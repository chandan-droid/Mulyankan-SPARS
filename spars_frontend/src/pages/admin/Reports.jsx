import { useEffect, useState } from 'react';
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
  getAdminStudents,
  getAdminSubjects,
  getAdminClasses,
  getAdminAssessments,
  getAdminMarks,
  getAdminQuestionMarks,
  getAdminTeachers,
  getAdminTeacherAssignments,
} from '@/lib/adminApi';
import AdminAnalyticsTab from './reports/AdminAnalyticsTab';
import AdminStudentTab from './reports/AdminStudentTab';
import AdminClassTab from './reports/AdminClassTab';
import AdminSubjectTab from './reports/AdminSubjectTab';
import AdminBranchTab from './reports/AdminBranchTab';
import AdminTeacherTab from './reports/AdminTeacherTab';
import AdminImportTab from './reports/AdminImportTab';

export default function AdminReports() {
  const [loadingData, setLoadingData] = useState(true);
  const [reportData, setReportData] = useState(() => ({
    students: getStudents(),
    subjects: getSubjects(),
    classes: getClasses(),
    assessments: getAssessments(),
    marks: getMarks(),
    questionMarks: getQuestionMarks(),
    teachers: getTeachers(),
    assignments: getTeacherAssignments(),
  }));

  useEffect(() => {
    let cancelled = false;

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
          questionMarksRes,
          teachersRes,
          assignmentsRes,
        ] = await Promise.allSettled([
          getAdminStudents(),
          getAdminSubjects(),
          getAdminClasses(),
          getAdminAssessments(),
          getAdminMarks(),
          getAdminQuestionMarks(),
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

        const questionMarks =
          questionMarksRes.status === 'fulfilled' && Array.isArray(questionMarksRes.value)
            ? questionMarksRes.value.map((item) => ({
                ...item,
                obtainedMarks: item.obtainedMarks ?? item.marksObtained ?? 0,
              }))
            : localData.questionMarks;

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
  }, []);

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

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="bg-muted/50 border border-border/50 p-1 rounded-xl flex flex-wrap h-auto gap-1">
          <TabsTrigger value="analytics" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            📊 Analytics
          </TabsTrigger>
          <TabsTrigger value="student" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            👤 Student-wise
          </TabsTrigger>
          <TabsTrigger value="class" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            🏫 Class-wise
          </TabsTrigger>
          <TabsTrigger value="subject" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            📚 Subject-wise
          </TabsTrigger>
          <TabsTrigger value="branch" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            🌿 Branch View
          </TabsTrigger>
          <TabsTrigger value="teacher" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            👨‍🏫 Teacher View
          </TabsTrigger>
          <TabsTrigger value="import" className="rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            📂 Import Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="animate-fade-in-up mt-6">
          <AdminAnalyticsTab reportData={reportData} />
        </TabsContent>

        <TabsContent value="student" className="animate-fade-in-up mt-6">
          <AdminStudentTab reportData={reportData} />
        </TabsContent>

        <TabsContent value="class" className="animate-fade-in-up mt-6">
          <AdminClassTab reportData={reportData} />
        </TabsContent>

        <TabsContent value="subject" className="animate-fade-in-up mt-6">
          <AdminSubjectTab reportData={reportData} />
        </TabsContent>

        <TabsContent value="branch" className="animate-fade-in-up mt-6">
          <AdminBranchTab reportData={reportData} />
        </TabsContent>

        <TabsContent value="teacher" className="animate-fade-in-up mt-6">
          <AdminTeacherTab reportData={reportData} />
        </TabsContent>

        <TabsContent value="import" className="animate-fade-in-up mt-6">
          <AdminImportTab />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
