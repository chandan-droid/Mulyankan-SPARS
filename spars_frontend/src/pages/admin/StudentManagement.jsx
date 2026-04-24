import { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { adminNavItems } from './Dashboard';
import * as XLSX from 'xlsx';
import {
  createAdminStudent,
  createAdminStudentsBulk,
  deleteAdminStudent,
  getCachedAdminClasses,
  getCachedAdminStudents,
  getAdminClasses,
  getAdminStudents,
  updateAdminStudent,
} from '@/lib/adminApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  GraduationCap,
  ChevronUp,
  ChevronDown,
  Filter,
  FileSpreadsheet,
  Download,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const emptyStudent = {
  name: '',
  regNo: '',
  classId: '',
};

const classLabel = (c) => `${c.branch} • Sem ${c.semester} • Sec ${c.section} • ${c.academic_year}`;

const branchColor = (b) => {
  const map = {
    CSE: 'bg-primary/10 text-primary',
    ECE: 'bg-secondary/10 text-secondary',
    ME: 'bg-accent/10 text-accent',
    CE: 'bg-info/10 text-info',
    EE: 'bg-warning/10 text-warning',
    IT: 'bg-emerald-100 text-emerald-700',
    COE: 'bg-blue-100 text-blue-700',
  };
  return map[b] || 'bg-muted text-muted-foreground';
};

export default function StudentManagement() {
  const cachedClasses = useMemo(() => getCachedAdminClasses(), []);
  const cachedStudents = useMemo(() => getCachedAdminStudents(), []);
  const [students, setStudents] = useState(cachedStudents);
  const [classes, setClasses] = useState(cachedClasses);
  const [loading, setLoading] = useState(
    !(cachedClasses.length > 0 || cachedStudents.length > 0)
  );
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [filterBranch, setFilterBranch] = useState('All');
  const [filterSemester, setFilterSemester] = useState('All');
  const [filterSection, setFilterSection] = useState('All');

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyStudent);

  const [openImport, setOpenImport] = useState(false);
  const [importClassId, setImportClassId] = useState('');
  const fileInputRef = useRef(null);

  const classesById = useMemo(() => {
    const map = {};
    classes.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [classes]);

  const refresh = async (silent = false) => {
    try {
      if (!silent || !(classes.length > 0 || students.length > 0)) {
        setLoading(true);
      }
      const [classItems, studentItems] = await Promise.all([
        getAdminClasses(),
        getAdminStudents(),
      ]);
      setClasses(classItems);
      setStudents(studentItems);
      if (!importClassId && classItems.length > 0) {
        setImportClassId(String(classItems[0].id));
      }
    } catch (error) {
      toast.error(error?.message || 'Unable to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh(true);
  }, []);

  const filteredAndSorted = students
    .filter((s) => {
      const q = search.toLowerCase();
      const cls = classesById[s.classId] || null;
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.regNo.toLowerCase().includes(q);
      const matchesBranch =
        filterBranch === 'All' || (cls && cls.branch === filterBranch);
      const matchesSemester =
        filterSemester === 'All' ||
        (cls && String(cls.semester) === String(filterSemester));
      const matchesSection =
        filterSection === 'All' || (cls && cls.section === filterSection);

      return matchesSearch && matchesBranch && matchesSemester && matchesSection;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      const key = sortConfig.key;
      let valA;
      let valB;

      if (key === 'branch' || key === 'semester' || key === 'section') {
        valA = classesById[a.classId]?.[key] ?? '';
        valB = classesById[b.classId]?.[key] ?? '';
      } else {
        valA = a[key];
        valB = b[key];
      }

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const branchOptions = useMemo(
    () => [...new Set(classes.map((c) => c.branch))].filter(Boolean).sort(),
    [classes]
  );

  const semesterOptions = useMemo(
    () => [...new Set(classes.map((c) => c.semester))].filter(Boolean).sort((a, b) => a - b),
    [classes]
  );

  const sectionOptions = useMemo(
    () => [...new Set(classes.map((c) => c.section))].filter(Boolean).sort(),
    [classes]
  );

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity ml-1 inline-block" />;
    }
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="h-3 w-3 text-primary ml-1 inline-block" />
      : <ChevronDown className="h-3 w-3 text-primary ml-1 inline-block" />;
  };

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(filteredAndSorted.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} students?`)) return;

    try {
      await Promise.all(selectedIds.map((id) => deleteAdminStudent(id)));
      toast.success(`${selectedIds.length} students deleted`);
      setSelectedIds([]);
      await refresh();
    } catch (error) {
      toast.error(error?.message || 'Unable to delete selected students');
    }
  };

  const handleOpen = (student) => {
    if (student) {
      setEditing(student);
      setForm({
        name: student.name,
        regNo: student.regNo,
        classId: String(student.classId),
      });
    } else {
      setEditing(null);
      setForm({
        ...emptyStudent,
        classId: classes[0] ? String(classes[0].id) : '',
      });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.regNo.trim() || !form.classId) {
      toast.error('Name, Reg No, and Class are required');
      return;
    }

    try {
      setSaving(true);
      if (editing) {
        await updateAdminStudent(editing.id, form);
        toast.success('Student updated');
      } else {
        await createAdminStudent(form);
        toast.success('Student added');
      }
      setOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error?.message || 'Unable to save student');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAdminStudent(id);
      toast.success('Student deleted');
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
      await refresh();
    } catch (error) {
      toast.error(error?.message || 'Unable to delete student');
    }
  };

  const handleImportUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!importClassId) {
      toast.error('Please choose a class before importing');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const normalizeKey = (k) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
        const findKey = (obj, targetStr) =>
          Object.keys(obj).find((k) => normalizeKey(k) === normalizeKey(targetStr));

        const parsedRows = [];
        jsonData.forEach((row) => {
          const nameKey = findKey(row, 'name') || findKey(row, 'studentname');
          const regKey =
            findKey(row, 'regno') ||
            findKey(row, 'registration') ||
            findKey(row, 'redgno');

          if (nameKey && regKey && row[nameKey] !== undefined && row[regKey] !== undefined) {
            const name = String(row[nameKey]).trim();
            const regNo = String(row[regKey]).trim();
            if (name && regNo) {
              parsedRows.push({
                name,
                regNo,
                classId: Number(importClassId),
              });
            }
          }
        });

        if (!parsedRows.length) {
          toast.error('No suitable student records found in file.');
          return;
        }

        const created = await createAdminStudentsBulk(parsedRows);
        toast.success(`Successfully imported ${created.length} students.`);
        setOpenImport(false);
        await refresh();
      } catch (error) {
        toast.error(error?.message || 'Parse engine failure. Make sure the file is valid.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const wsData = [['S.No.', 'Reg No', 'Student Name']];
    for (let i = 1; i <= 60; i++) {
      wsData.push([i, '', '']);
    }
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Roster Template');
    XLSX.writeFile(wb, 'student_import_template.xlsx');
    toast.success('Roster template downloaded.');
  };

  return (
    <DashboardLayout navItems={adminNavItems}>
      <div className="mb-6 flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl stat-gradient-blue shadow-md">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold tracking-tight text-foreground">
                Students
              </h1>
              <p className="text-sm text-muted-foreground">
                {filteredAndSorted.length} of {students.length} records
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white/50 p-2 rounded-2xl border border-white/20 shadow-sm backdrop-blur-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              className="pl-10 w-full sm:w-64 h-10 rounded-xl bg-card border-border/60"
              placeholder="Search name or reg no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 border-l border-border/60 pl-3">
            <Filter className="h-4 w-4 text-muted-foreground/50" />
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="w-[110px] rounded-xl h-10 bg-card border-border/60">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Branches</SelectItem>
                {branchOptions.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterSemester} onValueChange={setFilterSemester}>
              <SelectTrigger className="w-[110px] rounded-xl h-10 bg-card border-border/60 hidden sm:flex">
                <SelectValue placeholder="Sem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Sems</SelectItem>
                {semesterOptions.map((s) => <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterSection} onValueChange={setFilterSection}>
              <SelectTrigger className="w-[100px] rounded-xl h-10 bg-card border-border/60 hidden md:flex">
                <SelectValue placeholder="Sec" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Secs</SelectItem>
                {sectionOptions.map((s) => <SelectItem key={s} value={s}>Sec {s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={() => setOpenImport(true)}
              className="h-10 rounded-xl bg-sidebar-primary/5 hover:bg-sidebar-primary/10 border-border/60 text-sidebar-primary shadow-sm"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> <span className="hidden lg:inline">Import</span>
            </Button>
            <Button
              onClick={() => handleOpen()}
              className="h-10 rounded-xl btn-gradient text-primary-foreground shadow-md"
              disabled={!classes.length}
            >
              <Plus className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Add Student</span>
            </Button>
          </div>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between animate-fade-in-up">
          <span className="text-sm font-semibold text-primary px-2">
            {selectedIds.length} student(s) selected
          </span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="h-8 rounded-lg shadow-md transition-all hover:bg-destructive/90">
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Selected
          </Button>
        </div>
      )}

      <Card className="glass-card overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[50px] text-center">
                  <Checkbox
                    checked={filteredAndSorted.length > 0 && selectedIds.length === filteredAndSorted.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead
                  className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 cursor-pointer group select-none"
                  onClick={() => handleSort('name')}
                >
                  Name {renderSortIcon('name')}
                </TableHead>
                <TableHead
                  className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 cursor-pointer group select-none"
                  onClick={() => handleSort('regNo')}
                >
                  Reg No {renderSortIcon('regNo')}
                </TableHead>
                <TableHead
                  className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 cursor-pointer group select-none"
                  onClick={() => handleSort('branch')}
                >
                  Branch {renderSortIcon('branch')}
                </TableHead>
                <TableHead
                  className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 cursor-pointer group select-none"
                  onClick={() => handleSort('semester')}
                >
                  Semester {renderSortIcon('semester')}
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">
                  Section
                </TableHead>
                <TableHead className="text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading students...
                    </span>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSorted.map((s) => {
                  const cls = classesById[s.classId] || null;
                  const branch = cls?.branch || '-';
                  const semester = cls?.semester || '-';
                  const section = cls?.section || '-';
                  return (
                    <TableRow
                      key={s.id}
                      className={`group transition-colors ${selectedIds.includes(s.id) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'}`}
                    >
                      <TableCell className="w-[50px] text-center">
                        <Checkbox
                          checked={selectedIds.includes(s.id)}
                          onCheckedChange={(checked) => toggleSelect(s.id, checked)}
                          aria-label={`Select ${s.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold ${branchColor(branch)} bg-opacity-20`}>
                            {s.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="font-semibold text-foreground text-sm">
                            {s.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted/60 px-2 py-0.5 rounded-md font-mono text-muted-foreground">
                          {s.regNo}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${branchColor(branch)} border-0 text-[11px] font-semibold`}>
                          {branch}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-muted-foreground">
                        Sem {semester}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        Sec {section}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => handleOpen(s)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                            onClick={() => handleDelete(s.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              {!loading && filteredAndSorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">
                      No students found
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Try adjusting your search criteria or filters
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-xl">
              {editing ? 'Edit Student Details' : 'Register New Student'}
            </DialogTitle>
            <DialogDescription>
              {editing ? 'Modify the details for this student below.' : 'Fill in the information to add a new student to the system.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Full Name
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Aarav Sharma"
                className="rounded-xl h-10 border-border/60 focus:border-primary/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Registration No
              </Label>
              <Input
                value={form.regNo}
                onChange={(e) => setForm({ ...form, regNo: e.target.value })}
                placeholder="e.g. 2024CS001"
                className="rounded-xl h-10 border-border/60 focus:border-primary/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Class
              </Label>
              <Select value={form.classId} onValueChange={(v) => setForm({ ...form, classId: v })}>
                <SelectTrigger className="rounded-xl h-10 border-border/60"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {classLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl btn-gradient text-primary-foreground shadow-md transition-transform hover:scale-[1.02]">
              {saving ? 'Saving...' : editing ? 'Update Student' : 'Add Student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openImport} onOpenChange={setOpenImport}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-xl">
              Bulk Import Students
            </DialogTitle>
            <DialogDescription>
              Choose a target class, then upload an Excel file with Student Name and Reg No columns.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Class</Label>
              <Select value={importClassId} onValueChange={setImportClassId}>
                <SelectTrigger className="rounded-xl h-10 border-border/60"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {classLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6 gap-3">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImportUpload}
            />
            <Button variant="outline" onClick={handleDownloadTemplate} className="rounded-xl sm:mr-auto border-dashed border-primary/40 text-primary hover:bg-primary/5 font-semibold">
              <Download className="h-4 w-4 mr-1.5" /> Download Layout
            </Button>
            <Button variant="outline" onClick={() => setOpenImport(false)} className="rounded-xl font-bold font-sm">
              Cancel
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} className="rounded-xl btn-gradient text-primary-foreground shadow-md transition-transform hover:scale-[1.02] font-bold">
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Upload File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
