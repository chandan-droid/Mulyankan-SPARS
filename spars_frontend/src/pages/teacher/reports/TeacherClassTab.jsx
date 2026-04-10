import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTC, Legend } from 'recharts';
import { FileText, FileSpreadsheet, TrendingUp, Trophy, AlertTriangle, Users } from 'lucide-react';
import { getGrade, getPerformanceColor, exportClassReportPDF, exportClassRosterExcel } from '@/lib/reportUtils';

function PerformBadge({ pct }) {
  const color = pct >= 75 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : pct >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200';
  return <Badge variant="outline" className={`text-[10px] font-semibold ${color}`}>{pct.toFixed(1)}%</Badge>;
}

export default function TeacherClassTab({ reportData, selectedSubject, relevantStudents, branch, semester, section }) {
  const allAssessments = reportData?.assessments ?? [];
  const marksData = Array.isArray(reportData?.marks) ? reportData.marks : [];

  const classOverview = useMemo(() => {
    if (!selectedSubject) return { rows: [], avg: 0 };
    
    const rows = relevantStudents.map(student => {
      const marks = marksData.filter(m => m.studentId === student.id && String(m.subjectId) === String(selectedSubject));
      let tot = 0, max = 0;
      let midsem = 0, quiz = 0, assign1 = 0, assign2 = 0, attend = 0;
      let maxMidsem = 0, maxQuiz = 0, maxAssign1 = 0, maxAssign2 = 0, maxAttend = 0;

      for (const m of marks) {
        const a = allAssessments.find(x => x.id === m.assessmentId);
        if (!a) continue;
        tot += m.totalMarks;
        max += a.maxMarks;

        const assessmentType = String(a.type || m.assessmentType || '').toUpperCase();
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
        student, tot, max, pct, name: student.name, regNo: student.regNo, totalMarks: tot, maxPossible: max, percentage: pct, grade: getGrade(pct).grade, status: pct >= 40 ? 'Pass' : 'Fail',
        midsem: maxMidsem ? +((midsem/maxMidsem)*100).toFixed(0) + '%' : '',
        quiz: maxQuiz ? +((quiz/maxQuiz)*100).toFixed(0) + '%' : '',
        assign1: maxAssign1 ? +((assign1/maxAssign1)*100).toFixed(0) + '%' : '',
        assign2: maxAssign2 ? +((assign2/maxAssign2)*100).toFixed(0) + '%' : '',
        attendance: maxAttend ? +((attend/maxAttend)*100).toFixed(0) + '%' : '',
      };
    }).sort((a, b) => b.pct - a.pct);

    rows.forEach((r, idx) => {
      if (rows.length > 1) {
        r.percentile = +(((rows.length - 1 - idx) / (rows.length - 1)) * 100).toFixed(1);
      } else { r.percentile = 100; }
    });

    const avg = rows.length > 0 ? rows.reduce((s, r) => s + r.pct, 0) / rows.length : 0;
    const passCount = rows.filter(r => r.status === 'Pass').length;

    return { 
      rows, avg, passCount, failCount: rows.length - passCount, passPie: [{ name: 'Pass', value: passCount }, { name: 'Fail', value: rows.length - passCount }].filter(x => x.value > 0)
    };
  }, [selectedSubject, relevantStudents, marksData, allAssessments]);

  if (!selectedSubject) return null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid gap-5 sm:grid-cols-4">
        {[
          { label: 'Class Students', value: relevantStudents.length, icon: Users, gradient: 'stat-gradient-blue' },
          { label: 'Class Average', value: `${classOverview.avg.toFixed(1)}%`, icon: TrendingUp, gradient: 'stat-gradient-teal' },
          { label: 'Top Student', value: classOverview.rows[0]?.student.name.split(' ')[0] || '—', icon: Trophy, gradient: 'stat-gradient-amber' },
          { label: 'At Risk (<40%)', value: classOverview.failCount, icon: AlertTriangle, gradient: 'stat-gradient-rose' },
        ].map((s, i) => (
          <Card key={i} className="glass-card overflow-hidden">
            <CardContent className="p-5 relative">
              <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full ${s.gradient} opacity-[0.08] blur-xl`} />
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.gradient} shadow-md mb-3`}><s.icon className="h-5 w-5 text-white" /></div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60 mb-1">{s.label}</p>
              <p className="text-2xl font-heading font-bold tracking-tight text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Button size="sm" className="btn-gradient text-white rounded-xl gap-2 text-xs" onClick={() => exportClassReportPDF(`S${semester} Sec${section}`, classOverview.rows, classOverview.avg.toFixed(1), classOverview.passCount, classOverview.failCount)}><FileText className="h-3.5 w-3.5" /> Export PDF</Button>
        <Button size="sm" variant="outline" className="rounded-xl gap-2 text-xs" onClick={() => exportClassRosterExcel(classOverview.rows, { branch, semester, section, avgPct: classOverview.avg.toFixed(1), passCount: classOverview.passCount, failCount: classOverview.failCount })}><FileSpreadsheet className="h-3.5 w-3.5" /> Export Detailed Excel</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-heading font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Top Performers</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {classOverview.rows.slice(0, 3).map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : 'bg-amber-700'}`}>{i + 1}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.student.name}</p>
                    <div className="w-full bg-muted/60 rounded-full h-1.5 mt-1"><div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${r.pct}%`, background: getPerformanceColor(r.pct) }} /></div>
                  </div>
                  <PerformBadge pct={r.pct} />
                </div>
              ))}
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-heading font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Needs Attention {"(< 40%)"}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {classOverview.rows.filter(r => r.pct < 40).slice(0, 3).map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.student.name} ({r.student.regNo})</p>
                    <div className="w-full bg-muted/60 rounded-full h-1.5 mt-1"><div className="h-1.5 rounded-full bg-red-500 transition-all duration-700" style={{ width: `${r.pct}%` }} /></div>
                  </div>
                  <PerformBadge pct={r.pct} />
                </div>
              ))}
              {classOverview.failCount === 0 && <p className="text-sm text-muted-foreground py-2">All students are passing! 🎉</p>}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader><CardTitle className="text-sm font-heading font-semibold">Pass / Fail Ratio</CardTitle></CardHeader>
          <CardContent className="flex justify-center items-center h-full pb-8">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={classOverview.passPie} cx="50%" cy="50%" outerRadius={70} innerRadius={35} dataKey="value" strokeWidth={2} stroke="#fff" label={({ name, value }) => `${name}: ${value}`}>
                  {classOverview.passPie.map((e, i) => <Cell key={i} fill={e.name === 'Pass' ? 'hsl(168,60%,48%)' : 'hsl(0,72%,55%)'} />)}
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
                {['Rank', 'Student', 'Reg No.', 'MidSem', 'Quiz', 'Asgn 1', 'Asgn 2', 'Attend', 'Percentile', 'Overall'].map(h => (
                  <TableHead key={h} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {classOverview.rows.map((r, i) => (
                <TableRow key={i} className="hover:bg-primary/[0.02]">
                  <TableCell className="font-bold text-xs text-muted-foreground">#{i+1}</TableCell>
                  <TableCell className="font-medium text-sm whitespace-nowrap">{r.student.name}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{r.student.regNo}</TableCell>
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
  );
}
