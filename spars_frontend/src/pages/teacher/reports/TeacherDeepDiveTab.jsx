import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTC, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Search, Trophy, AlertTriangle } from 'lucide-react';

export default function TeacherDeepDiveTab({ reportData, selectedSubject, relevantStudents }) {
  const marksData = Array.isArray(reportData?.marks) ? reportData.marks : [];
  const allAssessments = reportData?.assessments ?? [];
  const [selectedAssesmentId, setSelectedAssesmentId] = useState('');

  const subjectAssessments = useMemo(() => {
    if (!selectedSubject) return [];
    return allAssessments.filter(a => a.subjectId === selectedSubject);
  }, [selectedSubject, allAssessments]);

  const deepDiveReport = useMemo(() => {
    if (!selectedAssesmentId || !selectedSubject) return null;
    const a = subjectAssessments.find(x => x.id === selectedAssesmentId);
    if (!a) return null;

    const classStudentIds = relevantStudents.map(s => s.id);
    const filteredMarks = marksData.filter(m => m.assessmentId === selectedAssesmentId && classStudentIds.includes(m.studentId));

    const rows = filteredMarks.map(m => {
      const student = relevantStudents.find(s => s.id === m.studentId);
      const totalMarks = m.totalMarks ?? m.marksObtained ?? 0;
      const pct = a.maxMarks > 0 ? +((totalMarks / a.maxMarks) * 100).toFixed(1) : 0;
      return { student, marks: totalMarks, pct };
    }).sort((a,b) => b.marks - a.marks);

    const avgPct = rows.length > 0 ? +(rows.reduce((s, r) => s + r.pct, 0) / rows.length).toFixed(1) : 0;
    const isOutlierTop = (idx) => idx < Math.ceil(rows.length * 0.1); 
    const isOutlierBottom = (idx) => idx >= rows.length - Math.ceil(rows.length * 0.1);

    // Dynamic Histogram Buckets based on max marks
    const numBuckets = 10;
    const bucketSize = a.maxMarks / numBuckets;
    const buckets = Array(numBuckets).fill(0);
    
    rows.forEach(r => {
      let bIdx = Math.floor(r.marks / bucketSize);
      if (bIdx >= numBuckets) bIdx = numBuckets - 1;
      buckets[bIdx]++;
    });

    const distData = buckets.map((c, i) => ({
      range: `${(i*bucketSize).toFixed(1)}-${((i+1)*bucketSize).toFixed(1)}`,
      count: c
    }));

    return { a, rows, avgPct, distData, isOutlierTop, isOutlierBottom, maxMarks: a.maxMarks };
  }, [selectedAssesmentId, selectedSubject, subjectAssessments, relevantStudents, marksData]);

  if (!selectedSubject) return null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card className="glass-card">
        <CardContent className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-4">Select Assessment</p>
          <div className="max-w-xs">
            <Select value={selectedAssesmentId} onValueChange={setSelectedAssesmentId}>
              <SelectTrigger className="rounded-xl h-10 bg-card"><SelectValue placeholder="Choose assessment..." /></SelectTrigger>
              <SelectContent>
                {subjectAssessments.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.type} - {s.name || s.date || 'Assessment'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!deepDiveReport && (
        <div className="text-center py-20 text-muted-foreground"><Search className="h-10 w-10 mx-auto mb-3 opacity-20" />Select an assessment to dive deep.</div>
      )}

      {deepDiveReport && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-sm font-heading font-semibold">Score Distribution (Max: {deepDiveReport.maxMarks})</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={deepDiveReport.distData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(225,14%,90%)" vertical={false} />
                    <XAxis dataKey="range" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <RTC contentStyle={{ borderRadius: '12px' }} />
                    <Bar dataKey="count" name="Students" fill="hsl(215,90%,56%)" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="space-y-6">
               <Card className="glass-card">
                  <CardContent className="p-5 flex flex-col justify-center items-center h-full min-h-[140px]">
                     <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60 mb-1">Class Average for this Assessment</p>
                     <p className="text-4xl font-heading font-bold text-foreground">{deepDiveReport.avgPct}%</p>
                  </CardContent>
               </Card>
               <div className="flex gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5 items-center">
                 <Trophy className="h-5 w-5 text-amber-500" />
                 <p className="text-sm font-medium">Top 10% outlier students highlighted in <span className="text-emerald-600 font-bold">Green</span>.</p>
               </div>
               <div className="flex gap-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5 items-center">
                 <AlertTriangle className="h-5 w-5 text-red-500" />
                 <p className="text-sm font-medium">Bottom 10% outlier students highlighted in <span className="text-red-500 font-bold">Red</span>.</p>
               </div>
            </div>
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
                      <TableCell className="font-bold text-xs text-muted-foreground">#{i+1}</TableCell>
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
