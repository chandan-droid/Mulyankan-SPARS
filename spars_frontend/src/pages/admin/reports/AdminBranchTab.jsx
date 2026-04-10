import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Building2, Trophy, Users } from 'lucide-react';

export default function AdminBranchTab({ reportData }) {
  const allStudents = reportData?.students ?? [];
  const allAssessments = reportData?.assessments ?? [];
  const marksData = Array.isArray(reportData?.marks) ? reportData.marks : [];

  const branchReport = useMemo(() => {
    const branches = [...new Set(allStudents.map(s => s.branch))].sort();
    
    const reportList = branches.map(b => {
      const bStudents = allStudents.filter(s => s.branch === b);
      let totalBranchMarks = 0;
      let maxBranchMarks = 0;

      const studentTotals = bStudents.map(student => {
        const marks = marksData.filter(m => m.studentId === student.id);
        let tot = 0, max = 0;
        for (const m of marks) {
          const a = allAssessments.find(x => x.id === m.assessmentId);
          if (a) { tot += m.totalMarks; max += a.maxMarks; }
        }
        totalBranchMarks += tot;
        maxBranchMarks += max;
        return { student, tot, max, pct: max > 0 ? +((tot/max)*100).toFixed(1) : 0 };
      }).sort((a, b) => b.pct - a.pct);

      return {
        branch: b,
        studentCount: bStudents.length,
        avgPct: maxBranchMarks > 0 ? +((totalBranchMarks / maxBranchMarks) * 100).toFixed(1) : 0,
        topStudent: studentTotals[0] || null
      };
    }).filter(r => r.studentCount > 0);

    return reportList.sort((a,b) => b.avgPct - a.avgPct);
  }, [allStudents, allAssessments, marksData]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-sm font-heading font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Branch Performance Comparison</CardTitle></CardHeader>
          <CardContent>
            {branchReport.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={branchReport} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(225,14%,90%)" horizontal={true} vertical={false} />
                  <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="branch" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                  <Tooltip cursor={{ fill: 'hsl(225,14%,90%,0.4)' }} formatter={(v) => [`${v}%`, 'Average']} contentStyle={{ borderRadius: '12px' }} />
                  <Bar dataKey="avgPct" radius={[0, 6, 6, 0]} barSize={24}>
                    {branchReport.map((entry, i) => (
                      <Cell key={i} fill={i === 0 ? 'hsl(235,65%,55%)' : i === branchReport.length - 1 ? 'hsl(0,72%,55%)' : 'hsl(215,90%,56%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-16 text-muted-foreground text-sm">No data available</div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {branchReport.slice(0, 3).map((r, i) => (
            <Card key={r.branch} className="glass-card flex items-center p-5 gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : 'bg-amber-700'}`}>
                <Trophy className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-heading font-bold text-lg leading-none">{r.branch}</p>
                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" /> {r.studentCount} students
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold font-heading">{r.avgPct.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Average</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardHeader className="bg-muted/20 border-b border-border/30"><CardTitle className="text-sm font-heading font-semibold">Department Breakdown</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {['Rank', 'Branch', 'Students', 'Top Student', 'Top Score', 'Overall Average'].map(h => (
                  <TableHead key={h} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {branchReport.map((r, i) => (
                <TableRow key={r.branch} className="hover:bg-primary/[0.02]">
                  <TableCell className="font-bold text-sm text-muted-foreground">#{i+1}</TableCell>
                  <TableCell className="font-bold text-sm">{r.branch}</TableCell>
                  <TableCell className="text-sm">{r.studentCount}</TableCell>
                  <TableCell className="text-sm font-medium">{r.topStudent?.student.name || '—'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] bg-primary/5">{r.topStudent ? `${r.topStudent.pct}%` : '—'}</Badge></TableCell>
                  <TableCell className="font-semibold text-sm">{r.avgPct}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
