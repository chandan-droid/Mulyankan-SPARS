/**
 * teacherApi.js
 * API service layer for all teacher-side backend endpoints.
 *
 * Endpoints covered:
 *  - GET  /api/teacher/classrooms/my-assignments
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
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
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

async function request(path, { method = 'GET', body, query, fallback } = {}) {
  const response = await fetch(buildUrl(path, query), {
    method,
    headers: getAuthHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return parseResponse(response, fallback || `${method} ${path} failed`);
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
  const marksValue = item.marksObtained ?? item.totalMarks;
  return {
    id: item.id,
    studentId: item.studentId,
    assessmentId: item.assessmentId,
    totalMarks: marksValue,
    marksObtained: marksValue,
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
      })),
    },
    fallback: 'Failed to create marks in bulk',
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
