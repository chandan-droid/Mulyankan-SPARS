import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LayoutDashboard, Users, BookOpen, UserCog, ClipboardList,
  BarChart2, Blocks, Activity, Award, ArrowUpRight,
  TrendingUp, ShieldCheck, Settings, Loader2, Target,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import {
  getStudents, getSubjects, getTeachers, getAssessments,
  getClasses, getTeacherAssignments, getMarks,
} from '@/data/store';
import {
  getCachedAdminAssessments,
  getCachedAdminClasses,
  getCachedAdminMarks,
  getCachedAdminStudents,
  getCachedAdminSubjects,
  getCachedAdminTeacherAssignments,
  getCachedAdminTeachers,
  getAdminStudents,
  getAdminSubjects,
  getAdminTeachers,
  getAdminAssessments,
  getAdminClasses,
  getAdminTeacherAssignments,
  getAdminMarks,
  getAdminInstituteCoAttainment,
  getAdminClassCoAttainment,
  getAdminStudentCoAttainment,
} from '@/lib/adminApi';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Users,          label: 'Students',   path: '/admin/students' },
  { icon: Blocks,         label: 'Classes',     path: '/admin/classes' },
  { icon: BookOpen,       label: 'Subjects',    path: '/admin/subjects' },
  { icon: UserCog,        label: 'Teachers',    path: '/admin/teachers' },
  { icon: ClipboardList,  label: 'Assessments', path: '/admin/assessments' },
  { icon: BarChart2,      label: 'Reports',     path: '/admin/reports' },
  { icon: Settings,       label: 'Settings',    path: '/admin/settings' },
];
export { navItems as adminNavItems };

/* ── helpers ─────────────────────────────────────────────────────────────── */
const PALETTE = ['hsl(var(--primary))', 'hsl(195 85% 48%)', 'hsl(168 60% 48%)'];

const TOOLTIP_STYLE = {
  borderRadius: '10px',
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--background))',
  fontSize: 12,
};

function formatClassFull(item) {
  if (!item) return 'Class details unavailable';
  const academicYear = item.academicYear ?? item.academic_year;
  const base = `${item.branch || 'Branch N/A'} • Semester ${item.semester ?? 'N/A'} • Section ${item.section || 'N/A'}`;
  return academicYear ? `${base} • ${academicYear}` : base;
}

/* ── small reusable atoms ──────────────────────────────────────────────────  */
function StatCard({ label, value, helper, tone, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border border-border/50 bg-card/70 p-4 text-left shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full ${tone} opacity-[0.08] blur-2xl transition-opacity duration-500 group-hover:opacity-[0.16]`} />
      <div className="relative z-10 flex items-start justify-between gap-2 mb-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone} shadow-md`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        {onClick && (
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-all group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        )}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-0.5">{label}</p>
        <p className="text-2xl font-heading font-bold tracking-tight text-foreground">{value}</p>
        {helper && <p className="mt-1 text-[11px] text-muted-foreground">{helper}</p>}
      </div>
    </button>
  );
}

/* ── main component ───────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const navigate = useNavigate();

  const warmDashboardData = useMemo(() => {
    const localData = {
      students: getStudents(),
      subjects: getSubjects(),
      teachers: getTeachers(),
      assessments: getAssessments(),
      classes: getClasses(),
      assignments: getTeacherAssignments(),
      marks: getMarks(),
    };

    const cachedData = {
      students: getCachedAdminStudents(),
      subjects: getCachedAdminSubjects(),
      teachers: getCachedAdminTeachers(),
      assessments: getCachedAdminAssessments(),
      classes: getCachedAdminClasses(),
      assignments: getCachedAdminTeacherAssignments(),
      marks: getCachedAdminMarks(),
    };

    return {
      students: cachedData.students.length > 0 ? cachedData.students : localData.students,
      subjects: cachedData.subjects.length > 0 ? cachedData.subjects : localData.subjects,
      teachers: cachedData.teachers.length > 0 ? cachedData.teachers : localData.teachers,
      assessments:
        cachedData.assessments.length > 0 ? cachedData.assessments : localData.assessments,
      classes: cachedData.classes.length > 0 ? cachedData.classes : localData.classes,
      assignments:
        cachedData.assignments.length > 0 ? cachedData.assignments : localData.assignments,
      marks: cachedData.marks.length > 0 ? cachedData.marks : localData.marks,
    };
  }, []);

  const [loadingLiveData, setLoadingLiveData] = useState(
    !Object.values(warmDashboardData).some((arr) => Array.isArray(arr) && arr.length > 0)
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState('ALL');
  const [coData, setCoData] = useState([]);
  const [loadingCo, setLoadingCo] = useState(false);

  const [dashboardData, setDashboardData] = useState(warmDashboardData);

  useEffect(() => {
    let cancelled = false;
    const hasWarmStartData = Object.values(warmDashboardData).some(
      (arr) => Array.isArray(arr) && arr.length > 0
    );
    if (!hasWarmStartData) setLoadingLiveData(true);

    const loadDashboardData = async () => {
      const localData = {
        students: getStudents(),
        subjects: getSubjects(),
        teachers: getTeachers(),
        assessments: getAssessments(),
        classes: getClasses(),
        assignments: getTeacherAssignments(),
        marks: getMarks(),
      };

      try {
        const [
          studentsRes,
          subjectsRes,
          teachersRes,
          assessmentsRes,
          classesRes,
          assignmentsRes,
          marksRes,
        ] = await Promise.allSettled([
          getAdminStudents(),
          getAdminSubjects(),
          getAdminTeachers(),
          getAdminAssessments(),
          getAdminClasses(),
          getAdminTeacherAssignments(),
          getAdminMarks(),
        ]);

        if (cancelled) return;

        const classes =
          classesRes.status === 'fulfilled' && Array.isArray(classesRes.value)
            ? classesRes.value
            : localData.classes;
        const classMap = new Map(classes.map((item) => [String(item.id), item]));

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
            year: student.year ?? cls?.academic_year ?? '',
          };
        });

        const subjects =
          subjectsRes.status === 'fulfilled' && Array.isArray(subjectsRes.value)
            ? subjectsRes.value
            : localData.subjects;

        const teachers =
          teachersRes.status === 'fulfilled' && Array.isArray(teachersRes.value)
            ? teachersRes.value
            : localData.teachers;

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
          };
        });
        const assessmentMap = new Map(assessments.map((item) => [String(item.id), item]));

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
          };
        });

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
            assessmentType: mark.assessmentType ?? linkedAssessment?.type ?? null,
          };
        });

        setDashboardData({
          students,
          subjects,
          teachers,
          assessments,
          classes,
          assignments,
          marks,
        });
      } catch {
        if (!cancelled) {
          setDashboardData(localData);
        }
      } finally {
        if (!cancelled) setLoadingLiveData(false);
      }
    };

    loadDashboardData();
    return () => {
      cancelled = true;
    };
  }, [warmDashboardData]);

  useEffect(() => {
    if (!selectedSubjectId && dashboardData.subjects.length > 0) {
      setSelectedSubjectId(String(dashboardData.subjects[0].id));
    }
  }, [dashboardData.subjects, selectedSubjectId]);

  useEffect(() => {
    if (!selectedSubjectId) return;
    let cancel = false;
    setLoadingCo(true);
    
    Promise.all([
      getAdminInstituteCoAttainment(selectedSubjectId),
      selectedClassId && selectedClassId !== 'ALL' ? getAdminClassCoAttainment(selectedClassId, selectedSubjectId) : Promise.resolve({ coAttainments: [] }),
      selectedStudentId && selectedStudentId !== 'ALL' ? getAdminStudentCoAttainment(selectedStudentId, selectedSubjectId) : Promise.resolve({ coAttainments: [] })
    ]).then(([resInst, resClass, resStu]) => {
      if (cancel) return;
      const fInst = resInst?.coAttainments || [];
      const fClass = resClass?.coAttainments || [];
      const fStudent = resStu?.coAttainments || [];

      const allCos = new Set([...fInst, ...fClass, ...fStudent].map(x => x.coNumber));

      const formatted = Array.from(allCos).sort((a,b)=>a-b).map(co => ({
          name: `CO${co}`,
          Institute: fInst.find(x => x.coNumber === co)?.attainmentLevel || 0,
          Class: fClass.find(x => x.coNumber === co)?.attainmentLevel || 0,
          Student: fStudent.find(x => x.coNumber === co)?.attainmentLevel || 0,
      }));
      setCoData(formatted);
    })
    .catch(() => {
      if (!cancel) setCoData([]);
    })
    .finally(() => {
      if (!cancel) setLoadingCo(false);
    });
    return () => { cancel = true; };
  }, [selectedSubjectId, selectedClassId, selectedStudentId]);

  const availableClasses = dashboardData.classes.filter(c => 
    dashboardData.assignments.some(a => String(a.subjectId) === selectedSubjectId && String(a.classId) === String(c.id))
  );

  const availableStudents = dashboardData.students.filter(s => {
    if (selectedClassId === 'ALL') return true;
    const c = dashboardData.classes.find(cls => String(cls.id) === selectedClassId);
    if (!c) return true;
    return s.branch === c.branch && s.semester === c.semester && s.section === c.section;
  });

  const students = dashboardData.students;
  const subjects = dashboardData.subjects;
  const teachers = dashboardData.teachers;
  const assessments = dashboardData.assessments;
  const classes = dashboardData.classes;
  const assignments = dashboardData.assignments;
  const marks = dashboardData.marks;

  const totalStudents    = students.length;
  const totalSubjects    = subjects.length;
  const totalTeachers    = teachers.length;
  const totalAssessments = assessments.length;
  const totalClasses     = classes.length;
  const avgClassSize     = totalClasses > 0 ? Math.round(totalStudents / totalClasses) : 0;

  /* chart data */
  const branchData = Object.entries(
    students.reduce((acc, s) => { const b = s.branch || 'N/A'; acc[b] = (acc[b] || 0) + 1; return acc; }, {})
  ).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const semData = Object.entries(
    students.reduce((acc, s) => { const k = `Sem ${s.semester || '?'}`; acc[k] = (acc[k] || 0) + 1; return acc; }, {})
  ).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));

  /* assignments metric */
  const assignedTeachers = new Set(assignments.map(a => a.teacherId).filter(Boolean)).size;

  /* recent roster */
  const classRoster = classes.map(c => ({
    ...c,
    studentCount: students.filter(s =>
      s.branch === c.branch &&
      Number(s.semester) === Number(c.semester) &&
      s.section === c.section &&
      (!c.academic_year || String(s.year ?? '') === String(c.academic_year))
    ).length,
  }));
  const maxRoster = classRoster.reduce((m, c) => Math.max(m, c.studentCount), 0);

  const recentStudents = [...students].slice(-5).reverse();

  const stats = [
    { label: 'Students',    value: totalStudents,    helper: `${branchData.length} branches`, tone: 'stat-gradient-blue',  icon: Users,        path: '/admin/students' },
    { label: 'Subjects',    value: totalSubjects,    helper: 'In catalogue',                  tone: 'stat-gradient-teal',  icon: BookOpen,     path: '/admin/subjects' },
    { label: 'Teachers',    value: totalTeachers,    helper: `${assignedTeachers} assigned`,  tone: 'stat-gradient-amber', icon: UserCog,      path: '/admin/teachers' },
    { label: 'Assessments', value: totalAssessments, helper: 'Configured',                   tone: 'stat-gradient-rose',  icon: ClipboardList,path: '/admin/assessments' },
    { label: 'Classes',     value: totalClasses,     helper: 'Active records',                tone: 'stat-gradient-teal',  icon: Blocks,       path: '/admin/classes' },
    { label: 'Avg. Size',   value: avgClassSize,     helper: maxRoster ? `Max ${maxRoster}` : 'No data', tone: 'stat-gradient-blue', icon: Award, path: null },
  ];

  return (
    <DashboardLayout navItems={navItems}>
      <div className="space-y-6">
        {/* ── Page Header ───────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">Admin</p>
            <h1 className="text-2xl font-heading font-bold tracking-tight text-foreground">Dashboard</h1>
          </div>
          {loadingLiveData && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-card/70 px-3 py-2 text-xs font-semibold text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Syncing live data
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/admin/reports')}
              className="btn-gradient inline-flex h-9 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold text-white shadow-lg"
            >
              <BarChart2 className="h-4 w-4" /> Reports
            </button>
            <button
              onClick={() => navigate('/admin/students')}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-card/70 px-4 text-[13px] font-semibold text-foreground backdrop-blur-sm transition hover:bg-card"
            >
              <Users className="h-4 w-4" /> Students
            </button>
          </div>
        </div>

        {/* ── Stat Cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {stats.map((s, i) => (
            <StatCard
              key={s.label}
              {...s}
              onClick={s.path ? () => navigate(s.path) : undefined}
            />
          ))}
        </div>

        {/* ── Charts Row ───────────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Branch chart */}
          <div className="rounded-2xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-heading font-semibold text-foreground">Students by Branch</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Enrollment distribution</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg stat-gradient-blue shadow">
                <Users className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <div className="h-[200px]">
              {branchData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.35)' }} contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={28}>
                      {branchData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No data yet</div>
              )}
            </div>
          </div>

          {/* Semester chart */}
          <div className="rounded-2xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-heading font-semibold text-foreground">Students by Semester</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Cohort distribution</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg stat-gradient-teal shadow">
                <Activity className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <div className="h-[200px]">
              {semData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={semData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.35)' }} contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={28}>
                      {semData.map((_, i) => <Cell key={i} fill={PALETTE[(i + 1) % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No data yet</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom Row ───────────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Recent students table */}
          <div className="rounded-2xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-heading font-semibold text-foreground">Recent Registrations</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Last 5 students added</p>
              </div>
              <button
                onClick={() => navigate('/admin/students')}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                View all →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-left">
                    {['Student', 'Branch', 'Semester', 'Reg. No.'].map(h => (
                      <th key={h} className="pb-2.5 pr-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentStudents.length > 0 ? recentStudents.map(s => (
                    <tr key={s.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-foreground">{s.name}</p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{s.branch || '—'}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{s.semester ?? '—'}</td>
                      <td className="py-2.5 font-mono text-muted-foreground">{s.regNo || '—'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No registrations yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top class rosters */}
          <div className="rounded-2xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg stat-gradient-amber shadow">
                <Blocks className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-heading font-semibold text-foreground">Top Classes</p>
                <p className="text-[11px] text-muted-foreground">Largest by enrolment</p>
              </div>
            </div>
            <div className="space-y-3">
              {classRoster.length > 0 ? (
                [...classRoster]
                  .sort((a, b) => b.studentCount - a.studentCount)
                  .slice(0, 4)
                  .map(c => {
                    const key = `${c.branch}-${c.semester}-${c.section}`;
                    const ratio = maxRoster > 0 ? Math.round((c.studentCount / maxRoster) * 100) : 0;
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-foreground truncate">
                            {formatClassFull(c)}
                          </p>
                          <span className="text-[11px] font-bold text-foreground shrink-0">{c.studentCount}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                          <div className="h-full rounded-full stat-gradient-teal transition-all duration-700" style={{ width: `${ratio}%` }} />
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-xs text-muted-foreground">No class data yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── CO Attainment Row ───────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm shadow-sm mt-6">
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg stat-gradient-blue shadow">
                <Target className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-heading font-semibold text-foreground">CO Attainment Radar</p>
                <p className="text-[11px] text-muted-foreground">Institute, Class, Student Views</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger className="w-32 h-9 text-xs rounded-xl bg-background/50">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.subjectName || `Subject ${s.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="w-32 h-9 text-xs rounded-xl bg-background/50">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classes</SelectItem>
                  {availableClasses.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{formatClassFull(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger className="w-32 h-9 text-xs rounded-xl bg-background/50">
                  <SelectValue placeholder="Student" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Students</SelectItem>
                  {availableStudents.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name} ({s.regNo})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="h-[280px]">
            {loadingCo ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Syncing Attainment...
              </div>
            ) : coData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={coData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 'auto']} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} 
                  />
                  <Radar name="Institute" dataKey="Institute" stroke="hsl(235,65%,55%)" fill="hsl(235,65%,55%)" fillOpacity={0.3} />
                  {selectedClassId !== 'ALL' && <Radar name="Class" dataKey="Class" stroke="hsl(168,60%,48%)" fill="hsl(168,60%,48%)" fillOpacity={0.4} />}
                  {selectedStudentId !== 'ALL' && <Radar name="Student" dataKey="Student" stroke="hsl(35,95%,58%)" fill="hsl(35,95%,58%)" fillOpacity={0.5} />}
                  <Tooltip wrapperStyle={{ borderRadius: '12px' }} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No CO Attainment data for selected subject.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
