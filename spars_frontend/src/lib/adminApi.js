const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
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

async function request(path, { method = 'GET', body, query, fallbackMessage }) {
  const response = await fetch(buildUrl(path, query), {
    method,
    headers: getAuthHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  return parseResponse(response, fallbackMessage);
}

function mapClassFromApi(item) {
  return {
    id: item.id,
    branch: item.branch,
    semester: item.semester,
    section: item.section || '',
    academic_year: item.academicYear,
  };
}

function mapClassToApi(item) {
  return {
    branch: item.branch,
    semester: Number(item.semester),
    section: item.section,
    academicYear: String(item.academic_year),
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