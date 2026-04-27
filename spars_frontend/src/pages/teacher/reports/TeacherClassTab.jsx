import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Cell, ResponsiveContainer, Tooltip as RTC, BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, PieChart, Pie } from 'recharts';
import { FileText, FileSpreadsheet, TrendingUp, Trophy, AlertTriangle, Users, Target, Loader2 } from 'lucide-react';
import { getGrade, getPerformanceColor, exportClassReportPDF, exportClassRosterExcel } from '@/lib/reportUtils';
import { getClassCoAttainment } from '@/lib/teacherApi';

function PerformBadge({ pct }) {
  if (pct == null) {
    return <Badge variant="outline" className="text-[10px] font-semibold bg-muted text-muted-foreground border-border/50">N/A</Badge>;
  }
  const color = pct >= 75 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : pct >= 40 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200';
  return <Badge variant="outline" className={`text-[10px] font-semibold ${color}`}>{pct.toFixed(1)}%</Badge>;
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isExcellent = data.avg >= 70;
    const isGood = data.avg >= 65 && data.avg < 70;
    const isModerate = data.avg >= 60 && data.avg < 65;
    const isAttained = data.avg >= 60;
    const status = isExcellent ? 'Excellent' : isGood ? 'Good' : isModerate ? 'Moderate' : 'Critical';
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 border border-border/50 p-3 rounded-xl shadow-xl backdrop-blur-md min-w-[180px]">
        <p className="font-semibold text-sm mb-2">{data.co}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-muted-foreground">Attainment:</span>
            <span className="font-bold">{data.avg}%</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-muted-foreground">Status:</span>
            <span className={`font-bold ${isAttained ? 'text-emerald-500' : 'text-red-500'}`}>
              {status}
            </span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 mb-1">Recommended Action</p>
          <p className={`text-xs font-medium leading-relaxed ${isAttained ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {isAttained ? 'Target met. Continue current teaching methods.' : 'Intervention required. Plan remedial sessions.'}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function TeacherClassTab({ reportData, selectedSubject, subjectName, subjectCode, relevantStudents, branch, semester, section, studentCount, academicYear, onOpenStudentReport }) {
  const allAssessments = reportData?.assessments ?? [];
  const marksData = Array.isArray(reportData?.marks) ? reportData.marks : [];
  const [coData, setCoData] = useState([]);
  const [loadingCo, setLoadingCo] = useState(false);

  const resolvedSubjectName = subjectName || '';
  const resolvedSubjectCode = subjectCode || '';

  const subjectAssessmentIds = useMemo(() => {
    const relevantClassIds = new Set(
      relevantStudents
        .map((student) => student.classId)
        .filter((classId) => classId != null)
        .map((classId) => String(classId))
    );

    return new Set(
      allAssessments
        .filter((a) => {
          const assessmentType = String(a.type || '').toUpperCase().replace(/\s+/g, '');
          const isAttendance =
            assessmentType === 'ATTENDANCE' ||
            assessmentType === 'ATTENDENCE' ||
            assessmentType === 'ATT';

          if (isAttendance) {
            if (a.classId == null || relevantClassIds.size === 0) return true;
            return relevantClassIds.has(String(a.classId));
          }

          return String(a.subjectId) === String(selectedSubject);
        })
        .map((a) => String(a.id))
    );
  }, [allAssessments, selectedSubject, relevantStudents]);

  const classOverview = useMemo(() => {
    if (!selectedSubject) return { rows: [], avg: 0 };

    const assessmentById = new Map(allAssessments.map((a) => [String(a.id), a]));

    const rows = relevantStudents.map(student => {
      const marks = marksData.filter(
        (m) =>
          String(m.studentId) === String(student.id) &&
          subjectAssessmentIds.has(String(m.assessmentId))
      );
      let tot = 0, max = 0;
      let midsem = 0, quiz = 0, assignment = 0, attend = 0;
      let maxMidsem = 0, maxQuiz = 0, maxAssignment = 0, maxAttend = 0;
      let hasMidsem = false, hasQuiz = false, hasAssignment = false, hasAttendance = false;

      for (const m of marks) {
        const a = assessmentById.get(String(m.assessmentId));
        if (!a) continue;
        const assessmentType = String(a.type || m.assessmentType || '').toUpperCase().replace(/\s+/g, '');

        const rawMarksValue = m.totalMarks ?? m.marksObtained ?? m.quizMarks ?? m.assignmentMarks;
        let marksValue = Number(rawMarksValue);

        if (!Number.isFinite(marksValue) && (assessmentType === 'ATTENDANCE' || assessmentType === 'ATTENDENCE' || assessmentType === 'ATT')) {
          const attended = Number(m.attendedClasses ?? 0);
          const totalClasses = Number(a.totalClasses ?? a.total_classes ?? 0);
          const maxMarksForAttendance = Number(a.maxMarks ?? 0);
          if (Number.isFinite(attended) && totalClasses > 0 && maxMarksForAttendance > 0) {
            marksValue = attended / totalClasses >= 0.75 ? maxMarksForAttendance : 0;
          }
        }

        if (!Number.isFinite(marksValue)) marksValue = 0;

        const maxMarksValue = Number(a.maxMarks ?? 0);
        tot += marksValue;
        max += maxMarksValue;

        switch (assessmentType) {
          case 'MIDSEM': midsem += marksValue; maxMidsem += maxMarksValue; hasMidsem = true; break;
          case 'QUIZ': quiz += marksValue; maxQuiz += maxMarksValue; hasQuiz = true; break;
          case 'ASSIGNMENT': assignment += marksValue; maxAssignment += maxMarksValue; hasAssignment = true; break;
          case 'ATTENDANCE':
          case 'ATTENDENCE':
          case 'ATT': attend += marksValue; maxAttend += maxMarksValue; hasAttendance = true; break;
        }
      }
      const pct = max > 0 ? +((tot / max) * 100).toFixed(1) : 0;
      const totalOutOf40 = max > 0 ? Number(((tot / max) * 40).toFixed(2)) : 0;
      return {
        student, tot, max, pct, name: student.name, regNo: student.regNo, totalMarks: tot, maxPossible: max, percentage: pct, totalOutOf40, grade: getGrade(pct).grade, status: pct >= 40 ? 'Pass' : 'Fail',
        midsem: hasMidsem ? Number(midsem.toFixed(2)) : null,
        quiz: hasQuiz ? Number(quiz.toFixed(2)) : null,
        assignment: hasAssignment ? Number(assignment.toFixed(2)) : null,
        attendance: hasAttendance ? Number(attend.toFixed(2)) : null,
      };
    }).sort((a, b) => b.pct - a.pct);

    const hasData = rows.some(r => r.maxPossible > 0);
    const avg = rows.length > 0 && hasData ? rows.reduce((s, r) => s + r.pct, 0) / rows.length : 0;
    const passCount = hasData ? rows.filter(r => r.status === 'Pass').length : 0;

    return { rows, avg, passCount, failCount: hasData ? rows.length - passCount : 0, hasData };
  }, [selectedSubject, relevantStudents, marksData, allAssessments, subjectAssessmentIds]);

  useEffect(() => {
    if (!selectedSubject || !relevantStudents.length) {
      setCoData([]);
      return;
    }

    const classId = relevantStudents.find((student) => student.classId != null)?.classId;
    if (!classId) {
      setCoData([]);
      return;
    }

    let cancel = false;
    setLoadingCo(true);
    getClassCoAttainment(classId, selectedSubject)
      .then((res) => {
        if (cancel) return;
        const formatted = (res?.coAttainments || []).map((co) => ({
          co: `CO${co.coNumber}`,
          avg: Math.round(Number(co.attainmentLevel) * 10) / 10,
          status: Math.round(Number(co.attainmentLevel) * 10) / 10 >= 60 ? 'Attained' : 'Action Required',
        }));
        setCoData(formatted);
      })
      .catch(() => {
        if (!cancel) setCoData([]);
      })
      .finally(() => {
        if (!cancel) setLoadingCo(false);
      });

    return () => {
      cancel = true;
    };
  }, [selectedSubject, relevantStudents]);

  if (!selectedSubject) return null;

  const openStudent = (studentId) => {
    if (typeof onOpenStudentReport === 'function') {
      onOpenStudentReport(studentId);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid gap-5 sm:grid-cols-4">
        {[
          {
            label: 'Enrolled',
            value: studentCount != null ? studentCount : relevantStudents.length,
            subLabel: studentCount != null ? `${relevantStudents.length} loaded` : null,
            icon: Users,
            gradient: 'stat-gradient-blue'
          },
          { label: 'Class Average', value: classOverview.hasData ? `${classOverview.avg.toFixed(1)}%` : '—', icon: TrendingUp, gradient: 'stat-gradient-teal' },
          { label: 'Top Student', value: classOverview.hasData ? (classOverview.rows[0]?.student.name.split(' ')[0] || '—') : '—', icon: Trophy, gradient: 'stat-gradient-amber' },
          { label: 'At Risk (<40%)', value: classOverview.hasData ? classOverview.failCount : '—', icon: AlertTriangle, gradient: 'stat-gradient-rose' },
        ].map((s, i) => (
          <Card key={i} className="glass-card overflow-hidden">
            <CardContent className="p-5 relative">
              <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full ${s.gradient} opacity-[0.08] blur-xl`} />
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.gradient} shadow-md mb-3`}><s.icon className="h-5 w-5 text-white" /></div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60 mb-1">{s.label}</p>
              <p className="text-2xl font-heading font-bold tracking-tight text-foreground">{s.value}</p>
              {s.subLabel && <p className="text-[10px] text-muted-foreground mt-0.5">{s.subLabel}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-border/30 pb-3">
          <CardTitle className="text-sm font-heading font-semibold flex items-center justify-between gap-3">
            <span className="flex items-center gap-2"><Target className="h-4 w-4 text-emerald-500" /> Course Outcome Attainment</span>
            <span className="text-xs font-medium text-muted-foreground">Class-wide metrics</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {loadingCo ? (
            <div className="flex min-h-[180px] items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" /> Loading CO attainment...
            </div>
          ) : coData.length > 0 ? (
            <div className="relative rounded-3xl border border-indigo-500/10 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-emerald-500/[0.03] p-5 shadow-sm overflow-hidden">
              <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

              <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-1">Performance</p>
                  <p className="text-lg font-heading font-bold text-foreground">CO-wise Attainment</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-border/50 px-3 py-1.5 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">0-60:</span>
                    <span className="text-xs font-bold text-foreground">{coData.filter((co) => co.avg < 60).length}</span>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-border/50 px-3 py-1.5 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">60-65:</span>
                    <span className="text-xs font-bold text-foreground">{coData.filter((co) => co.avg >= 60 && co.avg < 65).length}</span>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-border/50 px-3 py-1.5 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-lime-500" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">65-70:</span>
                    <span className="text-xs font-bold text-foreground">{coData.filter((co) => co.avg >= 65 && co.avg < 70).length}</span>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-border/50 px-3 py-1.5 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">70+:</span>
                    <span className="text-xs font-bold text-foreground">{coData.filter((co) => co.avg >= 70).length}</span>
                  </div>
                </div>
              </div>
              <div className="relative z-10 w-full mt-2">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={coData} barGap={8} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="teacherCoExcellent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="teacherCoGood" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#84cc16" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#84cc16" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="teacherCoMid" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="teacherCoLow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                    <XAxis dataKey="co" tickLine={false} axisLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: 'currentColor' }} tickMargin={12} opacity={0.6} />
                    <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'currentColor' }} opacity={0.6} />
                    <RTC content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.04)', rx: 8 }} />
                    <ReferenceLine y={60} stroke="#f59e0b" strokeOpacity={0.4} strokeDasharray="4 4" label={{ position: 'top', value: 'Min 60%', fill: '#f59e0b', fontSize: 10, fontWeight: 700 }} />
                    <ReferenceLine y={65} stroke="#84cc16" strokeOpacity={0.4} strokeDasharray="4 4" label={{ position: 'top', value: 'Good 65%', fill: '#84cc16', fontSize: 10, fontWeight: 700 }} />
                    <ReferenceLine y={70} stroke="#10b981" strokeOpacity={0.4} strokeDasharray="4 4" label={{ position: 'top', value: 'Target 70%', fill: '#10b981', fontSize: 10, fontWeight: 700 }} />
                    <Bar dataKey="avg" name="Attainment %" radius={[8, 8, 0, 0]} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out">
                      {coData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.avg >= 70 ? 'url(#teacherCoExcellent)' : entry.avg >= 65 ? 'url(#teacherCoGood)' : entry.avg >= 60 ? 'url(#teacherCoMid)' : 'url(#teacherCoLow)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[180px] items-center justify-center text-center">
              <div>
                <Target className="mx-auto mb-3 h-10 w-10 text-muted-foreground/20" />
                <p className="text-sm font-medium text-muted-foreground">No CO data available for this class yet.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button 
          size="sm" 
          className="btn-gradient text-white rounded-xl gap-2 text-xs" 
          onClick={() => exportClassReportPDF(
            `S${semester} Sec${section}`, 
            classOverview.rows, 
            classOverview.avg.toFixed(1), 
            classOverview.passCount, 
            classOverview.failCount,
            coData,
            resolvedSubjectName,
            resolvedSubjectCode
          )}
        >
          <FileText className="h-3.5 w-3.5" /> Export PDF
        </Button>
        <Button size="sm" variant="outline" className="rounded-xl gap-2 text-xs" onClick={() => exportClassRosterExcel(classOverview.rows, { branch, semester, section, academicYear, avgPct: classOverview.avg.toFixed(1), passCount: classOverview.passCount, failCount: classOverview.failCount })}><FileSpreadsheet className="h-3.5 w-3.5" /> Export Detailed Excel</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-heading font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Top Performers</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {!classOverview.hasData ? (
                <div className="py-4 text-center text-sm text-muted-foreground bg-muted/20 rounded-xl border border-border/30">No assessments recorded yet.</div>
              ) : (
                classOverview.rows.slice(0, 3).map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => openStudent(r.student?.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openStudent(r.student?.id);
                      }
                    }}
                  >
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : 'bg-amber-700'}`}>{i + 1}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{r.student.name}</p>
                      <div className="w-full bg-muted/60 rounded-full h-1.5 mt-1"><div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${r.pct}%`, background: getPerformanceColor(r.pct) }} /></div>
                    </div>
                    <PerformBadge pct={r.pct} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-heading font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Needs Attention {"(< 40%)"}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {!classOverview.hasData ? (
                <div className="py-4 text-center text-sm text-muted-foreground bg-muted/20 rounded-xl border border-border/30">No assessments recorded yet.</div>
              ) : (
                <>
                  {classOverview.rows.filter(r => r.pct < 40).slice(0, 3).map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => openStudent(r.student?.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openStudent(r.student?.id);
                        }
                      }}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{r.student.name} ({r.student.regNo})</p>
                        <div className="w-full bg-muted/60 rounded-full h-1.5 mt-1"><div className="h-1.5 rounded-full bg-red-500 transition-all duration-700" style={{ width: `${r.pct}%` }} /></div>
                      </div>
                      <PerformBadge pct={r.pct} />
                    </div>
                  ))}
                  {classOverview.failCount === 0 && <p className="text-sm text-muted-foreground py-2">All students are passing! 🎉</p>}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card overflow-hidden">
          <CardHeader className="bg-muted/20 border-b border-border/30">
            <CardTitle className="text-sm font-heading font-semibold flex items-center justify-between">
              Report Snapshot
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Class Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            {(() => {
              const excellent = classOverview.rows.filter(r => r.pct >= 75).length;
              const average = classOverview.rows.filter(r => r.pct >= 40 && r.pct < 75).length;
              const fail = classOverview.failCount;

              const pieData = !classOverview.hasData
                ? [{ name: 'No Data', value: 1, color: '#e2e8f0', percentage: 100 }]
                : [
                  { name: 'Excellent', value: excellent, color: '#10b981', sub: '≥ 75%' },
                  { name: 'Satisfactory', value: average, color: '#f59e0b', sub: '40-74%' },
                  { name: 'At Risk', value: fail, color: '#ef4444', sub: '< 40%' }
                ].filter(d => d.value > 0);

              return (
                <div className="flex items-center gap-2">
                  <div className="w-[120px] h-[120px] shrink-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={36}
                          outerRadius={56}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                          isAnimationActive={true}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RTC
                          content={({ active, payload }) => {
                            if (active && payload?.[0]) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background/95 border border-border p-2 rounded-xl shadow-xl text-xs backdrop-blur-sm">
                                  <div className="flex gap-2 items-center">
                                    <div className="w-2 h-2 rounded-full" style={{ background: data.color }} />
                                    <span className="font-bold">{data.name}</span>
                                  </div>
                                  <div className="mt-1 ml-4 text-muted-foreground">
                                    {data.value} {data.value === 1 ? 'student' : 'students'} {data.sub ? `(${data.sub})` : ''}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-heading font-extrabold">{classOverview.rows.length}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">Total</span>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-2 ml-2">
                    {pieData.map((d, i) => d.name !== 'No Data' && (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                          <span className="text-xs font-semibold text-muted-foreground">{d.name}</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: d.color }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-emerald-500/10 to-sky-500/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">CO focus</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {coData.filter((co) => co.avg >= 60).length} of {coData.length || 0} COs attained the 60% threshold.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                The CO bar chart is shown above in a compact view for quick interpretation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardHeader className="bg-muted/20 border-b border-border/30"><CardTitle className="text-sm font-heading font-semibold">Student Roster with Component Breakdown</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {['Rank', 'Student', 'Reg No.', 'MidSem', 'Quiz', 'Assignment', 'Attend', 'Total (Out of 40)', 'Total %'].map(h => (
                  <TableHead key={h} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {classOverview.rows.map((r, i) => {
                const rowBg = r.maxPossible === 0 ? 'hover:bg-primary/[0.02]'
                  : r.pct >= 75 ? 'bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer'
                    : r.pct >= 40 ? 'bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer'
                      : 'bg-red-500/10 hover:bg-red-500/20 cursor-pointer';
                return (
                  <TableRow
                    key={i}
                    className={rowBg}
                    onClick={() => openStudent(r.student?.id)}
                  >
                    <TableCell className="font-bold text-xs text-muted-foreground">#{i + 1}</TableCell>
                    <TableCell className="font-medium text-sm whitespace-nowrap">{r.student.name}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{r.student.regNo}</TableCell>
                    <TableCell className="text-xs">{r.midsem ?? '-'}</TableCell>
                    <TableCell className="text-xs">{r.quiz ?? '-'}</TableCell>
                    <TableCell className="text-xs">{r.assignment ?? '-'}</TableCell>
                    <TableCell className="text-xs">{r.attendance ?? '-'}</TableCell>
                    <TableCell className="text-xs font-semibold">{r.maxPossible > 0 ? r.totalOutOf40.toFixed(1) : '-'}</TableCell>
                    <TableCell><PerformBadge pct={r.maxPossible > 0 ? r.pct : null} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
