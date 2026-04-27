import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { adminNavItems } from './Dashboard';
import {
  createAdminTeacherAssignment,
  deleteAdminTeacherAssignment,
  getCachedAdminTeacherAssignments,
  getCachedAdminClasses,
  getCachedAdminSubjects,
  getCachedAdminTeachers,
  getAdminTeacherAssignments,
  getAdminClasses,
  getAdminSubjects,
  createAdminTeacher,
  getAdminTeachers,
  updateAdminTeacher,
} from '@/lib/adminApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserPlus,
  UserCog,
  Mail,
  Building2,
  Loader2,
  LinkIcon,
  Search,
  Filter,
  Users,
  BookOpen,
  School,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

const emptyAssignForm = { teacherId: '', subjectId: '', classId: '' };

const classLabel = (c) =>
  `${c.branch} • Sem ${c.semester} • Sec ${c.section} • ${c.academic_year}`;

export default function TeacherManagement() {
  const cachedTeachers = useMemo(() => getCachedAdminTeachers(), []);
  const cachedSubjects = useMemo(() => getCachedAdminSubjects(), []);
  const cachedClasses = useMemo(() => getCachedAdminClasses(), []);
  const cachedAssignments = useMemo(() => getCachedAdminTeacherAssignments(), []);
  const [teachers, setTeachers] = useState(cachedTeachers);
  const [subjects, setSubjects] = useState(cachedSubjects);
  const [classes, setClasses] = useState(cachedClasses);
  const [assignments, setAssignments] = useState(cachedAssignments);
  const [loading, setLoading] = useState(
    !(
      cachedTeachers.length > 0 ||
      cachedSubjects.length > 0 ||
      cachedClasses.length > 0 ||
      cachedAssignments.length > 0
    )
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
  });
  const [assignForm, setAssignForm] = useState(emptyAssignForm);
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    email: '',
    department: '',
  });

  const teachersWithId = useMemo(
    () => teachers.filter((t) => t?.id !== undefined && t?.id !== null),
    [teachers]
  );

  const refresh = async (silent = false) => {
    try {
      if (
        !silent ||
        !(teachers.length > 0 || subjects.length > 0 || classes.length > 0 || assignments.length > 0)
      ) {
        setLoading(true);
      }
      const [teacherData, subjectData, classData] = await Promise.all([
        getAdminTeachers(),
        getAdminSubjects(),
        getAdminClasses(),
      ]);
      const assignmentData = await getAdminTeacherAssignments();
      setTeachers(teacherData || []);
      setSubjects(subjectData || []);
      setClasses(classData || []);
      setAssignments(assignmentData || []);
    } catch (error) {
      toast.error(error?.message || 'Failed to sync teacher module data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh(true);
  }, []);

  const filteredTeachers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return teachers.filter((teacher) => {
      const matchesSearch =
        !q ||
        teacher.name?.toLowerCase().includes(q) ||
        teacher.email?.toLowerCase().includes(q);
      const matchesDept =
        deptFilter === 'all' || teacher.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [teachers, searchTerm, deptFilter]);

  const departments = useMemo(
    () => ['all', ...new Set(teachers.map((t) => t.department).filter(Boolean))],
    [teachers]
  );

  const handleCreate = async () => {
    if (
      !createForm.name.trim() ||
      !createForm.email.trim() ||
      !createForm.password.trim() ||
      !createForm.department.trim()
    ) {
      toast.error('Name, email, password, and department are required');
      return;
    }

    try {
      setSaving(true);
      const created = await createAdminTeacher(createForm);
      setTeachers((prev) => [created, ...prev]);
      toast.success('Teacher created successfully');
      setOpenCreate(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        department: '',
      });
    } catch (error) {
      toast.error(error?.message || 'Unable to create teacher');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAssign = () => {
    setAssignForm({
      teacherId: teachersWithId[0] ? String(teachersWithId[0].id) : '',
      subjectId: subjects[0] ? String(subjects[0].id) : '',
      classId: classes[0] ? String(classes[0].id) : '',
    });
    setOpenAssign(true);
  };

  const handleAssignTeacher = (teacher) => {
    setAssignForm({
      teacherId: teacher?.id ? String(teacher.id) : '',
      subjectId: subjects[0] ? String(subjects[0].id) : '',
      classId: classes[0] ? String(classes[0].id) : '',
    });
    setOpenAssign(true);
  };

  const handleOpenEdit = (teacher) => {
    setEditForm({
      id: teacher.id,
      name: teacher.name || '',
      email: teacher.email || '',
      department: teacher.department || '',
    });
    setOpenEdit(true);
  };

  const handleUpdateTeacher = async () => {
    if (!editForm.id || !editForm.name.trim() || !editForm.email.trim() || !editForm.department.trim()) {
      toast.error('Name, email, and department are required');
      return;
    }

    try {
      setUpdating(true);
      const updated = await updateAdminTeacher(editForm.id, editForm);
      setTeachers((prev) =>
        prev.map((item) =>
          String(item.id) === String(editForm.id)
            ? { ...item, ...updated }
            : item
        )
      );
      toast.success('Teacher updated successfully');
      setOpenEdit(false);
    } catch (error) {
      toast.error(error?.message || 'Unable to update teacher');
    } finally {
      setUpdating(false);
    }
  };

  const handleAssign = async () => {
    if (!assignForm.teacherId || !assignForm.subjectId || !assignForm.classId) {
      toast.error('Please select teacher, subject, and class');
      return;
    }

    try {
      setAssigning(true);
      const assignment = await createAdminTeacherAssignment(assignForm);
      setAssignments((prev) => [assignment, ...prev]);
      toast.success('Teacher assignment created');
      setOpenAssign(false);
      setAssignForm(emptyAssignForm);
    } catch (error) {
      toast.error(error?.message || 'Unable to create assignment');
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!assignmentId) return;
    if (!window.confirm('Delete this assignment?')) return;

    try {
      setDeletingAssignmentId(assignmentId);
      await deleteAdminTeacherAssignment(assignmentId);
      setAssignments((prev) => prev.filter((item) => String(item.id) !== String(assignmentId)));
      toast.success('Assignment deleted successfully');
    } catch (error) {
      toast.error(error?.message || 'Unable to delete assignment');
    } finally {
      setDeletingAssignmentId(null);
    }
  };

  return (
    <DashboardLayout navItems={adminNavItems}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserCog className="h-8 w-8 text-primary" /> Teacher Directory
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage faculty credentials and academic class assignments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleOpenAssign}
            className="rounded-xl shadow-sm"
            disabled={!teachersWithId.length || !subjects.length || !classes.length}
          >
            <LinkIcon className="h-4 w-4 mr-2" /> Assign Class
          </Button>
          <Button
            onClick={() => setOpenCreate(true)}
            className="rounded-xl btn-gradient shadow-md px-6"
          >
            <UserPlus className="h-4 w-4 mr-2" /> Add Teacher
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard title="Total Faculty" value={teachers.length} icon={Users} color="text-blue-500" />
        <StatCard title="Active Subjects" value={subjects.length} icon={BookOpen} color="text-emerald-500" />
        <StatCard title="Assignments" value={assignments.length} icon={School} color="text-amber-500" />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between bg-card/50 p-4 rounded-2xl border border-border/40 backdrop-blur-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9 rounded-xl border-none bg-background/50 focus-visible:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-full sm:w-[220px] rounded-xl bg-background/50 border-none">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d} value={d} className="capitalize">
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTeachers.map((teacher, i) => (
            <TeacherCard
              key={teacher.id || `${teacher.email}-${i}`}
              teacher={teacher}
              delay={i}
              onEdit={handleOpenEdit}
              onAssign={handleAssignTeacher}
            />
          ))}
        </div>
      )}

      {!loading && filteredTeachers.length === 0 && (
        <Card className="mt-6 border-border/50">
          <CardContent className="py-10 text-center text-muted-foreground">
            No teachers match the current filters.
          </CardContent>
        </Card>
      )}

      {assignments.length > 0 && (
        <Card className="mt-6 border-border/50">
          <CardContent className="p-5 space-y-2">
            <p className="text-sm font-semibold text-foreground">Teacher Assignments</p>
            {assignments.map((assignment, index) => {
              const teacher = teachers.find((t) => String(t.id) === String(assignment.teacherId));
              const subject = subjects.find((s) => String(s.id) === String(assignment.subjectId));
              const cls = classes.find((c) => String(c.id) === String(assignment.classId));
              return (
                <div
                  key={`${assignment.id || index}`}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 px-3 py-2"
                >
                  <Badge variant="secondary" className="font-medium">
                    {assignment.teacherName || teacher?.name || `Teacher ${assignment.teacherId}`}
                  </Badge>
                  <span className="text-muted-foreground/60 text-xs">teaches</span>
                  <Badge variant="outline" className="font-medium">
                    {assignment.subjectName || subject?.subjectName || `Subject ${assignment.subjectId}`}
                  </Badge>
                  <span className="text-muted-foreground/60 text-xs">for</span>
                  <Badge variant="outline" className="font-medium bg-primary/5 border-primary/20 text-primary">
                    {assignment.className || (cls ? classLabel(cls) : `Class ${assignment.classId}`)}
                  </Badge>
                  {assignment.id ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      disabled={deletingAssignmentId === assignment.id}
                      title="Delete assignment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {!loading && assignments.length === 0 && (
        <Card className="mt-6 border-border/50">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No teacher assignments found yet.
          </CardContent>
        </Card>
      )}

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold">Create Teacher</DialogTitle>
            <DialogDescription>
              Set up login credentials for a new teacher.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Dr. Rajesh Kumar"
                className="rounded-xl h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="teacher@school.edu"
                className="rounded-xl h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
              <Input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Login password"
                className="rounded-xl h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Department</Label>
              <Input
                value={createForm.department}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, department: e.target.value }))}
                placeholder="Computer Science"
                className="rounded-xl h-10"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setOpenCreate(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="rounded-xl btn-gradient text-primary-foreground">
              {saving ? 'Creating...' : 'Create Teacher'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold">Edit Teacher</DialogTitle>
            <DialogDescription>
              Update teacher profile details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Teacher name"
                className="rounded-xl h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="teacher@school.edu"
                className="rounded-xl h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Department</Label>
              <Input
                value={editForm.department}
                onChange={(e) => setEditForm((prev) => ({ ...prev, department: e.target.value }))}
                placeholder="Department"
                className="rounded-xl h-10"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setOpenEdit(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleUpdateTeacher} disabled={updating} className="rounded-xl btn-gradient text-primary-foreground">
              {updating ? 'Updating...' : 'Update Teacher'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openAssign} onOpenChange={setOpenAssign}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold">Assign Teacher to Class</DialogTitle>
            <DialogDescription>
              Select teacher, subject, and class to create assignment mapping.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Teacher</Label>
              <Select
                value={assignForm.teacherId}
                onValueChange={(value) => setAssignForm((prev) => ({ ...prev, teacherId: value }))}
              >
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachersWithId.map((teacher) => (
                    <SelectItem key={teacher.id} value={String(teacher.id)}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</Label>
              <Select
                value={assignForm.subjectId}
                onValueChange={(value) => setAssignForm((prev) => ({ ...prev, subjectId: value }))}
              >
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={String(subject.id)}>
                      {subject.subjectCode} - {subject.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class</Label>
              <Select
                value={assignForm.classId}
                onValueChange={(value) => setAssignForm((prev) => ({ ...prev, classId: value }))}
              >
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((classItem) => (
                    <SelectItem key={classItem.id} value={String(classItem.id)}>
                      {classLabel(classItem)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!teachersWithId.length && (
              <p className="text-xs text-amber-600">
                Teacher assignment needs numeric teacher IDs from backend. Create a teacher first or ensure GET teachers returns IDs.
              </p>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setOpenAssign(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={assigning || !teachersWithId.length}
              className="rounded-xl btn-gradient text-primary-foreground"
            >
              {assigning ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <Card className="glass-card border-none shadow-sm overflow-hidden relative">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-2xl bg-background/80 ${color} shadow-inner`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TeacherCard({ teacher, delay, onEdit, onAssign }) {
  const initials = teacher.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card
      className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-border/50 overflow-hidden"
      style={{ animation: `fade-in-up 0.5s ease forwards ${delay * 0.05}s` }}
    >
      <div className="h-2 w-full bg-gradient-to-r from-primary/40 to-secondary/40" />
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg border border-primary/20">
            {initials || 'NA'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
              {teacher.name}
            </h3>
            {/* <Badge variant="secondary" className="font-normal text-[10px] uppercase tracking-wider mt-1">
              {teacher.department || 'General'}
            </Badge> */}
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 text-primary/60" />
            <span className="truncate">{teacher.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4 text-primary/60" />
            <span>{teacher.department || 'General'} </span>
          </div>
          <div className="pt-2 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg"
              onClick={() => onAssign(teacher)}
              disabled={!teacher?.id}
            >
              <LinkIcon className="h-3.5 w-3.5 mr-1" /> Assign
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg"
              onClick={() => onEdit(teacher)}
              disabled={!teacher?.id}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="h-[200px] rounded-2xl bg-muted/40 animate-pulse border border-border/50"
        />
      ))}
    </div>
  );
}
