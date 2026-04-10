import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCog, BookOpen } from 'lucide-react';
import { getPerformanceColor } from '@/lib/reportUtils';

export default function AdminTeacherTab({ reportData }) {
  const teachers = reportData?.teachers ?? [];
  const assignments = reportData?.assignments ?? [];
  const subjects = reportData?.subjects ?? [];
  const students = reportData?.students ?? [];
  const assessments = reportData?.assessments ?? [];
  const marksData = Array.isArray(reportData?.marks) ? reportData.marks : [];

  const teacherReport = useMemo(() => {
    return teachers.map(teacher => {
      const tAssigns = assignments.filter(a => a.teacherId === teacher.id);
      
      const classPerformances = tAssigns.map(assign => {
        const sub = subjects.find(s => s.id === assign.subjectId);
        const classStudents = students.filter((student) => {
          if (assign.classId != null && student.classId != null) {
            return String(student.classId) === String(assign.classId);
          }
          return (
            student.branch === assign.branch &&
            Number(student.semester) === Number(assign.semester) &&
            student.section === assign.section
          );
        });
        
        let totalClassMarks = 0;
        let totalClassMax = 0;

        for (const student of classStudents) {
          const marks = marksData.filter(m => m.studentId === student.id && m.subjectId === assign.subjectId);
          for (const m of marks) {
            const a = assessments.find(x => x.id === m.assessmentId);
            if (a) {
              totalClassMarks += m.totalMarks;
              totalClassMax += a.maxMarks;
            }
          }
        }

        const avg = totalClassMax > 0 ? +((totalClassMarks / totalClassMax) * 100).toFixed(1) : 0;

        return {
          assignment: assign,
          subject: sub,
          studentsCount: classStudents.length,
          avg
        };
      }).filter(cp => cp.studentsCount > 0);

      const overallAvg = classPerformances.length > 0 ? +(classPerformances.reduce((acc, cp) => acc + cp.avg, 0) / classPerformances.length).toFixed(1) : 0;

      return {
        teacher,
        classes: classPerformances,
        overallAvg,
        totalStudents: classPerformances.reduce((acc, cp) => acc + cp.studentsCount, 0),
        totalClasses: classPerformances.length
      };
    }).sort((a,b) => b.overallAvg - a.overallAvg);
  }, [teachers, assignments, subjects, students, assessments, marksData]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card className="glass-card overflow-hidden">
        <CardHeader className="bg-muted/20 border-b border-border/30"><CardTitle className="text-sm font-heading font-semibold flex items-center gap-2"><UserCog className="h-4 w-4 text-primary" /> Teacher Performance Overview</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {['Teacher', 'Department', 'Active Classes', 'Total Students', 'Overall Average'].map(h => (
                  <TableHead key={h} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {teacherReport.map((r, i) => (
                <TableRow key={r.teacher.id} className="hover:bg-primary/[0.02]">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-secondary/80 text-xs font-bold text-white shadow-sm">
                        {r.teacher.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                      </div>
                      <span className="font-medium text-sm">{r.teacher.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground uppercase">{r.teacher.department}</TableCell>
                  <TableCell className="text-sm font-medium">{r.totalClasses}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.totalStudents}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-bold" style={{ color: getPerformanceColor(r.overallAvg), borderColor: getPerformanceColor(r.overallAvg) }}>
                      {r.overallAvg > 0 ? `${r.overallAvg}%` : 'N/A'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {teacherReport.filter(r => r.classes.length > 0).map(r => (
          <Card key={r.teacher.id} className="glass-card">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="text-sm font-heading font-semibold flex items-center justify-between">
                <span>{r.teacher.name}</span>
                <span className="text-xs font-mono text-muted-foreground">{r.overallAvg}% Avg</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {r.classes.map((c, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-muted-foreground" /> {c.subject?.subjectCode} ({c.assignment.branch} S{c.assignment.semester} - {c.assignment.section})</span>
                    <span className="font-bold text-xs" style={{ color: getPerformanceColor(c.avg) }}>{c.avg}%</span>
                  </div>
                  <div className="w-full bg-muted/60 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${c.avg}%`, background: getPerformanceColor(c.avg) }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
