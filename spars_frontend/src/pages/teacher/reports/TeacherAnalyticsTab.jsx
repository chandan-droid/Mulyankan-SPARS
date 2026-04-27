import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip as RTC, CartesianGrid, Cell,
  LineChart, Line, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ReferenceLine,
  PieChart, Pie,
} from 'recharts';
import {
  Loader2, TrendingUp, Trophy, AlertTriangle, Users, BarChart3,
  Target, Activity, Download, RefreshCw, Zap,
} from 'lucide-react';
import {
  getPerformanceDistribution,
  getTopPerformers,
  getBottomPerformers,
  getCoAttainmentComparison,
  getClassOverview,
  getTeacherTopStudents,
  getTeacherWeakStudents,
  getTeacherPerformanceTrends,
  generateTeacherReport,
} from '@/lib/teacherApi';

/* ── helpers ──────────────────────────────────────────────────────────────── */
const TOOLTIP_STYLE = {
  borderRadius: '10px',
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--background))',
  fontSize: 12,
};
const CHART_COLORS = [
  'hsl(235,65%,58%)', 'hsl(168,60%,48%)', 'hsl(35,95%,58%)',
  'hsl(0,72%,55%)', 'hsl(215,90%,56%)', 'hsl(280,65%,55%)',
];
const bandColor = (band) => {
  const b = String(band || '').toUpperCase();
  if (b === 'EXCELLENT') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (b === 'GOOD')      return 'bg-sky-100 text-sky-700 border-sky-200';
  if (b === 'AVERAGE')   return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
};
const pctColor = (v) =>
  v >= 75 ? 'hsl(168,60%,48%)' : v >= 50 ? 'hsl(35,95%,58%)' : 'hsl(0,72%,55%)';

function KpiCard({ icon: Icon, label, value, sub, gradient }) {
  return (
    <Card className="glass-card overflow-hidden">
      <CardContent className="p-5 relative">
        <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full ${gradient} opacity-[0.08] blur-xl`} />
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${gradient} shadow-md mb-3`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60 mb-1">{label}</p>
        <p className="text-2xl font-heading font-bold tracking-tight text-foreground">{value ?? '—'}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SectionHeading({ icon: Icon, label, color = 'text-primary' }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`h-4 w-4 ${color}`} />
      <p className="text-sm font-heading font-semibold text-foreground">{label}</p>
    </div>
  );
}

function StudentRankRow({ rank, name, pct, band, dim, student }) {
  const resolvedPctCandidates = [
    pct,
    student?.overallPercentage,
    student?.percentage,
    student?.avgPercentage,
    student?.averagePercentage,
  ].map((v) => Number(v));
  const resolvedPct = resolvedPctCandidates.find((v) => Number.isFinite(v));

  const explicitTotalCandidates = [
    student?.totalOutOf40,
    student?.totalMarksOutOf40,
    student?.totalMarks,
    student?.marksObtained,
    student?.score,
  ].map((v) => Number(v));
  const explicitTotal = explicitTotalCandidates.find((v) => Number.isFinite(v));

  const totalMark = Number.isFinite(explicitTotal)
    ? Number(explicitTotal.toFixed(1))
    : Number.isFinite(resolvedPct)
      ? Number((resolvedPct * 0.4).toFixed(1))
      : null;

  return (
    <div className={`flex items-center gap-3 rounded-xl border border-border/40 px-3 py-2.5 ${dim ? 'opacity-60' : 'bg-background/40'}`}>
      <span className="text-[11px] font-bold text-muted-foreground w-5 text-center">#{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{name}</p>
        <div className="w-full bg-muted/60 rounded-full h-1.5 mt-1">
          <div
            className="h-1.5 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(Number(resolvedPct ?? 0), 100)}%`, background: pctColor(Number(resolvedPct ?? 0)) }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {totalMark != null && (
          <span className="rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] font-bold text-foreground">
            {totalMark}
          </span>
        )}
        <span className="text-[11px] font-bold" style={{ color: pctColor(Number(resolvedPct ?? 0)) }}>
          {Number.isFinite(resolvedPct) ? `${resolvedPct.toFixed(1)}%` : '—'}
        </span>
        {band && <Badge variant="outline" className={`text-[9px] py-0 ${bandColor(band)}`}>{band}</Badge>}
      </div>
    </div>
  );
}

/* ── main component ──────────────────────────────────────────────────────── */
export default function TeacherAnalyticsTab({
  selectedSubject,
  currentAssignment,
  allAssessments = [],
}) {
  const classId   = currentAssignment?.classId ?? null;
  const subjectId = selectedSubject ? Number(selectedSubject) : null;

  /* subject assessments for the distribution selector */
  const subjectAssessments = allAssessments.filter(
    (a) => String(a.subjectId) === String(selectedSubject)
  );
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');

  useEffect(() => {
    if (subjectAssessments.length && !selectedAssessmentId) {
      setSelectedAssessmentId(String(subjectAssessments[0].id));
    }
  }, [subjectAssessments, selectedAssessmentId]);

  /* ── state ─────────────────────────────────────────────────────────────── */
  const [overview,      setOverview]      = useState(null);
  const [topStudents,   setTopStudents]   = useState([]);
  const [weakStudents,  setWeakStudents]  = useState([]);
  const [trends,        setTrends]        = useState([]);
  const [topPerf,       setTopPerf]       = useState([]);
  const [bottomPerf,    setBottomPerf]    = useState([]);
  const [coComparison,  setCoComparison]  = useState([]);
  const [distribution,  setDistribution]  = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [distLoading,   setDistLoading]   = useState(false);
  const [generating,    setGenerating]    = useState(false);
  const [genMsg,        setGenMsg]        = useState('');

  /* ── fetch class-level analytics ─────────────────────────────────────── */
  const fetchClassAnalytics = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    const [ovRes, topRes, weakRes, trendRes] = await Promise.allSettled([
      getClassOverview(classId, subjectId),
      getTeacherTopStudents(classId, subjectId, 5),
      getTeacherWeakStudents(classId, subjectId, 40),
      getTeacherPerformanceTrends(classId, subjectId),
    ]);
    if (ovRes.status    === 'fulfilled') setOverview(ovRes.value);
    if (topRes.status   === 'fulfilled') setTopStudents(topRes.value);
    if (weakRes.status  === 'fulfilled') setWeakStudents(weakRes.value);
    if (trendRes.status === 'fulfilled') setTrends(trendRes.value);
    setLoading(false);
  }, [classId, subjectId]);

  /* ── fetch subject-level analytics ────────────────────────────────────── */
  const fetchSubjectAnalytics = useCallback(async () => {
    if (!subjectId) return;
    const [topPRes, botPRes, coRes] = await Promise.allSettled([
      getTopPerformers(subjectId, 5),
      getBottomPerformers(subjectId, 5),
      getCoAttainmentComparison(subjectId),
    ]);
    if (topPRes.status === 'fulfilled') setTopPerf(topPRes.value);
    if (botPRes.status === 'fulfilled') setBottomPerf(botPRes.value);
    if (coRes.status   === 'fulfilled') setCoComparison(coRes.value);
  }, [subjectId]);

  /* ── fetch assessment distribution ────────────────────────────────────── */
  const fetchDistribution = useCallback(async () => {
    if (!selectedAssessmentId) return;
    setDistLoading(true);
    try {
      const data = await getPerformanceDistribution(selectedAssessmentId);
      setDistribution(data);
    } catch {
      setDistribution([]);
    } finally {
      setDistLoading(false);
    }
  }, [selectedAssessmentId]);

  useEffect(() => { fetchClassAnalytics(); },   [fetchClassAnalytics]);
  useEffect(() => { fetchSubjectAnalytics(); },  [fetchSubjectAnalytics]);
  useEffect(() => { fetchDistribution(); },      [fetchDistribution]);

  /* ── report generation ─────────────────────────────────────────────────── */
  async function handleGenerate(reportType) {
    if (!classId) return;
    setGenerating(true);
    setGenMsg('');
    try {
      const res = await generateTeacherReport(classId, subjectId, reportType, 'PDF');
      if (res?.fileUrl) {
        window.open(res.fileUrl, '_blank');
        setGenMsg(`✓ Report ready: ${res.fileName || reportType}`);
      } else {
        setGenMsg('Report generated (no download URL returned by server).');
      }
    } catch (e) {
      setGenMsg(`Error: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  }

  if (!selectedSubject) return null;

  /* ── co-comparison radar data ─────────────────────────────────────────── */
  const coRadarKeys = coComparison.length
    ? [...new Set(coComparison.flatMap(a => a.coAttainments?.map(c => `CO${c.coNumber}`) ?? []))]
    : [];
  const coRadarData = coRadarKeys.map(co => {
    const entry = { co };
    coComparison.forEach((assessment) => {
      const match = assessment.coAttainments?.find(c => `CO${c.coNumber}` === co);
      entry[assessment.assessmentName || `A${assessment.assessmentId}`] = match?.attainmentLevel ?? 0;
    });
    return entry;
  });

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* ── Refresh + Generate ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Live Analytics</p>
          <h2 className="text-lg font-heading font-bold text-foreground">Class & Subject Insights</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl gap-1.5 text-xs"
            disabled={loading}
            onClick={() => { fetchClassAnalytics(); fetchSubjectAnalytics(); }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            size="sm"
            className="btn-gradient text-white rounded-xl gap-1.5 text-xs"
            disabled={generating || !classId}
            onClick={() => handleGenerate('CLASS_PERFORMANCE')}
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Generate PDF Report
          </Button>
        </div>
      </div>
      {genMsg && (
        <p className={`text-xs font-medium px-3 py-2 rounded-xl ${genMsg.startsWith('Error') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {genMsg}
        </p>
      )}

      {/* ── Class Overview KPIs ─────────────────────────────────────────── */}
      {loading ? (
        <div className="flex py-10 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading class analytics…
        </div>
      ) : overview && Object.keys(overview).length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={Users}        label="Total Students"   value={overview.totalStudents}                     sub="Enrolled in class"         gradient="stat-gradient-blue" />
          <KpiCard icon={TrendingUp}   label="Class Average"    value={overview.averagePercentage != null ? `${Number(overview.averagePercentage).toFixed(1)}%` : '—'}  sub="Overall performance"       gradient="stat-gradient-teal" />
          <KpiCard icon={Trophy}       label="Pass Rate"        value={overview.passRate != null ? `${Number(overview.passRate).toFixed(1)}%` : '—'}                    sub="Students ≥ 40%"            gradient="stat-gradient-amber" />
          <KpiCard icon={AlertTriangle} label="At Risk"        value={overview.atRiskCount ?? '—'}                sub="Below threshold"           gradient="stat-gradient-rose" />
        </div>
      ) : classId ? (
        <div className="flex py-8 items-center justify-center text-xs text-muted-foreground gap-2">
          <Zap className="h-4 w-4 opacity-40" /> No overview data returned for this class yet.
        </div>
      ) : (
        <div className="flex py-8 items-center justify-center text-xs text-muted-foreground gap-2">
          <Zap className="h-4 w-4 opacity-40" /> Select a class assignment to see analytics.
        </div>
      )}

      {/* ── Top & Weak Students (class-level) ─────────────────────────── */}
      {classId && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top students */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <SectionHeading icon={Trophy} label="Top 5 Students in Class" color="text-amber-500" />
            </CardHeader>
            <CardContent className="space-y-2.5">
              {loading ? (
                <div className="flex py-6 justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : topStudents.length > 0 ? (
                topStudents.map((s, i) => (
                  <StudentRankRow
                    key={s.studentId}
                    rank={i + 1}
                    name={s.studentName}
                    pct={s.overallPercentage}
                    band={s.band}
                    student={s}
                  />
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">No data available.</p>
              )}
            </CardContent>
          </Card>

          {/* Weak students */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <SectionHeading icon={AlertTriangle} label="Students Needing Attention (< 40%)" color="text-red-500" />
            </CardHeader>
            <CardContent className="space-y-2.5">
              {loading ? (
                <div className="flex py-6 justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : weakStudents.length > 0 ? (
                weakStudents.map((s, i) => (
                  <StudentRankRow
                    key={s.studentId}
                    rank={i + 1}
                    name={s.studentName}
                    pct={s.overallPercentage}
                    band={s.band}
                    dim
                    student={s}
                  />
                ))
              ) : (
                <p className="text-xs text-emerald-600 font-medium py-4 text-center">🎉 All students above threshold!</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Performance Trends ──────────────────────────────────────────── */}
      {classId && trends.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <SectionHeading icon={Activity} label="Performance Trend Over Assessments" color="text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <RTC contentStyle={TOOLTIP_STYLE} />
                  <ReferenceLine y={60} stroke="hsl(168,60%,48%)" strokeDasharray="4 3" label={{ value: 'Target 60%', position: 'right', fontSize: 10, fill: 'hsl(168,60%,48%)' }} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Avg %"
                    stroke="hsl(235,65%,58%)"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: 'hsl(235,65%,58%)', strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Performance Distribution (per assessment) ──────────────────── */}
      {subjectAssessments.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <SectionHeading icon={BarChart3} label="Score Distribution by Assessment" color="text-sky-500" />
              <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
                <SelectTrigger className="w-full sm:w-56 h-9 rounded-xl text-xs bg-background/50">
                  <SelectValue placeholder="Select Assessment" />
                </SelectTrigger>
                <SelectContent>
                  {subjectAssessments.map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name || a.type} ({a.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {distLoading ? (
              <div className="flex py-10 justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : distribution.length > 0 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                      dataKey="studentCount"
                      nameKey="range"
                      stroke="none"
                    >
                      {distribution.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTC contentStyle={TOOLTIP_STYLE} formatter={(v, name) => [`${v} students`, name]} />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">No distribution data for this assessment.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Subject-level Top & Bottom Performers ─────────────────────── */}
      {subjectId && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <SectionHeading icon={Trophy} label="Top 5 by Subject" color="text-emerald-500" />
            </CardHeader>
            <CardContent className="space-y-2.5">
              {topPerf.length > 0 ? topPerf.map((s, i) => (
                <StudentRankRow key={s.studentId} rank={i + 1} name={s.studentName} pct={s.overallPercentage} student={s} />
              )) : (
                <p className="text-xs text-muted-foreground py-4 text-center">No data.</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <SectionHeading icon={AlertTriangle} label="Bottom 5 by Subject" color="text-red-500" />
            </CardHeader>
            <CardContent className="space-y-2.5">
              {bottomPerf.length > 0 ? bottomPerf.map((s, i) => (
                <StudentRankRow key={s.studentId} rank={i + 1} name={s.studentName} pct={s.overallPercentage} dim student={s} />
              )) : (
                <p className="text-xs text-muted-foreground py-4 text-center">No data.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── CO Attainment Comparison (across assessments) ──────────────── */}
      {coComparison.length > 0 && coRadarData.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <SectionHeading icon={Target} label="CO Attainment Comparison Across Assessments" color="text-fuchsia-500" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={coRadarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="co" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  {coComparison.map((a, i) => (
                    <Radar
                      key={a.assessmentId}
                      name={a.assessmentName || `Assessment ${a.assessmentId}`}
                      dataKey={a.assessmentName || `A${a.assessmentId}`}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      fillOpacity={0.25}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <RTC contentStyle={TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
