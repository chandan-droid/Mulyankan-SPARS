import { cacheGet, cacheSet, cacheInvalidate } from './cacheManager';

/**
 * teacherApi.js
 * API service layer for all teacher-side backend endpoints.
 *
 * Endpoints covered:
 *  - GET  /api/teacher/classrooms/my-assignments
 *  - GET  /api/teacher/classrooms/:classId
 *  - GET  /api/teacher/grades                          (classId?, subjectId?)
 *  - GET  /api/teacher/grades/:assessmentId
 *  - POST /api/teacher/marks/assessment/:assessmentId
 *  - POST /api/teacher/marks/assessment/:assessmentId/bulk
 *  - PUT  /api/teacher/marks/:markId
 *  - GET  /api/teacher/marks/assessment/:assessmentId
 *  - GET  /api/teacher/marks/student/:studentId/assessment/:assessmentId
 *  - GET  /api/teacher/marks/student/:studentId/class/:classId
 *  - GET  /api/teacher/marks                           (assessmentId?, classId?, studentId?)
 *  - POST /api/teacher/question-marks/mark/:markId
 *  - PUT  /api/teacher/question-marks/:questionMarkId
 *  - GET  /api/teacher/question-marks/mark/:markId
 *  - GET  /api/teacher/question-marks/:questionMarkId
 *  - GET  /api/teacher/students                        (search?, classId?)
 *  - GET  /api/teacher/students/class/:classId
 *  - GET  /api/teacher/students/:studentId
 */

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'https://mulyankan-spars.onrender.com'
).replace(/\/$/, '');

const TOKEN_STORAGE_KEY = 'edutrack_token';

/* ── helpers ─────────────────────────────────────────────────────────────── */

function getAuthHeaders() {
  const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function buildUrl(path, query = {}) {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  });
  return url.toString();
}

async function parseResponse(response, fallback) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new Error(payload?.message || fallback);
  }
  if (payload?.success === false) {
    throw new Error(payload?.message || fallback);
  }
  // Backend wraps data in { success, message, data }
  return payload?.data ?? payload;
}

/** Track in-flight background refreshes to avoid duplicate fetches */
const _bgRefreshes = new Map();

/** Cross-resource cache invalidation mapping */
const CROSS_INVALIDATIONS = {
  'teacher-assignments': ['/api/teacher/classrooms'],
  marks: ['/co-attainment'],
  'question-marks': ['/co-attainment'],
  assessments: ['/api/teacher/grades'],
  grades: ['/api/admin/assessments'],
  classes: ['/api/teacher/classrooms'],
};

async function request(path, { method = 'GET', body, query, fallback, fresh = false } = {}) {
  const fullUrl = buildUrl(path, query);

  /* ── GET: cache-first with background revalidation ─────────────────── */
  if (method === 'GET') {
    const cached = cacheGet(fullUrl);

    if (!fresh && cached !== null) {
      // Serve stale data instantly; refresh cache in background
      if (!_bgRefreshes.has(fullUrl)) {
        const refresh = fetch(fullUrl, { method: 'GET', headers: getAuthHeaders() })
          .then((res) => parseResponse(res, fallback || `GET ${path} failed`))
          .then((freshData) => cacheSet(fullUrl, freshData))
          .catch(() => {}) // silently swallow – cached data is still valid
          .finally(() => _bgRefreshes.delete(fullUrl));
        _bgRefreshes.set(fullUrl, refresh);
      }
      return cached;
    }

    // No cache → fetch from network, cache the result
    const response = await fetch(fullUrl, { method: 'GET', headers: getAuthHeaders() });
    const data = await parseResponse(response, fallback || `GET ${path} failed`);
    cacheSet(fullUrl, data);
    return data;
  }

  /* ── Mutations (POST / PUT / DELETE): execute then invalidate ───────── */
  const response = await fetch(fullUrl, {
    method,
    headers: getAuthHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await parseResponse(response, fallback || `${method} ${path} failed`);

  // Intelligent cache invalidation based on the resource path
  const resourceMatch = path.match(/^\/api\/(?:teacher|admin)\/([^/]+)/);
  if (resourceMatch) {
    const resource = resourceMatch[1];
    cacheInvalidate(`/api/teacher/${resource}`);
    cacheInvalidate(`/api/admin/${resource}`);
    const extras = CROSS_INVALIDATIONS[resource];
    if (extras) {
      extras.forEach((p) => cacheInvalidate(p));
    }
  }

  return data;
}

/* ── normalizers ─────────────────────────────────────────────────────────── */

/**
 * Normalize an AssignmentDTO from the backend into the shape the frontend
 * currently expects from the local store.
 *
 * Backend:  { id, teacherId, subjectId, classId }
 * Frontend: { id, teacherId, subjectId, classId,
 *             branch, semester, section, academic_year }   ← enriched later if needed
 */
function normalizeAssignment(item) {
  return {
    id: item.id,
    teacherId: item.teacherId,
    subjectId: item.subjectId,
    classId: item.classId,
    // Optional fields that the backend may include in extended responses
    branch: item.branch ?? null,
    semester: item.semester ?? null,
    section: item.section ?? null,
    academic_year: item.academicYear ?? item.academic_year ?? null,
  };
}

/**
 * Normalize the updated AcademicClassDTO from the backend.
 *
 * Backend: { id, branch, semester, section, academicYear, studentCount, subjects }
 * Frontend: { id, branch, semester, section, academicYear, academic_year,
 *             studentCount, subjects }
 */
function normalizeAcademicClass(item) {
  return {
    id: item.id,
    branch: item.branch ?? null,
    semester: item.semester ?? null,
    section: item.section ?? null,
    academicYear: item.academicYear ?? item.academic_year ?? null,
    academic_year: item.academicYear ?? item.academic_year ?? null,
    studentCount: Number(item.studentCount ?? 0),
    subjects: Array.isArray(item.subjects) ? item.subjects : [],
  };
}

/**
 * Normalize an AssessmentDTO from the backend.
 *
 * Backend:  { id, name, type, subjectId, classId, maxMarks, examDate }
 * Frontend: { id, name, type, subjectId, classId, maxMarks, date,
 *             branch, semester, section }
 */
function normalizeAssessment(item) {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    subjectId: item.subjectId,
    classId: item.classId,
    maxMarks: item.maxMarks,
    date: item.examDate ?? item.date ?? null,
    // Extra context fields if the backend enriches them
    branch: item.branch ?? null,
    semester: item.semester ?? null,
    section: item.section ?? null,
  };
}

/**
 * Normalize a MarkDTO from the backend.
 *
 * Backend:  { id, studentId, assessmentId, totalMarks|marksObtained, comments, createdAt }
 */
function normalizeMark(item) {
  const marksValue =
    item.totalMarks ??
    item.marksObtained ??
    item.quizMarks ??
    item.assignmentMarks ??
    item.obtainedMarks ??
    0;
  return {
    id: item.id,
    studentId: item.studentId,
    assessmentId: item.assessmentId,
    subjectId: item.subjectId ?? null,
    assessmentType: item.assessmentType ?? item.type ?? null,
    totalMarks: marksValue,
    marksObtained: marksValue,
    attendedClasses: item.attendedClasses ?? 0,
    quizMarks: item.quizMarks ?? null,
    quizScores: item.quizScores ?? null,
    comments: item.comments ?? null,
    createdAt: item.createdAt ?? null,
  };
}

/**
 * Normalize a QuestionMarkDTO from the backend.
 *
 * Backend:  { id, markId, questionNumber, coNumber, maxMarks, obtainedMarks }
 */
function normalizeQuestionMark(item) {
  return {
    id: item.id,
    markId: item.markId,
    questionNumber: item.questionNumber,
    coNumber: item.coNumber,
    maxMarks: item.maxMarks,
    obtainedMarks: item.obtainedMarks ?? item.marksObtained,
    marksObtained: item.marksObtained ?? item.obtainedMarks,
  };
}

/**
 * Normalize a StudentDTO from the backend.
 *
 * Backend:  { id, regNo, name, classId }
 */
function normalizeStudent(item) {
  return {
    id: item.id,
    regNo: item.regNo,
    name: item.name,
    classId: item.classId,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  1. CLASSROOMS / ASSIGNMENTS
 *  GET /api/teacher/classrooms/my-assignments
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Fetch the assignments for the currently authenticated teacher.
 * @returns {Promise<Array>} List of normalized assignments.
 */
export async function getMyAssignments() {
  const data = await request('/api/teacher/classrooms/my-assignments', {
    fallback: 'Failed to fetch your assignments',
  });
  return Array.isArray(data) ? data.map(normalizeAssignment) : [];
}

/**
 * Fetch a single class by its ID for teacher-side class context.
 * @param {number} classId
 * @returns {Promise<object>} Normalized academic class.
 */
export async function getClassById(classId) {
  const data = await request(`/api/teacher/classrooms/${classId}`, {
    fresh: true,
    fallback: `Failed to fetch class ${classId}`,
  });
  return normalizeAcademicClass(data);
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  2. ASSESSMENTS
 *  GET /api/teacher/grades
 *  GET /api/teacher/grades/:assessmentId
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Fetch all assessments visible to the teacher, optionally filtered.
 * @param {{ classId?: number, subjectId?: number }} [filters]
 * @returns {Promise<Array>} List of normalized assessments.
 */
export async function getMyAssessments({ classId, subjectId } = {}) {
  const data = await request('/api/teacher/grades', {
    query: { classId, subjectId },
    fallback: 'Failed to fetch assessments',
  });
  return Array.isArray(data) ? data.map(normalizeAssessment) : [];
}

/**
 * Fetch a single assessment by ID.
 * @param {number} assessmentId
 * @returns {Promise<object>} Normalized assessment.
 */
export async function getAssessmentById(assessmentId) {
  const data = await request(`/api/teacher/grades/${assessmentId}`, {
    fallback: `Failed to fetch assessment ${assessmentId}`,
  });
  return normalizeAssessment(data);
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  3. MARKS
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Create a single mark for a student in an assessment.
 * @param {number} assessmentId
 * @param {{ studentId: number, totalMarks: number }} markData
 * @returns {Promise<object>} Normalized created mark.
 */
export async function createMark(assessmentId, markData) {
  const data = await request(`/api/teacher/marks/assessment/${assessmentId}`, {
    method: 'POST',
    body: {
      assessmentId: Number(assessmentId),
      studentId: Number(markData.studentId),
      totalMarks: Number(markData.totalMarks),
      ...(markData.attendedClasses !== undefined
        ? { attendedClasses: Number(markData.attendedClasses) }
        : {}),
      ...(markData.quizMarks !== undefined
        ? { quizMarks: Number(markData.quizMarks) }
        : {}),
    },
    fallback: 'Failed to create mark',
  });
  return normalizeMark(data);
}

/**
 * Update an existing mark.
 * @param {number} markId
 * @param {{ marksObtained?: number, totalMarks?: number, comments?: string }} markData
 * @returns {Promise<object>} Normalized updated mark.
 */
export async function updateMark(markId, markData) {
  const rawMarks = markData.marksObtained ?? markData.totalMarks;
  if (rawMarks === undefined || rawMarks === null || Number.isNaN(Number(rawMarks))) {
    throw new Error('marksObtained is required for mark update');
  }

  const marksValue = Number(rawMarks);
  const payload = {
    marksObtained: marksValue,
  };

  if (markData.comments !== undefined) {
    payload.comments = markData.comments;
  }

  if (markData.attendedClasses !== undefined) {
    payload.attendedClasses = Number(markData.attendedClasses);
  }

  if (markData.quizMarks !== undefined) {
    payload.quizMarks = Number(markData.quizMarks);
  }

  const data = await request(`/api/teacher/marks/${markId}`, {
    method: 'PUT',
    body: payload,
    fallback: `Failed to update mark ${markId}`,
  });
  return normalizeMark(data);
}

/**
 * Create marks for multiple students in bulk for a single assessment.
 * @param {number} assessmentId
 * @param {Array<{ studentId: number, totalMarks: number }>} marks
 * @returns {Promise<Array>} List of normalized created marks.
 */
export async function createMarksBulk(assessmentId, marks) {
  const data = await request(`/api/teacher/marks/assessment/${assessmentId}/bulk`, {
    method: 'POST',
    body: {
      marks: marks.map(m => ({
        assessmentId: Number(assessmentId),
        studentId: Number(m.studentId),
        totalMarks: Number(m.totalMarks),
        ...(m.attendedClasses !== undefined
          ? { attendedClasses: Number(m.attendedClasses) }
          : {}),
        ...(m.quizMarks !== undefined
          ? { quizMarks: Number(m.quizMarks) }
          : {}),
      })),
    },
    fallback: 'Failed to create marks in bulk',
  });
  return Array.isArray(data) ? data.map(normalizeMark) : [];
}

/**
 * Update marks for multiple students in bulk for a single assessment.
 * Uses backend PUT bulk update endpoint.
 * @param {number} assessmentId
 * @param {Array<{ studentId: number, marksObtained: number }>} marks
 * @returns {Promise<Array>} List of normalized updated marks.
 */
export async function updateMarksBulk(assessmentId, marks) {
  const data = await request(`/api/teacher/marks/assessment/${assessmentId}/bulk`, {
    method: 'PUT',
    body: {
      marks: marks.map((m) => ({
        studentId: Number(m.studentId),
        marksObtained: Number(m.marksObtained),
      })),
    },
    fallback: 'Failed to update marks in bulk',
  });
  return Array.isArray(data) ? data.map(normalizeMark) : [];
}

/**
 * Fetch all marks for a given assessment.
 * @param {number} assessmentId
 * @returns {Promise<Array>} List of normalized marks.
 */
export async function getMarksByAssessment(assessmentId) {
  const data = await request(`/api/teacher/marks/assessment/${assessmentId}`, {
    fresh: true,
    fallback: `Failed to fetch marks for assessment ${assessmentId}`,
  });
  return Array.isArray(data) ? data.map(normalizeMark) : [];
}

/**
 * Fetch the mark for a specific student on a specific assessment.
 * @param {number} studentId
 * @param {number} assessmentId
 * @returns {Promise<object>} Normalized mark.
 */
export async function getMarkByStudentAndAssessment(studentId, assessmentId) {
  const data = await request(
    `/api/teacher/marks/student/${studentId}/assessment/${assessmentId}`,
    { fallback: `Failed to fetch mark for student ${studentId}` }
  );
  return normalizeMark(data);
}

/**
 * Fetch all marks for a student across an entire class.
 * @param {number} studentId
 * @param {number} classId
 * @returns {Promise<Array>} List of normalized marks.
 */
export async function getStudentMarksInClass(studentId, classId) {
  const data = await request(
    `/api/teacher/marks/student/${studentId}/class/${classId}`,
    { fallback: `Failed to fetch marks for student ${studentId} in class ${classId}` }
  );
  return Array.isArray(data) ? data.map(normalizeMark) : [];
}

/**
 * Flexible marks fetcher — supply at least one filter.
 * Priority: assessmentId+classId > classId > assessmentId > studentId
 * @param {{ assessmentId?: number, classId?: number, studentId?: number }} filters
 * @returns {Promise<Array>} List of normalized marks.
 */
export async function getMarksFiltered({ assessmentId, classId, studentId } = {}) {
  if (!assessmentId && !classId && !studentId) {
    throw new Error('At least one filter (assessmentId, classId, studentId) is required');
  }
  const data = await request('/api/teacher/marks', {
    query: { assessmentId, classId, studentId },
    fallback: 'Failed to fetch marks',
  });
  return Array.isArray(data) ? data.map(normalizeMark) : [];
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  4. QUESTION MARKS  (MidSem per-question breakdown)
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Create a question-level mark entry for a given mark record.
 * @param {number} markId
 * @param {{ questionNumber: number, coNumber: number, maxMarks: number, obtainedMarks: number }} qmData
 * @returns {Promise<object>} Normalized question mark.
 */
export async function createQuestionMark(markId, qmData) {
  const marksValue = Number(qmData.obtainedMarks ?? qmData.marksObtained ?? 0);
  const data = await request(`/api/teacher/question-marks/mark/${markId}`, {
    method: 'POST',
    body: {
      questionNumber: Number(qmData.questionNumber),
      coNumber: Number(qmData.coNumber),
      maxMarks: Number(qmData.maxMarks),
      obtainedMarks: marksValue,
    },
    fallback: 'Failed to create question mark',
  });
  return normalizeQuestionMark(data);
}

/**
 * Update an existing question mark.
 * @param {number} questionMarkId
 * @param {{ marksObtained?: number, obtainedMarks?: number }} qmData
 * @returns {Promise<object>} Normalized updated question mark.
 */
export async function updateQuestionMark(questionMarkId, qmData) {
  const payload = {};
  
  if (qmData.marksObtained !== undefined && qmData.marksObtained !== null && !Number.isNaN(Number(qmData.marksObtained))) {
    payload.marksObtained = Number(qmData.marksObtained);
  } else if (qmData.obtainedMarks !== undefined && qmData.obtainedMarks !== null && !Number.isNaN(Number(qmData.obtainedMarks))) {
    payload.marksObtained = Number(qmData.obtainedMarks);
  }

  if (qmData.coNumber !== undefined) {
    let coVal = String(qmData.coNumber).replace(/[^0-9]/g, '');
    if (coVal === '') coVal = '1';
    payload.coNumber = Number(coVal);
  }
  
  if (qmData.maxMarks !== undefined) {
    payload.maxMarks = Number(qmData.maxMarks);
  }
  
  if (qmData.questionNumber !== undefined) {
    let qVal = String(qmData.questionNumber).replace(/[^0-9]/g, '');
    if (qVal) {
      payload.questionNumber = Number(qVal);
    }
  }

  if (Object.keys(payload).length === 0) {
    throw new Error('No valid fields provided for question mark update');
  }

  const data = await request(`/api/teacher/question-marks/${questionMarkId}`, {
    method: 'PUT',
    body: payload,
    fallback: `Failed to update question mark ${questionMarkId}`,
  });
  return normalizeQuestionMark(data);
}

/**
 * Fetch all question marks for a given mark ID.
 * @param {number} markId
 * @returns {Promise<Array>} List of normalized question marks.
 */
export async function getQuestionMarksByMark(markId) {
  const data = await request(`/api/teacher/question-marks/mark/${markId}`, {
    fresh: true,
    fallback: `Failed to fetch question marks for mark ${markId}`,
  });
  return Array.isArray(data) ? data.map(normalizeQuestionMark) : [];
}

/**
 * Fetch a single question mark by its own ID.
 * @param {number} questionMarkId
 * @returns {Promise<object>} Normalized question mark.
 */
export async function getQuestionMarkDetail(questionMarkId) {
  const data = await request(`/api/teacher/question-marks/${questionMarkId}`, {
    fallback: `Failed to fetch question mark ${questionMarkId}`,
  });
  return normalizeQuestionMark(data);
}

/**
 * Fetch all question marks for a specific assessment and class combination.
 * @param {number} assessmentId 
 * @param {number} classId 
 * @returns {Promise<Array>} List of normalized question marks
 */
export async function getQuestionMarksByAssessmentAndClass(assessmentId, classId) {
  const data = await request(`/api/teacher/question-marks/assessment/${assessmentId}/class/${classId}`, {
    fresh: true,
    fallback: `Failed to fetch question marks for assessment ${assessmentId} and class ${classId}`,
  });
  
  if (Array.isArray(data)) {
    return data.map(normalizeQuestionMark);
  }
  if (data && typeof data === 'object') {
    return Object.values(data).flat().map(normalizeQuestionMark);
  }
  return [];
}

/**
 * Bulk save/upsert question marks for an assessment and class.
 * @param {number} assessmentId 
 * @param {number} classId 
 * @param {Array} studentMarks Array of { studentId, questionMarks: [{ questionNumber, coNumber, maxMarks, obtainedMarks }] }
 * @returns {Promise<Array>} List of saved normalized question marks
 */
export async function saveQuestionMarksByAssessmentAndClass(assessmentId, classId, studentMarks) {
  const data = await request(`/api/teacher/question-marks/assessment/${assessmentId}/class/${classId}/bulk`, {
    method: 'POST',
    body: { studentMarks },
    fallback: `Failed to bulk save question marks for assessment ${assessmentId} and class ${classId}`,
  });
  
  if (Array.isArray(data)) {
    return data.map(normalizeQuestionMark);
  }
  if (data && typeof data === 'object') {
    return Object.values(data).flat().map(normalizeQuestionMark);
  }
  return [];
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  5. STUDENTS
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Search / list students visible to the teacher.
 * @param {{ search?: string, classId?: number }} [filters]
 * @returns {Promise<Array>} List of normalized students.
 */
export async function searchStudents({ search, classId } = {}) {
  const data = await request('/api/teacher/students', {
    query: { search, classId },
    fallback: 'Failed to fetch students',
  });
  return Array.isArray(data) ? data.map(normalizeStudent) : [];
}

/**
 * Fetch all students enrolled in a specific class.
 * @param {number} classId
 * @returns {Promise<Array>} List of normalized students.
 */
export async function getStudentsByClass(classId) {
  const data = await request(`/api/teacher/students/class/${classId}`, {
    fresh: true,
    fallback: `Failed to fetch students for class ${classId}`,
  });
  return Array.isArray(data) ? data.map(normalizeStudent) : [];
}

/**
 * Fetch the full details of a single student.
 * @param {number} studentId
 * @returns {Promise<object>} Normalized student.
 */
export async function getStudentById(studentId) {
  const data = await request(`/api/teacher/students/${studentId}`, {
    fallback: `Failed to fetch student ${studentId}`,
  });
  return normalizeStudent(data);
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  COMPOSITE HELPERS
 *  High-level helpers used by MarkEntry that combine multiple API calls.
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Save a complete MidSem mark submission for one student.
 * Creates the mark record, then POSTs each question mark.
 *
 * @param {number} assessmentId
 * @param {{ studentId: number, totalMarks: number }} markData
 * @param {Array<{ questionNumber, coNumber, maxMarks, obtainedMarks }>} questionMarks
 * @returns {Promise<object>} The created mark.
 */
export async function saveMidsemMarkWithQuestions(assessmentId, markData, questionMarks) {
  const mark = await createMark(assessmentId, markData);
  await Promise.all(
    questionMarks.map(qm => createQuestionMark(mark.id, qm))
  );
  return mark;
}

/**
 * Save all simple marks (Quiz / Assignment / Attendance) for an assessment in bulk.
 *
 * @param {number} assessmentId
 * @param {Array<{ studentId: number, totalMarks: number }>} rows
 * @returns {Promise<Array>} All created marks.
 */
export async function saveSimpleMarksBulk(assessmentId, rows) {
  return createMarksBulk(assessmentId, rows);
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  6. CO ATTAINMENT
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Fetch CO attainment for a student in a subject.
 * @param {number} studentId
 * @param {number} subjectId
 * @returns {Promise<object>} CO attainment report.
 */
export async function getStudentCoAttainment(studentId, subjectId) {
  const data = await request(`/api/teacher/co-attainment/student/${studentId}/subject/${subjectId}`, {
    fallback: `Failed to fetch CO attainment for student ${studentId}`,
  });
  return data;
}

/**
 * Fetch CO attainment for a class in a subject.
 * @param {number} classId
 * @param {number} subjectId
 * @returns {Promise<object>} CO attainment report.
 */
export async function getClassCoAttainment(classId, subjectId) {
  const data = await request(`/api/teacher/co-attainment/class/${classId}/subject/${subjectId}`, {
    fallback: `Failed to fetch CO attainment for class ${classId}`,
  });
  return data;
}
