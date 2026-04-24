import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { teacherNavItems } from './Dashboard';
import { useAuth } from '@/contexts/AuthContext';
import {
  getMyAssignments, getCachedMyAssignments,
  getClassById, getStudentsByClass,
} from '@/lib/teacherApi';
import { getSubjects } from '@/data/store';
import {
  BookOpen, Users, GraduationCap, Layers, ChevronDown, ChevronRight,
  Loader2, Search, School, Calendar, Hash, UserCircle2, BadgeCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/* ─── small helpers ─────────────────────────────────────────────────── */
function ClassBadge({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5">
      {Icon && <Icon className="h-3 w-3 text-muted-foreground/70 shrink-0" />}
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      <span className="text-[10px] font-bold text-foreground">{value || '—'}</span>
    </div>
  );
}

function StudentRow({ student, index }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border/30 bg-background/40 hover:bg-primary/[0.03] transition-colors">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-extrabold shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-0.5">
        <p className="text-sm font-semibold text-foreground truncate">{student.name || student.studentName || '—'}</p>
        <p className="text-[11px] font-mono text-muted-foreground truncate">
          {student.regNo || student.registrationNumber || student.rollNo || '—'}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">{student.email || ''}</p>
      </div>
      {student.gender && (
        <Badge variant="outline" className="text-[9px] shrink-0 hidden sm:flex">{student.gender}</Badge>
      )}
    </div>
  );
}

/* ─── one expanded class card ────────────────────────────────────────── */
function ClassCard({ assignment, subjects }) {
  const [expanded, setExpanded]       = useState(false);
  const [classInfo, setClassInfo]     = useState(null);
  const [students, setStudents]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [fetched, setFetched]         = useState(false);
  const [search, setSearch]           = useState('');

  const sub = subjects.find(s => String(s.id) === String(assignment.subjectId));

  const toggle = async () => {
    setExpanded(prev => !prev);
    if (fetched || !assignment.classId) return;

    setLoading(true);
    try {
      const [cd, stu] = await Promise.allSettled([
        getClassById(assignment.classId),
        getStudentsByClass(assignment.classId),
      ]);
      if (cd.status === 'fulfilled' && cd.value)   setClassInfo(cd.value);
      if (stu.status === 'fulfilled' && Array.isArray(stu.value)) setStudents(stu.value);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(s =>
      (s.name || s.studentName || '').toLowerCase().includes(q) ||
      (s.regNo || s.registrationNumber || s.rollNo || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    );
  }, [students, search]);

  const branch   = classInfo?.branch   ?? assignment.branch   ?? '—';
  const semester = classInfo?.semester ?? assignment.semester ?? '—';
  const section  = classInfo?.section  ?? assignment.section  ?? '—';
  const ayear    = classInfo?.academicYear ?? '';
  const count    = classInfo?.studentCount ?? students.length ?? 0;

  return (
    <Card className="glass-card overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow">
      {/* ── Card header / toggle ── */}
      <button
        onClick={toggle}
        className="w-full text-left p-5 flex items-center gap-4 group"
      >
        {/* subject icon */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl stat-gradient-blue shadow-md">
          <BookOpen className="h-5 w-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-0.5">
            {sub?.subjectCode || 'SUBJ'}
          </p>
          <h3 className="text-base font-heading font-bold text-foreground truncate">
            {sub?.subjectName || assignment.subjectId}
          </h3>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <ClassBadge label="Branch" value={branch}          icon={School}    />
            <ClassBadge label="Sem"    value={semester}        icon={Layers}    />
            <ClassBadge label="Sec"    value={section}         icon={Hash}      />
            {ayear && <ClassBadge label="AY" value={ayear}     icon={Calendar}  />}
            <ClassBadge label="Students" value={count}         icon={Users}     />
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-muted/50 group-hover:bg-primary/10 transition-colors">
          {expanded
            ? <ChevronDown  className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {/* ── Expanded student list ── */}
      {expanded && (
        <div className="border-t border-border/30 bg-muted/10 animate-in slide-in-from-top-2 duration-200">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Loading class &amp; student details…
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {/* Class detail pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Branch',        value: branch,   icon: School       },
                  { label: 'Semester',      value: semester, icon: Layers       },
                  { label: 'Section',       value: section,  icon: Hash         },
                  { label: 'Academic Year', value: ayear || '—', icon: Calendar },
                ].map(item => (
                  <div key={item.label} className="rounded-xl border border-border/40 bg-background/60 p-3 text-center">
                    <item.icon className="h-4 w-4 text-primary/60 mx-auto mb-1" />
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{item.label}</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Subjects list */}
              {Array.isArray(classInfo?.subjects) && classInfo.subjects.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Subjects in Class</p>
                  <div className="flex flex-wrap gap-1.5">
                    {classInfo.subjects.map(s => (
                      <Badge key={s} variant="outline" className="text-[10px] font-semibold">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Student table */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-heading font-semibold text-foreground flex items-center gap-2">
                    <UserCircle2 className="h-4 w-4 text-primary/70" />
                    Students
                    <Badge className="text-[10px] font-bold bg-primary/10 text-primary hover:bg-primary/10">
                      {students.length}
                    </Badge>
                  </p>
                  {students.length > 5 && (
                    <div className="relative w-full sm:w-56">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or reg no…"
                        className="pl-8 h-8 text-xs rounded-xl bg-background/60"
                      />
                    </div>
                  )}
                </div>

                {students.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-medium">No students found for this class.</p>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <p className="text-center py-6 text-xs text-muted-foreground">No students match your search.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                    {/* Header row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 px-4 py-1.5">
                      {['Name', 'Reg. No.', 'Email'].map(h => (
                        <p key={h} className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">{h}</p>
                      ))}
                    </div>
                    {filteredStudents.map((s, i) => (
                      <StudentRow key={s.id ?? i} student={s} index={i} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ─── main page ──────────────────────────────────────────────────────── */
export default function AssignedClasses() {
  const { user } = useAuth();
  const subjects = getSubjects();

  const cached = getCachedMyAssignments();
  const [assignments, setAssignments] = useState(cached.length > 0 ? cached : []);
  const [loading, setLoading]         = useState(cached.length === 0);
  const [globalSearch, setGlobalSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    getMyAssignments()
      .then(data => {
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) setAssignments(data);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /* de-duplicate by classId|subjectId */
  const uniqueAssignments = useMemo(() => {
    const seen = new Set();
    return assignments.filter(a => {
      const key = `${a.classId}|${a.subjectId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [assignments]);

  const filtered = useMemo(() => {
    if (!globalSearch.trim()) return uniqueAssignments;
    const q = globalSearch.toLowerCase();
    return uniqueAssignments.filter(a => {
      const sub = subjects.find(s => String(s.id) === String(a.subjectId));
      return (
        (sub?.subjectName || '').toLowerCase().includes(q) ||
        (sub?.subjectCode || '').toLowerCase().includes(q) ||
        (a.branch || '').toLowerCase().includes(q) ||
        String(a.semester || '').includes(q) ||
        (a.section || '').toLowerCase().includes(q)
      );
    });
  }, [uniqueAssignments, globalSearch, subjects]);

  const firstName = (user?.name || 'Teacher').split(' ')[0];

  return (
    <DashboardLayout navItems={teacherNavItems}>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1">Teacher</p>
            <h1 className="text-2xl font-heading font-bold tracking-tight text-foreground flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl stat-gradient-blue shadow-lg">
                <School className="h-5 w-5 text-white" />
              </div>
              Assigned Classes
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              All classes &amp; students assigned to {firstName}
            </p>
          </div>

          {/* KPI strip */}
          <div className="flex gap-3 shrink-0">
            <div className="rounded-xl border border-border/50 bg-card/70 px-4 py-2.5 text-center backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Classes</p>
              <p className="text-xl font-heading font-extrabold text-foreground">{uniqueAssignments.length}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/70 px-4 py-2.5 text-center backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Subjects</p>
              <p className="text-xl font-heading font-extrabold text-foreground">
                {new Set(assignments.map(a => a.subjectId)).size}
              </p>
            </div>
          </div>
        </div>

        {/* ── Global search ── */}
        {!loading && uniqueAssignments.length > 3 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              placeholder="Filter by subject, branch, semester…"
              className="pl-9 h-10 rounded-xl bg-card/60 border-border/50"
            />
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className="flex h-[50vh] flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">
              Fetching your assigned classes…
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/40">
              <BookOpen className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-base font-heading font-semibold text-foreground">
              {globalSearch ? 'No classes match your filter' : 'No classes assigned yet'}
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {globalSearch
                ? 'Try a different search term.'
                : 'Your assigned classes will appear here once the admin sets them up.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium">
              {filtered.length} {filtered.length === 1 ? 'class' : 'classes'} found
              {globalSearch ? ` for "${globalSearch}"` : ''}
              {' '}· Click a card to expand and view students
            </p>
            {filtered.map(a => (
              <ClassCard
                key={`${a.classId}|${a.subjectId}`}
                assignment={a}
                subjects={subjects}
              />
            ))}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
