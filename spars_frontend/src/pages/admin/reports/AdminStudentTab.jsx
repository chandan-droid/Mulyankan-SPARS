import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { FileText, FileSpreadsheet, Target, TrendingUp, Award, Users, Loader2 } from 'lucide-react';
import { getGrade, exportStudentReportPDF, exportToExcel, getPerformanceColor } from '@/lib/reportUtils';
import { getAdminStudentCoAttainment } from '@/lib/adminApi';

function PerformBadge({ pct }) {
  const color = pct >= 75 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : pct >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-red-100 text-red-700 border-red-200';
  return <Badge variant="outline" className={`text-[10px] font-semibold ${color}`}>{pct.toFixed(1)}%</Badge>;
}

export default function AdminStudentTab({ reportData }) {
  const allStudents = reportData?.students ?? [];
  const allAssessments = reportData?.assessments ?? [];
  const allSubjects = reportData?.subjects ?? [];
  const marks = Array.isArray(reportData?.marks) ? reportData.marks : [];
  const questionMarks = Array.isArray(reportData?.questionMarks) ? reportData.questionMarks : [];
  const [selStudent, setSelStudent] = useState('');

  const report = useMemo(() => {
    if (!selStudent) return null;
    const student = allStudents.find((s) => s.id === selStudent);
    if (!student) return null;

    const studentMarks = marks.filter((m) => m.studentId === selStudent).map(m => ({
      ...m,
      assessmentInfo: allAssessments.find(a => a.id === m.assessmentId),
      subjectInfo: allSubjects.find(s => s.id === m.subjectId)
    }));

    const rows = studentMarks.map(m => {
      const pct = m.assessmentInfo ? +((m.totalMarks / m.assessmentInfo.maxMarks) * 100).toFixed(1) : 0;
      return {
        subject: m.subjectInfo?.subjectName || '',
        type: m.assessmentType,
        marks: m.totalMarks,
        maxMarks: m.assessmentInfo?.maxMarks || 0,
        percentage: pct,
        quizScores: m.quizScores // for quiz breakdown
      };
    });

    const totalMarks = rows.reduce((s, r) => s + r.marks, 0);
    const maxPossible = rows.reduce((s, r) => s + r.maxMarks, 0);
    const pct = maxPossible > 0 ? +((totalMarks / maxPossible) * 100).toFixed(1) : 0;

    return { student, rows, totalMarks, maxPossible, pct, grade: getGrade(pct) };
  }, [selStudent, allStudents, marks, allAssessments, allSubjects]);

  const studentSubjects = useMemo(() => {
     if (!selStudent) return [];
     const ids = new Set();
     marks.filter(m => m.studentId === selStudent && m.subjectId).forEach(m => ids.add(m.subjectId));
     return allSubjects.filter(s => ids.has(s.id));
  }, [selStudent, marks, allSubjects]);

  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [coData, setCoData] = useState([]);
  const [loadingCo, setLoadingCo] = useState(false);

  useEffect(() => {
    if (studentSubjects.length > 0 && (!selectedSubjectId || !studentSubjects.find(s => String(s.id) === String(selectedSubjectId)))) {
       setSelectedSubjectId(String(studentSubjects[0].id));
    } else if (studentSubjects.length === 0) {
       setSelectedSubjectId('');
       setCoData([]);
    }
  }, [studentSubjects, selectedSubjectId]);

  useEffect(() => {
    if (!selStudent || !selectedSubjectId) {
      setCoData([]);
      return;
    }
    let cancel = false;
    setLoadingCo(true);
    getAdminStudentCoAttainment(selStudent, selectedSubjectId)
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
  }, [selStudent, selectedSubjectId]);

  const handleExportPDF = () => {
    if (!report) return;
    exportStudentReportPDF({
      studentName: report.student.name,
      regNo: report.student.regNo,
      branch: report.student.branch,
      semester: report.student.semester,
      section: report.student.section,
      rows: report.rows,
      totalMarks: report.totalMarks,
      maxPossible: report.maxPossible,
      percentage: report.pct.toString(),
      grade: report.grade.grade,
      coData: coData
    });
  };

  const handleExportExcel = () => {
    if (!report) return;
    exportToExcel(report.rows.map(r => ({
      Subject: r.subject,
      Type: r.type,
      Marks: r.marks,
      MaxMarks: r.maxMarks,
      Percentage: r.percentage + '%',
      'CO Data Available': coData.length > 0 ? 'Yes' : 'No'
    })), `${report.student.name}_marks`);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card className="glass-card">
        <CardContent className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-4">Select Student</p>
          <div className="max-w-xs">
            <Select value={selStudent} onValueChange={setSelStudent}>
              <SelectTrigger className="rounded-xl h-10 bg-card"><SelectValue placeholder="Choose a student..." /></SelectTrigger>
              <SelectContent>
                {allStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.regNo})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!selStudent && (
        <div className="text-center py-20 text-muted-foreground"><Users className="h-10 w-10 mx-auto mb-3 opacity-20" />Select a student above.</div>
      )}

      {report && (
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { label: 'Total Marks', value: `${report.totalMarks}/${report.maxPossible}`, icon: Target, gradient: 'stat-gradient-blue' },
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

          <div className="flex gap-3 flex-wrap">
            <Button size="sm" className="btn-gradient text-white rounded-xl gap-2 text-xs" onClick={handleExportPDF}><FileText className="h-3.5 w-3.5" /> Export PDF</Button>
            <Button size="sm" variant="outline" className="rounded-xl gap-2 text-xs" onClick={handleExportExcel}><FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel</Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Marks breakdown table */}
            <Card className="glass-card overflow-hidden lg:col-span-2">
              <CardHeader className="bg-muted/20 border-b border-border/30"><CardTitle className="text-sm font-heading font-semibold">Assessment History</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      {['Subject', 'Type', 'Marks Details', 'Score', 'Percentage'].map(h => (
                        <TableHead key={h} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.rows.map((r, i) => (
                      <TableRow key={i} className="hover:bg-primary/[0.02]">
                        <TableCell className="text-sm font-medium">{r.subject}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/15">{r.type}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.type === 'QUIZ' && r.quizScores ? (
                            <span className="flex gap-1">
                              {r.quizScores.map((q, idx) => (
                                <Badge key={idx} variant="secondary" className={q === r.marks ? 'bg-primary/20 border-primary text-primary' : ''}>Q{idx+1}: {q}</Badge>
                              ))}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="font-semibold text-sm">{r.marks} <span className="text-xs text-muted-foreground font-normal">/ {r.maxMarks}</span></TableCell>
                        <TableCell><PerformBadge pct={r.percentage} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* CO Radar */}
            <Card className="glass-card">
              <CardHeader className="flex flex-col space-y-2 pb-2">
                <CardTitle className="text-sm font-heading font-semibold flex items-center justify-between">
                  <span>CO Performance</span>
                </CardTitle>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger className="h-8 text-xs bg-background/50">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {studentSubjects.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.subjectCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
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
                      <Tooltip wrapperStyle={{ borderRadius: '12px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm">No CO data from MidSem.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
