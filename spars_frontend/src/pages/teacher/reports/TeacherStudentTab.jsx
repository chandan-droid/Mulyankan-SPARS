import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RTC, Legend } from 'recharts';
import { FileText, FileSpreadsheet, Target, TrendingUp, Award, Users, Loader2 } from 'lucide-react';
import { getGrade, exportStudentReportPDF, exportToExcel } from '@/lib/reportUtils';
import { getStudentCoAttainment } from '@/lib/teacherApi';

function PerformBadge({ pct }) {
  const color = pct >= 75 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : pct >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200';
  return <Badge variant="outline" className={`text-[10px] font-semibold ${color}`}>{pct.toFixed(1)}%</Badge>;
}

export default function TeacherStudentTab({ reportData, selectedSubject, relevantStudents, subjectInfo }) {
  const allAssessments = reportData?.assessments ?? [];
  const marks = Array.isArray(reportData?.marks) ? reportData.marks : [];
  const questionMarks = Array.isArray(reportData?.questionMarks) ? reportData.questionMarks : [];
  const [selectedStudent, setSelectedStudent] = useState('');

  const report = useMemo(() => {
    if (!selectedStudent || !selectedSubject) return null;
    const student = relevantStudents.find(s => s.id === selectedStudent);
    if (!student) return null;

    const studentMarks = marks.filter(m => m.studentId === selectedStudent && String(m.subjectId) === String(selectedSubject)).map(m => ({
      ...m, assessmentInfo: allAssessments.find(a => a.id === m.assessmentId)
    }));

    const rows = studentMarks.map(m => {
      const pct = m.assessmentInfo ? +((m.totalMarks / m.assessmentInfo.maxMarks) * 100).toFixed(1) : 0;
      return {
        subject: subjectInfo?.subjectName || '',
        type: m.assessmentType || m.assessmentInfo?.type,
        marks: m.totalMarks,
        maxMarks: m.assessmentInfo?.maxMarks || 0,
        percentage: pct,
        quizMarks: m.quizMarks ?? m.totalMarks
      };
    });

    const totalMarks = rows.reduce((s, r) => s + r.marks, 0);
    const maxPossible = rows.reduce((s, r) => s + r.maxMarks, 0);
    const pct = maxPossible > 0 ? +((totalMarks / maxPossible) * 100).toFixed(1) : 0;

    // Line chart data
    const progressData = studentMarks.map((m, i) => ({
      name: m.assessmentInfo?.name || `${m.assessmentType || 'Assessment'} ${i + 1}`,
      marks: m.totalMarks,
      max: m.assessmentInfo?.maxMarks || 0
    }));

    // Percentile Calc
    const subjectMarksForOtherStudents = {};
    marks.filter(m => m.subjectId === selectedSubject).forEach(m => {
      if(!subjectMarksForOtherStudents[m.studentId]) subjectMarksForOtherStudents[m.studentId] = { tot:0, max:0 };
      const a = allAssessments.find(x => x.id === m.assessmentId);
      if(a) { subjectMarksForOtherStudents[m.studentId].tot += m.totalMarks; subjectMarksForOtherStudents[m.studentId].max += a.maxMarks; }
    });
    const allPcts = Object.values(subjectMarksForOtherStudents).map(x => x.max > 0 ? +((x.tot/x.max)*100).toFixed(1) : 0).sort((a,b) => a-b);
    let percentile = 100;
    if (allPcts.length > 1) {
      const below = allPcts.filter(p => p < pct).length;
      percentile = +((below / (allPcts.length - 1))*100).toFixed(1);
    }

    return { student, rows, totalMarks, maxPossible, pct, grade: getGrade(pct), progressData, percentile };
  }, [selectedStudent, selectedSubject, relevantStudents, marks, allAssessments, subjectInfo]);

  const [coData, setCoData] = useState([]);
  const [loadingCo, setLoadingCo] = useState(false);

  useEffect(() => {
    if (!selectedStudent || !selectedSubject) {
      setCoData([]);
      return;
    }
    let cancel = false;
    setLoadingCo(true);
    getStudentCoAttainment(selectedStudent, selectedSubject)
      .then(res => {
         if (cancel) return;
         const formatted = (res?.coAttainments || []).map(co => ({
            co: `CO${co.coNumber}`,
            avg: co.attainmentLevel,
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
  }, [selectedStudent, selectedSubject]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card className="glass-card">
        <CardContent className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-4">Select Student</p>
          <div className="max-w-xs">
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="rounded-xl h-10 bg-card"><SelectValue placeholder="Choose a student..." /></SelectTrigger>
              <SelectContent>
                {relevantStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.regNo})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!selectedStudent && (
        <div className="text-center py-20 text-muted-foreground"><Users className="h-10 w-10 mx-auto mb-3 opacity-20" />Select a student from your class.</div>
      )}

      {report && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-primary-foreground shadow-md">
                {report.student.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
              </div>
              <div>
                <p className="font-heading font-semibold text-foreground">{report.student.name}</p>
                <p className="text-xs text-muted-foreground">Percentile in Class: <span className="font-bold text-foreground">{report.percentile}%</span></p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="btn-gradient text-white rounded-xl gap-2 text-xs" onClick={() => exportStudentReportPDF({ studentName: report.student.name, regNo: report.student.regNo, branch: report.student.branch, semester: report.student.semester, section: report.student.section, rows: report.rows, totalMarks: report.totalMarks, maxPossible: report.maxPossible, percentage: report.pct.toString(), grade: report.grade.grade, coData: coData })}><FileText className="h-3.5 w-3.5" /> PDF</Button>
              <Button size="sm" variant="outline" className="rounded-xl gap-2 text-xs" onClick={() => exportToExcel(report.rows.map(r => ({ Subject: r.subject, Type: r.type, Marks: r.marks, MaxMarks: r.maxMarks, Percentage: r.percentage + '%' })), `${report.student.name}_marks`)}><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</Button>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { label: 'Total Marks', value: `${report.totalMarks} / ${report.maxPossible}`, icon: Target, gradient: 'stat-gradient-blue' },
              { label: 'Percentage', value: `${report.pct}%`, icon: TrendingUp, gradient: 'stat-gradient-teal' },
              { label: 'Grade', value: report.grade.grade, icon: Award, gradient: 'stat-gradient-amber' },
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

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="glass-card lg:col-span-2">
              <CardHeader className="bg-muted/20 border-b border-border/30"><CardTitle className="text-sm font-heading font-semibold">Assessment Breakdown</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      {['Type', 'Score Details', 'Marks', 'Max', 'Percentage'].map(h => <TableHead key={h} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">{h}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.rows.map((m, i) => (
                      <TableRow key={i} className="hover:bg-primary/[0.02]">
                        <TableCell><Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/15">{m.type}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {String(m.type).toUpperCase() === 'QUIZ' ? (
                            <Badge variant="secondary" className="bg-primary/10 border-primary/20 text-primary">
                              Quiz: {m.quizMarks}
                            </Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="font-semibold text-sm">{m.marks}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.maxMarks}</TableCell>
                        <TableCell><PerformBadge pct={m.percentage} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader><CardTitle className="text-sm font-heading font-semibold">CO Radar Chart</CardTitle></CardHeader>
              <CardContent>
                {loadingCo ? (
                  <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                  </div>
                ) : coData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={coData}>
                      <PolarGrid stroke="hsl(225,14%,90%)" />
                      <PolarAngleAxis dataKey="co" tick={{ fill: 'hsl(224,12%,48%)', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="Attainment %" dataKey="avg" stroke="hsl(235,65%,55%)" fill="hsl(235,65%,55%)" fillOpacity={0.4} />
                      <RTC wrapperStyle={{ borderRadius: '12px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm">No MidSem data recorded.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
