import { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { adminNavItems } from './Dashboard';
import * as XLSX from 'xlsx';
import {
  createAdminClass,
  deleteAdminClass,
  getCachedAdminClasses,
  getCachedAdminStudents,
  getAdminClasses,
  getAdminStudents,
  updateAdminClass,
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
  Blocks,
  ChevronUp,
  ChevronDown,
  Filter,
  FileSpreadsheet,
  Download,
  Users2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const BRANCHES = ['CSE', 'ECE', 'ME', 'CE', 'EE', 'IT', 'CSE AIML', 'COE'];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const SECTIONS = ['A', 'B'];

const emptyClass = {
  branch: '',
  semester: '',
  section: '',
  academic_year: '',
};

const classLabel = (c) =>
  `${c.branch} Sem ${c.semester} Sec ${c.section} • ${c.academic_year}`;

export default function ClassManagement() {
  const cachedClasses = useMemo(() => getCachedAdminClasses(), []);
  const cachedStudents = useMemo(() => getCachedAdminStudents(), []);
  const [classes, setClasses] = useState(cachedClasses);
  const [students, setStudents] = useState(cachedStudents);
  const [loading, setLoading] = useState(
    !(cachedClasses.length > 0 || cachedStudents.length > 0)
  );
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterSemester, setFilterSemester] = useState('All');
  const [filterSection, setFilterSection] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyClass);
  const [saving, setSaving] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const fileInputRef = useRef(null);

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
    } catch (error) {
      toast.error(error?.message || 'Unable to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh(true);
  }, []);

  const studentCounts = useMemo(() => {
    const counts = {};
    students.forEach((student) => {
      const classId = student.classId;
      counts[classId] = (counts[classId] || 0) + 1;
    });
    return counts;
  }, [students]);

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
  const yearOptions = useMemo(
    () => [...new Set(classes.map((c) => c.academic_year))].filter(Boolean).sort(),
    [classes]
  );

  const filteredAndSorted = classes
    .filter((c) => {
      const q = search.toLowerCase();
      const label = classLabel(c).toLowerCase();
      const matchesSearch = !q || label.includes(q);
      const matchesBranch = filterBranch === 'All' || c.branch === filterBranch;
      const matchesSemester =
        filterSemester === 'All' || String(c.semester) === String(filterSemester);
      const matchesSection = filterSection === 'All' || c.section === filterSection;
      const matchesYear = filterYear === 'All' || String(c.academic_year) === String(filterYear);
      return matchesSearch && matchesBranch && matchesSemester && matchesSection && matchesYear;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity ml-1 inline-block" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="h-3 w-3 text-primary ml-1 inline-block" />
    ) : (
      <ChevronDown className="h-3 w-3 text-primary ml-1 inline-block" />
    );
  };

  const toggleSelectAll = (checked) => {
    setSelectedIds(checked ? filteredAndSorted.map((c) => c.id) : []);
  };

  const toggleSelect = (id, checked) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected classes?`)) return;

    try {
      await Promise.all(selectedIds.map((id) => deleteAdminClass(id)));
      toast.success(`${selectedIds.length} classes deleted`);
      setSelectedIds([]);
      await refresh();
    } catch (error) {
      toast.error(error?.message || 'Unable to delete selected classes');
    }
  };

  const handleOpen = (cls) => {
    if (cls) {
      setEditing(cls);
      setForm({
        branch: cls.branch,
        semester: String(cls.semester),
        section: cls.section,
        academic_year: cls.academic_year,
      });
    } else {
      setEditing(null);
      setForm(emptyClass);
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.branch || !form.semester || !form.section || !form.academic_year) {
      toast.error('All class fields are required');
      return;
    }

    const nextClass = {
      branch: form.branch,
      semester: Number(form.semester),
      section: form.section,
      academic_year: form.academic_year,
    };

    const duplicate = classes.some(
      (c) =>
        c.branch === nextClass.branch &&
        Number(c.semester) === nextClass.semester &&
        c.section === nextClass.section &&
        String(c.academic_year) === String(nextClass.academic_year) &&
        (!editing || c.id !== editing.id)
    );

    if (duplicate) {
      toast.error('That class combination already exists');
      return;
    }

    try {
      setSaving(true);
      if (editing) {
        await updateAdminClass(editing.id, nextClass);
        toast.success('Class updated');
      } else {
        await createAdminClass(nextClass);
        toast.success('Class added');
      }
      setOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error?.message || 'Unable to save class');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAdminClass(id);
      toast.success('Class deleted');
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
      await refresh();
    } catch (error) {
      toast.error(error?.message || 'Unable to delete class');
    }
  };

  const handleImportUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

        const validRows = [];
        jsonData.forEach((row) => {
          const branchKey = findKey(row, 'branch');
          const semesterKey = findKey(row, 'semester');
          const sectionKey = findKey(row, 'section');
          const yearKey =
            findKey(row, 'academic year') ||
            findKey(row, 'academic_year') ||
            findKey(row, 'year');

          if (branchKey && semesterKey && sectionKey && yearKey) {
            const branch = String(row[branchKey]).trim().toUpperCase();
            const semester = Number(row[semesterKey]);
            const section = String(row[sectionKey]).trim().toUpperCase();
            const academic_year = String(row[yearKey]).trim();

            if (
              BRANCHES.includes(branch) &&
              SEMESTERS.includes(semester) &&
              SECTIONS.includes(section) &&
              academic_year
            ) {
              validRows.push({ branch, semester, section, academic_year });
            }
          }
        });

        if (!validRows.length) {
          toast.error('No valid class records found in file.');
          return;
        }

        const existingKeys = new Set(
          classes.map((c) => [c.branch, c.semester, c.section, c.academic_year].join('|'))
        );

        const uniqueRows = validRows.filter((row) => {
          const key = [row.branch, row.semester, row.section, row.academic_year].join('|');
          if (existingKeys.has(key)) return false;
          existingKeys.add(key);
          return true;
        });

        if (!uniqueRows.length) {
          toast.error('All imported class rows already exist.');
          return;
        }

        await Promise.all(uniqueRows.map((row) => createAdminClass(row)));
        toast.success(`Successfully imported ${uniqueRows.length} class(es).`);
        await refresh();
        setOpenImport(false);
      } catch {
        toast.error('File parsing failed. Please check the Excel file.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const wsData = [['Branch', 'Semester', 'Section', 'Academic Year']];
    wsData.push(['CSE', 3, 'A', '2024']);
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Classes Template');
    XLSX.writeFile(wb, 'class_import_template.xlsx');
    toast.success('Template downloaded successfully.');
  };

  const exportClasses = () => {
    const wsData = [['Branch', 'Semester', 'Section', 'Academic Year', 'Students']];
    filteredAndSorted.forEach((c) => {
      wsData.push([
        c.branch,
        c.semester,
        c.section,
        c.academic_year,
        studentCounts[c.id] || 0,
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Classes');
    XLSX.writeFile(wb, `classes_export_${Date.now()}.xlsx`);
    toast.success('Classes exported successfully.');
  };

  return (
    <DashboardLayout navItems={adminNavItems}>
      <div className="mb-6 flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl stat-gradient-teal shadow-md">
              <Blocks className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold tracking-tight text-foreground">
                Classes
              </h1>
              <p className="text-sm text-muted-foreground">
                {filteredAndSorted.length} of {classes.length} records
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white/50 p-2 rounded-2xl border border-white/20 shadow-sm backdrop-blur-md">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              className="pl-10 w-full sm:w-64 h-10 rounded-xl bg-card border-border/60"
              placeholder="Search class combination..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 border-l border-border/60 pl-3 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground/50" />
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="w-[110px] rounded-xl h-10 bg-card border-border/60">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Branches</SelectItem>
                {branchOptions.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterSemester} onValueChange={setFilterSemester}>
              <SelectTrigger className="w-[110px] rounded-xl h-10 bg-card border-border/60">
                <SelectValue placeholder="Sem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Sems</SelectItem>
                {semesterOptions.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    Sem {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterSection} onValueChange={setFilterSection}>
              <SelectTrigger className="w-[100px] rounded-xl h-10 bg-card border-border/60">
                <SelectValue placeholder="Sec" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Secs</SelectItem>
                {sectionOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    Sec {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[130px] rounded-xl h-10 bg-card border-border/60">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Years</SelectItem>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={() => setOpenImport(true)}
              className="h-10 rounded-xl bg-sidebar-primary/5 hover:bg-sidebar-primary/10 border-border/60 text-sidebar-primary shadow-sm"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              <span className="hidden lg:inline">Import</span>
            </Button>
            <Button
              onClick={exportClasses}
              variant="outline"
              className="h-10 rounded-xl bg-sidebar-primary/5 hover:bg-sidebar-primary/10 border-border/60 text-sidebar-primary shadow-sm"
            >
              <Download className="h-4 w-4 mr-1.5" />
              <span className="hidden lg:inline">Export</span>
            </Button>
            <Button
              onClick={() => handleOpen()}
              className="h-10 rounded-xl btn-gradient text-primary-foreground shadow-md"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Add Class</span>
            </Button>
          </div>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between animate-fade-in-up">
          <span className="text-sm font-semibold text-primary px-2">
            {selectedIds.length} class(es) selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            className="h-8 rounded-lg shadow-md transition-all hover:bg-destructive/90"
          >
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
                <TableHead
                  className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 cursor-pointer group select-none"
                  onClick={() => handleSort('section')}
                >
                  Section {renderSortIcon('section')}
                </TableHead>
                <TableHead
                  className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70 cursor-pointer group select-none"
                  onClick={() => handleSort('academic_year')}
                >
                  Academic Year {renderSortIcon('academic_year')}
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">
                  Students
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
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading classes...
                    </span>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSorted.map((c) => {
                  const studentCount = studentCounts[c.id] || 0;
                  return (
                    <TableRow
                      key={c.id}
                      className={`group transition-colors ${
                        selectedIds.includes(c.id)
                          ? 'bg-primary/5 hover:bg-primary/10'
                          : 'hover:bg-muted/30'
                      }`}
                    >
                      <TableCell className="w-[50px] text-center">
                        <Checkbox
                          checked={selectedIds.includes(c.id)}
                          onCheckedChange={(checked) => toggleSelect(c.id, checked)}
                          aria-label={`Select ${classLabel(c)}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15 text-[11px] font-semibold">
                          {c.branch}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-muted-foreground">
                        Sem {c.semester}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-muted-foreground">
                        Sec {c.section}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.academic_year}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Users2 className="h-3.5 w-3.5 text-muted-foreground/50" />
                          <span className="text-xs font-semibold">{studentCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => handleOpen(c)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                            onClick={() => handleDelete(c.id)}
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
                    <Blocks className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">
                      No classes found
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
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-xl">
              {editing ? 'Edit Class' : 'Create New Class'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the class combination below.'
                : 'Create a class using branch, semester, section, and academic year.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Branch
                </Label>
                <Select
                  value={form.branch}
                  onValueChange={(value) => setForm({ ...form, branch: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANCHES.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Semester
                </Label>
                <Select
                  value={form.semester}
                  onValueChange={(value) => setForm({ ...form, semester: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        Sem {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Section
                </Label>
                <Select
                  value={form.section}
                  onValueChange={(value) => setForm({ ...form, section: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Academic Year
                </Label>
                <Input
                  value={form.academic_year}
                  onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                  placeholder="2024"
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="btn-gradient rounded-lg">
              {saving ? 'Saving...' : editing ? 'Update Class' : 'Create Class'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openImport} onOpenChange={setOpenImport}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-xl">
              Import Classes
            </DialogTitle>
            <DialogDescription>
              Upload an Excel file with Branch, Semester, Section, and Academic Year columns.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="w-full rounded-xl h-10"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>

            <div
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">
                Click to upload or drag file
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Excel files only (.xlsx, .xls)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportUpload}
                className="hidden"
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setOpenImport(false)}
              className="rounded-lg"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
