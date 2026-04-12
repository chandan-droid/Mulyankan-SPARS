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
  getStudentsByClass,
  getMarksByAssessment,
  getQuestionMarksByMark,
} from '@/lib/teacherApi';
import { useAuth } from '@/contexts/AuthContext';

import TeacherClassTab from './reports/TeacherClassTab';
import TeacherStudentTab from './reports/TeacherStudentTab';
import TeacherCOTab from './reports/TeacherCOTab';
import TeacherDeepDiveTab from './reports/TeacherDeepDiveTab';
import TeacherImportTab from './reports/TeacherImportTab';

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
  const [selectedAssignmentKey, setSelectedAssignmentKey] = useState('');
  const [apiAssignments, setApiAssignments] = useState(null); // null = not yet fetched
  const [apiAssessments, setApiAssessments] = useState([]);
  const [apiClassStudents, setApiClassStudents] = useState([]);
  const [apiClassMarks, setApiClassMarks] = useState([]);
  const [apiClassQuestionMarks, setApiClassQuestionMarks] = useState([]);
  const [classDataLoaded, setClassDataLoaded] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingClassData, setLoadingClassData] = useState(false);

  const allSubjects = getSubjects();
  const allStudents = getStudents();
  const allAssessments = getAssessments();
  const allMarks = getMarks();
  const allQuestionMarks = getQuestionMarks();
  const localAssignments = getAssignmentsForTeacher(user?.id || '');

  // Fetch assignments from real API, fall back to local store
  useEffect(() => {
    let cancelled = false;
    setLoadingAssignments(true);
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

  const assignedSubjects = useMemo(() => {
    const seen = new Set();
    return rawAssignments.reduce((acc, a) => {
      const key = assignmentKey(a);
      if (seen.has(key)) return acc;
      seen.add(key);

      const s = allSubjects.find((sub) => sub.id === a.subjectId);
      acc.push({
        ...a,
        key,
        subjectName: s?.subjectName || '',
        subjectCode: s?.subjectCode || '',
      });
      return acc;
    }, []);
  }, [rawAssignments, allSubjects]);

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

  useEffect(() => {
    let cancelled = false;

    const loadClassScopedData = async () => {
      if (!currentAssignment) {
        setClassDataLoaded(false);
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
        let classStudents = [];
        if (currentAssignment.classId != null) {
          classStudents = await getStudentsByClass(currentAssignment.classId);
        } else {
          classStudents = allStudents.filter((student) =>
            isStudentInAssignment(student, currentAssignment)
          );
        }

        const sourceAssessments = apiAssessments.length > 0 ? apiAssessments : allAssessments;
        const matchedAssessments = sourceAssessments.filter((assessment) => {
          if (String(assessment.subjectId) !== String(currentAssignment.subjectId)) return false;
          return isSameAssignmentClass(assessment, currentAssignment);
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

        const qmsSettled = await Promise.allSettled(
          midsemMarkIds.map((markId) => getQuestionMarksByMark(markId))
        );
        const classQuestionMarks = qmsSettled
          .filter((result) => result.status === 'fulfilled')
          .flatMap((result) => result.value);

        if (cancelled) return;
        setApiClassStudents(classStudents);
        setApiClassMarks(classMarks);
        setApiClassQuestionMarks(classQuestionMarks);
        setClassDataLoaded(true);
      } catch {
        if (cancelled) return;
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
    currentAssignment,
    apiAssignments,
    apiAssessments,
    allAssessments,
    allStudents,
  ]);

  const subjectInfo = useMemo(() => {
    return allSubjects.find((s) => String(s.id) === String(selectedSubject));
  }, [selectedSubject, allSubjects]);

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

  return (
    <DashboardLayout navItems={teacherNavItems}>
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl stat-gradient-teal shadow-md">
            <FileBarChart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold tracking-tight text-foreground">
              Performance Reports
            </h1>
            <p className="text-sm text-muted-foreground">
              Deep insights into your classes' academic standing
            </p>
          </div>
        </div>
        
        {/* Global Subject Selector */}
        <div className="w-full md:w-64">
           <Select value={selectedAssignmentKey} onValueChange={setSelectedAssignmentKey}>
             <SelectTrigger className="w-full rounded-xl h-10 bg-card border-border/60">
               <div className="flex items-center gap-2">
                 {loadingAssignments || loadingClassData
                   ? <Loader2 className="h-4 w-4 text-primary animate-spin" />
                   : <BookOpen className="h-4 w-4 text-primary" />}
                 <SelectValue placeholder="Select Class/Subject" />
               </div>
             </SelectTrigger>
             <SelectContent>
               {assignedSubjects.map((s) => (
                 <SelectItem key={s.key} value={s.key}>
                   <div className="flex flex-col text-left">
                     <span className="font-medium text-sm">{s.subjectCode} - {s.subjectName}</span>
                     <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.branch} • Sem {s.semester} • Sec {s.section}</span>
                   </div>
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
        </div>
      </div>

      <Tabs defaultValue="classOverview" className="space-y-6">
        <TabsList className="bg-muted/50 border border-border/50 p-1 rounded-xl flex flex-wrap h-auto gap-1">
          <TabsTrigger value="classOverview" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            🏫 Class Overview
          </TabsTrigger>
          <TabsTrigger value="student" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            👤 Student Report
          </TabsTrigger>
          <TabsTrigger value="co" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            🎯 CO Analysis
          </TabsTrigger>
          <TabsTrigger value="deepdive" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            🔍 Assessment Deep Dive
          </TabsTrigger>
          <TabsTrigger value="import" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            📂 Import Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classOverview" className="mt-6">
           {selectedSubject ? (
             <TeacherClassTab
               reportData={reportData}
               selectedSubject={selectedSubject}
               relevantStudents={relevantStudents}
               branch={currentAssignment?.branch}
               semester={currentAssignment?.semester}
               section={currentAssignment?.section}
             />
           ) : (
             <div className="text-center py-24 text-muted-foreground"><BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />Select a Class/Subject above to view reports.</div>
           )}
        </TabsContent>

        <TabsContent value="student" className="mt-6">
           {selectedSubject ? (
             <TeacherStudentTab
               reportData={reportData}
               selectedSubject={selectedSubject}
               relevantStudents={relevantStudents}
               subjectInfo={subjectInfo}
             />
           ) : (
             <div className="text-center py-24 text-muted-foreground"><BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />Select a Class/Subject above to view reports.</div>
           )}
        </TabsContent>

        <TabsContent value="co" className="mt-6">
           {selectedSubject ? (
             <TeacherCOTab
               reportData={reportData}
               selectedSubject={selectedSubject}
               relevantStudents={relevantStudents}
               branch={currentAssignment?.branch}
               semester={currentAssignment?.semester}
               section={currentAssignment?.section}
               classId={currentAssignment?.classId}
             />
           ) : (
             <div className="text-center py-24 text-muted-foreground"><BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />Select a Class/Subject above to view reports.</div>
           )}
        </TabsContent>
        
        <TabsContent value="deepdive" className="mt-6">
           {selectedSubject ? (
             <TeacherDeepDiveTab reportData={reportData} selectedSubject={selectedSubject} relevantStudents={relevantStudents} />
           ) : (
             <div className="text-center py-24 text-muted-foreground"><BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />Select a Class/Subject above to view reports.</div>
           )}
        </TabsContent>

        <TabsContent value="import" className="mt-6">
           <TeacherImportTab selectedSubject={selectedSubject} reportData={reportData} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

