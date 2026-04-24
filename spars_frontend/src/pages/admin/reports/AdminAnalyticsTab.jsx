import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  ResponsiveContainer, CartesianGrid, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { Users, TrendingUp, Award, ClipboardList, Target, Loader2 } from 'lucide-react';
import {
  getAdminInstituteCoAttainment,
  getAdminInstituteGradeDistribution,
  getAdminAssessmentTypeAverages,
} from '@/lib/adminApi';

const CHART_COLORS = [
  'hsl(235,65%,55%)',
  'hsl(168,60%,48%)',
  'hsl(35,95%,58%)',
  'hsl(0,72%,55%)',
  'hsl(215,90%,56%)',
  'hsl(280,60%,55%)',
];

export default function AdminAnalyticsTab({ reportData }) {
  const allStudents   = reportData?.students    ?? [];
  const allAssessments = reportData?.assessments ?? [];
  const allSubjects   = reportData?.subjects    ?? [];

  // ── Grade Distribution (from API) ──────────────────────────────────────
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [loadingGrade, setLoadingGrade]           = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoadingGrade(true);
    getAdminInstituteGradeDistribution()
      .then((data) => {
        if (cancel) return;
        // DTO: { grade, studentCount }
        setGradeDistribution(data.map((d) => ({ name: d.grade, value: d.studentCount })));
      })
      .catch(() => { if (!cancel) setGradeDistribution([]); })
      .finally(() => { if (!cancel) setLoadingGrade(false); });
    return () => { cancel = true; };
  }, []);

  // ── Assessment Type Averages (from API) ─────────────────────────────────
  const [assessmentTypeData, setAssessmentTypeData] = useState([]);
  const [loadingTypes, setLoadingTypes]             = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoadingTypes(true);
    getAdminAssessmentTypeAverages()
      .then((data) => {
        if (cancel) return;
        // DTO: { assessmentType, averagePercentage }
        setAssessmentTypeData(
          data.map((d) => ({
            name: d.assessmentType,
            AvgPercentage: +Number(d.averagePercentage).toFixed(1),
          }))
        );
      })
      .catch(() => { if (!cancel) setAssessmentTypeData([]); })
      .finally(() => { if (!cancel) setLoadingTypes(false); });
    return () => { cancel = true; };
  }, []);

  // ── CO Attainment (from API, per subject) ───────────────────────────────
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [coData, setCoData]                       = useState([]);
  const [loadingCo, setLoadingCo]                 = useState(false);

  useEffect(() => {
    if (!selectedSubjectId && allSubjects.length > 0) {
      setSelectedSubjectId(String(allSubjects[0].id));
    }
  }, [allSubjects, selectedSubjectId]);

  useEffect(() => {
    if (!selectedSubjectId) return;
    let cancel = false;
    setLoadingCo(true);
    getAdminInstituteCoAttainment(selectedSubjectId)
      .then((res) => {
        if (cancel) return;
        const formatted = (res?.coAttainments || []).map((co) => ({
          co: `CO${co.coNumber}`,
          attainment: co.attainmentLevel,
          fullMark: 100,
        }));
        setCoData(formatted);
      })
      .catch(() => { if (!cancel) setCoData([]); })
      .finally(() => { if (!cancel) setLoadingCo(false); });
    return () => { cancel = true; };
  }, [selectedSubjectId]);

  // ── Quick-stat cards (counts from reportData) ───────────────────────────
  const totalStudents    = allStudents.length;
  const totalAssessments = allAssessments.length;

  // derive avg performance + pass % from grade distribution (if loaded)
  const totalEntries   = gradeDistribution.reduce((s, g) => s + g.value, 0);
  const passEntries    = gradeDistribution
    .filter((g) => g.name !== 'F')
    .reduce((s, g) => s + g.value, 0);
  const passPct        = totalEntries > 0 ? (passEntries / totalEntries) * 100 : 0;

  const avgPct = assessmentTypeData.length > 0
    ? assessmentTypeData.reduce((s, d) => s + d.AvgPercentage, 0) / assessmentTypeData.length
    : 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── Stat Cards ── */}
      <div className="grid gap-5 sm:grid-cols-4">
        {[
          { label: 'Total Students',   value: totalStudents,       icon: Users,          gradient: 'stat-gradient-blue',  unit: '' },
          { label: 'Total Assessments',value: totalAssessments,    icon: ClipboardList,  gradient: 'stat-gradient-rose',  unit: '' },
          { label: 'Avg Performance',  value: avgPct.toFixed(1),   icon: TrendingUp,     gradient: 'stat-gradient-teal',  unit: '%' },
          { label: 'Pass Percentage',  value: passPct.toFixed(1),  icon: Award,          gradient: 'stat-gradient-amber', unit: '%' },
        ].map((s, i) => (
          <Card key={s.label} className="glass-card overflow-hidden" style={{ animationDelay: `${i * 0.1}s` }}>
            <CardContent className="p-5 relative">
              <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full ${s.gradient} opacity-[0.08] blur-xl`} />
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.gradient} shadow-lg mb-4`}>
                <s.icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60 mb-1">{s.label}</p>
              <p className="text-3xl font-heading font-bold tracking-tight text-foreground">{s.value}{s.unit}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── CO Attainment Radar ── */}
        <Card className="glass-card">
          <CardHeader className="flex flex-col space-y-2 pb-2">
            <CardTitle className="text-sm font-heading font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Institution CO Attainment</span>
            </CardTitle>
            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
              <SelectTrigger className="h-8 text-xs bg-background/50">
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {allSubjects.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.subjectCode} - {s.subjectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loadingCo ? (
              <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading attainment...
              </div>
            ) : coData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={coData}>
                  <PolarGrid stroke="hsl(225,14%,90%)" />
                  <PolarAngleAxis dataKey="co" tick={{ fill: 'hsl(224,12%,48%)', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(224,12%,48%)', fontSize: 10 }} />
                  <Radar name="Attainment %" dataKey="attainment" stroke="hsl(235,65%,55%)" fill="hsl(235,65%,55%)" fillOpacity={0.4} />
                  <Tooltip wrapperStyle={{ borderRadius: '12px' }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-16 text-muted-foreground text-sm">No CO data available</div>
            )}
          </CardContent>
        </Card>

        {/* ── Assessment Type Avg Performance ── */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-heading font-semibold">Average % by Assessment Type</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTypes ? (
              <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
              </div>
            ) : assessmentTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={assessmentTypeData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(225,14%,90%)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(224,12%,48%)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(224,12%,48%)' }} domain={[0, 100]} />
                  <Tooltip cursor={{ fill: 'hsl(225,14%,90%,0.4)' }} formatter={(v) => [`${v}%`, 'Avg']} />
                  <Bar dataKey="AvgPercentage" radius={[6, 6, 0, 0]}>
                    {assessmentTypeData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.AvgPercentage >= 75
                            ? 'hsl(168,60%,48%)'
                            : entry.AvgPercentage >= 50
                            ? 'hsl(35,95%,58%)'
                            : 'hsl(0,72%,55%)'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-16 text-muted-foreground text-sm">No assessment data</div>
            )}
          </CardContent>
        </Card>

        {/* ── Institution Grade Distribution ── */}
        <Card className="glass-card col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-heading font-semibold">Institution Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingGrade ? (
              <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading grade distribution...
              </div>
            ) : gradeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={gradeDistribution} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(225,14%,90%)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(224,12%,48%)' }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(224,12%,48%)' }} />
                  <Tooltip
                    cursor={{ fill: 'hsl(225,14%,90%,0.4)' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(225,14%,90%)' }}
                    formatter={(value, name) => [value, `Grade ${name}`]}
                  />
                  <Legend />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {gradeDistribution.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-16 text-muted-foreground text-sm">No marks data yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
