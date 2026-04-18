export function getData() { return {}; }
export function authenticate() { return null; }
export function getStudents() { return []; }
export function addStudent() {}
export function updateStudent() {}
export function deleteStudent() {}
export function getSubjects() { return []; }
export function addSubject() {}
export function getTeachers() { return []; }
export function addTeacher() {}
export function getTeacherAssignments() { return []; }
export function autoGenerateAssessments() {}
export function addTeacherAssignment() {}
export function getAssignmentsForTeacher() { return []; }
export function getAssessments() { return []; }
export function updateAssessmentDate() {}
export function updateAssessmentTotalClasses() {}
export function addAssessment() {}
export function getMarks() { return []; }
export function getMarksForAssessment() { return []; }
export function saveMark() {}
export function upsertMark() {}
export function getQuestionMarks() { return []; }
export function getQuestionMarksForMark() { return []; }
export function saveQuestionMarks() {}
export function getMidsemTemplate() { return null; }
export function saveMidsemTemplate() {}
export function buildDefaultMidsemQuestions() {
  return [
    { questionNumber: '1a', part: 'A', maxMarks: 1.0, coNumber: 1 },
    { questionNumber: '1b', part: 'A', maxMarks: 1.0, coNumber: 2 },
    { questionNumber: '1c', part: 'A', maxMarks: 1.0, coNumber: 3 },
    { questionNumber: '1d', part: 'A', maxMarks: 1.0, coNumber: 3 },
    { questionNumber: '1e', part: 'A', maxMarks: 1.0, coNumber: 4 },
    { questionNumber: '2a', part: 'B', maxMarks: 2.5, coNumber: 1 },
    { questionNumber: '2b', part: 'B', maxMarks: 2.5, coNumber: 2 },
    { questionNumber: '2c', part: 'B', maxMarks: 2.5, coNumber: 1 },
    { questionNumber: '2d', part: 'B', maxMarks: 2.5, coNumber: 3 },
    { questionNumber: '2e', part: 'B', maxMarks: 2.5, coNumber: 5 },
    { questionNumber: '2f', part: 'B', maxMarks: 2.5, coNumber: 1 }
  ];
}
export function getStudentsForClass() { return []; }
export function getMarksForStudent() { return []; }
export function getClasses() { return []; }
export function getAvailableClassCombos() { return []; }
export function addClass() {}
export function updateClass() {}
export function deleteClass() {}
export function getClassStudents() { return []; }
export function getTeacherName() { return ''; }
export function resetData() {}
