import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { adminNavItems } from './Dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileBarChart, Loader2 } from 'lucide-react';
import {
  getStudents,
  getSubjects,
  getClasses,
  getAssessments,
  getMarks,
  getQuestionMarks,
  getTeachers,
  getTeacherAssignments,
} from '@/data/store';
import {
  getCachedAdminAssessments,
  getCachedAdminClasses,
  getCachedAdminMarks,
  getCachedAdminQuestionMarks,
  getCachedAdminStudents,
  getCachedAdminSubjects,
  getCachedAdminTeacherAssignments,
  getCachedAdminTeachers,
  getAdminStudents,
  getAdminSubjects,
  getAdminClasses,
  getAdminAssessments,
  getAdminMarks,
  getAdminQuestionMarks,
  getAdminTeachers,
  getAdminTeacherAssignments,
} from '@/lib/adminApi';
import AdminClassTab from './reports/AdminClassTab';
import AdminStudentTab from './reports/AdminStudentTab';
import AdminSubjectTab from './reports/AdminSubjectTab';
import AdminBranchTab from './reports/AdminBranchTab';

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState('class');
  const [deepLinkStudentId, setDeepLinkStudentId] = useState(null);
  const warmReportData = useMemo(() => {
    const localData = {
      students: getStudents(),
      subjects: getSubjects(),
      classes: getClasses(),
      assessments: getAssessments(),
      marks: getMarks(),
      questionMarks: getQuestionMarks(),
      teachers: getTeachers(),
      assignments: getTeacherAssignments(),
    };

    const cachedData = {
      students: getCachedAdminStudents(),
      subjects: getCachedAdminSubjects(),
      classes: getCachedAdminClasses(),
      assessments: getCachedAdminAssessments(),
      marks: getCachedAdminMarks(),
      questionMarks: getCachedAdminQuestionMarks(),
      teachers: getCachedAdminTeachers(),
      assignments: getCachedAdminTeacherAssignments(),
    };

    return {
      students: cachedData.students.length > 0 ? cachedData.students : localData.students,
      subjects: cachedData.subjects.length > 0 ? cachedData.subjects : localData.subjects,
      classes: cachedData.classes.length > 0 ? cachedData.classes : localData.classes,
      assessments: cachedData.assessments.length > 0 ? cachedData.assessments : localData.assessments,
      marks: cachedData.marks.length > 0 ? cachedData.marks : localData.marks,
      questionMarks:
        cachedData.questionMarks.length > 0 ? cachedData.questionMarks : localData.questionMarks,
      teachers: cachedData.teachers.length > 0 ? cachedData.teachers : localData.teachers,
      assignments:
        cachedData.assignments.length > 0 ? cachedData.assignments : localData.assignments,
    };
  }, []);

  const [loadingData, setLoadingData] = useState(
    !Object.values(warmReportData).some((arr) => Array.isArray(arr) && arr.length > 0)
  );
  const [reportData, setReportData] = useState(warmReportData);

  useEffect(() => {
    let cancelled = false;
    const hasWarmStartData = Object.values(warmReportData).some(
      (arr) => Array.isArray(arr) && arr.length > 0
    );
    if (!hasWarmStartData) setLoadingData(true);

    const loadReportData = async () => {
      const localData = {
        students: getStudents(),
        subjects: getSubjects(),
        classes: getClasses(),
        assessments: getAssessments(),
        marks: getMarks(),
        questionMarks: getQuestionMarks(),
        teachers: getTeachers(),
        assignments: getTeacherAssignments(),
      };

      try {
        const [
          studentsRes,
          subjectsRes,
          classesRes,
          assessmentsRes,
          marksRes,
          teachersRes,
          assignmentsRes,
        ] = await Promise.allSettled([
          getAdminStudents(),
          getAdminSubjects(),
          getAdminClasses(),
          getAdminAssessments(),
          getAdminMarks(),
          getAdminTeachers(),
          getAdminTeacherAssignments(),
        ]);

        if (cancelled) return;

        const classes =
          classesRes.status === 'fulfilled' && Array.isArray(classesRes.value)
            ? classesRes.value
            : localData.classes;
        const classMap = new Map(classes.map((item) => [String(item.id), item]));

        const subjects =
          subjectsRes.status === 'fulfilled' && Array.isArray(subjectsRes.value)
            ? subjectsRes.value
            : localData.subjects;

        const studentsRaw =
          studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value)
            ? studentsRes.value
            : localData.students;
        const students = studentsRaw.map((student) => {
          const cls = classMap.get(String(student.classId));
          return {
            ...student,
            branch: student.branch ?? cls?.branch ?? '',
            semester: Number(student.semester ?? cls?.semester ?? 0),
            section: student.section ?? cls?.section ?? '',
            year: student.year ?? cls?.academic_year ?? student.academic_year ?? '',
          };
        });

        const assessmentsRaw =
          assessmentsRes.status === 'fulfilled' && Array.isArray(assessmentsRes.value)
            ? assessmentsRes.value
            : localData.assessments;
        const assessments = assessmentsRaw.map((assessment) => {
          const cls = classMap.get(String(assessment.classId));
          return {
            ...assessment,
            branch: assessment.branch ?? cls?.branch ?? '',
            semester: Number(assessment.semester ?? cls?.semester ?? 0),
            section: assessment.section ?? cls?.section ?? '',
            academic_year: assessment.academic_year ?? cls?.academic_year ?? '',
          };
        });
        const assessmentMap = new Map(assessments.map((item) => [String(item.id), item]));

        const marksRaw =
          marksRes.status === 'fulfilled' && Array.isArray(marksRes.value)
            ? marksRes.value
            : localData.marks;
        const marks = marksRaw.map((mark) => {
          const linkedAssessment = assessmentMap.get(String(mark.assessmentId));
          const marksValue = mark.totalMarks ?? mark.marksObtained ?? 0;
          return {
            ...mark,
            totalMarks: marksValue,
            marksObtained: marksValue,
            subjectId: mark.subjectId ?? linkedAssessment?.subjectId ?? null,
            assessmentType: mark.assessmentType ?? linkedAssessment?.type ?? null,
          };
        });

        const midsemAssessmentIds = new Set(
          assessments
            .filter((assessment) => String(assessment.type).toUpperCase() === 'MIDSEM')
            .map((assessment) => String(assessment.id))
        );
        const midsemMarkIds = marks
          .filter((mark) => midsemAssessmentIds.has(String(mark.assessmentId)))
          .map((mark) => mark.id)
          .filter(Boolean);

        const questionMarksSettled = await Promise.allSettled(
          midsemMarkIds.map((markId) => getAdminQuestionMarks({ markId }))
        );

        const questionMarks = questionMarksSettled
          .filter((result) => result.status === 'fulfilled' && Array.isArray(result.value))
          .flatMap((result) => result.value)
          .map((item) => ({
            ...item,
            obtainedMarks: item.obtainedMarks ?? item.marksObtained ?? 0,
          }));

        const teachers =
          teachersRes.status === 'fulfilled' && Array.isArray(teachersRes.value)
            ? teachersRes.value
            : localData.teachers;

        const assignmentsRaw =
          assignmentsRes.status === 'fulfilled' && Array.isArray(assignmentsRes.value)
            ? assignmentsRes.value
            : localData.assignments;
        const assignments = assignmentsRaw.map((assignment) => {
          const cls = classMap.get(String(assignment.classId));
          return {
            ...assignment,
            branch: assignment.branch ?? cls?.branch ?? '',
            semester: Number(assignment.semester ?? cls?.semester ?? 0),
            section: assignment.section ?? cls?.section ?? '',
            academic_year: assignment.academic_year ?? cls?.academic_year ?? '',
          };
        });

        setReportData({
          students,
          subjects,
          classes,
          assessments,
          marks,
          questionMarks,
          teachers,
          assignments,
        });
      } catch {
        if (cancelled) return;
        setReportData(localData);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };

    loadReportData();
    return () => {
      cancelled = true;
    };
  }, [warmReportData]);

  return (
    <DashboardLayout navItems={adminNavItems}>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl stat-gradient-blue shadow-md">
            <FileBarChart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold tracking-tight text-foreground">
              Reports & Analytics
            </h1>
            <p className="text-sm text-muted-foreground">
              Multi-perspective performance insights
            </p>
          </div>
        </div>
        {loadingData && (
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/70 px-3 py-2 text-xs font-semibold text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Syncing live report data...
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 border border-border/50 p-1 rounded-xl flex flex-wrap h-auto gap-1">
          <TabsTrigger value="class" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Class Overview
          </TabsTrigger>
          <TabsTrigger value="student" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Student Report
          </TabsTrigger>
          <TabsTrigger value="subject" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Subject-wise
          </TabsTrigger>
          {/* <TabsTrigger value="branch" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Branch View
          </TabsTrigger> */}
        </TabsList>

        <TabsContent value="class" className="animate-fade-in-up mt-6">
          <AdminClassTab reportData={reportData} onNavigateToStudent={(studentId) => {
            setDeepLinkStudentId(String(studentId));
            setActiveTab('student');
          }} />
        </TabsContent>

        <TabsContent value="student" className="animate-fade-in-up mt-6">
          <AdminStudentTab reportData={reportData} deepLinkStudentId={deepLinkStudentId} onDeepLinkConsumed={() => setDeepLinkStudentId(null)} />
        </TabsContent>

        <TabsContent value="subject" className="animate-fade-in-up mt-6">
          <AdminSubjectTab reportData={reportData} />
        </TabsContent>

        <TabsContent value="branch" className="animate-fade-in-up mt-6">
          <AdminBranchTab reportData={reportData} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
