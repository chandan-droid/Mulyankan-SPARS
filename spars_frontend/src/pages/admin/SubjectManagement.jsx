import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { adminNavItems } from './Dashboard';
import { createAdminSubject, getAdminSubjects } from '@/lib/adminApi';
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
import { Loader2, Plus, BookOpen, Hash } from 'lucide-react';
import { toast } from 'sonner';

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    subjectCode: '',
    subjectName: '',
  });

  const refresh = async () => {
    try {
      setLoading(true);
      const items = await getAdminSubjects();
      setSubjects(items);
    } catch (error) {
      toast.error(error?.message || 'Unable to load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSave = async () => {
    if (!form.subjectCode.trim() || !form.subjectName.trim()) {
      toast.error('Both fields are required');
      return;
    }

    try {
      setSaving(true);
      const created = await createAdminSubject(form);
      setSubjects((prev) => [created, ...prev]);
      toast.success('Subject added');
      setOpen(false);
      setForm({
        subjectCode: '',
        subjectName: '',
      });
    } catch (error) {
      toast.error(error?.message || 'Unable to create subject');
    } finally {
      setSaving(false);
    }
  };
  return (
    <DashboardLayout navItems={adminNavItems}>
      <div className="mb-8 flex items-end justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl stat-gradient-teal shadow-md">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold tracking-tight text-foreground">
              Subjects
            </h1>
            <p className="text-sm text-muted-foreground">
              {subjects.length} subjects registered
            </p>
          </div>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="h-10 rounded-xl btn-gradient text-primary-foreground shadow-md"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add Subject
        </Button>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading subjects...
        </div>
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s, i) => (
          <Card
            key={s.id}
            className="glass-card group hover:shadow-lg transition-all duration-300 animate-fade-in-up"
            style={{
              animationDelay: `${i * 0.08}s`,
              animationFillMode: 'both',
            }}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary shrink-0">
                  <Hash className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {s.subjectName}
                  </p>
                  <code className="text-xs bg-muted/60 px-2 py-0.5 rounded-md font-mono text-muted-foreground mt-1 inline-block">
                    {s.subjectCode}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {subjects.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            No subjects yet
          </p>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold">
              Add New Subject
            </DialogTitle>
            <DialogDescription>
              Enter the subject code and name
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Subject Code
              </Label>
              <Input
                value={form.subjectCode}
                onChange={(e) =>
                  setForm({
                    ...form,
                    subjectCode: e.target.value,
                  })
                }
                placeholder="e.g. CS301"
                className="rounded-xl h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Subject Name
              </Label>
              <Input
                value={form.subjectName}
                onChange={(e) =>
                  setForm({
                    ...form,
                    subjectName: e.target.value,
                  })
                }
                placeholder="e.g. Data Structures & Algorithms"
                className="rounded-xl h-10"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl btn-gradient text-primary-foreground"
            >
              {saving ? 'Saving...' : 'Add Subject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
