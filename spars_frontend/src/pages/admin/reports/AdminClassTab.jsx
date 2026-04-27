import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTC, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, ReferenceLine } from 'recharts';
import { FileText, FileSpreadsheet, Users, TrendingUp, Trophy, AlertTriangle, BookOpen, Target, Loader2 } from 'lucide-react';
import { getGrade, exportClassReportPDF, exportClassRosterExcel, getPerformanceColor } from '@/lib/reportUtils';
import { getAdminClassCoAttainment } from '@/lib/adminApi';

function PerformBadge({ pct }) {
  if (pct == null || isNaN(pct)) return <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">N/A</Badge>;
  const color = pct >= 75 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : pct >= 40 ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-red-100 text-red-700 border-red-200';
  return <Badge variant="outline" className={`text-[10px] font-semibold ${color}`}>{Number(pct).toFixed(1)}%</Badge>;
}

const CoTooltip = ({ active, payload }) => {
  if (active && payload?.[0]) {
    const data = payload[0].payload;
    const isAttained = data.avg >= 60;
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 border border-border/50 p-3 rounded-xl shadow-xl backdrop-blur-md min-w-[160px]">
        <p className="font-semibold text-sm mb-1">{data.co}</p>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">Attainment:</span>
          <span className="font-bold">{data.avg}%</span>
        </div>
        <div className={`mt-2 text-xs font-semibold ${isAttained ? 'text-emerald-600' : 'text-red-500'}`}>
          {isAttained ? '✓ Target Met' : '✗ Action Required'}
        </div>
      </div>
    );
  }
  return null;
};

export default function AdminClassTab({ reportData, onNavigateToStudent }) {
  const allStudents = reportData?.students ?? [];
  const allAssessments = reportData?.assessments ?? [];
  const allSubjects = reportData?.subjects ?? [];
  const marksData = Array.isArray(reportData?.marks) ? reportData.marks : [];

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [coData, setCoData] = useState([]);
  const [loadingCo, setLoadingCo] = useState(false);

  const availableClasses = useMemo(() => {
    const classSet = new Set();
    allStudents.forEach(s => {
      if (s.branch && s.semester && s.section) {
        classSet.add(`${s.branch}|${s.semester}|${s.section}`);
      }
    });
    return Array.from(classSet).map(c => {
      const [branch, semester, section] = c.split('|');
      return { 
        id: c, 
        label: `${branch} — Sem ${semester} (Sec ${section})`,
        branch, 
        semester: parseInt(semester), 
        section 
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, [allStudents]);

  // Default select first class
  useEffect(() => {
    if (!selectedClassId && availableClasses.length > 0) {
      setSelectedClassId(availableClasses[0].id);
    }
  }, [availableClasses, selectedClassId]);

  const availableSubjects = useMemo(() => {
    if (!selectedClassId) return [];
    const selectedCls = availableClasses.find(c => c.id === selectedClassId);
    if (!selectedCls) return [];

    // Find classId from a student in the class
    const sampleStudent = allStudents.find(s =>
      s.branch === selectedCls.branch && s.semester === selectedCls.semester && s.section === selectedCls.section
    );
    const classId = sampleStudent?.classId;
    if (!classId) return [];

    const subjectIds = [...new Set(
      allAssessments
        .filter(a => String(a.classId) === String(classId))
        .map(a => a.subjectId)
        .filter(Boolean)
    )];

    return allSubjects
      .filter(s => subjectIds.includes(s.id))
      .sort((a, b) => (a.subjectName || '').localeCompare(b.subjectName || ''));
  }, [selectedClassId, availableClasses, allStudents, allAssessments, allSubjects]);

  // Reset subject filter when class changes (or auto-select first)
  useEffect(() => {
    if (availableSubjects.length > 0) {
      setSelectedSubjectId(String(availableSubjects[0].id));
    } else {
      setSelectedSubjectId('');
    }
  }, [selectedClassId, availableSubjects]);

  const classReport = useMemo(() => {
    if (!selectedClassId) return null;
    const selectedCls = availableClasses.find(c => c.id === selectedClassId);
    if (!selectedCls) return null;
    
    const classStudents = allStudents.filter(s => s.branch === selectedCls.branch && s.semester === selectedCls.semester && s.section === selectedCls.section);
    
    const rows = classStudents.map(student => {
      const marks = marksData.filter(m => {
        const isStudent = String(m.studentId) === String(student.id);
        if (!isStudent) return false;
        if (!selectedSubjectId || selectedSubjectId === 'ALL') return true;
        
        // Match by mark.subjectId or by linking via assessment
        if (m.subjectId && String(m.subjectId) === String(selectedSubjectId)) return true;
        const a = allAssessments.find(x => String(x.id) === String(m.assessmentId));
        return a && String(a.subjectId) === String(selectedSubjectId);
      });
      let tot = 0, max = 0;
      let midsem = 0, quiz = 0, assignment = 0, attend = 0;
      let maxMidsem = 0, maxQuiz = 0, maxAssignment = 0, maxAttend = 0;

      for (const m of marks) {
        const a = allAssessments.find(x => String(x.id) === String(m.assessmentId));
        if (!a) continue;
        const marksValue = Number(m.totalMarks ?? m.marksObtained ?? 0);
        const maxMarksValue = Number(a.maxMarks ?? 0);
        tot += marksValue;
        max += maxMarksValue;
        
        const assessmentType = String(a.type || m.assessmentType || '').toUpperCase();
        switch(assessmentType) {
          case 'MIDSEM': midsem += marksValue; maxMidsem += maxMarksValue; break;
          case 'QUIZ': quiz += marksValue; maxQuiz += maxMarksValue; break;
          case 'ASSIGNMENT': assignment += marksValue; maxAssignment += maxMarksValue; break;
          case 'ATTENDANCE': attend += marksValue; maxAttend += maxMarksValue; break;
        }
      }
      const pct = max > 0 ? +((tot / max) * 100).toFixed(1) : 0;
      const totalOutOf40 = max > 0 ? Number(((tot / max) * 40).toFixed(2)) : 0;
      
      return {
        student, totalMarks: tot, maxPossible: max, pct, totalOutOf40,
        grade: getGrade(pct).grade, status: pct >= 40 ? 'Pass' : 'Fail',
        name: student.name, regNo: student.regNo,
        midsem: maxMidsem ? Number(midsem.toFixed(2)) : null,
        quiz: maxQuiz ? Number(quiz.toFixed(2)) : null,
        assignment: maxAssignment ? Number(assignment.toFixed(2)) : null,
        attendance: maxAttend ? Number(attend.toFixed(2)) : null,
      };
    }).sort((a, b) => b.pct - a.pct);

    const avgPct = rows.length > 0 ? rows.reduce((s, r) => s + r.pct, 0) / rows.length : 0;
    const passCount = rows.filter(r => r.status === 'Pass').length;

    return { 
      rows, avgPct, passCount, failCount: rows.length - passCount,
      cls: selectedCls,
    };
  }, [selectedClassId, selectedSubjectId, availableClasses, allStudents, marksData, allAssessments]);

  // Fetch CO data for the selected class (first subject available in class)
  useEffect(() => {
    if (!selectedClassId || !classReport) { setCoData([]); return; }
    const selectedCls = availableClasses.find(c => c.id === selectedClassId);
    if (!selectedCls) { setCoData([]); return; }

    // Find classId from a student in the class
    const sampleStudent = allStudents.find(s =>
      s.branch === selectedCls.branch && s.semester === selectedCls.semester && s.section === selectedCls.section
    );
    const classId = sampleStudent?.classId;
    
    // Find subjects relevant to this class
    const classAssessmentSubjectIds = [...new Set(
      allAssessments
        .filter(a => String(a.classId) === String(classId))
        .map(a => a.subjectId)
        .filter(Boolean)
    )];
    if (!classId || classAssessmentSubjectIds.length === 0) { setCoData([]); return; }

    const subjectId = (selectedSubjectId && selectedSubjectId !== 'ALL') ? selectedSubjectId : classAssessmentSubjectIds[0];
    let cancel = false;
    setLoadingCo(true);
    getAdminClassCoAttainment(classId, subjectId)
      .then(res => {
        if (cancel) return;
        const formatted = (res?.coAttainments || []).map(co => ({
          co: `CO${co.coNumber}`,
          avg: Math.round(Number(co.attainmentLevel) * 10) / 10,
          status: Number(co.attainmentLevel) >= 70 ? 'Excellent' : Number(co.attainmentLevel) >= 65 ? 'Good' : Number(co.attainmentLevel) >= 60 ? 'Moderate' : 'Critical',
        }));
        setCoData(formatted);
      })
      .catch(() => { if (!cancel) setCoData([]); })
      .finally(() => { if (!cancel) setLoadingCo(false); });
    return () => { cancel = true; };
  }, [selectedClassId, selectedSubjectId, availableClasses, classReport, allStudents, allAssessments]);

  const handleStudentClick = (student) => {
    if (typeof onNavigateToStudent === 'function') {
      onNavigateToStudent(student.id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="grid gap-6 sm:grid-cols-2 max-w-2xl">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Select Class</p>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="rounded-xl h-10 bg-card"><SelectValue placeholder="Choose a class..." /></SelectTrigger>
                <SelectContent>
                  {availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedClassId && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Filter by Subject</p>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger className="rounded-xl h-10 bg-card">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary/50" />
                      <SelectValue placeholder="Select Subject" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.subjectCode} - {s.subjectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!classReport && (
        <div className="text-center py-20 text-muted-foreground"><BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />Select a class to view the full overview report.</div>
      )}

      {classReport && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-5 sm:grid-cols-4">
            {[
              { label: 'Total Students', value: classReport.rows.length, icon: Users, gradient: 'stat-gradient-blue' },
              { label: 'Avg Percentage', value: `${classReport.avgPct.toFixed(1)}%`, icon: TrendingUp, gradient: 'stat-gradient-teal' },
              { label: 'Passed', value: classReport.passCount, icon: Trophy, gradient: 'stat-gradient-amber' },
              { label: 'At Risk', value: classReport.failCount, icon: AlertTriangle, gradient: 'stat-gradient-rose' },
            ].map((s, idx) => (
              <Card key={idx} className="glass-card overflow-hidden">
                <CardContent className="p-5 relative">
                  <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full ${s.gradient} opacity-[0.08] blur-xl`} />
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.gradient} shadow-md mb-3`}><s.icon className="h-5 w-5 text-white" /></div>
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground/60 mb-1">{s.label}</p>
                  <p className="text-2xl font-heading font-bold text-foreground">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CO Attainment Chart */}
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
                        <span className="text-xs font-bold text-foreground">{coData.filter(co => co.avg < 60).length}</span>
                      </div>
                      <div className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-border/50 px-3 py-1.5 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">60-65:</span>
                        <span className="text-xs font-bold text-foreground">{coData.filter(co => co.avg >= 60 && co.avg < 65).length}</span>
                      </div>
                      <div className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-border/50 px-3 py-1.5 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-lime-500" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">65-70:</span>
                        <span className="text-xs font-bold text-foreground">{coData.filter(co => co.avg >= 65 && co.avg < 70).length}</span>
                      </div>
                      <div className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-border/50 px-3 py-1.5 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">70+:</span>
                        <span className="text-xs font-bold text-foreground">{coData.filter(co => co.avg >= 70).length}</span>
                      </div>
                    </div>
                  </div>
                  <div className="relative z-10 w-full">
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={coData} barGap={8} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="adminCoExcellent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                          </linearGradient>
                          <linearGradient id="adminCoGood" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#84cc16" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#84cc16" stopOpacity={0.2}/>
                          </linearGradient>
                          <linearGradient id="adminCoMid" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2}/>
                          </linearGradient>
                          <linearGradient id="adminCoLow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.2}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                        <XAxis dataKey="co" tickLine={false} axisLine={false} tick={{ fontSize: 11, fontWeight: 600 }} tickMargin={12} opacity={0.6} />
                        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} opacity={0.6} />
                        <RTC content={<CoTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.04)', rx: 8 }} />
                        <ReferenceLine y={60} stroke="#f59e0b" strokeOpacity={0.4} strokeDasharray="4 4" label={{ position: 'top', value: 'Min 60%', fill: '#f59e0b', fontSize: 8, fontWeight: 700 }} />
                        <ReferenceLine y={65} stroke="#84cc16" strokeOpacity={0.4} strokeDasharray="4 4" label={{ position: 'top', value: 'Good 65%', fill: '#84cc16', fontSize: 8, fontWeight: 700 }} />
                        <ReferenceLine y={70} stroke="#10b981" strokeOpacity={0.4} strokeDasharray="4 4" label={{ position: 'top', value: 'Target 70%', fill: '#10b981', fontSize: 8, fontWeight: 700 }} />
                        <Bar dataKey="avg" name="Attainment %" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={1200} animationEasing="ease-out">
                          {coData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.avg >= 70 ? 'url(#adminCoExcellent)' : entry.avg >= 65 ? 'url(#adminCoGood)' : entry.avg >= 60 ? 'url(#adminCoMid)' : 'url(#adminCoLow)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[140px] items-center justify-center text-center">
                  <div>
                    <Target className="mx-auto mb-3 h-10 w-10 text-muted-foreground/20" />
                    <p className="text-sm font-medium text-muted-foreground">No CO data available for this class yet.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Buttons */}
          <div className="flex gap-3">
            <Button size="sm" className="btn-gradient text-white rounded-xl gap-2 text-xs" onClick={() => {
              const cls = availableClasses.find(c => c.id === selectedClassId);
              const subjectObj = availableSubjects.find(s => String(s.id) === String(selectedSubjectId));
              exportClassReportPDF(
                `${cls?.branch} Sem${cls?.semester} Sec${cls?.section}`, 
                classReport.rows, 
                classReport.avgPct.toFixed(1), 
                classReport.passCount, 
                classReport.failCount,
                coData,
                subjectObj?.subjectName,
                subjectObj?.subjectCode
              );
            }}><FileText className="h-3.5 w-3.5" /> Export PDF</Button>
            <Button size="sm" variant="outline" className="rounded-xl gap-2 text-xs" onClick={() => {
              const cls = availableClasses.find(c => c.id === selectedClassId);
              exportClassRosterExcel(classReport.rows, { branch: cls?.branch, semester: cls?.semester, section: cls?.section, passCount: classReport.passCount, failCount: classReport.failCount, avgPct: classReport.avgPct.toFixed(1) });
            }}><FileSpreadsheet className="h-3.5 w-3.5" /> Export Detailed Excel</Button>
          </div>

          {/* Top / At-Risk + Donut snapshot */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-heading font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Top Performers</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {classReport.rows.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground bg-muted/20 rounded-xl border border-border/30">No assessments recorded yet.</div>
                  ) : (
                    classReport.rows.slice(0, 3).map((r, i) => (
                      <div key={i} className="flex items-center gap-3 cursor-pointer group" onClick={() => handleStudentClick(r.student)}>
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : 'bg-amber-700'}`}>{i + 1}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium group-hover:text-primary transition-colors">{r.name}</p>
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
                  {classReport.rows.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground bg-muted/20 rounded-xl border border-border/30">No assessments recorded yet.</div>
                  ) : (
                    <>
                      {classReport.rows.filter(r => r.pct < 40).slice(0, 3).map((r, i) => (
                        <div key={i} className="flex items-center gap-3 cursor-pointer group" onClick={() => handleStudentClick(r.student)}>
                          <div className="flex-1">
                            <p className="text-sm font-medium group-hover:text-primary transition-colors">{r.name} ({r.regNo})</p>
                            <div className="w-full bg-muted/60 rounded-full h-1.5 mt-1"><div className="h-1.5 rounded-full bg-red-500 transition-all duration-700" style={{ width: `${r.pct}%` }} /></div>
                          </div>
                          <PerformBadge pct={r.pct} />
                        </div>
                      ))}
                      {classReport.failCount === 0 && <p className="text-sm text-muted-foreground py-2">All students are passing! 🎉</p>}
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
                  const excellent = classReport.rows.filter(r => r.pct >= 75).length;
                  const average = classReport.rows.filter(r => r.pct >= 40 && r.pct < 75).length;
                  const fail = classReport.failCount;
                  const pieData = classReport.rows.length === 0 
                    ? [{ name: 'No Data', value: 1, color: '#e2e8f0' }]
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
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={36} outerRadius={56} paddingAngle={3} dataKey="value" stroke="none">
                              {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                            </Pie>
                            <RTC content={({ active, payload }) => {
                              if (active && payload?.[0]) {
                                const d = payload[0].payload;
                                return <div className="bg-background/95 border border-border p-2 rounded-xl shadow-xl text-xs backdrop-blur-sm"><div className="flex gap-2 items-center"><div className="w-2 h-2 rounded-full" style={{ background: d.color }} /><span className="font-bold">{d.name}</span></div><div className="mt-1 ml-4 text-muted-foreground">{d.value} {d.value === 1 ? 'student' : 'students'} {d.sub ? `(${d.sub})` : ''}</div></div>;
                              }
                              return null;
                            }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-xl font-heading font-extrabold">{classReport.rows.length}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">Total</span>
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col justify-center space-y-2 ml-2">
                        {pieData[0].name === 'No Data' ? (
                          <div className="text-xs text-muted-foreground">No students</div>
                        ) : (
                          pieData.map((d, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                <span className="font-medium text-muted-foreground">{d.name}</span>
                              </div>
                              <span className="font-bold" style={{ color: d.color }}>{d.value}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()}
                {classReport.rows.length > 0 && (
                  <div className="rounded-xl bg-muted/30 p-4 border border-border/40 mt-4">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/50 mb-1">Pass Rate Summary</p>
                    <p className="text-sm font-medium text-foreground">
                      <span className="font-bold text-emerald-600">{(classReport.passCount / classReport.rows.length * 100).toFixed(1)}%</span> of students passed the 40% threshold.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Student Roster - clickable rows */}
          <Card className="glass-card overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/30">
              <CardTitle className="text-sm font-heading font-semibold flex items-center justify-between">
                Student Roster with Component Breakdown
                <span className="text-[10px] text-muted-foreground font-normal">Click a row to view student report</span>
              </CardTitle>
            </CardHeader>
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
                  {classReport.rows.map((r, i) => {
                    const rowBg = r.maxPossible === 0 ? "hover:bg-primary/[0.02]" :
                                  r.pct >= 75 ? "bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer" :
                                  r.pct >= 40 ? "bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer" :
                                  "bg-red-500/10 hover:bg-red-500/20 cursor-pointer";
                    return (
                      <TableRow key={i} className={rowBg} onClick={() => handleStudentClick(r.student)}>
                        <TableCell className="font-bold text-xs text-muted-foreground">#{i+1}</TableCell>
                        <TableCell className="font-medium text-sm whitespace-nowrap">{r.name}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{r.regNo}</TableCell>
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
      )}
    </div>
  );
}
