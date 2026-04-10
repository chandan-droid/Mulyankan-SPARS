import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTC, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { FileText, Target } from 'lucide-react';
import { getPerformanceColor, exportCOAttainmentPDF } from '@/lib/reportUtils';
import { getMidsemTemplate, buildDefaultMidsemQuestions } from '@/data/store';

export default function TeacherCOTab({ reportData, selectedSubject, relevantStudents, branch, semester, section }) {
  const marksData = Array.isArray(reportData?.marks) ? reportData.marks : [];
  const questionMarksData = Array.isArray(reportData?.questionMarks) ? reportData.questionMarks : [];
  const threshold = 60; // 60% standard attainment threshold

  const coData = useMemo(() => {
    if (!selectedSubject) return [];
    
    // Get all MidSem marks for this subject for the class
    const studentIds = relevantStudents.map(s => s.id);
    const midsemMarks = marksData.filter(
      (m) =>
        String(m.subjectId) === String(selectedSubject) &&
        String(m.assessmentType).toUpperCase() === 'MIDSEM' &&
        studentIds.includes(m.studentId)
    );

    const coMap = {};
    const assessmentTemplates = {};

    for (const m of midsemMarks) {
      if (!assessmentTemplates[m.assessmentId]) {
         const t = getMidsemTemplate(m.assessmentId);
         assessmentTemplates[m.assessmentId] = t ? t.questions : buildDefaultMidsemQuestions();
      }
      const questions = assessmentTemplates[m.assessmentId];

      for (const qm of questionMarksData.filter(q => q.markId === m.id)) {
        const match = questions.find(q => 
           String(q.questionNumber) === String(qm.questionNumber) || 
           String(questions.indexOf(q) + 1) === String(qm.questionNumber)
        );

        const rawCo = match?.coNumber ?? qm.coNumber ?? 1;
        const cleanCo = String(rawCo).replace(/[^0-9]/g, '') || '1';
        const key = `CO${cleanCo}`;
        
        const maxM = match?.maxMarks ?? qm.maxMarks ?? 0;

        if (!coMap[key]) coMap[key] = { obtained: 0, max: 0 };
        coMap[key].obtained += Number(qm.obtainedMarks ?? qm.marksObtained ?? 0);
        coMap[key].max += Number(maxM);
      }
    }

    return Object.entries(coMap).map(([co, v]) => ({
      co, obtained: v.obtained, max: v.max,
      avg: v.max > 0 ? +((v.obtained / v.max) * 100).toFixed(1) : 0
    })).sort((a,b) => String(a.co).localeCompare(String(b.co), undefined, {numeric: true}));
  }, [selectedSubject, relevantStudents, marksData, questionMarksData]);

  if (!selectedSubject) return null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {coData.length > 0 ? (
        <>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-muted-foreground">Class-wide Course Outcome Attainment</p>
              <h2 className="text-xl font-heading font-bold text-foreground">Target Threshold: {threshold}%</h2>
            </div>
            <Button size="sm" className="btn-gradient text-white rounded-xl gap-2 text-xs" onClick={() => exportCOAttainmentPDF(`S${semester} Sec${section}`, coData, threshold)}>
              <FileText className="h-3.5 w-3.5" /> Export CO Report PDF
            </Button>
          </div>

          <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {coData.map((co) => (
              <Card key={co.co} className="glass-card overflow-hidden">
                <CardContent className="p-5 relative text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60 mb-2">{co.co}</p>
                  <p className="text-2xl font-heading font-bold" style={{ color: getPerformanceColor(co.avg) }}>{co.avg}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Avg Score</p>
                  <div className="w-full bg-muted/60 rounded-full h-1.5 mt-2">
                    <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${Math.min(co.avg, 100)}%`, background: getPerformanceColor(co.avg) }} />
                  </div>
                  <div className="mt-3 text-[10px] font-bold uppercase tracking-wider">
                    {co.avg >= threshold ? <span className="text-emerald-500">✓ Attained</span> : <span className="text-red-500">✗ Not Attained</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="glass-card">
            <CardHeader><CardTitle className="text-sm font-heading font-semibold">CO-wise Attainment Chart</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={coData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(225,14%,90%)" vertical={false} />
                  <XAxis dataKey="co" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <RTC contentStyle={{ borderRadius: '12px' }} />
                  <Legend />
                  <ReferenceLine y={threshold} label={{ position: 'top', value: `Target ${threshold}%`, fill: 'hsl(0,72%,55%)', fontSize: 11 }} stroke="hsl(0,72%,55%)" strokeDasharray="3 3" />
                  <Bar dataKey="avg" name="Attainment %" radius={[6, 6, 0, 0]}>
                    {coData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.avg >= threshold ? 'hsl(168,60%,48%)' : 'hsl(0,72%,55%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-16">
          <Target className="h-10 w-10 text-muted-foreground/15 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No CO data available. CO analysis requires MidSem marks.</p>
        </div>
      )}
    </div>
  );
}
