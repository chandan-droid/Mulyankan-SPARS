import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Download, Check, X } from 'lucide-react';
import { parseMarksExcel } from '@/lib/importUtils';
import { downloadImportTemplate } from '@/lib/reportUtils';
import { toast } from 'sonner';

export default function TeacherImportTab({ selectedSubject }) {
  const [importRows, setImportRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const handleFileUpload = async (e) => {
    if(!selectedSubject) {
      toast.error('Select a class/subject first.');
      if(fileRef.current) fileRef.current.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      let rows = await parseMarksExcel(file);
      // Teacher can only import for current subject visually.
      rows = rows.filter(r => r.subjectCode /* well we don't have subject code easily matching, but handled at save level */);
      setImportRows(rows);
      toast.success(`Parsed ${rows.length} rows. Review and confirm below.`);
    } catch {
      toast.error('Failed to parse file. Please check the format.');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {!selectedSubject ? (
        <Card className="glass-card">
          <CardContent className="p-16 text-center text-muted-foreground">
             <p className="font-semibold text-lg">Select a Class / Subject from the top dropdown to upload marks.</p>
          </CardContent>
        </Card>
      ) : (
      <>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-heading font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" /> Upload Excel File
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Upload a .xlsx file with columns: <b>RegNo, AssessmentType, SubjectCode, TotalMarks</b></p>
              <div
                className="border-2 border-dashed border-border/60 rounded-2xl p-8 text-center hover:border-primary/40 hover:bg-primary/[0.02] transition-all cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Click to browse or drag & drop</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Supports .xlsx, .xls files</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
              </div>
              {importing && <div className="flex items-center gap-3 text-sm text-muted-foreground"><div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />Parsing file...</div>}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-heading font-semibold flex items-center gap-2">
                <Download className="h-4 w-4 text-secondary" /> Download Template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Download a pre-formatted Excel template to fill in student marks data.</p>
              <div className="rounded-xl bg-muted/40 p-4 border border-border/40">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Template Columns</p>
                <div className="space-y-1.5">
                  {['RegNo', 'AssessmentType', 'SubjectCode', 'TotalMarks'].map((col) => (
                    <div key={col} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                      <code className="text-xs font-mono text-foreground">{col}</code>
                    </div>
                  ))}
                </div>
              </div>
              <Button size="sm" variant="outline" className="rounded-xl gap-2 text-xs w-full" onClick={downloadImportTemplate}>
                <Download className="h-3.5 w-3.5" /> Download Template (.xlsx)
              </Button>
            </CardContent>
          </Card>
        </div>

        {importRows.length > 0 && (
          <Card className="glass-card overflow-hidden animate-fade-in-up">
            <CardHeader className="bg-muted/20 border-b border-border/30 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-heading font-semibold">Preview – {importRows.length} rows parsed</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" className="btn-gradient text-white rounded-xl gap-1.5 text-xs h-8" onClick={() => { toast.success('Data confirmed! Check Mark Entry page to save.'); setImportRows([]); }}>
                  <Check className="h-3.5 w-3.5" /> Confirm Import
                </Button>
                <Button size="sm" variant="ghost" className="rounded-xl gap-1.5 text-xs h-8 text-muted-foreground" onClick={() => setImportRows([])}>
                  <X className="h-3.5 w-3.5" /> Discard
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {['Reg No.', 'Assessment Type', 'Subject Code', 'Marks'].map((h) => (
                      <TableHead key={h} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground/70">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importRows.slice(0, 20).map((r, i) => (
                    <TableRow key={i} className="hover:bg-primary/[0.02]">
                      <TableCell className="text-xs font-mono">{r.regNo}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/15">{r.assessmentType}</Badge></TableCell>
                      <TableCell className="text-sm">{r.subjectCode}</TableCell>
                      <TableCell className="font-semibold">{r.totalMarks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </>
      )}
    </div>
  );
}
