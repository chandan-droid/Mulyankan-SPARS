import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTC, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import { FileText, FileSpreadsheet, Users, TrendingUp, Trophy, AlertTriangle, BookOpen } from 'lucide-react';
import { getGrade, exportClassReportPDF, exportClassRosterExcel, getPerformanceColor } from '@/lib/reportUtils';

function PerformBadge({ pct }) {
  const color = pct >= 75 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : pct >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-red-100 text-red-700 border-red-200';
  return <Badge variant="outline" className={`text-[10px] font-semibold ${color}`}>{pct.toFixed(1)}%</Badge>;
}

export default function AdminClassTab({ reportData }) {
  const allStudents = reportData?.students ?? [];
  const allAssessments = reportData?.assessments ?? [];
  const marksData = Array.isArray(reportData?.marks) ? reportData.marks : [];

  const [selBranch, setSelBranch] = useState('');
  const [selSemester, setSelSemester] = useState('');
  const [selSection, setSelSection] = useState('');

  const branches = [...new Set(allStudents.map(s => s.branch))].sort();
  const semesters = [...new Set(allStudents.map(s => s.semester))].sort((a,b) => a - b);
  const sections = [...new Set(allStudents.map(s => s.section))].sort();

  const classReport = useMemo(() => {
    if (!selBranch || !selSemester || !selSection) return null;
    const sem = parseInt(selSemester);
    const classStudents = allStudents.filter(s => s.branch === selBranch && s.semester === sem && s.section === selSection);
    
    const rows = classStudents.map(student => {
      const marks = marksData.filter(m => m.studentId === student.id);
      let tot = 0, max = 0;
      let midsem = 0, quiz = 0, assign1 = 0, assign2 = 0, attend = 0;
      let maxMidsem = 0, maxQuiz = 0, maxAssign1 = 0, maxAssign2 = 0, maxAttend = 0;

      for (const m of marks) {
        const a = allAssessments.find(x => x.id === m.assessmentId);
        if (!a) continue;
        tot += m.totalMarks;
        max += a.maxMarks;
        
        const assessmentType = (a.type || m.assessmentType || '').toUpperCase();
        switch(assessmentType) {
          case 'MIDSEM': midsem += m.totalMarks; maxMidsem += a.maxMarks; break;
          case 'QUIZ': quiz += m.totalMarks; maxQuiz += a.maxMarks; break;
          case 'ASSIGNMENT': {
            const assessmentName = String(a.name || '').toUpperCase();
            if (assessmentName.includes('2')) {
              assign2 += m.totalMarks;
              maxAssign2 += a.maxMarks;
            } else {
              assign1 += m.totalMarks;
              maxAssign1 += a.maxMarks;
            }
            break;
          }
          case 'ATTENDANCE': attend += m.totalMarks; maxAttend += a.maxMarks; break;
        }
      }
      const pct = max > 0 ? +((tot / max) * 100).toFixed(1) : 0;
      
      return {
        student, totalMarks: tot, maxPossible: max, pct,
        grade: getGrade(pct).grade, status: pct >= 40 ? 'Pass' : 'Fail',
        name: student.name, regNo: student.regNo,
        midsem: maxMidsem ? +((midsem/maxMidsem)*100).toFixed(0) + '%' : '',
        quiz: maxQuiz ? +((quiz/maxQuiz)*100).toFixed(0) + '%' : '',
        assign1: maxAssign1 ? +((assign1/maxAssign1)*100).toFixed(0) + '%' : '',
        assign2: maxAssign2 ? +((assign2/maxAssign2)*100).toFixed(0) + '%' : '',
        attendance: maxAttend ? +((attend/maxAttend)*100).toFixed(0) + '%' : '',
      };
    }).sort((a, b) => b.pct - a.pct); // Sort for percentile

    rows.forEach((r, idx) => {
      // Calculate Percentile
      if (rows.length > 1) {
        const below = rows.length - 1 - idx;
        r.percentile = +((below / (rows.length - 1)) * 100).toFixed(1);
      } else {
        r.percentile = 100;
      }
    });

    const avgPct = rows.length > 0 ? rows.reduce((s, r) => s + r.pct, 0) / rows.length : 0;
    const passCount = rows.filter(r => r.status === 'Pass').length;

    // Distribution Histogram Buckets
    const buckets = [0,0,0,0,0,0,0,0,0,0]; // 0-10, 10-20, ... 90-100
    rows.forEach(r => {
      let bucket = Math.floor(r.pct / 10);
      if (bucket === 10) bucket = 9; // Handle 100%
      if (bucket >= 0) buckets[bucket]++;
    });
    const distData = buckets.map((c, i) => ({ range: `${i*10}-${(i+1)*10}`, count: c }));

    return { 
      rows, avgPct, passCount, failCount: rows.length - passCount,
      topStudents: rows.slice(0, 3), weakStudents: [...rows].reverse().slice(0, 3),
      distData,
      passPie: [{ name: 'Pass', value: passCount }, { name: 'Fail', value: rows.length - passCount }].filter(x => x.value > 0)
    };
  }, [selBranch, selSemester, selSection, allStudents, marksData, allAssessments]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card className="glass-card">
        <CardContent className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-4">Select Class</p>
          <div className="grid gap-4 sm:grid-cols-3 max-w-lg">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-semibold text-muted-foreground">Branch</Label>
              <Select value={selBranch} onValueChange={setSelBranch}>
                <SelectTrigger className="rounded-xl h-10 bg-card"><SelectValue placeholder="Branch" /></SelectTrigger>
                <SelectContent>{branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase font-semibold text-muted-foreground">Semester</Label>
              <Select value={selSemester} onValueChange={setSelSemester}>
                <SelectTrigger className="rounded-xl h-10 bg-card"><SelectValue placeholder="Sem" /></SelectTrigger>
                <SelectContent>{semesters.map(s => <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase font-semibold text-muted-foreground">Section</Label>
              <Select value={selSection} onValueChange={setSelSection}>
                <SelectTrigger className="rounded-xl h-10 bg-card"><SelectValue placeholder="Section" /></SelectTrigger>
                <SelectContent>{sections.map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!classReport && (
        <div className="text-center py-20 text-muted-foreground"><BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />Select Branch, Semester, and Section.</div>
      )}

      {classReport && (
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-4">
            {[
              { label: 'Total Students', value: classReport.rows.length, icon: Users, gradient: 'stat-gradient-blue' },
              { label: 'Avg Percentage', value: `${classReport.avgPct.toFixed(1)}%`, icon: TrendingUp, gradient: 'stat-gradient-teal' },
              { label: 'Passed', value: classReport.passCount, icon: Trophy, gradient: 'stat-gradient-amber' },
              { label: 'At Risk', value: classReport.failCount, icon: AlertTriangle, gradient: 'stat-gradient-rose' },
            ].map((s, idx) => (
              <Card key={idx} className="glass-card overflow-hidden">
                <CardContent className="p-5 relative">
                  <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full ${s.gradient} opacity-[0.08] blur-xl`} />
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.gradient} shadow-md mb-3`}><s.icon className="h-5 w-5 text-white" /></div>
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground/60 mb-1">{s.label}</p>
                  <p className="text-2xl font-heading font-bold text-foreground">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-3">
            <Button size="sm" className="btn-gradient text-white rounded-xl gap-2 text-xs" onClick={() => exportClassReportPDF(`${selBranch} Sem${selSemester} Sec${selSection}`, classReport.rows, classReport.avgPct.toFixed(1), classReport.passCount, classReport.failCount)}><FileText className="h-3.5 w-3.5" /> Export PDF</Button>
            <Button size="sm" variant="outline" className="rounded-xl gap-2 text-xs" onClick={() => exportClassRosterExcel(classReport.rows, { branch: selBranch, semester: selSemester, section: selSection, passCount: classReport.passCount, failCount: classReport.failCount, avgPct: classReport.avgPct.toFixed(1) })}><FileSpreadsheet className="h-3.5 w-3.5" /> Export Detailed Excel</Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-sm font-heading font-semibold">Score Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={classReport.distData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(225,14%,90%)" vertical={false} />
                    <XAxis dataKey="range" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <RTC contentStyle={{ borderRadius: '12px' }} />
                    <Bar dataKey="count" name="Students" fill="hsl(168,60%,48%)" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-sm font-heading font-semibold">Pass / Fail Ratio</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={classReport.passPie} cx="50%" cy="50%" outerRadius={90} innerRadius={45} dataKey="value" strokeWidth={2} stroke="#fff" label={({ name, value }) => `${name}: ${value}`}>
                      {classReport.passPie.map((e, i) => <Cell key={i} fill={e.name === 'Pass' ? 'hsl(168,60%,48%)' : 'hsl(0,72%,55%)'} />)}
                    </Pie>
                    <RTC />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/30"><CardTitle className="text-sm font-heading font-semibold">Student Roster with Component Breakdown</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {['Rank', 'Name', 'Reg No.', 'MidSem', 'Quiz', 'Asgn 1', 'Asgn 2', 'Attend', 'Percentile', 'Overall'].map(h => (
                      <TableHead key={h} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classReport.rows.map((r, i) => (
                    <TableRow key={i} className="hover:bg-primary/[0.02]">
                      <TableCell className="font-bold text-xs text-muted-foreground">#{i+1}</TableCell>
                      <TableCell className="font-medium text-sm whitespace-nowrap">{r.name}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{r.regNo}</TableCell>
                      <TableCell className="text-xs">{r.midsem || '-'}</TableCell>
                      <TableCell className="text-xs">{r.quiz || '-'}</TableCell>
                      <TableCell className="text-xs">{r.assign1 || '-'}</TableCell>
                      <TableCell className="text-xs">{r.assign2 || '-'}</TableCell>
                      <TableCell className="text-xs">{r.attendance || '-'}</TableCell>
                      <TableCell className="text-xs font-mono">{r.percentile}%</TableCell>
                      <TableCell><PerformBadge pct={r.pct} /></TableCell>
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
