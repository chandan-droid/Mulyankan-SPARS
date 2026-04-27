import { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { teacherNavItems } from './Dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileBarChart, BookOpen, Loader2 } from 'lucide-react';
import {
  getAssignmentsForTeacher,
  getSubjects,
  getStudents,
  getAssessments,
  getMarks,
  getQuestionMarks,
} from '@/data/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getMyAssignments,
  getMyAssessments,
  getCachedMyAssignments,
  getCachedMyAssessments,
  getClassById,
  getStudentsByClass,
  getMarksByAssessment,
  getQuestionMarksByMark,
  getQuestionMarksByAssessmentAndClass,
} from '@/lib/teacherApi';
import { useAuth } from '@/contexts/AuthContext';

import TeacherClassTab from './reports/TeacherClassTab';
import TeacherStudentTab from './reports/TeacherStudentTab';
import TeacherDeepDiveTab from './reports/TeacherDeepDiveTab';

function assignmentKey(assignment) {
  if (assignment.classId != null) {
    return `${assignment.subjectId}|class:${assignment.classId}`;
  }
  return `${assignment.subjectId}|slot:${assignment.branch}-${assignment.semester}-${assignment.section}`;
}

function isSameAssignmentClass(assignment, target) {
  if (assignment.classId != null && target.classId != null) {
    return String(assignment.classId) === String(target.classId);
  }
  return (
    assignment.branch === target.branch &&
    Number(assignment.semester) === Number(target.semester) &&
    assignment.section === target.section
  );
}

function isStudentInAssignment(student, assignment) {
  if (assignment.classId != null && student.classId != null) {
    return String(student.classId) === String(assignment.classId);
  }
  return (
    student.branch === assignment.branch &&
    Number(student.semester) === Number(assignment.semester) &&
    student.section === assignment.section
  );
}

export default function TeacherReports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('classOverview');
  const [selectedAssignmentKey, setSelectedAssignmentKey] = useState('');
  const [preselectedStudentId, setPreselectedStudentId] = useState('');
  const cachedAssignments = useMemo(() => getCachedMyAssignments(), []);
  const cachedAssessments = useMemo(() => getCachedMyAssessments(), []);
  const [apiAssignments, setApiAssignments] = useState(
    cachedAssignments.length > 0 ? cachedAssignments : null
  ); // null = not yet fetched
  const [apiAssessments, setApiAssessments] = useState(cachedAssessments);
  const [apiClassStudents, setApiClassStudents] = useState([]);
  const [apiClassMarks, setApiClassMarks] = useState([]);
  const [apiClassQuestionMarks, setApiClassQuestionMarks] = useState([]);
  const [apiClassDetails, setApiClassDetails] = useState(null);
  // classId -> AcademicClassDTO (branch, semester, section, studentCount, academicYear)
  const [assignmentClassDetailsMap, setAssignmentClassDetailsMap] = useState({});
  const [classDataLoaded, setClassDataLoaded] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(
    !(cachedAssignments.length > 0)
  );
  const [loadingClassData, setLoadingClassData] = useState(false);

  // Snapshot local store values with stable references to avoid effect churn.
  const allSubjects = useMemo(() => getSubjects(), []);
  const allStudents = useMemo(() => getStudents(), []);
  const allAssessments = useMemo(() => getAssessments(), []);
  const allMarks = useMemo(() => getMarks(), []);
  const allQuestionMarks = useMemo(() => getQuestionMarks(), []);
  const localAssignments = useMemo(
    () => getAssignmentsForTeacher(user?.id || ''),
    [user?.id]
  );

  // Fetch assignments from real API, fall back to local store
  useEffect(() => {
    let cancelled = false;
    const hasWarmStartData = cachedAssignments.length > 0 || localAssignments.length > 0;
    if (!hasWarmStartData) setLoadingAssignments(true);
    Promise.allSettled([getMyAssignments(), getMyAssessments()])
      .then(([assignmentsRes, assessmentsRes]) => {
        if (cancelled) return;

        if (assignmentsRes.status === 'fulfilled') {
          setApiAssignments(assignmentsRes.value);
        } else {
          setApiAssignments(null); // signal fallback
        }

        if (assessmentsRes.status === 'fulfilled') {
          setApiAssessments(Array.isArray(assessmentsRes.value) ? assessmentsRes.value : []);
        } else {
          setApiAssessments([]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApiAssignments(null);
          setApiAssessments([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAssignments(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Use API data if available, otherwise array will naturally be empty
  const rawAssignments = useMemo(() => {
    if (apiAssignments && apiAssignments.length > 0) return apiAssignments;
    return localAssignments;
  }, [apiAssignments, localAssignments]);

  // Fetch class details for each unique classId in rawAssignments
  useEffect(() => {
    if (!rawAssignments.length) return;
    const uniqueClassIds = [...new Set(rawAssignments.map(a => a.classId).filter(Boolean))];
    if (!uniqueClassIds.length) return;
    let cancelled = false;
    Promise.allSettled(uniqueClassIds.map(id => getClassById(id)))
      .then(results => {
        if (cancelled) return;
        const map = {};
        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value) {
            map[String(uniqueClassIds[i])] = r.value;
          }
        });
        setAssignmentClassDetailsMap(map);
      });
    return () => { cancelled = true; };
  }, [rawAssignments]); // eslint-disable-line react-hooks/exhaustive-deps

  const assignedSubjects = useMemo(() => {
    const seen = new Set();
    return rawAssignments.reduce((acc, a) => {
      const key = assignmentKey(a);
      if (seen.has(key)) return acc;
      seen.add(key);

      const s = allSubjects.find((sub) => sub.id === a.subjectId);
      // Enrich branch/semester/section from API class details when assignment has nulls
      const cd = assignmentClassDetailsMap[String(a.classId ?? '')] ?? {};
      const classSubject = Array.isArray(cd.subjects)
        ? cd.subjects.find(
          (subject) =>
            String(subject?.id ?? subject?.subjectId ?? subject ?? '') === String(a.subjectId)
        )
        : null;
      acc.push({
        ...a,
        branch: cd.branch ?? a.branch ?? '',
        semester: cd.semester ?? a.semester ?? '',
        section: cd.section ?? a.section ?? '',
        academicYear: cd.academicYear ?? a.academicYear ?? a.academic_year ?? '',
        studentCount: cd.studentCount ?? null,
        key,
        subjectName:
          s?.subjectName ||
          s?.name ||
          classSubject?.subjectName ||
          classSubject?.subject_name ||
          classSubject?.name ||
          (typeof classSubject === 'string' ? classSubject : '') ||
          a?.subjectName ||
          a?.subject_name ||
          a?.subject?.subjectName ||
          a?.subject?.subject_name ||
          a?.subject?.name ||
          '',
        subjectCode:
          s?.subjectCode ||
          s?.code ||
          classSubject?.subjectCode ||
          classSubject?.subject_code ||
          classSubject?.code ||
          a?.subjectCode ||
          a?.subject_code ||
          a?.subject?.subjectCode ||
          a?.subject?.subject_code ||
          a?.subject?.code ||
          '',
      });
      return acc;
    }, []);
  }, [rawAssignments, allSubjects, assignmentClassDetailsMap]);

  useEffect(() => {
    if (!assignedSubjects.length) {
      setSelectedAssignmentKey('');
      return;
    }

    const exists = assignedSubjects.some((item) => item.key === selectedAssignmentKey);
    if (!selectedAssignmentKey || !exists) {
      setSelectedAssignmentKey(assignedSubjects[0].key);
    }
  }, [assignedSubjects, selectedAssignmentKey]);

  const currentAssignment = useMemo(() => {
    return assignedSubjects.find((a) => a.key === selectedAssignmentKey) || null;
  }, [selectedAssignmentKey, assignedSubjects]);

  const selectedSubject = currentAssignment?.subjectId ? String(currentAssignment.subjectId) : '';
  const currentAssignmentKey = currentAssignment?.key || '';
  const currentAssignmentClassId = currentAssignment?.classId ?? null;

  const handleOpenStudentReport = (studentId) => {
    if (studentId == null) return;
    setPreselectedStudentId(String(studentId));
    setActiveTab('student');
  };

  useEffect(() => {
    setPreselectedStudentId('');
  }, [currentAssignmentKey]);

  useEffect(() => {
    let cancelled = false;

    const loadClassScopedData = async () => {
      if (!currentAssignment) {
        setClassDataLoaded(false);
        setApiClassDetails(null);
        setApiClassStudents([]);
        setApiClassMarks([]);
        setApiClassQuestionMarks([]);
        return;
      }

      if (!(apiAssignments && apiAssignments.length > 0)) {
        // Local-only mode: tab components will use local fallback data.
        setClassDataLoaded(false);
        return;
      }

      setLoadingClassData(true);
      setClassDataLoaded(false);

      try {
        let classDetails = null;
        let classStudents = [];
        if (currentAssignmentClassId != null) {
          classDetails = await getClassById(currentAssignmentClassId);
          classStudents = await getStudentsByClass(currentAssignmentClassId);
        } else {
          classStudents = allStudents.filter((student) =>
            isStudentInAssignment(student, currentAssignment)
          );
        }

        const sourceAssessments = apiAssessments.length > 0 ? apiAssessments : allAssessments;
        const matchedAssessments = sourceAssessments.filter((assessment) => {
          if (!isSameAssignmentClass(assessment, currentAssignment)) return false;

          const assessmentType = String(assessment.type || '').toUpperCase().replace(/\s+/g, '');
          const isAttendanceAssessment =
            assessmentType === 'ATTENDANCE' ||
            assessmentType === 'ATTENDENCE' ||
            assessmentType === 'ATT';

          // Attendance can be class-scoped on some payloads (subjectId null/different).
          if (isAttendanceAssessment) return true;

          return String(assessment.subjectId) === String(currentAssignment.subjectId);
        });

        const marksSettled = await Promise.allSettled(
          matchedAssessments.map((assessment) => getMarksByAssessment(assessment.id))
        );
        const classMarks = marksSettled
          .filter((result) => result.status === 'fulfilled')
          .flatMap((result) => result.value);

        const midsemAssessments = new Set(
          matchedAssessments
            .filter((assessment) => String(assessment.type).toUpperCase() === 'MIDSEM')
            .map((assessment) => String(assessment.id))
        );
        const midsemMarkIds = classMarks
          .filter((mark) => midsemAssessments.has(String(mark.assessmentId)))
          .map((mark) => mark.id);

        let qmsSettled = [];
        if (currentAssignmentClassId != null) {
          qmsSettled = await Promise.allSettled(
            Array.from(midsemAssessments).map((assessmentId) =>
              getQuestionMarksByAssessmentAndClass(assessmentId, currentAssignmentClassId)
            )
          );
        } else {
          qmsSettled = await Promise.allSettled(
            midsemMarkIds.map((markId) => getQuestionMarksByMark(markId))
          );
        }
        const classQuestionMarks = qmsSettled
          .filter((result) => result.status === 'fulfilled')
          .flatMap((result) => result.value);

        if (cancelled) return;
        setApiClassDetails(classDetails);
        setApiClassStudents(classStudents);
        setApiClassMarks(classMarks);
        setApiClassQuestionMarks(classQuestionMarks);
        setClassDataLoaded(true);
      } catch {
        if (cancelled) return;
        setApiClassDetails(null);
        setClassDataLoaded(false);
      } finally {
        if (!cancelled) setLoadingClassData(false);
      }
    };

    loadClassScopedData();
    return () => {
      cancelled = true;
    };
  }, [
    currentAssignmentKey,
    currentAssignmentClassId,
    apiAssignments,
    apiAssessments,
    allAssessments,
    allStudents,
  ]);

  const subjectInfo = useMemo(() => {
    if (!selectedSubject) return null;

    const fromMasterSubjects = allSubjects.find(
      (s) => String(s.id ?? s.subjectId ?? '') === String(selectedSubject)
    );
    if (fromMasterSubjects) return fromMasterSubjects;

    const classDetailsFromMap = assignmentClassDetailsMap[String(currentAssignment?.classId ?? '')] ?? {};
    const classSubjectList = Array.isArray(apiClassDetails?.subjects)
      ? apiClassDetails.subjects
      : Array.isArray(classDetailsFromMap?.subjects)
        ? classDetailsFromMap.subjects
        : [];
    const fromClassDetails = classSubjectList.find(
      (s) => String(s?.id ?? s?.subjectId ?? s ?? '') === String(selectedSubject)
    );
    if (fromClassDetails) return fromClassDetails;

    if (currentAssignment) {
      return {
        id: currentAssignment.subjectId,
        subjectName:
          currentAssignment.subjectName ||
          currentAssignment.subject?.subjectName ||
          currentAssignment.subject?.name ||
          null,
        subjectCode:
          currentAssignment.subjectCode ||
          currentAssignment.subject?.subjectCode ||
          currentAssignment.subject?.code ||
          null,
      };
    }

    return null;
  }, [
    selectedSubject,
    allSubjects,
    assignmentClassDetailsMap,
    currentAssignment,
    apiClassDetails,
  ]);

  const currentClassInfo = useMemo(() => {
    const classDetails = apiClassDetails ?? {};
    // Also read from the assignment-level classDetailsMap as a richer fallback
    const cdMap = assignmentClassDetailsMap[String(currentAssignment?.classId ?? '')] ?? {};
    return {
      branch: classDetails.branch ?? cdMap.branch ?? currentAssignment?.branch ?? '',
      semester: classDetails.semester ?? cdMap.semester ?? currentAssignment?.semester ?? '',
      section: classDetails.section ?? cdMap.section ?? currentAssignment?.section ?? '',
      academicYear: classDetails.academicYear ?? cdMap.academicYear ?? currentAssignment?.academicYear ?? currentAssignment?.academic_year ?? '',
      studentCount: Number(classDetails.studentCount ?? cdMap.studentCount ?? apiClassStudents.length ?? 0),
      subjects: Array.isArray(classDetails.subjects) ? classDetails.subjects : [],
    };
  }, [apiClassDetails, assignmentClassDetailsMap, currentAssignment, apiClassStudents.length]);

  const relevantStudents = useMemo(() => {
    if (!currentAssignment) return [];
    if (classDataLoaded) return apiClassStudents;
    return allStudents.filter((student) => isStudentInAssignment(student, currentAssignment));
  }, [currentAssignment, allStudents, classDataLoaded, apiClassStudents]);

  const reportData = useMemo(() => {
    const sourceAssessments = apiAssessments.length > 0 ? apiAssessments : allAssessments;
    return {
      students: classDataLoaded ? apiClassStudents : allStudents,
      subjects: allSubjects,
      assessments: sourceAssessments,
      marks: classDataLoaded ? apiClassMarks : allMarks,
      questionMarks: classDataLoaded ? apiClassQuestionMarks : allQuestionMarks,
      assignments: rawAssignments,
    };
  }, [
    classDataLoaded,
    apiClassStudents,
    allStudents,
    allSubjects,
    apiAssessments,
    allAssessments,
    apiClassMarks,
    allMarks,
    apiClassQuestionMarks,
    allQuestionMarks,
    rawAssignments,
  ]);

  if (loadingAssignments) {
    return (
      <DashboardLayout navItems={teacherNavItems}>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Gathering report data...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={teacherNavItems}>
      <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500 shadow-md">
              <FileBarChart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold tracking-tight text-sky-700">
                Performance Reports
              </h1>
              <p className="text-sm text-violet-600">
                Deep insights into your classes' academic standing
              </p>
            </div>
          </div>

          {/* Global Subject Selector */}
          <div className="w-full md:w-64">
            <Select value={selectedAssignmentKey} onValueChange={setSelectedAssignmentKey}>
              <SelectTrigger className="w-full rounded-xl h-10 bg-white border-sky-200">
                <div className="flex items-center gap-2">
                  {loadingAssignments || loadingClassData
                    ? <Loader2 className="h-4 w-4 text-sky-600 animate-spin" />
                    : <BookOpen className="h-4 w-4 text-sky-600" />}
                  <SelectValue placeholder="Select Class/Subject" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {assignedSubjects.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    <div className="flex flex-col text-left">
                      <span className="font-medium text-sm">{s.subjectCode} - {s.subjectName}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {s.branch || '—'} &bull; Sem {s.semester || '—'} &bull; Sec {s.section || '—'}
                        {s.studentCount != null ? ` • ${s.studentCount} stu.` : ''}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-fuchsia-500/10 p-1 rounded-xl">
            <TabsTrigger value="classOverview" className="rounded-lg text-xs font-semibold text-fuchsia-700 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              📊 Class Overview
            </TabsTrigger>
            <TabsTrigger value="student" className="rounded-lg text-xs font-semibold text-fuchsia-700 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              👤 Student Report
            </TabsTrigger>
            <TabsTrigger value="deepdive" className="rounded-lg text-xs font-semibold text-fuchsia-700 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              🔍 Assessment Deep Dive
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classOverview" className="mt-6">
            {selectedSubject ? (
              <div className="space-y-8">
                <TeacherClassTab
                  reportData={reportData}
                  selectedSubject={selectedSubject}
                  subjectName={currentAssignment?.subjectName}
                  subjectCode={currentAssignment?.subjectCode}
                  relevantStudents={relevantStudents}
                  branch={currentClassInfo.branch}
                  semester={currentClassInfo.semester}
                  section={currentClassInfo.section}
                  studentCount={currentClassInfo.studentCount || null}
                  academicYear={currentClassInfo.academicYear}
                  onOpenStudentReport={handleOpenStudentReport}
                />
              </div>
            ) : (
              <div className="text-center py-24 text-muted-foreground"><BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />Select a Class/Subject above to view reports.</div>
            )}
          </TabsContent>

          <TabsContent value="student" className="mt-6">
            {selectedSubject ? (
              <TeacherStudentTab
                reportData={reportData}
                selectedSubject={selectedSubject}
                subjectName={currentAssignment?.subjectName}
                subjectCode={currentAssignment?.subjectCode}
                relevantStudents={relevantStudents}
                branch={currentClassInfo.branch}
                semester={currentClassInfo.semester}
                section={currentClassInfo.section}
                academicYear={currentClassInfo.academicYear}
                preselectedStudentId={preselectedStudentId}
              />
            ) : (
              <div className="text-center py-24 text-muted-foreground"><BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />Select a Class/Subject above to view reports.</div>
            )}
          </TabsContent>

          <TabsContent value="deepdive" className="mt-6">
            {selectedSubject ? (
              <TeacherDeepDiveTab 
                reportData={reportData} 
                selectedSubject={selectedSubject} 
                subjectName={currentAssignment?.subjectName}
                subjectCode={currentAssignment?.subjectCode}
                relevantStudents={relevantStudents} 
              />
            ) : (
              <div className="text-center py-24 text-muted-foreground"><BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />Select a Class/Subject above to view reports.</div>
            )}
          </TabsContent>

        </Tabs>
      </div>
    </DashboardLayout>
  );
}

