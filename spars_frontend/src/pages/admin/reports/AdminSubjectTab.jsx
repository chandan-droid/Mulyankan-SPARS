import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTC, ResponsiveContainer, CartesianGrid, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { BookOpen, Users, TrendingUp, Trophy, Target } from 'lucide-react';
import { getPerformanceColor, getGrade } from '@/lib/reportUtils';

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

  const subjectReport = useMemo(() => {
    if (!selSubjectWise) return null;
    const subject = allSubjects.find(s => s.id === selSubjectWise);
    if (!subject) return null;

    const subAssessments = allAssessments.filter(a => a.subjectId === selSubjectWise);
    const subMarks = marksData.filter(m => m.subjectId === selSubjectWise);
    
    const studentMap = {};
    for (const m of subMarks) {
      const a = subAssessments.find(x => x.id === m.assessmentId);
      if (!a) continue;
      if (!studentMap[m.studentId]) studentMap[m.studentId] = { obtained: 0, max: 0, breakdowns: {} };
      studentMap[m.studentId].obtained += m.totalMarks;
      studentMap[m.studentId].max += a.maxMarks;
      studentMap[m.studentId].breakdowns[a.type || m.assessmentType] = (studentMap[m.studentId].breakdowns[a.type || m.assessmentType] || 0) + m.totalMarks;
    }

    const rows = Object.entries(studentMap).map(([studentId, v]) => {
      const student = allStudents.find(s => s.id === studentId);
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
      if (m.assessmentType !== 'MIDSEM') continue;
      for (const qm of questionMarksData.filter(q => q.markId === m.id)) {
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

    return { subject, rows, avgPct, distData, topPerformers: rows.slice(0, 5), coData, types };
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
                {allSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.subjectCode} – {s.subjectName}</SelectItem>)}
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
                {subjectReport.coData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={subjectReport.coData}>
                      <PolarGrid stroke="hsl(225,14%,90%)" />
                      <PolarAngleAxis dataKey="co" tick={{ fill: 'hsl(224,12%,48%)', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="Attainment %" dataKey="avg" stroke="hsl(168,60%,48%)" fill="hsl(168,60%,48%)" fillOpacity={0.4} />
                      <RTC wrapperStyle={{ borderRadius: '12px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm">No MidSem data to calculate CO attainment</div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader><CardTitle className="text-sm font-heading font-semibold">Score Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={subjectReport.distData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(225,14%,90%)" vertical={false} />
                    <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <RTC contentStyle={{ borderRadius: '12px' }} />
                    <Bar dataKey="count" name="Students" radius={[6,6,0,0]}>
                      {subjectReport.distData.map((e, i) => (
                        <Cell key={i} fill={['hsl(168,60%,48%)', 'hsl(168,60%,48%)', 'hsl(35,95%,58%)', 'hsl(35,95%,58%)', 'hsl(0,72%,55%)'][i]} />
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
                            <p className="font-medium text-sm leading-none mb-1">{r.student.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono leading-none">{r.student.regNo}</p>
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
