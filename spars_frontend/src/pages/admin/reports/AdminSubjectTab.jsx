import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTC, ResponsiveContainer, CartesianGrid, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { BookOpen, Users, TrendingUp, Trophy, Target, Loader2 } from 'lucide-react';
import { getPerformanceColor, getGrade } from '@/lib/reportUtils';
import { getAdminInstituteCoAttainment } from '@/lib/adminApi';

function PerformBadge({ pct }) {
  const color = pct >= 75 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : pct >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200';
  return <Badge variant="outline" className={`text-[10px] font-semibold ${color}`}>{pct.toFixed(1)}%</Badge>;
}

export default function AdminSubjectTab({ reportData }) {
  const allStudents = reportData?.students ?? [];
  const allAssessments = reportData?.assessments ?? [];
  const allSubjects = reportData?.subjects ?? [];
  const marksData = Array.isArray(reportData?.marks) ? reportData.marks : [];
  const questionMarksData = Array.isArray(reportData?.questionMarks)
    ? reportData.questionMarks
    : [];
  const [selSubjectWise, setSelSubjectWise] = useState('');
  const [coDataApi, setCoDataApi] = useState([]);
  const [loadingCoApi, setLoadingCoApi] = useState(false);

  useEffect(() => {
    if (!allSubjects.length) {
      setSelSubjectWise('');
      return;
    }

    const exists = allSubjects.some((subject) => String(subject.id) === String(selSubjectWise));
    if (!exists) {
      setSelSubjectWise(String(allSubjects[0].id));
    }
  }, [allSubjects, selSubjectWise]);

  useEffect(() => {
    if (!selSubjectWise) return;
    let cancel = false;
    setLoadingCoApi(true);
    getAdminInstituteCoAttainment(selSubjectWise)
      .then((res) => {
        if (cancel) return;
        const formatted = (res?.coAttainments || []).map((co) => ({
          co: `CO${co.coNumber}`,
          avg: co.attainmentLevel,
        }));
        setCoDataApi(formatted);
      })
      .catch(() => { if (!cancel) setCoDataApi([]); })
      .finally(() => { if (!cancel) setLoadingCoApi(false); });
    return () => { cancel = true; };
  }, [selSubjectWise]);

  const subjectReport = useMemo(() => {
    if (!selSubjectWise) return null;
    const subject = allSubjects.find((s) => String(s.id) === String(selSubjectWise));
    if (!subject) return null;

    const subAssessments = allAssessments.filter(
      (assessment) => String(assessment.subjectId) === String(selSubjectWise)
    );
    const subAssessmentIds = new Set(subAssessments.map((assessment) => String(assessment.id)));
    const subMarks = marksData.filter((mark) => {
      if (String(mark.subjectId ?? '') === String(selSubjectWise)) return true;
      return subAssessmentIds.has(String(mark.assessmentId));
    });
    
    const studentMap = {};
    for (const m of subMarks) {
      const a = subAssessments.find((assessment) => String(assessment.id) === String(m.assessmentId));
      if (!a) continue;
      const studentKey = String(m.studentId);
      if (!studentMap[studentKey]) studentMap[studentKey] = { obtained: 0, max: 0, breakdowns: {} };
      const marksValue = Number(m.totalMarks ?? m.marksObtained ?? 0);
      const maxMarksValue = Number(a.maxMarks ?? 0);
      studentMap[studentKey].obtained += marksValue;
      studentMap[studentKey].max += maxMarksValue;
      const breakdownKey = a.type || m.assessmentType || 'Unknown';
      studentMap[studentKey].breakdowns[breakdownKey] = (studentMap[studentKey].breakdowns[breakdownKey] || 0) + marksValue;
    }

    const rows = Object.entries(studentMap).map(([studentId, v]) => {
      const student = allStudents.find((s) => String(s.id) === String(studentId));
      const pct = v.max > 0 ? +((v.obtained / v.max) * 100).toFixed(1) : 0;
      return { student, pct, obtained: v.obtained, max: v.max, breakdowns: v.breakdowns };
    }).sort((a, b) => b.pct - a.pct);

    const avgPct = rows.length > 0 ? rows.reduce((s, r) => s + r.pct, 0) / rows.length : 0;

    // Distribution
    const buckets = { '90-100': 0, '75-89': 0, '60-74': 0, '40-59': 0, 'Below 40': 0 };
    for (const r of rows) {
      if (r.pct >= 90) buckets['90-100']++;
      else if (r.pct >= 75) buckets['75-89']++;
      else if (r.pct >= 60) buckets['60-74']++;
      else if (r.pct >= 40) buckets['40-59']++;
      else buckets['Below 40']++;
    }
    const distData = Object.entries(buckets).map(([range, count]) => ({ range, count }));

    // CO Attainment
    const coMap = {};
    for (const m of subMarks) {
      if (String(m.assessmentType ?? '').toUpperCase() !== 'MIDSEM') continue;
      for (const qm of questionMarksData.filter((q) => String(q.markId) === String(m.id))) {
        const key = `CO${qm.coNumber}`;
        if (!coMap[key]) coMap[key] = { obtained: 0, max: 0 };
        coMap[key].obtained += qm.obtainedMarks;
        coMap[key].max += qm.maxMarks;
      }
    }
    const coData = Object.entries(coMap).map(([co, v]) => ({
      co, obtained: v.obtained, max: v.max,
      avg: v.max > 0 ? +((v.obtained / v.max) * 100).toFixed(1) : 0
    })).sort((a,b) => a.co.localeCompare(b.co));

    // Get unique assessment types for columns
    const types = [...new Set(subAssessments.map(a => a.type || 'Unknown'))];

    // Assessment type averages for this subject
    const typeAverages = types.map(t => {
      const typeMarks = subMarks.filter(m => {
        const a = subAssessments.find(as => String(as.id) === String(m.assessmentId));
        return (a?.type || m.assessmentType) === t;
      });
      const totalObtained = typeMarks.reduce((s, m) => s + Number(m.totalMarks ?? m.marksObtained ?? 0), 0);
      const totalMax = typeMarks.reduce((s, m) => {
        const a = subAssessments.find(as => String(as.id) === String(m.assessmentId));
        return s + Number(a?.maxMarks ?? 0);
      }, 0);
      return { name: t, avg: totalMax > 0 ? (totalObtained / totalMax) * 100 : 0 };
    });

    return { subject, rows, avgPct, distData, topPerformers: rows.slice(0, 5), coData, types, typeAverages };
  }, [selSubjectWise, allSubjects, allAssessments, marksData, questionMarksData, allStudents]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card className="glass-card">
        <CardContent className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-4">Select Subject</p>
          <div className="max-w-xs">
            <Select value={selSubjectWise} onValueChange={setSelSubjectWise}>
              <SelectTrigger className="rounded-xl h-10 bg-card"><SelectValue placeholder="Choose a subject..." /></SelectTrigger>
              <SelectContent>
                {allSubjects.map((subject) => (
                  <SelectItem key={subject.id} value={String(subject.id)}>
                    {subject.subjectName || `Subject ${subject.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!subjectReport && (
        <div className="text-center py-20 text-muted-foreground"><BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />Select a subject.</div>
      )}

      {subjectReport && (
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { label: 'Total Students', value: subjectReport.rows.length, icon: Users, gradient: 'stat-gradient-blue' },
              { label: 'Class Average', value: `${subjectReport.avgPct.toFixed(1)}%`, icon: TrendingUp, gradient: 'stat-gradient-teal' },
              { label: 'Top Score', value: subjectReport.topPerformers[0] ? `${subjectReport.topPerformers[0].pct}%` : 'N/A', icon: Trophy, gradient: 'stat-gradient-amber' },
            ].map(s => (
              <Card key={s.label} className="glass-card overflow-hidden">
                <CardContent className="p-5 relative">
                  <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full ${s.gradient} opacity-[0.08] blur-xl`} />
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.gradient} shadow-md mb-3`}><s.icon className="h-5 w-5 text-white" /></div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60 mb-1">{s.label}</p>
                  <p className="text-2xl font-heading font-bold tracking-tight text-foreground">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-sm font-heading font-semibold">Subject CO Attainment</CardTitle></CardHeader>
              <CardContent>
                {loadingCoApi ? (
                  <div className="flex h-[240px] items-center justify-center text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Syncing attainment...
                  </div>
                ) : coDataApi.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={coDataApi}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="co" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      {(() => {
                        const avg = coDataApi.length > 0 ? coDataApi.reduce((s, c) => s + c.avg, 0) / coDataApi.length : 0;
                        const color = getPerformanceColor(avg);
                        return <Radar name="Attainment %" dataKey="avg" stroke={color} fill={color} fillOpacity={0.4} />;
                      })()}
                      <RTC 
                        contentStyle={{ borderRadius: '12px', backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} 
                        itemStyle={{ fontSize: '12px' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm">No CO attainment data available for this subject</div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader><CardTitle className="text-sm font-heading font-semibold">Avg % by Assessment Type</CardTitle></CardHeader>
              <CardContent>
                {subjectReport.typeAverages.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={subjectReport.typeAverages} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(225,14%,90%)" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <RTC contentStyle={{ borderRadius: '12px', backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} formatter={(v) => [`${v.toFixed(1)}%`, 'Avg']} />
                      <Bar 
                        dataKey="avg" 
                        radius={[6, 6, 0, 0]} 
                        barSize={32}
                        label={{ position: 'top', fill: 'hsl(var(--muted-foreground))', fontSize: 10, formatter: (v) => `${v.toFixed(0)}%` }}
                      >
                        {subjectReport.typeAverages.map((entry, i) => (
                          <Cell key={i} fill={getPerformanceColor(entry.avg)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm">No assessment data</div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card lg:col-span-2">
              <CardHeader><CardTitle className="text-sm font-heading font-semibold">Score Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={subjectReport.distData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <RTC contentStyle={{ borderRadius: '12px', backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar 
                        dataKey="count" 
                        name="Students" 
                        radius={[6,6,0,0]}
                        label={{ position: 'top', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      >
                        {subjectReport.distData.map((e, i) => (
                          <Cell key={i} fill={['#16a34a', '#22c55e', '#eab308', '#f97316', '#ef4444'][i]} />
                        ))}
                      </Bar>
                    </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/30"><CardTitle className="text-sm font-heading font-semibold">All Students – Heatmap View</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">Rank & Student</TableHead>
                    {subjectReport.types.map(t => (
                      <TableHead key={t} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">{t}</TableHead>
                    ))}
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 text-right">Overall</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjectReport.rows.map((r, i) => (
                    <TableRow key={i} className="hover:bg-primary/[0.02]">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">#{i+1}</span>
                          <div>
                            <p className="font-medium text-sm leading-none mb-1">
                              {r.student?.name || 'Unknown Student'}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono leading-none">
                              {r.student?.regNo || '—'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      {subjectReport.types.map(t => (
                        <TableCell key={t} className="text-center font-semibold text-sm" style={{ color: r.breakdowns[t] ? getPerformanceColor((r.breakdowns[t] / 100)*100) : 'inherit' }}>
                          {r.breakdowns[t] || '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <PerformBadge pct={r.pct} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
