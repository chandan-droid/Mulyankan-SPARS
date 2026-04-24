import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTC, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { FileText, Target, Loader2 } from 'lucide-react';
import { getPerformanceColor, exportCOAttainmentPDF } from '@/lib/reportUtils';
import { getClassCoAttainment } from '@/lib/teacherApi';

export default function TeacherCOTab({ reportData, selectedSubject, relevantStudents, branch, semester, section, classId }) {
  const threshold = 60; // 60% standard attainment threshold

  const [coData, setCoData] = useState([]);
  const [loadingCo, setLoadingCo] = useState(false);

  useEffect(() => {
    if (!selectedSubject || !classId || classId === 'undefined') {
       setCoData([]);
       return;
    }
    
    let cancel = false;
    setLoadingCo(true);
    getClassCoAttainment(classId, selectedSubject)
      .then(res => {
         if (cancel) return;
         const formatted = (res?.coAttainments || []).map(co => ({
            co: `CO${co.coNumber}`,
            avg: Math.round(Number(co.attainmentLevel) * 10) / 10,
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
  }, [classId, selectedSubject]);

  if (!selectedSubject) return null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {loadingCo ? (
        <div className="flex py-16 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-3 text-primary" /> Fetching class CO attainment...
        </div>
      ) : coData.length > 0 ? (
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
