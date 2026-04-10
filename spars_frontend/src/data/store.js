const KEY = 'edutrack_data';
let uid = 100;
const genId = () => `id_${++uid}_${Date.now()}`;

function normalizeClassRecord(c = {}) {
  return {
    id: c.id || genId(),
    branch: c.branch || '',
    semester: Number(c.semester) || 1,
    section: c.section || '',
    academic_year: String(c.academic_year ?? c.year ?? new Date().getFullYear()),
  };
}

function getClassKey(c) {
  return [c.branch, c.semester, c.section, c.academic_year].join('|');
}

function getDefaultAcademicYear() {
  return String(new Date().getFullYear());
}

function getDefaultData() {
  return {
    users: [],
    students: [],
    subjects: [],
    teacherAssignments: [],
    classes: [],
    assessments: [],
    marks: [],
    questionMarks: [],
    midsemTemplates: [],
  };
}

// Passwords stored separately (not in AppData for clarity)
const PASSWORDS_KEY = 'edutrack_passwords';
function getPasswords() {
  try {
    return JSON.parse(localStorage.getItem(PASSWORDS_KEY) || '{}');
  } catch {
    return {};
  }
}
function setPasswords(p) {
  localStorage.setItem(PASSWORDS_KEY, JSON.stringify(p));
}
function initPasswords() {
  const p = getPasswords();
  if (!p['admin1']) {
    p['admin1'] = 'admin123';
    p['teacher1'] = 'teacher123';
    p['teacher2'] = 'teacher123';
    setPasswords(p);
  }
}
export function getData() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
       const parsed = JSON.parse(raw);
       let normalized = false;
       if (!Array.isArray(parsed.users)) {
         parsed.users = [];
         normalized = true;
       }
       if (!Array.isArray(parsed.students)) {
         parsed.students = [];
         normalized = true;
       }
       if (!Array.isArray(parsed.subjects)) {
         parsed.subjects = [];
         normalized = true;
       }
       if (!Array.isArray(parsed.teacherAssignments)) {
         parsed.teacherAssignments = [];
         normalized = true;
       }
       if (!Array.isArray(parsed.classes)) {
         parsed.classes = [];
         normalized = true;
       }
       if (!Array.isArray(parsed.assessments)) {
         parsed.assessments = [];
         normalized = true;
       }
       if (!Array.isArray(parsed.marks)) {
         parsed.marks = [];
         normalized = true;
       }
       if (!Array.isArray(parsed.questionMarks)) {
         parsed.questionMarks = [];
         normalized = true;
       }
       if (!Array.isArray(parsed.midsemTemplates)) {
         parsed.midsemTemplates = [];
         normalized = true;
       }
       if (Array.isArray(parsed.classes)) {
         const nextClasses = [];
         const seenClassKeys = new Set();
         parsed.classes.forEach((c) => {
           const normalizedClass = normalizeClassRecord(c);
           const key = getClassKey(normalizedClass);
           if (!seenClassKeys.has(key)) {
             nextClasses.push(normalizedClass);
             seenClassKeys.add(key);
           }
           if (JSON.stringify(c) !== JSON.stringify(normalizedClass)) {
             normalized = true;
           }
         });
         if (nextClasses.length !== parsed.classes.length) normalized = true;
         parsed.classes = nextClasses;
       }
       // Retro-fit existing QUIZ maxMarks to 5
       if (parsed.assessments) {
          parsed.assessments.forEach(a => {
             if (a.type === 'QUIZ') a.maxMarks = 5;
          });
       }
       // Backward compat sync for V2 assessments
       if (!parsed.syncedAssessmentsV2) {
          const typesNeeded = [
            { type: 'MIDSEM', name: 'MidSem Exam', maxMarks: 20 },
            { type: 'QUIZ', name: 'Quiz', maxMarks: 5 },
            { type: 'ASSIGNMENT', name: 'Assignment 1', maxMarks: 5 },
            { type: 'ASSIGNMENT', name: 'Assignment 2', maxMarks: 5 },
            { type: 'ATTENDANCE', name: 'Attendance', maxMarks: 5 }
          ];
          let updated = false;
          (parsed.teacherAssignments || []).forEach(a => {
             const existing = (parsed.assessments || []).filter(ass => 
                ass.subjectId === a.subjectId && ass.branch === a.branch && ass.semester === a.semester && ass.section === a.section
             );
             typesNeeded.forEach(tn => {
                const exists = existing.find(e => e.type === tn.type && (e.name === tn.name || (tn.type !== 'ASSIGNMENT' && e.type === tn.type)));
                if (!exists) {
                   const newA = {
                      id: genId(),
                      type: tn.type,
                      name: tn.name,
                      subjectId: a.subjectId,
                      branch: a.branch,
                      semester: a.semester,
                      section: a.section,
                      date: 'TBA',
                      maxMarks: tn.maxMarks
                   };
                   parsed.assessments = parsed.assessments || [];
                   parsed.assessments.push(newA);
                 if (Array.isArray(parsed.teacherAssignments)) {
                   parsed.teacherAssignments = parsed.teacherAssignments.map((assignment) => {
                     const matchingClass = (parsed.classes || []).find(
                       (c) =>
                         c.branch === assignment.branch &&
                         c.semester === assignment.semester &&
                         c.section === assignment.section
                     );
                     const academic_year = String(
                       assignment.academic_year ??
                         matchingClass?.academic_year ??
                         getDefaultAcademicYear()
                     );
                     if (assignment.academic_year !== academic_year) normalized = true;
                     return {
                       ...assignment,
                       academic_year,
                     };
                   });
                 }
                   if (tn.type === 'MIDSEM') {
                      if (!parsed.midsemTemplates) parsed.midsemTemplates = [];
                      parsed.midsemTemplates.push({
                          assessmentId: newA.id,
                          questions: buildDefaultMidsemQuestions()
                      });
                   }
                   updated = true;
                }
             });
          });
          parsed.syncedAssessmentsV2 = true;
           if (updated) normalized = true;
       }
         if (normalized) localStorage.setItem(KEY, JSON.stringify(parsed));
       return parsed;
    }
  } catch {}
  const d = getDefaultData();
  localStorage.setItem(KEY, JSON.stringify(d));
  initPasswords();
  return d;
}
function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

// Auth
export function authenticate(email, password) {
  const data = getData();
  initPasswords();
  const passwords = getPasswords();
  const user = data.users.find((u) => u.email === email);
  if (user && passwords[user.id] === password) return user;
  return null;
}

// Students
export function getStudents() {
  return getData().students;
}
export function addStudent(s) {
  const data = getData();
  data.students.push({
    ...s,
    id: genId(),
  });
  save(data);
}
export function updateStudent(id, updates) {
  const data = getData();
  const idx = data.students.findIndex((s) => s.id === id);
  if (idx >= 0)
    data.students[idx] = {
      ...data.students[idx],
      ...updates,
    };
  save(data);
}
export function deleteStudent(id) {
  const data = getData();
  data.students = data.students.filter((s) => s.id !== id);
  data.marks = data.marks.filter((m) => m.studentId !== id);
  save(data);
}

// Subjects
export function getSubjects() {
  return getData().subjects;
}
export function addSubject(s) {
  const data = getData();
  data.subjects.push({
    ...s,
    id: genId(),
  });
  save(data);
}

// Teachers (users with role=teacher)
export function getTeachers() {
  return getData().users.filter((u) => u.role === 'teacher');
}
export function addTeacher(t) {
  const data = getData();
  const id = genId();
  data.users.push({
    id,
    email: t.email,
    name: t.name,
    role: 'teacher',
    department: t.department,
  });
  save(data);
  const p = getPasswords();
  p[id] = t.password;
  setPasswords(p);
}

// Teacher Assignments
export function getTeacherAssignments() {
  return getData().teacherAssignments;
}

export function autoGenerateAssessments(subjectId, branch, semester, section) {
  const data = getData();
  const existing = data.assessments.filter(ass => 
     ass.subjectId === subjectId && ass.branch === branch && ass.semester === semester && ass.section === section
  );
  
  const typesNeeded = [
    { type: 'MIDSEM', name: 'MidSem Exam', maxMarks: 20 },
    { type: 'QUIZ', name: 'Quiz', maxMarks: 5 },
    { type: 'ASSIGNMENT', name: 'Assignment 1', maxMarks: 5 },
    { type: 'ASSIGNMENT', name: 'Assignment 2', maxMarks: 5 },
    { type: 'ATTENDANCE', name: 'Attendance', maxMarks: 5 }
  ];

  let added = false;
  typesNeeded.forEach(tn => {
     const exists = existing.find(e => e.type === tn.type && e.name === tn.name);
     if (!exists) {
        const newA = {
           id: genId(),
           type: tn.type,
           name: tn.name,
           subjectId,
           branch,
           semester,
           section,
            academic_year: null,
           date: 'TBA',
           maxMarks: tn.maxMarks
        };
        data.assessments.push(newA);
        if (tn.type === 'MIDSEM') {
           if (!data.midsemTemplates) data.midsemTemplates = [];
           data.midsemTemplates.push({
               assessmentId: newA.id,
               questions: buildDefaultMidsemQuestions()
           });
        }
        added = true;
     }
  });
  if (added) save(data);
}

export function addTeacherAssignment(a) {
  const data = getData();
  data.teacherAssignments.push({
    ...a,
    academic_year: String(a.academic_year ?? getDefaultAcademicYear()),
    id: genId(),
  });
  save(data);
  autoGenerateAssessments(a.subjectId, a.branch, a.semester, a.section);
}
export function getAssignmentsForTeacher(teacherId) {
  return getData().teacherAssignments.filter((a) => a.teacherId === teacherId);
}

// Assessments
export function getAssessments() {
  return getData().assessments;
}
export function updateAssessmentDate(id, date) {
  const data = getData();
  const idx = data.assessments.findIndex(a => a.id === id);
  if (idx >= 0) {
     data.assessments[idx].date = date;
     save(data);
  }
}
export function updateAssessmentTotalClasses(id, totalClasses) {
  const data = getData();
  const idx = data.assessments.findIndex(a => a.id === id);
  if (idx >= 0) {
     data.assessments[idx].totalClasses = totalClasses;
     save(data);
  }
}
export function addAssessment(a) {
  const data = getData();
  data.assessments.push({
    ...a,
    id: genId(),
  });
  save(data);
}

// Marks
export function getMarks() {
  return getData().marks;
}
export function getMarksForAssessment(assessmentId) {
  return getData().marks.filter((m) => m.assessmentId === assessmentId);
}
export function saveMark(mark, existingId) {
  const data = getData();
  if (existingId) {
    const idx = data.marks.findIndex((m) => m.id === existingId);
    if (idx >= 0)
      data.marks[idx] = {
        ...data.marks[idx],
        ...mark,
      };
  } else {
    data.marks.push({
      ...mark,
      id: genId(),
    });
  }
  save(data);
  return data.marks;
}
export function upsertMark(mark) {
  const data = getData();
  const existing = data.marks.find(
    (m) =>
      m.studentId === mark.studentId && m.assessmentId === mark.assessmentId
  );
  if (existing) {
    Object.assign(existing, mark);
    save(data);
    return existing.id;
  } else {
    const id = genId();
    data.marks.push({
      ...mark,
      id,
    });
    save(data);
    return id;
  }
}

// Question Marks (MIDSEM)
export function getQuestionMarks() {
  return getData().questionMarks;
}
export function getQuestionMarksForMark(markId) {
  return getData().questionMarks.filter((q) => q.markId === markId);
}
export function saveQuestionMarks(markId, questions) {
  const data = getData();
  // Remove old question marks for this mark
  data.questionMarks = data.questionMarks.filter((q) => q.markId !== markId);
  // Add new ones
  questions.forEach((q) => {
    data.questionMarks.push({
      ...q,
      id: genId(),
      markId,
    });
  });
  save(data);
}

// MidSem Templates
export function getMidsemTemplate(assessmentId) {
  const data = getData();
  // Ensure field exists for old stored data
  if (!data.midsemTemplates) data.midsemTemplates = [];
  return (
    data.midsemTemplates.find((t) => t.assessmentId === assessmentId) || null
  );
}
export function saveMidsemTemplate(assessmentId, questions) {
  const data = getData();
  if (!data.midsemTemplates) data.midsemTemplates = [];
  const idx = data.midsemTemplates.findIndex(
    (t) => t.assessmentId === assessmentId
  );
  const template = {
    assessmentId,
    questions,
  };
  if (idx >= 0) data.midsemTemplates[idx] = template;
  else data.midsemTemplates.push(template);
  save(data);
}

// Build default MidSem template (all CO1 until overridden)
export function buildDefaultMidsemQuestions() {
  return [
    ...['1a', '1b', '1c', '1d', '1e'].map((n) => ({
      questionNumber: n,
      coNumber: 1,
      maxMarks: 1,
      part: 'A',
    })),
    ...['2a', '2b', '2c', '2d', '2e', '2f'].map((n) => ({
      questionNumber: n,
      coNumber: 1,
      maxMarks: 2.5,
      part: 'B',
    })),
  ];
}
export function getStudentsForClass(branch, semester, section, academicYear = null) {
  return getData().students.filter((s) => {
    const matchesBase =
      s.branch === branch && s.semester === semester && s.section === section;
    if (!matchesBase) return false;
    if (!academicYear) return true;
    return String(s.year ?? '') === String(academicYear);
  });
}

// Utility: get all marks for a student
export function getMarksForStudent(studentId) {
  return getData().marks.filter((m) => m.studentId === studentId);
}

// Classes
export function getClasses() {
  return (getData().classes || []).map(normalizeClassRecord);
}

export function getAvailableClassCombos() {
  const seen = new Set();
  return getClasses().filter((c) => {
    const key = getClassKey(c);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function addClass(c) {
  const data = getData();
  if (!data.classes) data.classes = [];
  const nextClass = normalizeClassRecord(c);
  const key = getClassKey(nextClass);
  if (!data.classes.some((existing) => getClassKey(normalizeClassRecord(existing)) === key)) {
    data.classes.push(nextClass);
  }
  save(data);
}

export function updateClass(id, updates) {
  const data = getData();
  if (!data.classes) data.classes = [];
  const idx = data.classes.findIndex((c) => c.id === id);
  if (idx >= 0) {
    data.classes[idx] = normalizeClassRecord({
      ...data.classes[idx],
      ...updates,
      id,
    });
    save(data);
  }
}

export function deleteClass(id) {
  const data = getData();
  if (!data.classes) data.classes = [];
  data.classes = data.classes.filter((c) => c.id !== id);
  save(data);
}

export function getClassStudents(classId) {
  const data = getData();
  if (!data.classes) data.classes = [];
  const cls = data.classes.find((c) => c.id === classId);
  if (!cls) return [];
  
  return (data.students || []).filter(
    (s) =>
      s.branch === cls.branch &&
      s.semester === cls.semester &&
      s.section === cls.section
  );
}

export function getTeacherName(teacherId) {
  const data = getData();
  const teacher = data.users.find((u) => u.id === teacherId);
  return teacher ? teacher.name : 'N/A';
}

// Reset to defaults
export function resetData() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(PASSWORDS_KEY);
}
