import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  LayoutDashboard, PenLine, FileBarChart, BookOpen, ClipboardList,
  ArrowUpRight, TrendingUp, Award, CheckCircle, Users, Calendar,
  BarChart3, Settings,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import {
  getAssignmentsForTeacher, getSubjects, getAssessments, getStudents, getMarks,
} from '@/data/store';
import { Loader2 } from 'lucide-react';
import {
  getMyAssignments, getMyAssessments as fetchMyAssessmentsApi,
} from '@/lib/teacherApi';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
} from 'recharts';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',  path: '/teacher' },
  { icon: PenLine,         label: 'Mark Entry', path: '/teacher/marks' },
  { icon: FileBarChart,    label: 'Reports',    path: '/teacher/reports' },
  { icon: Settings,        label: 'Settings',   path: '/teacher/settings' },
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

function QuickAction({ icon: Icon, label, desc, path, color, navigate }) {
  return (
    <button
      type="button"
      onClick={() => navigate(path)}
      className="group flex items-start gap-3 rounded-2xl border border-border/50 bg-card/70 p-4 text-left backdrop-blur-sm shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color} transition-transform duration-300 group-hover:scale-105`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/30 transition-all group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </button>
  );
}

/* ── main component ───────────────────────────────────────────────────────── */
export default function TeacherDashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  // Local store (always available as fallback)
  const localAssignments = getAssignmentsForTeacher(user?.id || '');
  const localAssessments = getAssessments();

  const subjects  = getSubjects();
  const students  = getStudents();
  const marks     = getMarks();

  // API-fetched state
  const [apiAssignments, setApiAssignments] = useState(null);
  const [apiAssessments, setApiAssessments] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsInitializing(true);
    
    Promise.allSettled([
      getMyAssignments(),
      fetchMyAssessmentsApi()
    ]).then(([assignmentsRes, assessmentsRes]) => {
      if (cancelled) return;
      if (assignmentsRes.status === 'fulfilled' && assignmentsRes.value?.length > 0) {
        setApiAssignments(assignmentsRes.value);
      }
      if (assessmentsRes.status === 'fulfilled' && assessmentsRes.value?.length > 0) {
        setApiAssessments(assessmentsRes.value);
      }
      setIsInitializing(false);
    });
    
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Use API data when available, else fall back to local store
  const assignments   = apiAssignments  ?? localAssignments;
  const assessments   = apiAssessments  ?? localAssessments;

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

  /* assessments matching my assignments */
  const myAssessments = assessments.filter(a =>
    assignments.some(
      x => x.subjectId === a.subjectId && x.branch === a.branch &&
           x.semester === a.semester && x.section === a.section
    )
  );


  /* unique classes */
  const classMap = {};
  assignments.forEach(a => {
    const key = `${a.branch}-${a.semester}-${a.section}`;
    if (!classMap[key]) {
      classMap[key] = {
        ...a,
        studentCount: students.filter(
          s => s.branch === a.branch &&
               Number(s.semester) === Number(a.semester) &&
               s.section === a.section
        ).length,
      };
    }
  });
  const classList     = Object.values(classMap);
  const totalStudents = classList.reduce((s, c) => s + c.studentCount, 0);
  const uniqueSubs    = [...new Set(assignments.map(a => a.subjectId))];
  const totalMarks    = marks.filter(m => myAssessments.some(a => a.id === m.assessmentId)).length;

  /* chart data */
  const branchData = Object.entries(
    assignments.reduce((acc, a) => { const k = a.branch || 'N/A'; acc[k] = (acc[k] || 0) + 1; return acc; }, {})
  ).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const typeData = Object.entries(
    myAssessments.reduce((acc, a) => { const t = a.type || 'OTHER'; acc[t] = (acc[t] || 0) + 1; return acc; }, {})
  ).map(([name, count]) => ({ name, count }));

  /* progress per assessment type */
  const markProgress = ASSESS_TYPES.map(type => {
    const typed = myAssessments.filter(a => a.type === type);
    const done  = marks.filter(m => typed.some(a => a.id === m.assessmentId)).length;
    return { type, total: typed.length, done, pct: typed.length ? Math.round((done / typed.length) * 100) : 0 };
  });

  const recentAssessments = [...myAssessments]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 5);

  const firstName = (user?.name || 'Teacher').split(' ')[0];

  return (
    <DashboardLayout navItems={navItems}>
      <div className="space-y-6">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">Teacher</p>
            <h1 className="text-2xl font-heading font-bold tracking-tight text-foreground">
              Welcome back, {firstName}
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
          <Kpi icon={Award}        label="Marks Logged" value={totalMarks}           helper="Submitted scores"       tone="stat-gradient-rose"  badge="Entry" />
        </div>

        {/* ── Mid: Progress + Charts ───────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.8fr]">
          {/* Assessment progress */}
          <div className="rounded-2xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-heading font-semibold text-foreground">Marks Entry Progress</p>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {myAssessments.length ? Math.round((totalMarks / myAssessments.length) * 100) : 0}% avg
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

        {/* ── Bottom: Recent Activity + Classes + Quick Actions ─── */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.7fr]">
          {/* Recent assessments */}
          <div className="rounded-2xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg stat-gradient-blue shadow">
                <Calendar className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-sm font-heading font-semibold text-foreground">Recent Assessments</p>
            </div>
            <div className="space-y-2.5">
              {recentAssessments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No assessments yet.</p>
              ) : recentAssessments.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/40 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{a.name || a.type}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{a.branch} · Sem {a.semester} · Sec {a.section}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-foreground">{a.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Class list */}
          <div className="rounded-2xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg stat-gradient-teal shadow">
                <BookOpen className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-sm font-heading font-semibold text-foreground">Your Classes</p>
            </div>
            <div className="space-y-2.5">
              {classList.length === 0 ? (
                <p className="text-xs text-muted-foreground">No classes assigned yet.</p>
              ) : classList.slice(0, 5).map(c => {
                const sub = subjects.find(s => s.id === c.subjectId);
                return (
                  <div key={`${c.branch}-${c.semester}-${c.section}-${c.subjectId}`} className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/40 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{sub?.subjectName || c.subjectId}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{c.branch} · Sem {c.semester} · Sec {c.section}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-foreground">{c.studentCount} stu.</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Snapshot + Quick actions */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg stat-gradient-amber shadow">
                  <CheckCircle className="h-3.5 w-3.5 text-white" />
                </div>
                <p className="text-sm font-heading font-semibold text-foreground">Snapshot</p>
              </div>
              <div className="space-y-3">
                {[
                  {
                    label: 'Subjects', 
                    val: uniqueSubs.length,
                    pct: Math.min(100, uniqueSubs.length * 20),
                  },
                  {
                    label: 'Mark Completion',
                    val: `${myAssessments.length ? Math.min(100, Math.round((totalMarks / myAssessments.length) * 100)) : 0}%`,
                    pct: myAssessments.length ? Math.min(100, Math.round((totalMarks / myAssessments.length) * 100)) : 0,
                  },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-foreground">{item.label}</p>
                      <span className="text-[11px] font-bold text-foreground">{item.val}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                      <div className="h-full rounded-full stat-gradient-teal transition-all duration-700" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <QuickAction
              icon={PenLine}
              label="Enter Marks"
              desc="Record assessment scores"
              path="/teacher/marks"
              color="bg-primary/10 text-primary"
              navigate={navigate}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
