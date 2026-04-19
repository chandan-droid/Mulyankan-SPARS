import { cacheGet, cacheSet, cacheInvalidate } from './cacheManager';

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'https://mulyankan-spars.onrender.com'
).replace(/\/$/, '');

const TOKEN_STORAGE_KEY = 'edutrack_token';

function getAuthHeaders() {
  const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function buildUrl(path, query = {}) {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function parseResponse(response, fallbackMessage) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }

  if (payload?.success === false) {
    throw new Error(payload?.message || fallbackMessage);
  }

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
  students: ['/api/teacher/students'],
};

async function request(path, { method = 'GET', body, query, fallbackMessage }) {
  const fullUrl = buildUrl(path, query);

  /* ── GET: cache-first with background revalidation ─────────────────── */
  if (method === 'GET') {
    const cached = cacheGet(fullUrl);

    if (cached !== null) {
      // Serve stale data instantly; refresh cache in background
      if (!_bgRefreshes.has(fullUrl)) {
        const refresh = fetch(fullUrl, { method: 'GET', headers: getAuthHeaders() })
          .then((res) => parseResponse(res, fallbackMessage))
          .then((freshData) => cacheSet(fullUrl, freshData))
          .catch(() => {}) // silently swallow – cached data is still valid
          .finally(() => _bgRefreshes.delete(fullUrl));
        _bgRefreshes.set(fullUrl, refresh);
      }
      return cached;
    }

    // No cache → fetch from network, cache the result
    const response = await fetch(fullUrl, { method: 'GET', headers: getAuthHeaders() });
    const data = await parseResponse(response, fallbackMessage);
    cacheSet(fullUrl, data);
    return data;
  }

  /* ── Mutations (POST / PUT / DELETE): execute then invalidate ───────── */
  const response = await fetch(fullUrl, {
    method,
    headers: getAuthHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await parseResponse(response, fallbackMessage);

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

function mapClassFromApi(item) {
  return {
    id: item.id,
    branch: item.branch,
    semester: item.semester,
    section: item.section || '',
    academicYear: item.academicYear ?? item.academic_year ?? null,
    academic_year: item.academicYear ?? item.academic_year ?? null,
    studentCount: Number(item.studentCount ?? 0),
    subjects: Array.isArray(item.subjects) ? item.subjects : [],
  };
}

function mapClassToApi(item) {
  return {
    branch: item.branch,
    semester: Number(item.semester),
    section: item.section,
    academicYear: String(item.academicYear ?? item.academic_year ?? ''),
  };
}

function mapAdminMarkFromApi(item) {
  const marksValue = item.totalMarks ?? item.marksObtained ?? 0;
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
  };
}

function mapAdminQuestionMarkFromApi(item) {
  const marksValue = item.obtainedMarks ?? item.marksObtained ?? 0;
  return {
    id: item.id,
    markId: item.markId,
    questionNumber: item.questionNumber,
    coNumber: item.coNumber,
    maxMarks: item.maxMarks,
    obtainedMarks: marksValue,
    marksObtained: marksValue,
  };
}

export async function getAdminClasses() {
  const data = await request('/api/admin/classes', {
    fallbackMessage: 'Failed to fetch classes',
  });
  return Array.isArray(data) ? data.map(mapClassFromApi) : [];
}

export async function createAdminClass(item) {
  const data = await request('/api/admin/classes', {
    method: 'POST',
    body: mapClassToApi(item),
    fallbackMessage: 'Failed to create class',
  });
  return mapClassFromApi(data);
}

export async function updateAdminClass(id, item) {
  const data = await request(`/api/admin/classes/${id}`, {
    method: 'PUT',
    body: mapClassToApi(item),
    fallbackMessage: 'Failed to update class',
  });
  return mapClassFromApi(data);
}

export async function deleteAdminClass(id) {
  await request(`/api/admin/classes/${id}`, {
    method: 'DELETE',
    fallbackMessage: 'Failed to delete class',
  });
}

export async function getAdminStudents({ search, classId } = {}) {
  const data = await request('/api/admin/students', {
    query: { search, classId },
    fallbackMessage: 'Failed to fetch students',
  });
  return Array.isArray(data) ? data : [];
}

export async function createAdminStudent(student) {
  return request('/api/admin/students', {
    method: 'POST',
    body: {
      regNo: student.regNo,
      name: student.name,
      classId: Number(student.classId),
    },
    fallbackMessage: 'Failed to create student',
  });
}

export async function updateAdminStudent(id, student) {
  return request(`/api/admin/students/${id}`, {
    method: 'PUT',
    body: {
      regNo: student.regNo,
      name: student.name,
      classId: Number(student.classId),
    },
    fallbackMessage: 'Failed to update student',
  });
}

export async function deleteAdminStudent(id) {
  await request(`/api/admin/students/${id}`, {
    method: 'DELETE',
    fallbackMessage: 'Failed to delete student',
  });
}

export async function createAdminStudentsBulk(students) {
  const data = await request('/api/admin/students/bulk', {
    method: 'POST',
    body: {
      students: students.map((item) => ({
        regNo: item.regNo,
        name: item.name,
        classId: Number(item.classId),
      })),
    },
    fallbackMessage: 'Failed to create students in bulk',
  });
  return Array.isArray(data) ? data : [];
}

export async function getAdminSubjects() {
  const data = await request('/api/admin/subjects', {
    fallbackMessage: 'Failed to fetch subjects',
  });
  return Array.isArray(data) ? data : [];
}

export async function createAdminSubject(subject) {
  return request('/api/admin/subjects', {
    method: 'POST',
    body: {
      subjectCode: subject.subjectCode,
      subjectName: subject.subjectName,
    },
    fallbackMessage: 'Failed to create subject',
  });
}

export async function getAdminTeachers() {
  try {
    const data = await request('/api/admin/teachers', {
      fallbackMessage: 'Failed to fetch teachers',
    });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function createAdminTeacher(teacher) {
  return request('/api/admin/teachers', {
    method: 'POST',
    body: {
      name: teacher.name,
      email: teacher.email,
      password: teacher.password,
      department: teacher.department,
    },
    fallbackMessage: 'Failed to create teacher',
  });
}

export async function updateAdminTeacher(teacherId, teacher) {
  return request(`/api/admin/teachers/${teacherId}`, {
    method: 'PUT',
    body: {
      id: teacher?.id ? Number(teacher.id) : Number(teacherId),
      name: teacher.name,
      email: teacher.email,
      department: teacher.department,
    },
    fallbackMessage: 'Failed to update teacher',
  });
}

export async function deleteAdminTeacher(teacherId) {
  await request(`/api/admin/teachers/${teacherId}`, {
    method: 'DELETE',
    fallbackMessage: 'Failed to delete teacher',
  });
}

export async function createAdminTeacherAssignment(assignment) {
  return request('/api/admin/teacher-assignments', {
    method: 'POST',
    body: {
      teacherId: Number(assignment.teacherId),
      subjectId: Number(assignment.subjectId),
      classId: Number(assignment.classId),
    },
    fallbackMessage: 'Failed to create teacher assignment',
  });
}

export async function getAdminTeacherAssignments() {
  const data = await request('/api/admin/teacher-assignments', {
    fallbackMessage: 'Failed to fetch teacher assignments',
  });
  return Array.isArray(data) ? data : [];
}

export async function deleteAdminTeacherAssignment(id) {
  await request(`/api/admin/teacher-assignments/${id}`, {
    method: 'DELETE',
    fallbackMessage: 'Failed to delete teacher assignment',
  });
}

export async function getAdminAssessments() {
  const data = await request('/api/admin/assessments', {
    fallbackMessage: 'Failed to fetch assessments',
  });
  return Array.isArray(data) ? data : [];
}

export async function updateAdminAssessment(id, assessment) {
  return request(`/api/admin/assessments/${id}`, {
    method: 'PUT',
    body: {
      id: Number(assessment.id),
      name: assessment.name,
      type: assessment.type,
      subjectId: Number(assessment.subjectId),
      classId: Number(assessment.classId),
      maxMarks: Number(assessment.maxMarks),
      examDate: assessment.examDate,
    },
    fallbackMessage: 'Failed to update assessment',
  });
}

export async function getAdminMarks({ assessmentId, classId, studentId } = {}) {
  const data = await request('/api/admin/marks', {
    query: { assessmentId, classId, studentId },
    fallbackMessage: 'Failed to fetch marks',
  });
  return Array.isArray(data) ? data.map(mapAdminMarkFromApi) : [];
}

export async function getAdminQuestionMarks({ markId } = {}) {
  const data = await request('/api/admin/question-marks', {
    query: { markId },
    fallbackMessage: 'Failed to fetch question marks',
  });
  return Array.isArray(data) ? data.map(mapAdminQuestionMarkFromApi) : [];
}

export async function getAdminInstituteCoAttainment(subjectId) {
  return request(`/api/admin/co-attainment/institute/subject/${subjectId}`, {
    fallbackMessage: 'Failed to fetch institute CO attainment',
  });
}

export async function getAdminClassCoAttainment(classId, subjectId) {
  return request(`/api/admin/co-attainment/class/${classId}/subject/${subjectId}`, {
    fallbackMessage: 'Failed to fetch class CO attainment',
  });
}

export async function getAdminStudentCoAttainment(studentId, subjectId) {
  return request(`/api/admin/co-attainment/student/${studentId}/subject/${subjectId}`, {
    fallbackMessage: 'Failed to fetch student CO attainment',
  });
}