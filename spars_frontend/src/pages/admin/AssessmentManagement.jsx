import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { adminNavItems } from './Dashboard';
import {
  getCachedAdminAssessments,
  getCachedAdminClasses,
  getCachedAdminMarks,
  getCachedAdminSubjects,
  getAdminAssessments,
  getAdminClasses,
  getAdminMarks,
  getAdminSubjects,
  updateAdminAssessment,
} from '@/lib/adminApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ClipboardList,
  Calendar,
  Loader2,
  BookOpen,
  School,
  Filter,
  Search,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

const typeColor = {
  MIDSEM: 'bg-primary/10 text-primary border-primary/20',
  QUIZ: 'bg-secondary/10 text-secondary border-secondary/20',
  ASSIGNMENT: 'bg-accent/10 text-accent border-accent/20',
  ATTENDANCE: 'bg-destructive/10 text-destructive border-destructive/20',
};

function classLabel(item) {
  return `${item.branch} • Sem ${item.semester} • Sec ${item.section} • ${item.academic_year}`;
}

export default function AssessmentManagement() {
  const cachedClasses = useMemo(() => getCachedAdminClasses(), []);
  const cachedSubjects = useMemo(() => getCachedAdminSubjects(), []);
  const cachedAssessments = useMemo(() => getCachedAdminAssessments(), []);
  const cachedMarks = useMemo(() => getCachedAdminMarks(), []);
  const [classes, setClasses] = useState(cachedClasses);
  const [subjects, setSubjects] = useState(cachedSubjects);
  const [assessments, setAssessments] = useState(cachedAssessments);
  const [marks, setMarks] = useState(cachedMarks);

  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchText, setSearchText] = useState('');

  const [loading, setLoading] = useState(
    !(cachedClasses.length > 0 || cachedSubjects.length > 0 || cachedAssessments.length > 0)
  );

  const [editingAssessment, setEditingAssessment] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    type: '',
    maxMarks: '',
    examDate: '',
  });
  const [saving, setSaving] = useState(false);

  const classById = useMemo(() => {
    const map = {};
    classes.forEach((item) => {
      map[String(item.id)] = item;
    });
    return map;
  }, [classes]);

  const subjectById = useMemo(() => {
    const map = {};
    subjects.forEach((item) => {
      map[String(item.id)] = item;
    });
    return map;
  }, [subjects]);

  const filteredAssessments = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return assessments.filter((item) => {
      const matchesClass =
        selectedClassId === 'all' || String(item.classId) === String(selectedClassId);
      const matchesSubject =
        selectedSubjectId === 'all' || String(item.subjectId) === String(selectedSubjectId);
      const matchesType = selectedType === 'all' || item.type === selectedType;

      const classInfo = classById[String(item.classId)];
      const subjectInfo = subjectById[String(item.subjectId)];
      const classText = classInfo ? classLabel(classInfo).toLowerCase() : '';
      const subjectText = subjectInfo
        ? `${subjectInfo.subjectCode} ${subjectInfo.subjectName}`.toLowerCase()
        : '';

      const matchesSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.type?.toLowerCase().includes(q) ||
        classText.includes(q) ||
        subjectText.includes(q);

      return matchesClass && matchesSubject && matchesType && matchesSearch;
    });
  }, [
    assessments,
    selectedClassId,
    selectedSubjectId,
    selectedType,
    searchText,
    classById,
    subjectById,
  ]);

  const groupedAssessments = useMemo(() => {
    const groups = new Map();

    filteredAssessments.forEach((item) => {
      const key = `${item.classId}::${item.subjectId}`;
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(key, {
          key,
          classId: item.classId,
          subjectId: item.subjectId,
          items: [item],
        });
      }
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => {
          const dateA = a.examDate || '';
          const dateB = b.examDate || '';
          return dateA.localeCompare(dateB);
        }),
      }))
      .sort((a, b) => {
        const classA = classById[String(a.classId)];
        const classB = classById[String(b.classId)];
        const subjectA = subjectById[String(a.subjectId)];
        const subjectB = subjectById[String(b.subjectId)];

        const classTextA = classA ? classLabel(classA) : String(a.classId);
        const classTextB = classB ? classLabel(classB) : String(b.classId);
        const classCmp = classTextA.localeCompare(classTextB);
        if (classCmp !== 0) return classCmp;

        const subjectTextA = subjectA
          ? `${subjectA.subjectCode} ${subjectA.subjectName}`
          : String(a.subjectId);
        const subjectTextB = subjectB
          ? `${subjectB.subjectCode} ${subjectB.subjectName}`
          : String(b.subjectId);
        return subjectTextA.localeCompare(subjectTextB);
      });
  }, [filteredAssessments, classById, subjectById]);

  const marksCountByAssessment = useMemo(() => {
    const map = new Map();
    marks.forEach((mark) => {
      const key = String(mark.assessmentId ?? '');
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [marks]);

  const fetchAll = async (silent = false) => {
    try {
      if (!silent || !(classes.length > 0 || subjects.length > 0 || assessments.length > 0)) {
        setLoading(true);
      }
      const [classData, subjectData, assessmentData, marksData] = await Promise.all([
        getAdminClasses(),
        getAdminSubjects(),
        getAdminAssessments(),
        getAdminMarks(),
      ]);

      setClasses(classData || []);
      setSubjects(subjectData || []);
      setAssessments(assessmentData || []);
      setMarks(marksData || []);
    } catch (error) {
      toast.error(error?.message || 'Unable to load assessment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll(true);
  }, []);

  const handleOpenEdit = (assessment) => {
    setEditingAssessment(assessment);
    setEditForm({
      name: assessment.name || '',
      type: assessment.type || '',
      maxMarks: String(assessment.maxMarks || ''),
      examDate: assessment.examDate || '',
    });
  };

  const handleSave = async () => {
    if (!editingAssessment) return;

    if (!editForm.name.trim() || !editForm.type || !editForm.maxMarks || !editForm.examDate) {
      toast.error('Name, type, max marks, and exam date are required');
      return;
    }

    const maxMarks = Number(editForm.maxMarks);
    if (!Number.isFinite(maxMarks) || maxMarks < 1) {
      toast.error('Max marks must be greater than 0');
      return;
    }

    try {
      setSaving(true);
      const updated = await updateAdminAssessment(editingAssessment.id, {
        id: editingAssessment.id,
        name: editForm.name.trim(),
        type: editForm.type,
        subjectId: editingAssessment.subjectId,
        classId: editingAssessment.classId,
        maxMarks,
        examDate: editForm.examDate,
      });

      setAssessments((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );

      toast.success('Assessment updated successfully');
      setEditingAssessment(null);
    } catch (error) {
      toast.error(error?.message || 'Unable to update assessment');
    } finally {
      setSaving(false);
    }
  };

  const selectedClass = editingAssessment
    ? classById[String(editingAssessment.classId)]
    : null;
  const selectedSubject = editingAssessment
    ? subjectById[String(editingAssessment.subjectId)]
    : null;

  return (
    <DashboardLayout navItems={adminNavItems}>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl stat-gradient-rose shadow-lg">
            <ClipboardList className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-extrabold tracking-tight text-foreground">
              Assessment Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Browse all assessments and filter by class, subject, type, or keyword.
            </p>
          </div>
        </div>
      </div>

      <Card className="mb-6 glass-card border-border/50">
        <CardContent className="p-4 md:p-5">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground text-sm font-medium">
            <Filter className="h-4 w-4" /> Filters
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="rounded-xl h-10 bg-background/70">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classes.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {classLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Subject</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger className="rounded-xl h-10 bg-background/70">
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {subjects.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.subjectCode} - {item.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="rounded-xl h-10 bg-background/70">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="MIDSEM">MIDSEM</SelectItem>
                  <SelectItem value="QUIZ">QUIZ</SelectItem>
                  <SelectItem value="ASSIGNMENT">ASSIGNMENT</SelectItem>
                  <SelectItem value="ATTENDANCE">ATTENDANCE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Search</Label>
              <div className="relative">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Name, type, class, subject..."
                  className="rounded-xl h-10 pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-20 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading assessments...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Layers className="h-4 w-4" /> Grouped by Class + Subject
            </span>
            <span>{filteredAssessments.length} assessments in {groupedAssessments.length} groups</span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {groupedAssessments.map((group) => {
              const classInfo = classById[String(group.classId)];
              const subjectInfo = subjectById[String(group.subjectId)];

              return (
                <Card key={group.key} className="glass-card border-border/50 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col gap-1 border-b border-border/50 bg-muted/20 px-4 py-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {classInfo ? classLabel(classInfo) : `Class ${group.classId}`}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {subjectInfo
                            ? `${subjectInfo.subjectCode} - ${subjectInfo.subjectName}`
                            : `Subject ${group.subjectId}`}
                        </p>
                      </div>
                      <Badge variant="outline" className="w-fit text-xs">
                        {group.items.length} assessments
                      </Badge>
                    </div>

                    <div className="divide-y divide-border/30 px-3 pb-3">
  {group.items.map((item) => (
    <div
      key={item.id}
      className="group flex flex-col py-3 first:pt-2 last:pb-0"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
            {item.name}
          </p>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
             <Badge className={`text-[9px] h-4 px-1.5 shadow-none ${typeColor[item.type]}`}>
               {item.type}
             </Badge>
             <span className="flex items-center gap-1">
               <Calendar className="h-3 w-3 opacity-70" /> {item.examDate}
             </span>
             <span className="font-medium text-foreground/70">
               {item.maxMarks} Marks
             </span>
          </div>
        </div>
        
        {(() => {
          const hasMarksRecorded = (marksCountByAssessment.get(String(item.id)) || 0) > 0;
          return (
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold ${hasMarksRecorded ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}
            >
              {hasMarksRecorded ? 'Marks Recorded' : 'Marks Not Recorded'}
            </Badge>
          );
        })()}
      </div>
    </div>
  ))}
</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {groupedAssessments.length === 0 ? (
            <Card className="glass-card border-border/50">
              <CardContent className="py-14 text-center">
                <div className="text-muted-foreground space-y-1">
                  <p className="font-medium">No assessments found</p>
                  <p className="text-xs">Try changing class/subject/type filters or search text.</p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      <Dialog open={!!editingAssessment} onOpenChange={(open) => !open && setEditingAssessment(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-xl">
              Edit Assessment
            </DialogTitle>
            <DialogDescription>
              Update name, marks, and date for the selected assessment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Type</Label>
              <Input value={editForm.type} disabled className="rounded-xl bg-muted/40" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Max Marks</Label>
                <Input
                  type="number"
                  min={1}
                  value={editForm.maxMarks}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, maxMarks: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Exam Date</Label>
                <Input
                  type="date"
                  value={editForm.examDate}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, examDate: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground">
              <div className="inline-flex items-center gap-1.5">
                <School className="h-3.5 w-3.5" />
                <span>{selectedClass ? classLabel(selectedClass) : '-'}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 mt-1 ml-4">
                <BookOpen className="h-3.5 w-3.5" />
                <span>
                  {selectedSubject
                    ? `${selectedSubject.subjectCode} - ${selectedSubject.subjectName}`
                    : '-'}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setEditingAssessment(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl btn-gradient text-primary-foreground">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
