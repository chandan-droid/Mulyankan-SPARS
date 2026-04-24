import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip as RTC } from 'recharts';
import { FileText, FileSpreadsheet, Target, TrendingUp, Award, Users, Loader2 } from 'lucide-react';
import { getGrade, exportStudentReportPDF, exportToExcel } from '@/lib/reportUtils';
import { getAdminStudentCoAttainment } from '@/lib/adminApi';

function PerformBadge({ pct }) {
  if (pct == null || isNaN(pct)) return <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">N/A</Badge>;
  const color = pct >= 75 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : pct >= 40 ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-red-100 text-red-700 border-red-200';
  return <Badge variant="outline" className={`text-[10px] font-semibold ${color}`}>{Number(pct).toFixed(1)}%</Badge>;
}

export default function AdminStudentTab({ reportData, deepLinkStudentId, onDeepLinkConsumed }) {
  const allStudents = reportData?.students ?? [];
  const allClasses = reportData?.classes ?? [];
  const allAssessments = reportData?.assessments ?? [];
  const allSubjects = reportData?.subjects ?? [];
  const marks = Array.isArray(reportData?.marks) ? reportData.marks : [];

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selStudent, setSelStudent] = useState('');

  const assessmentById = useMemo(
    () => new Map(allAssessments.map((assessment) => [String(assessment.id), assessment])),
    [allAssessments]
  );
  const subjectById = useMemo(
    () => new Map(allSubjects.map((subject) => [String(subject.id), subject])),
    [allSubjects]
  );

  const filteredStudents = useMemo(() => {
    if (!selectedClassId) return allStudents;
    return allStudents.filter((student) => String(student.classId) === String(selectedClassId));
  }, [allStudents, selectedClassId]);

  const report = useMemo(() => {
    if (!selStudent) return null;
    const student = allStudents.find((s) => String(s.id) === String(selStudent));
    if (!student) return null;

    const studentMarks = marks
      .filter((mark) => String(mark.studentId) === String(selStudent))
      .map((mark) => {
        const assessmentInfo = assessmentById.get(String(mark.assessmentId));
        const subjectInfo = subjectById.get(String(mark.subjectId ?? assessmentInfo?.subjectId));
        return {
          ...mark,
          assessmentInfo,
          subjectInfo,
        };
      })
      .filter((mark) => {
        if (!selectedClassId) return true;
        return String(mark.assessmentInfo?.classId ?? '') === String(selectedClassId);
      });

    const rows = studentMarks.map((mark) => {
      const marksValue = Number(mark.totalMarks ?? mark.marksObtained ?? 0);
      const maxValue = Number(mark.assessmentInfo?.maxMarks ?? 0);
      const pct = maxValue > 0 ? +((marksValue / maxValue) * 100).toFixed(1) : 0;
      const subjectName = mark.subjectInfo?.subjectName ?? mark.subjectInfo?.name ?? null;
      const subjectCode = mark.subjectInfo?.subjectCode ?? mark.subjectInfo?.code ?? null;
      return {
        type: mark.assessmentType || mark.assessmentInfo?.type || 'ASSESSMENT',
        subject: subjectName || subjectCode || 'N/A',
        subjectCode: subjectCode || '',
        marks: marksValue,
        maxMarks: maxValue,
        percentage: pct,
        quizMarks: mark.quizMarks ?? marksValue,
      };
    });

    const totalMarks = rows.reduce((sum, row) => sum + row.marks, 0);
    const maxPossible = rows.reduce((sum, row) => sum + row.maxMarks, 0);
    const pct = maxPossible > 0 ? +((totalMarks / maxPossible) * 100).toFixed(1) : 0;

    const cohort = selectedClassId
      ? filteredStudents
      : allStudents;

    const cohortStats = cohort
      .map((cohortStudent) => {
        const cohortMarks = marks
          .filter((mark) => String(mark.studentId) === String(cohortStudent.id))
          .map((mark) => {
            const assessmentInfo = assessmentById.get(String(mark.assessmentId));
            return {
              mark,
              assessmentInfo,
            };
          })
          .filter(({ assessmentInfo }) => {
            if (!selectedClassId) return true;
            return String(assessmentInfo?.classId ?? '') === String(selectedClassId);
          });

        const cTotal = cohortMarks.reduce(
          (sum, item) => sum + Number(item.mark.totalMarks ?? item.mark.marksObtained ?? 0),
          0
        );
        const cMax = cohortMarks.reduce(
          (sum, item) => sum + Number(item.assessmentInfo?.maxMarks ?? 0),
          0
        );
        return cMax > 0 ? +((cTotal / cMax) * 100).toFixed(1) : null;
      })
      .filter((value) => value !== null)
      .sort((a, b) => a - b);

    let percentile = 100;
    if (cohortStats.length > 1) {
      const below = cohortStats.filter((value) => value < pct).length;
      percentile = +((below / (cohortStats.length - 1)) * 100).toFixed(1);
    }

    // Resolve class metadata for the student
    const studentClass = allClasses.find(c => String(c.id) === String(student.classId));
    const branch = student.branch || studentClass?.branch || 'N/A';
    const semester = student.semester || studentClass?.semester || 'N/A';
    const section = student.section || studentClass?.section || 'N/A';

    return {
      student: { ...student, branch, semester, section },
      rows,
      totalMarks,
      maxPossible,
      pct,
      percentile,
      grade: getGrade(pct),
    };
  }, [
    selStudent,
    allStudents,
    marks,
    selectedClassId,
    filteredStudents,
    assessmentById,
    subjectById,
  ]);

  const studentSubjects = useMemo(() => {
    if (!selStudent) return [];
    const subjectIds = new Set();
    marks
      .filter((mark) => String(mark.studentId) === String(selStudent))
      .forEach((mark) => {
        const assessmentInfo = assessmentById.get(String(mark.assessmentId));
        const sid = mark.subjectId ?? assessmentInfo?.subjectId;
        if (sid != null) subjectIds.add(String(sid));
      });
    return allSubjects.filter((subject) => subjectIds.has(String(subject.id)));
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

  // Deep-link from Class tab: auto-select a student
  useEffect(() => {
    if (deepLinkStudentId) {
      setSelStudent(deepLinkStudentId);
      if (typeof onDeepLinkConsumed === 'function') onDeepLinkConsumed();
    }
  }, [deepLinkStudentId, onDeepLinkConsumed]);

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
          <div className="grid gap-6 sm:grid-cols-2 max-w-2xl">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Filter by Class</p>
              <Select 
                value={selectedClassId} 
                onValueChange={(val) => { 
                  setSelectedClassId(val === 'all' ? '' : val); 
                  setSelStudent(''); 
                }}
              >
                <SelectTrigger className="rounded-xl h-10 bg-card"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {allClasses.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.branch} - S{c.semester} ({c.section})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Select Student</p>
              <Select value={selStudent} onValueChange={setSelStudent}>
                <SelectTrigger className="rounded-xl h-10 bg-card"><SelectValue placeholder="Choose a student..." /></SelectTrigger>
                <SelectContent>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} ({s.regNo})</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled>No students found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selStudent && (
        <div className="text-center py-20 text-muted-foreground"><Users className="h-10 w-10 mx-auto mb-3 opacity-20" />Select a student above.</div>
      )}

      {report && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-primary-foreground shadow-md">
                {report.student.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="font-heading font-semibold text-foreground">{report.student.name}</p>
                <p className="text-xs text-muted-foreground">
                  Percentile in {selectedClassId ? 'Class' : 'Cohort'}:{' '}
                  <span className="font-bold text-foreground">{report.percentile}%</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="btn-gradient text-white rounded-xl gap-2 text-xs" onClick={handleExportPDF}><FileText className="h-3.5 w-3.5" /> PDF</Button>
              <Button size="sm" variant="outline" className="rounded-xl gap-2 text-xs" onClick={handleExportExcel}><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</Button>
            </div>
          </div>

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

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Marks breakdown table */}
            <Card className="glass-card overflow-hidden lg:col-span-2">
              <CardHeader className="bg-muted/20 border-b border-border/30"><CardTitle className="text-sm font-heading font-semibold">Assessment Breakdown</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      {['Subject', 'Type', 'Marks', 'Max', 'Percentage'].map(h => (
                        <TableHead key={h} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.rows.map((r, i) => (
                      <TableRow key={i} className="hover:bg-primary/[0.02]">
                        <TableCell className="text-xs font-medium max-w-[120px] truncate" title={r.subject}>{r.subject}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/15">{r.type}</Badge></TableCell>
                        <TableCell className="font-semibold text-sm">{r.marks}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.maxMarks}</TableCell>
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
                  <span>CO Radar Chart</span>
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
