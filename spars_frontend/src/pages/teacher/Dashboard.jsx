import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  LayoutDashboard, PenLine, FileBarChart, BookOpen, ClipboardList,
  TrendingUp, Award, Users, BarChart3, Settings, Target, Zap,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAuth } from '@/contexts/AuthContext';
import {
  getAssignmentsForTeacher, getSubjects, getAssessments, getStudents, getMarks,
} from '@/data/store';
import { Loader2 } from 'lucide-react';
import {
  getMyAssignments, getMyAssessments as fetchMyAssessmentsApi,
  getCachedMyAssignments, getCachedMyAssessments,
  getClassCoAttainment,
  getTeacherPerformanceTrends, getClassById,
  getMarksEntryProgress, getAssignmentsByBranch,
} from '@/lib/teacherApi';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid,
  LineChart, Line, ReferenceLine,
} from 'recharts';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',       path: '/teacher' },
  { icon: PenLine,         label: 'Mark Entry',      path: '/teacher/marks' },
  { icon: FileBarChart,    label: 'Reports',         path: '/teacher/reports' },
  { icon: Settings,        label: 'Settings',        path: '/teacher/settings' },
];
export { navItems as teacherNavItems };

const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--secondary))',
  'hsl(168 60% 48%)', 'hsl(35 95% 58%)', 'hsl(215 90% 56%)',
];
const TOOLTIP_STYLE = {
  borderRadius: '10px',
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--background))',
  fontSize: 12,
};
const ASSESS_TYPES = ['MIDSEM', 'QUIZ', 'ASSIGNMENT', 'ATTENDANCE'];

/* ── atoms ───────────────────────────────────────────────────────────────── */
function Kpi({ icon: Icon, label, value, helper, tone, badge }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/70 p-4 backdrop-blur-sm shadow-sm">
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full ${tone} opacity-[0.08] blur-2xl`} />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone} shadow-md`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          {badge && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-600">
              <TrendingUp className="h-2.5 w-2.5" />{badge}
            </span>
          )}
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-0.5">{label}</p>
        <p className="text-2xl font-heading font-bold tracking-tight text-foreground">{value}</p>
        {helper && <p className="mt-1 text-[11px] text-muted-foreground">{helper}</p>}
      </div>
    </div>
  );
}


/* ── main component ───────────────────────────────────────────────────────── */
export default function TeacherDashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  // Local store (always available as fallback)
  const localAssignments = getAssignmentsForTeacher(user?.id || '');
  const localAssessments = getAssessments();
  const cachedAssignments = getCachedMyAssignments();
  const cachedAssessments = getCachedMyAssessments();

  const subjects  = getSubjects();
  const students  = getStudents();
  const marks     = getMarks();

  // API-fetched state
  const [apiAssignments, setApiAssignments] = useState(
    cachedAssignments.length > 0 ? cachedAssignments : null
  );
  const [apiAssessments, setApiAssessments] = useState(
    cachedAssessments.length > 0 ? cachedAssessments : null
  );
  const hasWarmStartData =
    cachedAssignments.length > 0 ||
    cachedAssessments.length > 0 ||
    localAssignments.length > 0 ||
    localAssessments.length > 0;
  const [isInitializing, setIsInitializing] = useState(!hasWarmStartData);

  const [selectedAssignmentKey, setSelectedAssignmentKey] = useState('');
  const [coData, setCoData] = useState([]);
  const [loadingCo, setLoadingCo] = useState(false);

  // API-fetched analytics chart data
  const [apiMarkProgress, setApiMarkProgress] = useState(null); // MarksEntryProgressSummaryDTO
  const [apiBranchData,   setApiBranchData]   = useState(null); // AssignmentsByBranchDTO[]

  // API-fetched class details (classId -> { id, branch, semester, section, studentCount })
  const [apiClassDetails, setApiClassDetails] = useState({});

  // Analytics state
  const [analyticsTrends,   setAnalyticsTrends]   = useState([]);

  useEffect(() => {
    let cancelled = false;
    if (!hasWarmStartData) setIsInitializing(true);
    
    Promise.allSettled([
      getMyAssignments(),
      fetchMyAssessmentsApi(),
      getMarksEntryProgress(),
      getAssignmentsByBranch(),
    ]).then(([assignmentsRes, assessmentsRes, markProgressRes, branchDataRes]) => {
      if (cancelled) return;
      if (assignmentsRes.status === 'fulfilled' && assignmentsRes.value?.length > 0) {
        setApiAssignments(assignmentsRes.value);
      }
      if (assessmentsRes.status === 'fulfilled' && assessmentsRes.value?.length > 0) {
        setApiAssessments(assessmentsRes.value);
      }
      if (markProgressRes.status === 'fulfilled' && markProgressRes.value) {
        setApiMarkProgress(markProgressRes.value);
      }
      if (branchDataRes.status === 'fulfilled' && branchDataRes.value?.length > 0) {
        setApiBranchData(branchDataRes.value);
      }
      setIsInitializing(false);
    });

    return () => { cancelled = true; };
  }, [hasWarmStartData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Use API data when available, else fall back to local store
  const assignments   = apiAssignments  ?? localAssignments;
  const assessments   = apiAssessments  ?? localAssessments;

  // Fetch student counts for each unique classId once assignments are loaded
  useEffect(() => {
    if (!assignments.length) return;
    const uniqueClassIds = [...new Set(assignments.map(a => a.classId).filter(Boolean))];
    if (!uniqueClassIds.length) return;

    let cancelled = false;
    Promise.allSettled(uniqueClassIds.map(id => getClassById(id)))
      .then(results => {
        if (cancelled) return;
        const map = {};
        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value) {
            map[uniqueClassIds[i]] = r.value;
          }
        });
        setApiClassDetails(map);
      });
    return () => { cancelled = true; };
  }, [assignments]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedAssignmentKey && assignments.length > 0) {
      const first = assignments[0];
      setSelectedAssignmentKey(`${first.classId}|${first.subjectId}`);
    }
  }, [assignments, selectedAssignmentKey]);

  useEffect(() => {
    if (!selectedAssignmentKey) return;
    const [classId, subjectId] = selectedAssignmentKey.split('|');
    if (!classId || !subjectId || classId === 'undefined' || subjectId === 'undefined') return;

    let cancel = false;
    setLoadingCo(true);
    getClassCoAttainment(classId, subjectId)
      .then(res => {
        if (cancel) return;
        const formatted = (res?.coAttainments || []).map(co => ({
          name: `CO${co.coNumber}`,
          AvgPercentage: Math.round(Number(co.attainmentLevel) * 10) / 10,
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
  }, [selectedAssignmentKey]);

  // Fetch analytics whenever the class/subject selection changes
  useEffect(() => {
    if (!selectedAssignmentKey) return;
    const [classId, subjectId] = selectedAssignmentKey.split('|');
    if (!classId || !subjectId || classId === 'undefined' || subjectId === 'undefined') return;

    let cancel = false;
    getTeacherPerformanceTrends(classId, subjectId).then((trendData) => {
      if (cancel) return;
      setAnalyticsTrends(Array.isArray(trendData) ? trendData : []);
    }).catch(() => {
      if (!cancel) setAnalyticsTrends([]);
    });
    return () => { cancel = true; };
  }, [selectedAssignmentKey]);

  if (isInitializing) {
    return (
      <DashboardLayout navItems={navItems}>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Syncing live dashboard data...</p>
        </div>
      </DashboardLayout>
    );
  }

  /* assessments matching my assignments — prefer classId matching */
  const myAssessments = assessments.filter(a =>
    assignments.some(x => {
      const sameSubject = String(x.subjectId) === String(a.subjectId);
      if (!sameSubject) return false;
      // API path: classId is authoritative
      if (x.classId != null && a.classId != null) {
        return String(x.classId) === String(a.classId);
      }
      // Fallback: branch/semester/section matching
      const cd = apiClassDetails[String(x.classId ?? '')];
      const branch = cd?.branch ?? x.branch;
      const semester = cd?.semester ?? x.semester;
      const section = cd?.section ?? x.section;
      return branch === a.branch &&
             Number(semester) === Number(a.semester) &&
             section === a.section;
    })
  );


  /* unique classes – keyed by classId|subjectId, enriched with API class details */
  const classMap = {};
  assignments.forEach(a => {
    const mapKey = `${a.classId}|${a.subjectId}`;
    if (!classMap[mapKey]) {
      const cd = apiClassDetails[String(a.classId ?? '')] ?? {};
      const apiCount = cd.studentCount ?? null;
      const localCount = apiCount !== null ? apiCount : students.filter(
        s => s.branch === (cd.branch ?? a.branch) &&
             Number(s.semester) === Number(cd.semester ?? a.semester) &&
             s.section === (cd.section ?? a.section)
      ).length;
      classMap[mapKey] = {
        ...a,
        branch:      cd.branch      ?? a.branch      ?? '—',
        semester:    cd.semester    ?? a.semester    ?? '—',
        section:     cd.section     ?? a.section     ?? '—',
        academicYear: cd.academicYear ?? a.academicYear ?? a.academic_year ?? '',
        studentCount: localCount,
      };
    }
  });
  const classList = Object.values(classMap);
  // Prefer analytics API total (most accurate); sum of class counts as fallback
  const totalStudents = classList.reduce((s, c) => s + (c.studentCount || 0), 0);
  const localLoggedMarks = marks.filter(m => myAssessments.some(a => a.id === m.assessmentId)).length;

  /* calculate student-level records (assessment * students) */
  const totalPotentialRecords = myAssessments.reduce((sum, a) => {
    const cd = apiClassDetails[String(a.classId ?? '')];
    return sum + (cd?.studentCount ?? 0);
  }, 0);

  const actualLoggedRecords = apiMarkProgress?.averageProgressPercentage != null
    ? Math.round(totalPotentialRecords * (Number(apiMarkProgress.averageProgressPercentage) / 100))
    : localLoggedMarks;

  const totalMarks = actualLoggedRecords;

  /* chart data — use API-resolved branch, prefer API endpoint data */
  const branchData = apiBranchData
    ? apiBranchData.map(d => ({ name: d.branch || 'N/A', count: Number(d.assignmentCount) }))
      .sort((a, b) => b.count - a.count)
    : Object.entries(
        assignments.reduce((acc, a) => {
          const cd = apiClassDetails[String(a.classId ?? '')] ?? {};
          const k = cd.branch ?? a.branch ?? 'N/A';
          acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const typeData = Object.entries(
    myAssessments.reduce((acc, a) => { const t = a.type || 'OTHER'; acc[t] = (acc[t] || 0) + 1; return acc; }, {})
  ).map(([name, count]) => ({ name, count }));

  /* progress per assessment type — prefer API endpoint, fall back to local computation */
  const markProgress = apiMarkProgress?.progressByAssessmentType
    ? apiMarkProgress.progressByAssessmentType.map(item => {
        const typeAssessments = myAssessments.filter(a => a.type === item.assessmentType);
        const typePotentialRecords = typeAssessments.reduce((sum, a) => {
          const cd = apiClassDetails[String(a.classId ?? '')];
          return sum + (cd?.studentCount ?? 0);
        }, 0);
        const typeDoneRecords = Math.round(typePotentialRecords * (Number(item.progressPercentage ?? 0) / 100));
        
        return {
          type: item.assessmentType,
          total: typePotentialRecords,
          done:  typeDoneRecords,
          pct:   Math.round(Number(item.progressPercentage ?? 0)),
        };
      })
    : ASSESS_TYPES.map(type => {
        const typed = myAssessments.filter(a => a.type === type);
        const typePotential = typed.reduce((sum, a) => {
          const cd = apiClassDetails[String(a.classId ?? '')];
          return sum + (cd?.studentCount ?? 0);
        }, 0);
        const doneRecords = marks.filter(m => typed.some(a => a.id === m.assessmentId)).length;
        return { 
          type, 
          total: typePotential, 
          done: doneRecords, 
          pct: typePotential ? Math.round((doneRecords / typePotential) * 100) : 0 
        };
      });

  /* avg for the header badge */
  const markProgressAvg = apiMarkProgress?.averageProgressPercentage != null
    ? Math.round(Number(apiMarkProgress.averageProgressPercentage))
    : (totalPotentialRecords ? Math.round((totalMarks / totalPotentialRecords) * 100) : 0);

  const recentAssessments = [...myAssessments]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 5);

  const teacherName = user?.name || 'Teacher';

  return (
    <DashboardLayout navItems={navItems}>
      <div className="space-y-6">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">Teacher</p>
            <h1 className="text-2xl font-heading font-bold tracking-tight text-foreground">
              Welcome back, {teacherName}
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">Here's your teaching overview for today.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/teacher/marks')}
              className="btn-gradient inline-flex h-9 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold text-white shadow-lg"
            >
              <PenLine className="h-4 w-4" /> Enter Marks
            </button>
            <button
              onClick={() => navigate('/teacher/reports')}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-card/70 px-4 text-[13px] font-semibold text-foreground backdrop-blur-sm transition hover:bg-card"
            >
              <FileBarChart className="h-4 w-4" /> Reports
            </button>
          </div>
        </div>

        {/* ── KPIs ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi icon={BookOpen}     label="Assignments"  value={assignments.length}  helper="Current teaching load" tone="stat-gradient-blue"  badge="Live" />
          <Kpi icon={ClipboardList} label="Assessments" value={myAssessments.length} helper="Linked to your classes" tone="stat-gradient-teal"  badge="Active" />
          <Kpi icon={Users}        label="Students"     value={totalStudents}        helper="Across your sections"   tone="stat-gradient-amber" badge="Total" />
          <Kpi icon={Award}        label="Marks Logged" value={totalMarks}           helper={`of ${totalPotentialRecords} total records`} tone="stat-gradient-rose"  badge="Entry" />
        </div>

        {/* ── Mid: Progress + Charts ───────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.8fr]">
          {/* Assessment progress */}
          <div className="rounded-2xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-heading font-semibold text-foreground">Marks Entry Progress</p>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {markProgressAvg}% avg
              </span>
            </div>
            <div className="space-y-4">
              {markProgress.map((item, i) => (
                <div key={item.type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <p className="text-xs font-medium text-foreground">{item.type}</p>
                    </div>
                    <span className="text-[11px] font-bold text-foreground">{item.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${item.pct}%`, background: COLORS[i % COLORS.length] }}
                    />
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{item.done}/{item.total} recorded</p>
                </div>
              ))}
            </div>
          </div>

          {/* Branch bar chart */}
          <div className="rounded-2xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-heading font-semibold text-foreground">Assignments by Branch</p>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg stat-gradient-blue shadow">
                <BarChart3 className="h-3 w-3 text-white" />
              </div>
            </div>
            <div className="h-[180px]">
              {branchData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                    <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.4)' }} contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No assignment data.</div>
              )}
            </div>
          </div>

          {/* Assessment type donut */}
          <div className="rounded-2xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-heading font-semibold text-foreground">Type Mix</p>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg stat-gradient-teal shadow">
                <ClipboardList className="h-3 w-3 text-white" />
              </div>
            </div>
            <div className="h-[140px]">
              {typeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={typeData} dataKey="count" cx="50%" cy="50%" innerRadius={42} outerRadius={60} paddingAngle={4}>
                      {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No data yet.</div>
              )}
            </div>
            {typeData.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {typeData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] text-muted-foreground">{d.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom: Classes + CO Attainment ─── */}
        <div className="grid gap-6 lg:grid-cols-3 mt-6">
          {/* Class list (1/3) */}
          <div className="rounded-2xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm shadow-sm h-full">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg stat-gradient-teal shadow">
                <BookOpen className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-sm font-heading font-semibold text-foreground">Your Classes</p>
            </div>
            <div className="space-y-2.5">
              {classList.length === 0 ? (
                <p className="text-xs text-muted-foreground">No classes assigned yet.</p>
              ) : classList.slice(0, 10).map(c => {
                const sub = subjects.find(s => s.id === c.subjectId);
                return (
                  <div key={`${c.classId}-${c.subjectId}`} className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/40 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{sub?.subjectName || c.subjectId}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {c.branch} · Sem {c.semester} · Sec {c.section}
                        {c.academicYear ? <> · {c.academicYear}</> : null}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-foreground">{c.studentCount} stu.</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CO Attainment (2/3) */}
          <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm shadow-sm h-full">
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg stat-gradient-blue shadow">
                  <Target className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-heading font-semibold text-foreground">Class CO Attainment</p>
                  <p className="text-[11px] text-muted-foreground">Course outcome tracking</p>
                </div>
              </div>
              <div className="w-full sm:w-64">
                <Select value={selectedAssignmentKey} onValueChange={setSelectedAssignmentKey}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background/50">
                    <SelectValue placeholder="Select Class/Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignments.map(a => {
                      const sub = subjects.find(s => s.id === a.subjectId);
                      const cd = apiClassDetails[String(a.classId ?? '')] ?? {};
                      const branch   = cd.branch   ?? a.branch   ?? '—';
                      const semester = cd.semester ?? a.semester ?? '—';
                      const section  = cd.section  ?? a.section  ?? '—';
                      const ayear    = cd.academicYear ?? '';
                      return (
                        <SelectItem key={`${a.classId}|${a.subjectId}`} value={`${a.classId}|${a.subjectId}`}>
                          <span className="font-medium">{sub?.subjectCode || sub?.subjectName || a.subjectId}</span>
                          <span className="ml-1.5 text-muted-foreground">
                            {branch} S{semester}{section}{ayear ? ` · ${ayear}` : ''}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
                <div className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-border/50 px-3 py-1.5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">0-60:</span>
                  <span className="text-xs font-bold text-foreground">{coData.filter(co => co.AvgPercentage < 60).length}</span>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-border/50 px-3 py-1.5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">60-65:</span>
                  <span className="text-xs font-bold text-foreground">{coData.filter(co => co.AvgPercentage >= 60 && co.AvgPercentage < 65).length}</span>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-border/50 px-3 py-1.5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-lime-500" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">65-70:</span>
                  <span className="text-xs font-bold text-foreground">{coData.filter(co => co.AvgPercentage >= 65 && co.AvgPercentage < 70).length}</span>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-border/50 px-3 py-1.5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">70+:</span>
                  <span className="text-xs font-bold text-foreground">{coData.filter(co => co.AvgPercentage >= 70).length}</span>
                </div>
            </div>
            
            <div className="h-[280px]">
               {loadingCo ? (
                 <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                   <Loader2 className="h-4 w-4 animate-spin mr-2" /> Syncing Attainment...
                 </div>
               ) : coData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={coData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                     <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                     <YAxis domain={[0, 100]} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                     <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.35)' }} contentStyle={TOOLTIP_STYLE} />
                     <ReferenceLine y={60} stroke="hsl(35 95% 58%)" strokeOpacity={0.4} strokeDasharray="4 4" label={{ position: 'top', value: '60%', fill: 'hsl(35 95% 58%)', fontSize: 9, fontWeight: 700 }} />
                     <ReferenceLine y={65} stroke="hsl(84 81% 44%)" strokeOpacity={0.4} strokeDasharray="4 4" label={{ position: 'top', value: '65%', fill: 'hsl(84 81% 44%)', fontSize: 8, fontWeight: 700 }} />
                      <ReferenceLine y={70} stroke="hsl(168 60% 48%)" strokeOpacity={0.4} strokeDasharray="4 4" label={{ position: 'top', value: '70%', fill: 'hsl(168 60% 48%)', fontSize: 8, fontWeight: 700 }} />
                     <Bar dataKey="AvgPercentage" radius={[6, 6, 0, 0]} barSize={36}>
                        {coData.map((entry, i) => {
                          const val = entry.AvgPercentage;
                          const fill = val >= 70 ? 'hsl(168 60% 48%)' : val >= 65 ? 'hsl(84 81% 44%)' : val >= 60 ? 'hsl(35 95% 58%)' : 'hsl(0 72% 55%)';
                          return <Cell key={i} fill={fill} />;
                        })}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                   No CO Attainment data for selected combination.
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* ── Performance Trends ──────────────────────────────────────── */}
        {analyticsTrends.length > 0 && (
          <div className="rounded-2xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm shadow-sm mt-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg stat-gradient-teal shadow">
                <Zap className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-sm font-heading font-semibold text-foreground">Performance Trend</p>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsTrends} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="value" name="Avg %" stroke="hsl(235,65%,58%)" strokeWidth={2.5}
                    dot={{ r: 4, fill: 'hsl(235,65%,58%)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
