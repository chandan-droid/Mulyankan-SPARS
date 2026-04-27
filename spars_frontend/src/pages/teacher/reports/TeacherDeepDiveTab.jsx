import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTC, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Search, Trophy, AlertTriangle, Loader2, BarChart3 } from 'lucide-react';
import { getPerformanceDistribution } from '@/lib/teacherApi';

const DISTRIBUTION_COLORS = [
  'hsl(235,65%,58%)', 'hsl(168,60%,48%)', 'hsl(35,95%,58%)',
  'hsl(0,72%,55%)', 'hsl(215,90%,56%)', 'hsl(280,65%,55%)',
];

export default function TeacherDeepDiveTab({ reportData, selectedSubject, relevantStudents, subjectName, subjectCode }) {
  const marksData = Array.isArray(reportData?.marks) ? reportData.marks : [];
  const allAssessments = reportData?.assessments ?? [];
  const [selectedAssesmentId, setSelectedAssesmentId] = useState('');
  const [distribution, setDistribution] = useState([]);
  const [distLoading, setDistLoading] = useState(false);

  const resolvedSubjectName = subjectName || '';
  const resolvedSubjectCode = subjectCode || '';

  const subjectAssessments = useMemo(() => {
    if (!selectedSubject) return [];
    return allAssessments.filter((a) => String(a.subjectId) === String(selectedSubject));
  }, [selectedSubject, allAssessments]);

  useEffect(() => {
    if (!subjectAssessments.length) {
      setSelectedAssesmentId('');
      return;
    }
    const hasSelection = subjectAssessments.some(
      (assessment) => String(assessment.id) === String(selectedAssesmentId)
    );
    if (!hasSelection) {
      setSelectedAssesmentId(String(subjectAssessments[0].id));
    }
  }, [subjectAssessments, selectedAssesmentId]);

  const deepDiveReport = useMemo(() => {
    if (!selectedAssesmentId || !selectedSubject) return null;
    const a = subjectAssessments.find(x => String(x.id) === String(selectedAssesmentId));
    if (!a) return null;

    const classStudentIds = new Set(relevantStudents.map((s) => String(s.id)));
    const filteredMarks = marksData.filter(
      (m) =>
        String(m.assessmentId) === String(selectedAssesmentId) &&
        classStudentIds.has(String(m.studentId))
    );

    const rows = filteredMarks.map((m) => {
      const student = relevantStudents.find((s) => String(s.id) === String(m.studentId));
      if (!student) return null;
      const totalMarks = m.totalMarks ?? m.marksObtained ?? 0;
      const pct = a.maxMarks > 0 ? +((totalMarks / a.maxMarks) * 100).toFixed(1) : 0;
      return { student, marks: totalMarks, pct };
    }).filter(Boolean).sort((a, b) => b.marks - a.marks);

    const avgPct = rows.length > 0 ? +(rows.reduce((s, r) => s + r.pct, 0) / rows.length).toFixed(1) : 0;
    const isOutlierTop = (idx) => idx < Math.ceil(rows.length * 0.1);
    const isOutlierBottom = (idx) => idx >= rows.length - Math.ceil(rows.length * 0.1);

    return { a, rows, avgPct, isOutlierTop, isOutlierBottom };
  }, [selectedAssesmentId, selectedSubject, subjectAssessments, relevantStudents, marksData]);

  useEffect(() => {
    if (!selectedAssesmentId) {
      setDistribution([]);
      return;
    }

    let cancel = false;
    setDistLoading(true);
    getPerformanceDistribution(selectedAssesmentId)
      .then((data) => {
        if (cancel) return;
        setDistribution(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancel) setDistribution([]);
      })
      .finally(() => {
        if (!cancel) setDistLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, [selectedAssesmentId]);

  if (!selectedSubject) return null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {!deepDiveReport && (
        <div className="text-center py-20 text-muted-foreground"><Search className="h-10 w-10 mx-auto mb-3 opacity-20" />Select an assessment to dive deep.</div>
      )}

      {subjectAssessments.length > 0 && (
        <Card className="glass-card overflow-hidden">
          <CardHeader className="pb-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-sm font-heading font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-sky-500" />
                Score Distribution by Assessment
              </CardTitle>
              <Select value={selectedAssesmentId} onValueChange={setSelectedAssesmentId}>
                <SelectTrigger className="w-full sm:w-56 h-9 rounded-xl text-xs bg-background/50">
                  <SelectValue placeholder="Select Assessment" />
                </SelectTrigger>
                <SelectContent>
                  {subjectAssessments.map((assessment) => (
                    <SelectItem key={assessment.id} value={String(assessment.id)}>
                      {assessment.name || assessment.type} ({assessment.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {distLoading ? (
              <div className="flex py-10 justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : distribution.length > 0 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(225,14%,90%)" />
                    <XAxis dataKey="range" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <RTC formatter={(v) => [`${v} students`, 'Count']} />
                    <Bar dataKey="studentCount" name="Students" radius={[6, 6, 0, 0]} barSize={32}>
                      {distribution.map((_, i) => (
                        <Cell key={i} fill={DISTRIBUTION_COLORS[i % DISTRIBUTION_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">No distribution data for this assessment.</p>
            )}
          </CardContent>
        </Card>
      )}

      {deepDiveReport && (
        <div className="space-y-6">
          <div className="space-y-6">
            <Card className="glass-card">
              <CardContent className="p-5 flex flex-col justify-center items-center h-full min-h-[140px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60 mb-1">Class Average for this Assessment</p>
                <p className="text-4xl font-heading font-bold text-foreground">{deepDiveReport.avgPct}%</p>
              </CardContent>
            </Card>
            {/* <div className="flex gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5 items-center">
              <Trophy className="h-5 w-5 text-amber-500" />
              <p className="text-sm font-medium">Top 10% outlier students highlighted in <span className="text-emerald-600 font-bold">Green</span>.</p>
            </div>
            <div className="flex gap-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5 items-center">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <p className="text-sm font-medium">Bottom 10% outlier students highlighted in <span className="text-red-500 font-bold">Red</span>.</p>
            </div> */}
          </div>

          <Card className="glass-card overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/30"><CardTitle className="text-sm font-heading font-semibold">Ranked Student List</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {['Rank', 'Name', 'Reg No.', 'Score', 'Percentage'].map(h => (
                      <TableHead key={h} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deepDiveReport.rows.map((r, i) => (
                    <TableRow key={i} className={`hover:bg-primary/[0.02] ${deepDiveReport.isOutlierTop(i) ? 'bg-emerald-500/[0.05]' : deepDiveReport.isOutlierBottom(i) ? 'bg-red-500/[0.05]' : ''}`}>
                      <TableCell className="font-bold text-xs text-muted-foreground">#{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm">
                        {r.student.name}
                        {deepDiveReport.isOutlierTop(i) && <span className="ml-2 text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Top 10%</span>}
                        {deepDiveReport.isOutlierBottom(i) && <span className="ml-2 text-[10px] text-red-600 font-bold uppercase tracking-wider">At Risk</span>}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{r.student.regNo}</TableCell>
                      <TableCell className="font-semibold">{r.marks}</TableCell>
                      <TableCell className="font-mono text-xs">{r.pct}%</TableCell>
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
