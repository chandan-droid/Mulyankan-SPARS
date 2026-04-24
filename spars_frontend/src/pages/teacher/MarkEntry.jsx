import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { teacherNavItems } from './Dashboard';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import {
  getAssignmentsForTeacher,
  getAssessments,
  getSubjects,
  getStudentsForClass,
  getMarksForAssessment,
  upsertMark,
  saveQuestionMarks,
  getQuestionMarksForMark,
  getMidsemTemplate,
  buildDefaultMidsemQuestions,
  saveMidsemTemplate,
} from '@/data/store';
import {
  getMyAssignments,
  getMyAssessments,
  getCachedMyAssignments,
  getCachedMyAssessments,
  createMarksBulk,
  updateMarksBulk,
  getMarksByAssessment as fetchMarksByAssessmentApi,
  getQuestionMarksByAssessmentAndClass as fetchQuestionMarksByAssessmentAndClassApi,
  saveQuestionMarksByAssessmentAndClass as saveQuestionMarksBulkApi,
  getStudentsByClass as fetchStudentsByClassApi,
  getClassById,
} from '@/lib/teacherApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, PenLine, CheckCircle2, AlertCircle, FileSpreadsheet, ListChecks, ChevronRight, Download, Loader2 } from 'lucide-react';

export default function MarkEntry() {
  const { user } = useAuth();
  const localAssignments = getAssignmentsForTeacher(user?.id || '');
  const subjects = getSubjects();
  const localAssessments = getAssessments();
  const cachedAssignments = getCachedMyAssignments();
  const cachedAssessments = getCachedMyAssessments();

  const [apiAssignments, setApiAssignments] = useState(cachedAssignments);
  const [apiAssessments, setApiAssessments] = useState(cachedAssessments);
  const [hasApiData, setHasApiData] = useState(
    cachedAssignments.length > 0 || cachedAssessments.length > 0
  );
  // classId -> AcademicClassDTO (branch, semester, section, studentCount, academicYear)
  const [classDetailsMap, setClassDetailsMap] = useState({});

  const [selectedId, setSelectedId] = useState('');
  const [midsemRows, setMidsemRows] = useState([]);
  const [simpleRows, setSimpleRows] = useState([]);
  const [originalMidsemRows, setOriginalMidsemRows] = useState([]);
  const [originalSimpleRows, setOriginalSimpleRows] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState(null);
  const hasWarmStartData =
    cachedAssignments.length > 0 ||
    cachedAssessments.length > 0 ||
    localAssignments.length > 0 ||
    localAssessments.length > 0;
  const [isInitializing, setIsInitializing] = useState(!hasWarmStartData);

  useEffect(() => {
    let cancelled = false;
    if (!hasWarmStartData) setIsInitializing(true);

    const loadTeacherData = async () => {
      try {
        const [assignmentData, assessmentData] = await Promise.all([
          getMyAssignments(),
          getMyAssessments(),
        ]);

        if (cancelled) return;
        setApiAssignments(Array.isArray(assignmentData) ? assignmentData : []);
        setApiAssessments(Array.isArray(assessmentData) ? assessmentData : []);
        setHasApiData(true);
        console.log('✓ Initial API data loaded successfully');
      } catch (err) {
        if (cancelled) return;
        console.warn('⚠ Initial API load failed:', err);
        setHasApiData(false);
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    };

    loadTeacherData();
    return () => {
      cancelled = true;
    };
  }, [hasWarmStartData]);

  const assignments = hasApiData ? apiAssignments : localAssignments;
  const allAssessments = hasApiData ? apiAssessments : localAssessments;

  const myAssessments = useMemo(() => {
    return allAssessments
      .filter((a) => {
        return assignments.some((ta) => {
          const sameSubject = String(ta.subjectId) === String(a.subjectId);
          if (!sameSubject) return false;

          // API path: classId based matching is authoritative.
          if (ta.classId != null && a.classId != null) {
            return String(ta.classId) === String(a.classId);
          }

          // Local-store path: fall back to branch/semester/section matching.
          return (
            ta.branch === a.branch &&
            Number(ta.semester) === Number(a.semester) &&
            ta.section === a.section
          );
        });
      })
      .map((a) => {
        const linkedAssignment = assignments.find((ta) => {
          const sameSubject = String(ta.subjectId) === String(a.subjectId);
          if (!sameSubject) return false;

          if (ta.classId != null && a.classId != null) {
            return String(ta.classId) === String(a.classId);
          }

          return (
            ta.branch === a.branch &&
            Number(ta.semester) === Number(a.semester) &&
            ta.section === a.section
          );
        });

        if (!linkedAssignment) return a;

        return {
          ...a,
          branch: a.branch ?? linkedAssignment.branch,
          semester: a.semester ?? linkedAssignment.semester,
          section: a.section ?? linkedAssignment.section,
          academic_year: a.academic_year ?? linkedAssignment.academic_year,
          classId: a.classId ?? linkedAssignment.classId,
        };
      });
  }, [allAssessments, assignments]);

  // Fetch class details for each unique classId in myAssessments
  useEffect(() => {
    if (!hasApiData || myAssessments.length === 0) return;
    const uniqueClassIds = [...new Set(myAssessments.map(a => a.classId).filter(Boolean))];
    if (uniqueClassIds.length === 0) return;
    let cancelled = false;
    Promise.allSettled(uniqueClassIds.map(id => getClassById(id)))
      .then(results => {
        if (cancelled) return;
        const map = {};
        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value) {
            map[String(uniqueClassIds[i])] = r.value;
          }
        });
        setClassDetailsMap(map);
      });
    return () => { cancelled = true; };
  }, [hasApiData, myAssessments]); // eslint-disable-line react-hooks/exhaustive-deps

  const assessment = myAssessments.find((a) => a.id === selectedId);

  const [midsemQuestions, setMidsemQuestions] = useState([]);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!assessment || assessment.type !== 'MIDSEM') {
      setMidsemQuestions([]);
      return;
    }

    const persisted = getMidsemTemplate(assessment.id)?.questions;
    const baseQuestions = Array.isArray(persisted) && persisted.length > 0
      ? persisted
      : buildDefaultMidsemQuestions();

    setMidsemQuestions(baseQuestions.map((q) => ({ ...q })));
  }, [assessment]);

  const midsemTemplate = useMemo(() => {
    if (!assessment || assessment.type !== 'MIDSEM') return null;
    return {
      assessmentId: assessment.id,
      questions: midsemQuestions.length > 0 ? midsemQuestions : buildDefaultMidsemQuestions(),
    };
  }, [assessment, midsemQuestions]);

  const applyCoMapping = useCallback((questions, { showToast = true } = {}) => {
    if (!assessment || assessment.type !== 'MIDSEM') return;

    setMidsemQuestions(questions.map((q) => ({ ...q })));
    saveMidsemTemplate(assessment.id, questions);

    if (!hasApiData) {
      if (showToast) toast.success('CO Mapping updated successfully');
      return;
    }

    const syncPromise = (async () => {
      // Only sync CO mapping changes for students with data
      const rowsWithClass = midsemRows.filter((row) => row.classId != null);
      const uniqueClassIds = [...new Set(rowsWithClass.map((row) => row.classId))];
      if (uniqueClassIds.length === 0) return;

      await Promise.all(
        uniqueClassIds.map((classId) => {
          // Filter to only students with any marks data in this class
          const studentsInClass = rowsWithClass.filter(
            (row) => String(row.classId) === String(classId)
          );
          const studentMarks = studentsInClass
            .map((row) => ({
              studentId: row.studentId,
              questionMarks: questions.map((q, qi) => ({
                questionNumber: qi + 1,
                coNumber: Number(String(q.coNumber).replace(/[^0-9]/g, '') || 1),
                maxMarks: Number(q.maxMarks ?? 0),
                obtainedMarks: Number(row.marks?.[qi] ?? 0),
              })),
            }))
            .filter((sm) => sm.studentId != null); // Exclude null/undefined studentsIds

          if (studentMarks.length === 0) return Promise.resolve();
          return saveQuestionMarksBulkApi(assessment.id, classId, studentMarks);
        })
      );
    })();

    if (showToast) {
      toast.promise(syncPromise, {
        loading: 'Syncing CO mapping to server...',
        success: 'CO Mapping synced successfully!',
        error: 'Saved locally, but failed to sync to server',
      });
      return;
    }

    syncPromise.catch(() => {});
  }, [assessment, hasApiData, midsemRows]);

  const handleInlineCOMapChange = useCallback((questionIndex, coValue) => {
    if (!midsemTemplate) return;
    const updatedQuestions = midsemTemplate.questions.map((question, index) =>
      index === questionIndex
        ? { ...question, coNumber: Number(coValue) }
        : question
    );

    // Inline header mapping should feel immediate; avoid noisy success toasts.
    applyCoMapping(updatedQuestions, { showToast: false });
  }, [midsemTemplate, applyCoMapping]);

  const loadMarks = useCallback(async (a) => {
    let existingMarks = getMarksForAssessment(a.id);
    let stds = getStudentsForClass(a.branch, a.semester, a.section, a.academic_year);

    if (hasApiData && a.classId != null) {
      try {
        const [apiMarks, apiStudents] = await Promise.all([
          fetchMarksByAssessmentApi(a.id),
          fetchStudentsByClassApi(a.classId),
        ]);

        if (Array.isArray(apiMarks)) {
          existingMarks = apiMarks;
          console.log('✓ Fetched marks from API:', existingMarks);
        }
        if (Array.isArray(apiStudents)) {
          stds = apiStudents;
          console.log('✓ Fetched students from API:', stds);
        }
      } catch (err) {
        console.warn('⚠ Failed to load API marks. Using local data:', err?.message);
        setApiError(err?.message || 'Failed to load API marks. Using local data.');
      }
    }

    const hasActiveTemplate =
      assessment &&
      assessment.type === 'MIDSEM' &&
      String(assessment.id) === String(a.id) &&
      midsemQuestions.length > 0;

    const template = hasActiveTemplate
      ? { assessmentId: a.id, questions: midsemQuestions }
      : (getMidsemTemplate(a.id) ?? {
          assessmentId: a.id,
          questions: buildDefaultMidsemQuestions(),
        });
    const numQ = template.questions.length; // 11

    if (a.type === 'MIDSEM') {
      let bulkQuestionMarks = [];
      if (hasApiData) {
        try {
          const uniqueClassIds = [...new Set(stds.map(s => s.classId).filter(Boolean))];
          const results = await Promise.all(
            uniqueClassIds.map(cId => fetchQuestionMarksByAssessmentAndClassApi(a.id, cId))
          );
          bulkQuestionMarks = results.flat();
        } catch (err) {
          console.warn('Failed bulk fetch of question marks', err);
        }
      }

      const bulkQmMap = bulkQuestionMarks.reduce((acc, qm) => {
        const key = String(qm.markId);
        if (!acc[key]) acc[key] = [];
        acc[key].push(qm);
        return acc;
      }, {});

      const rows = await Promise.all(
        stds.map(async (s) => {
          const matchedMarkId = String(s.id);
          const mark = existingMarks.find((m) => String(m.studentId) === matchedMarkId);
          if (mark) {
            let qms = getQuestionMarksForMark(mark.id);
            if (hasApiData) {
              const stringMarkId = String(mark.id);
              qms = bulkQmMap[stringMarkId] || [];
            }
            const marks = template.questions.map((q, qi) => {
              const backendQuestionNumber = qi + 1;
              const qm = qms.find((x) => {
                const xNum = Number(x.questionNumber);
                return (
                  xNum === backendQuestionNumber ||
                  String(x.questionNumber) === String(q.questionNumber)
                );
              });
              return qm?.obtainedMarks ?? (qm?.marksObtained ?? 0);
            });
            const total = marks.reduce((sum, m) => sum + m, 0);
            return {
              studentId: s.id,
              classId: s.classId,
              studentName: s.name,
              regNo: s.regNo || '',
              marks,
              total,
            };
          }
          return {
            studentId: s.id,
            classId: s.classId,
            studentName: s.name,
            regNo: s.regNo || '',
            marks: Array(numQ).fill(0),
            total: 0,
          };
        })
      );
      setMidsemRows(rows);
      setOriginalMidsemRows(JSON.parse(JSON.stringify(rows))); // Store as baseline
    } else {
      // ============ FIXED: SIMPLE ASSESSMENTS (QUIZ, ASSIGNMENT, ATTENDANCE) ============
      const processedRows = stds.map((s) => {
        // FIX #1: STRING COERCION - Convert both IDs to strings for reliable comparison
        const studentIdStr = String(s.id);
        const mark = existingMarks.find((m) => String(m.studentId) === studentIdStr);

        const resolvedMarks =
          mark?.totalMarks ??
          mark?.marksObtained ??
          mark?.quizMarks ??
          mark?.assignmentMarks ??
          0;

        // FIX #2: Initialize all required fields
        const row = {
          studentId: s.id,
          studentName: s.name,
          regNo: s.regNo || '',
          marks: resolvedMarks,
          quizMarks: mark?.quizMarks ?? resolvedMarks,
        };

        // ATTENDANCE now uses direct marks out of 5.
        if (a.type === 'ATTENDANCE') {
          row.marks = Math.min(Math.max(0, Number(resolvedMarks) || 0), 5);
        }

        console.log(`✓ Processed student ${studentIdStr} (${s.name}):`, {
          found: !!mark,
          marksValue: row.marks,
          assessmentType: a.type
        });

        return row;
      });

      setSimpleRows(processedRows);
      setOriginalSimpleRows(JSON.parse(JSON.stringify(processedRows))); // Store as baseline
      console.log('✓ All simple rows processed:', processedRows);
    }
  }, [hasApiData, assessment, midsemQuestions]);

  const handleSelectAssessment = (id) => {
    setSelectedId(id);
    const a = myAssessments.find((x) => x.id === id);
    if (a) {
      console.log('📋 Loading marks for assessment:', a);
      loadMarks(a);
    }
  };

  const updateMidsemMark = (rowIdx, qIdx, value) => {
    if (!midsemTemplate) return;
    const max = midsemTemplate.questions[qIdx].maxMarks;
    setMidsemRows((prev) => {
      const rows = [...prev];
      const row = {
        ...rows[rowIdx],
        marks: [...rows[rowIdx].marks],
      };
      row.marks[qIdx] = Math.min(Math.max(0, value), max);
      row.total = +row.marks.reduce((s, m) => s + m, 0).toFixed(2);
      rows[rowIdx] = row;
      return rows;
    });
  };

  const updateSimpleRow = (idx, field, value) => {
    setSimpleRows((prev) => {
      const rows = [...prev];
      const row = { ...rows[idx] };

      if (field === 'marks') {
        row.marks = Math.min(Math.max(0, value), assessment?.maxMarks ?? 10);
      }
      if (field === 'quizMarks') {
        row.quizMarks = value;
        row.marks = value; // Keep marks in sync with quizMarks
      }
      rows[idx] = row;
      return rows;
    });
  };

  const focusMarkCell = useCallback((grid, row, col) => {
    const selector = `input[data-mark-grid="${grid}"][data-mark-row="${row}"][data-mark-col="${col}"]`;
    const target = document.querySelector(selector);
    if (target && typeof target.focus === 'function') {
      target.focus();
      if (typeof target.select === 'function') target.select();
    }
  }, []);

  const handleMarkCellKeyDown = useCallback((e, grid, row, col, maxCol) => {
    const key = e.key;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(key)) {
      return;
    }

    const cells = document.querySelectorAll(`input[data-mark-grid="${grid}"]`);
    let maxRow = 0;
    cells.forEach((cell) => {
      const val = Number(cell.getAttribute('data-mark-row'));
      if (!Number.isNaN(val)) maxRow = Math.max(maxRow, val);
    });

    let nextRow = row;
    let nextCol = col;

    if (key === 'ArrowUp') nextRow = Math.max(0, row - 1);
    if (key === 'ArrowDown' || key === 'Enter') nextRow = Math.min(maxRow, row + 1);
    if (key === 'ArrowLeft') nextCol = Math.max(0, col - 1);
    if (key === 'ArrowRight') nextCol = Math.min(maxCol, col + 1);

    if (nextRow !== row || nextCol !== col) {
      e.preventDefault();
      focusMarkCell(grid, nextRow, nextCol);
    }
  }, [focusMarkCell]);

  /**
   * Detect which students have changed marks (for optimized payload).
   * Only returns students where marks actually differ from original state.
   */
  const getChangedMidsemRows = useCallback(() => {
    return midsemRows.filter((row) => {
      const originalRow = originalMidsemRows.find(
        (r) => String(r.studentId) === String(row.studentId)
      );
      if (!originalRow) return true; // New student (no original)
      // Check if marks array changed
      const marksChanged = JSON.stringify(row.marks) !== JSON.stringify(originalRow.marks);
      // Check if total changed
      const totalChanged = Number(row.total) !== Number(originalRow.total);
      return marksChanged || totalChanged;
    });
  }, [midsemRows, originalMidsemRows]);

  const getChangedSimpleRows = useCallback(() => {
    return simpleRows.filter((row) => {
      const originalRow = originalSimpleRows.find(
        (r) => String(r.studentId) === String(row.studentId)
      );
      if (!originalRow) return true; // New student
      const marksChanged = Number(row.marks) !== Number(originalRow.marks);
      return marksChanged;
    });
  }, [simpleRows, originalSimpleRows, assessment]);

  /**
   * Save marks — tries the real backend first, falls back to local store.
   * - MIDSEM: POST mark per student, then POST question marks per student.
   * - Others: POST bulk marks in one request.
   */
  const handleSave = async () => {
    if (!assessment || isSaving) return;
    setIsSaving(true);
    setApiError(null);

    try {
      if (assessment.type === 'MIDSEM') {
        if (!midsemTemplate) {
          toast.error('No CO template found for this assessment');
          setIsSaving(false);
          return;
        }

        // Try backend API first
        try {
          const existingMarks = await fetchMarksByAssessmentApi(assessment.id);
          const existingStudentIds = new Set(
            existingMarks.map((mark) => String(mark.studentId))
          );

          // Only process changed rows
          const changedMidsemRows = getChangedMidsemRows();

          const rowsToCreate = changedMidsemRows
            .filter((row) => !existingStudentIds.has(String(row.studentId)))
            .map((row) => ({
              studentId: row.studentId,
              totalMarks: Number(row.total),
            }));

          const rowsToUpdate = changedMidsemRows
            .filter((row) => existingStudentIds.has(String(row.studentId)))
            .map((row) => ({
              studentId: row.studentId,
              marksObtained: Number(row.total),
            }));

          if (rowsToCreate.length > 0) {
            await createMarksBulk(assessment.id, rowsToCreate);
          }
          if (rowsToUpdate.length > 0) {
            await updateMarksBulk(assessment.id, rowsToUpdate);
          }

          // Bulk save question marks for only changed students, mapped by classId
          const uniqueClassIds = [...new Set(changedMidsemRows.map(r => r.classId).filter(Boolean))];
          const bulkSavePromises = uniqueClassIds.map(cId => {
            const studentsInClass = changedMidsemRows.filter(r => r.classId === cId);
            const studentMarksRequest = studentsInClass.map(row => {
              const questionMarks = midsemTemplate.questions.map((q, qi) => ({
                questionNumber: qi + 1,
                coNumber: q.coNumber,
                maxMarks: q.maxMarks,
                obtainedMarks: Number(row.marks[qi] ?? 0),
              }));
              return {
                studentId: row.studentId,
                questionMarks: questionMarks
              };
            });
            return saveQuestionMarksBulkApi(assessment.id, cId, studentMarksRequest);
          });
          
          await Promise.all(bulkSavePromises);
          
          toast.success('Marks updated on server successfully!');
        } catch (apiErr) {
          // Fall back to local store
          console.warn('API save failed, using local store:', apiErr.message);
          for (const row of midsemRows) {
            const markId = upsertMark({
              studentId: row.studentId,
              assessmentId: assessment.id,
              subjectId: assessment.subjectId,
              assessmentType: 'MIDSEM',
              totalMarks: row.total,
            });
            saveQuestionMarks(
              markId,
              midsemTemplate.questions.map((q, i) => ({
                questionNumber: q.questionNumber,
                coNumber: q.coNumber,
                maxMarks: q.maxMarks,
                obtainedMarks: row.marks[i] ?? 0,
              }))
            );
          }
          toast.success('Marks saved locally (server unavailable).');
        }
      } else {
        try {
          const existingMarks = await fetchMarksByAssessmentApi(assessment.id);
          const existingStudentIds = new Set(
            existingMarks.map((mark) => String(mark.studentId))
          );

          // Only process changed rows
          const changedSimpleRows = getChangedSimpleRows();

          const rowsToCreate = changedSimpleRows
            .filter((row) => !existingStudentIds.has(String(row.studentId)))
            .map((row) => ({
              studentId: row.studentId,
              totalMarks: Number(row.marks),
              ...(assessment.type === 'QUIZ'
                ? { quizMarks: Number(row.marks ?? 0) }
                : {}),
            }));

          const rowsToUpdate = changedSimpleRows
            .filter((row) => existingStudentIds.has(String(row.studentId)))
            .map((row) => ({
              studentId: row.studentId,
              marksObtained: Number(row.marks),
            }));

          if (rowsToCreate.length > 0) {
            await createMarksBulk(assessment.id, rowsToCreate);
          }
          if (rowsToUpdate.length > 0) {
            await updateMarksBulk(assessment.id, rowsToUpdate);
          }

          toast.success(`Marks synced to server (${simpleRows.length} records)`);
        } catch (apiErr) {
          console.warn('API save failed, using local store:', apiErr.message);
          for (const row of simpleRows) {
            upsertMark({
              studentId: row.studentId,
              assessmentId: assessment.id,
              subjectId: assessment.subjectId,
              assessmentType: assessment.type,
              totalMarks: row.marks,
              quizMarks: row.quizMarks,
            });
          }
          toast.success('Marks saved locally (server unavailable).');
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ---- EXCEL IMPORT LOGIC ----
  const normalizeKey = (k) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
  const findKey = (obj, targetStr) => {
    const normTarget = normalizeKey(targetStr);
    return Object.keys(obj).find(k => normalizeKey(k) === normTarget);
  };

  const processImportedData = (jsonData) => {
    let matchCount = 0;

    if (assessment.type === 'MIDSEM') {
      setMidsemRows(prev => {
        const rows = [...prev].map(r => ({ ...r, marks: [...r.marks] }));
        rows.forEach((row) => {
          const studentData = jsonData.find(j => {
            const regKey = findKey(j, 'regno') || findKey(j, 'registration') || findKey(j, 'redgno');
            return regKey ? String(j[regKey]).trim().toUpperCase() === String(row.regNo).trim().toUpperCase() : false;
          });

          if (studentData) {
            matchCount++;
            for (let i = 0; i < 11; i++) {
              const rawQnum = String(midsemTemplate.questions[i].questionNumber).replace(/^q/i, '');
              const qKey = findKey(studentData, rawQnum) || findKey(studentData, `q${rawQnum}`);
              if (qKey && studentData[qKey] !== undefined) {
                const val = parseFloat(studentData[qKey]);
                if (!isNaN(val)) row.marks[i] = Math.min(Math.max(0, val), midsemTemplate.questions[i].maxMarks);
              }
            }
            row.total = +row.marks.reduce((s, m) => s + m, 0).toFixed(2);
          }
        });
        return rows;
      });
    } else {
      setSimpleRows(prev => {
        const rows = [...prev].map(r => ({ ...r }));
        rows.forEach((row) => {
          const studentData = jsonData.find(j => {
            const regKey = findKey(j, 'regno') || findKey(j, 'registration') || findKey(j, 'redgno');
            return regKey ? String(j[regKey]).trim().toUpperCase() === String(row.regNo).trim().toUpperCase() : false;
          });

          if (studentData) {
            matchCount++;
            if (assessment.type === 'QUIZ') {
              const mKey = findKey(studentData, 'quiz') || findKey(studentData, 'quizmarks') || findKey(studentData, 'marks') || findKey(studentData, 'score');
              if (mKey !== undefined && studentData[mKey] !== undefined) {
                const val = parseFloat(studentData[mKey]);
                if (!isNaN(val)) row.quizMarks = Math.min(Math.max(0, val), assessment.maxMarks);
              }
              row.marks = row.quizMarks;
            } else if (assessment.type === 'ASSIGNMENT') {
              const mKey =
                findKey(studentData, 'assign') ||
                findKey(studentData, 'assignment') ||
                findKey(studentData, 'assign1') ||
                findKey(studentData, 'assignment1') ||
                findKey(studentData, 'marks') ||
                findKey(studentData, 'score');

              if (mKey !== undefined && studentData[mKey] !== undefined) {
                const val = parseFloat(studentData[mKey]);
                if (!isNaN(val)) row.marks = Math.min(Math.max(0, val), assessment.maxMarks ?? 10);
              }
            } else if (assessment.type === 'ATTENDANCE') {
              const attKey =
                findKey(studentData, 'attendance') ||
                findKey(studentData, 'attendancemarks') ||
                findKey(studentData, 'attend') ||
                findKey(studentData, 'marks') ||
                findKey(studentData, 'score') ||
                findKey(studentData, 'attended') ||
                findKey(studentData, 'attendedclasses');
              if (attKey !== undefined && studentData[attKey] !== undefined) {
                const v = parseFloat(studentData[attKey]);
                if (!isNaN(v)) {
                  row.marks = Math.min(Math.max(0, v), 5);
                }
              }
            }
          }
        });
        return rows;
      });
    }
    toast.success(`Active Match: Perfect import for ${matchCount} students!`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !assessment) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        processImportedData(jsonData);
      } catch (err) {
        toast.error('Failed to parse Excel file. Is it corrupted?');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  const handleZeroAbsentees = () => {
    toast.success('Normalized empty / blank rows into rigid 0 records.');
  };

  const handleDownloadTemplate = () => {
    if (!assessment) return;

    let wsData = [];
    const headers = ['S.No.', 'Redg. No.', 'Student Name', '1a', '1b', '1c', '1d', '1e', '2a', '2b', '2c', '2d', '2e', '2f', 'Assignment', 'Attendance Marks', 'Quiz'];
    wsData.push(headers);

    const rowsBasis = assessment.type === 'MIDSEM' ? midsemRows : simpleRows;
    rowsBasis.forEach((r, i) => {
      const rowData = [i + 1, r.regNo, r.studentName];
      // Keep template rows aligned with all assessment columns after identity fields.
      for (let x = 0; x < 14; x++) rowData.push('');
      wsData.push(rowData);
    });

    if (wsData.length === 1 && rowsBasis.length === 0) {
      toast.error("No students found in this section to generate template.");
      return;
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    const safeName = (assessment.name || assessment.type).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    XLSX.writeFile(wb, `${safeName}_template.xlsx`);
    toast.success('Template securely downloaded.');
  };

  const getSubjectName = (id) =>
    subjects.find((s) => s.id === id)?.subjectName || id;

  const getCompactAssessmentCode = (assessmentItem) => {
    const type = String(assessmentItem.type || '').toUpperCase();
    const name = String(assessmentItem.name || '').toUpperCase();

    if (type === 'MIDSEM') return 'MID';
    if (type === 'QUIZ') return 'QUIZ';
    if (type === 'ATTENDANCE') return 'ATT';
    if (type === 'ASSIGNMENT') {
      const numMatch = name.match(/\d+/);
      if (numMatch) return `ASG-${numMatch[0]}`;
      return 'ASG';
    }

    const fallback = (name || type || 'ASSESS').replace(/[^A-Z0-9]/g, '');
    return fallback.slice(0, 6);
  };

  const getMidsemQuestionLabel = (question, index) => {
    const raw = String(question?.questionNumber ?? '').trim();
    if (!raw) {
      const fallback = buildDefaultMidsemQuestions()[index]?.questionNumber;
      return String(fallback ?? index + 1).toUpperCase();
    }
    return raw.replace(/^q/i, '').toUpperCase();
  };

  // Group assessments by course for the master list
  // Enrich with API class details (branch/sem/section from classDetailsMap)
  const groupedMenu = Object.values(
    myAssessments.reduce((acc, a) => {
      const classKey = String(a.classId ?? '');
      const cd = classDetailsMap[classKey];
      const branch   = cd?.branch   ?? a.branch   ?? '';
      const semester = cd?.semester ?? a.semester ?? '';
      const section  = cd?.section  ?? a.section  ?? '';
      const key = `${a.subjectId}-${a.classId ?? `${branch}-${semester}-${section}`}`;
      if (!acc[key]) {
        acc[key] = {
          id: key,
          subjectId: a.subjectId,
          branch,
          semester,
          section,
          studentCount: cd?.studentCount ?? null,
          academicYear: cd?.academicYear ?? null,
          assessments: [],
        };
      }
      acc[key].assessments.push(a);
      return acc;
    }, {})
  );

  useEffect(() => {
    if (selectedId || myAssessments.length === 0) return;
    const firstAssessment = myAssessments[0];
    setSelectedId(firstAssessment.id);
    loadMarks(firstAssessment);
  }, [selectedId, myAssessments, loadMarks]);

  if (isInitializing) {
    return (
      <DashboardLayout navItems={teacherNavItems}>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Syncing class assignments...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={teacherNavItems}>
      {/* Dynamic Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl stat-gradient-blue shadow-lg ring-4 ring-white/10 dark:ring-black/10">
            <PenLine className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-extrabold tracking-tight text-foreground">
              Marks & Metrics Entry
            </h1>
            <p className="text-sm font-medium text-muted-foreground mt-0.5">
              High-efficiency marking canvas equipped with Excel synchronization.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mt-4">
        {/* LEFT PANE - MASTER LIST */}
        <div className="group/assess w-full lg:w-[88px] lg:hover:w-[320px] shrink-0 space-y-4 transition-[width] duration-300 ease-out">
          <h3 className="ml-1 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground/80 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap overflow-hidden lg:max-w-0 lg:opacity-0 lg:group-hover/assess:max-w-[220px] lg:group-hover/assess:opacity-100 transition-all duration-200">
              Your Assessments
            </span>
          </h3>
          <div className="relative bg-card/40 backdrop-blur-sm border border-border/40 rounded-2xl p-2.5 h-[calc(100vh-280px)] overflow-y-auto lg:overflow-y-hidden lg:group-hover/assess:overflow-y-auto shadow-inner overflow-hidden">
            <div className="hidden lg:flex lg:flex-col gap-2 lg:absolute lg:inset-2.5 transition-opacity duration-200 lg:opacity-100 lg:group-hover/assess:opacity-0 lg:group-hover/assess:pointer-events-none">
              {groupedMenu.length === 0 && (
                <div className="p-2 text-center text-muted-foreground/60">
                  <AlertCircle className="w-5 h-5 mx-auto opacity-50" />
                </div>
              )}
              {groupedMenu.flatMap((group) => group.assessments).map((a) => {
                const isSelected = selectedId === a.id;
                return (
                  <button
                    key={`compact-${a.id}`}
                    onClick={() => handleSelectAssessment(a.id)}
                    title={`${a.name || a.type} - ${getSubjectName(a.subjectId)}`}
                    className={`w-full h-11 rounded-xl border text-[10px] font-extrabold tracking-wider transition-all duration-200 ${isSelected
                        ? 'bg-primary/15 border-primary/40 text-primary shadow-sm'
                        : 'bg-background/80 border-border/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      }`}
                  >
                    {getCompactAssessmentCode(a)}
                  </button>
                );
              })}
            </div>
            <div className="space-y-2.5 transition-opacity duration-200 lg:opacity-0 lg:pointer-events-none lg:group-hover/assess:opacity-100 lg:group-hover/assess:pointer-events-auto">
              {groupedMenu.length === 0 && (
                <div className="p-8 text-center text-muted-foreground/60">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold">No assigned tests found.</p>
                </div>
              )}
              {groupedMenu.map((group) => (
                <div key={group.id} className="mb-4 last:mb-0">
                  <div className="px-2 py-1 mb-1.5 flex items-center justify-between">
                    <p className="text-xs font-extrabold text-foreground tracking-tight">{getSubjectName(group.subjectId)}</p>
                    <span className="text-[9px] font-bold bg-muted/60 px-1.5 py-0.5 rounded text-muted-foreground">{group.branch}</span>
                  </div>
                  <div className="space-y-1.5">
                    {group.assessments.map(a => {
                      const isSelected = selectedId === a.id;
                      return (
                        <button
                          key={a.id}
                          onClick={() => handleSelectAssessment(a.id)}
                          className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 border ${isSelected
                              ? 'bg-primary/10 border-primary/30 shadow-sm'
                              : 'bg-background hover:bg-muted/50 border-transparent hover:border-border/60'
                            }`}
                        >
                          <div>
                            <p className={`text-sm font-bold ${isSelected ? 'text-primary drop-shadow-sm' : 'text-foreground'}`}>
                              {a.name || a.type}
                            </p>
                            <p className="text-[10px] font-semibold text-muted-foreground mt-0.5 uppercase tracking-wider">
                              Max {a.maxMarks}m
                            </p>
                          </div>
                          {isSelected && <ChevronRight className="h-4 w-4 text-primary animate-in fade-in slide-in-from-left-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANE - CANVAS */}
        <div className="flex-1 min-w-0">
          {!assessment ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-card/20 border border-dashed border-border/60 rounded-3xl p-10 text-center animate-fade-in-up">
              <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                <ListChecks className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-xl font-heading font-extrabold text-foreground mb-2">Select an Assessment</h3>
              <p className="text-sm font-medium text-muted-foreground max-w-sm">
                Choose any evaluation module from the left menu to slide open the interactive marking grid and Excel import tools.
              </p>
            </div>
          ) : (
            <Card className="glass-card overflow-hidden shadow-xl border-border/50 animate-in slide-in-from-bottom-4 duration-500">
              <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b border-border/40 p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge className="bg-primary hover:bg-primary text-[10px] font-extrabold tracking-widest px-2 py-0.5 shadow-md">
                        {assessment.type}
                      </Badge>
                      <span className="text-xs font-bold text-muted-foreground">MAX {assessment.maxMarks}</span>
                      {(() => {
                        const cd = classDetailsMap[String(assessment.classId ?? '')];
                        const count = cd?.studentCount;
                        return count != null ? (
                          <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">
                            {count} students
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <CardTitle className="text-xl font-heading font-extrabold text-foreground">
                      {assessment.name || assessment.type} — {getSubjectName(assessment.subjectId)}
                    </CardTitle>
                    <p className="text-xs font-semibold text-muted-foreground tracking-wide mt-1">
                      {(() => {
                        const cd = classDetailsMap[String(assessment.classId ?? '')];
                        const branch   = cd?.branch   ?? assessment.branch   ?? '—';
                        const semester = cd?.semester ?? assessment.semester ?? '—';
                        const section  = cd?.section  ?? assessment.section  ?? '—';
                        const ayear    = cd?.academicYear ?? '';
                        return (
                          <>
                            {branch} <span className="opacity-40 px-1">•</span>
                            Sem {semester} <span className="opacity-40 px-1">•</span>
                            Sec {section}
                            {ayear ? <> <span className="opacity-40 px-1">•</span> {ayear}</> : null}
                          </>
                        );
                      })()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="outline"
                      onClick={handleDownloadTemplate}
                      className="h-10 rounded-xl font-bold text-xs hover:bg-muted/50 border-border/40 transition-all"
                    >
                      <Download className="h-4 w-4 mr-1.5" /> Template
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-10 rounded-xl font-bold text-xs bg-sidebar-primary/5 hover:bg-sidebar-primary/10 border-sidebar-primary/20 hover:border-sidebar-primary/40 text-sidebar-primary transition-all"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Import Excel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="h-10 rounded-xl btn-gradient text-white font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <Save className="h-4 w-4 mr-1.5" />
                      {isSaving ? 'Saving…' : 'Commit Marks'}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0 bg-background/50 [&_div.overflow-auto]:h-[calc(100vh-280px)] [&_div.overflow-auto]:overflow-auto">
                {/* ── MIDSEM ─────────────────────────────────── */}
                {assessment.type === 'MIDSEM' && midsemTemplate && (
                  <>
                    <Table>
                      <TableHeader className="sticky top-0 z-30 bg-card outline outline-1 outline-border">
                        <TableRow className="border-b border-border/40">
                          <TableHead className="sticky left-0 bg-card z-40 font-bold text-xs uppercase tracking-widest text-muted-foreground/70 min-w-[200px] border-r border-border/20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            Student Match
                          </TableHead>
                          <TableHead colSpan={5} className="text-center font-extrabold text-xs uppercase tracking-widest text-blue-700 bg-blue-500/10 border-x border-blue-500/10">
                            Part A
                          </TableHead>
                          <TableHead colSpan={6} className="text-center font-extrabold text-xs uppercase tracking-widest text-purple-700 bg-purple-500/10 border-x border-purple-500/10">
                            Part B
                          </TableHead>
                          <TableHead className="text-center bg-card font-bold text-xs uppercase tracking-widest text-muted-foreground/70">
                            Net
                          </TableHead>
                        </TableRow>
                        <TableRow className="border-b border-border/30">
                          <TableHead className="sticky left-0 bg-card z-40 p-2 border-r border-border/20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" />
                          {midsemTemplate.questions.map((q, qi) => (
                            <TableHead
                              key={`${q.questionNumber}-${qi}`}
                              className={`text-center min-w-[70px] text-[10px] p-2 leading-none border-x border-border/10 ${q.part === 'A' ? 'bg-blue-500/10' : 'bg-purple-500/10'}`}
                            >
                              <div className="font-extrabold text-foreground mb-0.5">Q {getMidsemQuestionLabel(q, qi)}</div>
                              <span className="text-[8px] font-bold text-muted-foreground uppercase">{q.maxMarks}m MAX</span>
                              <div className="mt-1 flex justify-center">
                                <Select value={String(q.coNumber)} onValueChange={(v) => handleInlineCOMapChange(qi, v)}>
                                  <SelectTrigger className="h-6 min-w-[58px] px-1 rounded-md text-[9px] font-extrabold border-border/60 bg-background/80">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[1, 2, 3, 4, 5].map((co) => (
                                      <SelectItem key={co} value={String(co)}>
                                        CO {co}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableHead>
                          ))}
                          <TableHead className="bg-card" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {midsemRows.map((row, ri) => (
                          <TableRow key={row.studentId} className="hover:bg-primary/[0.03] transition-colors border-b border-border/20">
                            <TableCell className="sticky left-0 bg-card z-10 border-r border-border/20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                              <div className="flex flex-col">
                                <span className="font-bold text-sm text-foreground">{row.studentName}</span>
                                <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 w-fit px-1 rounded mt-0.5">{row.regNo}</span>
                              </div>
                            </TableCell>
                            {midsemTemplate.questions.map((q, qi) => (
                              <TableCell key={qi} className={`p-2 border-x border-border/10 ${q.part === 'A' ? 'bg-blue-500/[0.02]' : 'bg-purple-500/[0.02]'}`}>
                                <Input
                                  type="number"
                                  step="0.5"
                                  min={0}
                                  max={q.maxMarks}
                                  data-mark-grid="MIDSEM"
                                  data-mark-row={ri}
                                  data-mark-col={qi}
                                  value={row.marks[qi] === 0 && row.marks[qi] !== "0" ? "" : row.marks[qi]}
                                  placeholder="0"
                                  onKeyDown={(e) => handleMarkCellKeyDown(e, 'MIDSEM', ri, qi, (midsemTemplate?.questions?.length || 1) - 1)}
                                  onChange={(e) => updateMidsemMark(ri, qi, e.target.value === '' ? 0 : Number(e.target.value))}
                                  className="h-9 text-center w-full min-w-[84px] px-2 mx-auto rounded-lg text-base tabular-nums font-semibold bg-background focus:bg-background/80 border-border/60 focus:border-primary/50 transition-colors"
                                />
                              </TableCell>
                            ))}
                            <TableCell className="text-center p-2">
                              <span className="inline-flex items-center justify-center h-10 w-16 rounded-xl bg-primary/10 shadow-sm border border-primary/20 font-extrabold text-[15px] text-primary">
                                {row.total.toFixed(1)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}

                {/* ── SIMPLE EVALS (QUIZ / ASSIGNMENT / ATTENDANCE) ── */}
                {assessment.type !== 'MIDSEM' && (
                  <Table>
                    <TableHeader className="sticky top-0 z-30 bg-card outline outline-1 outline-border">
                      <TableRow className="border-b border-border/40">
                        <TableHead className="sticky left-0 bg-card z-40 font-bold text-xs uppercase tracking-widest text-muted-foreground/70 min-w-[200px] pl-6 border-r border-border/20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          Student Match
                        </TableHead>
                        {assessment.type === 'QUIZ' && (
                          <TableHead className="text-center border-x border-border/5 bg-muted/10">
                            <div className="font-extrabold text-xs uppercase tracking-widest text-foreground/70 mb-0.5">Quiz Marks</div>
                            <span className="text-[8px] font-bold text-muted-foreground/60 uppercase bg-background px-1.5 py-0.5 rounded shadow-sm border border-border/40">MAX {assessment.maxMarks}</span>
                          </TableHead>
                        )}
                        {assessment.type === 'ASSIGNMENT' && (
                          <TableHead className="text-center font-bold text-xs uppercase tracking-widest text-muted-foreground/70">Assignment Marks (MAX {assessment.maxMarks ?? 10})</TableHead>
                        )}
                        {assessment.type === 'ATTENDANCE' && (
                          <TableHead className="text-center font-bold text-xs uppercase tracking-widest text-muted-foreground/70">
                            Attendance Marks (MAX 5)
                          </TableHead>
                        )}
                        <TableHead className="text-center font-extrabold text-xs uppercase tracking-widest text-primary bg-primary/5">Final Out Of {assessment.maxMarks}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simpleRows.map((row, i) => (
                        <TableRow key={row.studentId} className="hover:bg-primary/[0.03] transition-colors border-b border-border/20">
                          <TableCell className="sticky left-0 bg-card z-10 border-r border-border/20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] pl-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-foreground">{row.studentName}</span>
                              <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 w-fit px-1 rounded mt-0.5 tracking-wider">{row.regNo}</span>
                            </div>
                          </TableCell>

                          {assessment.type === 'QUIZ' && (
                            <TableCell className="text-center">
                              <Input
                                type="number" min={0} max={assessment.maxMarks}
                                data-mark-grid="QUIZ"
                                data-mark-row={i}
                                data-mark-col={0}
                                value={row.marks === 0 ? '' : row.marks} placeholder="0"
                                onKeyDown={(e) => handleMarkCellKeyDown(e, 'QUIZ', i, 0, 0)}
                                onChange={(e) => updateSimpleRow(i, 'marks', e.target.value === '' ? 0 : Number(e.target.value))}
                                className="h-10 w-32 px-2 mx-auto text-center rounded-xl text-base tabular-nums font-bold bg-background hover:bg-background/80 border-border/40 focus:border-primary/40 focus:bg-background/80"
                              />
                            </TableCell>
                          )}

                          {assessment.type === 'ASSIGNMENT' && (
                            <TableCell className="text-center">
                              <Input
                                type="number" min={0} max={assessment.maxMarks ?? 10}
                                data-mark-grid="ASSIGNMENT"
                                data-mark-row={i}
                                data-mark-col={0}
                                value={row.marks === 0 ? '' : row.marks} placeholder="0"
                                onKeyDown={(e) => handleMarkCellKeyDown(e, 'ASSIGNMENT', i, 0, 0)}
                                onChange={(e) => updateSimpleRow(i, 'marks', e.target.value === '' ? 0 : Number(e.target.value))}
                                className="h-10 w-32 px-2 mx-auto text-center rounded-xl text-base tabular-nums font-bold bg-background"
                              />
                            </TableCell>
                          )}

                          {assessment.type === 'ATTENDANCE' && (
                            <TableCell className="text-center">
                              <Input
                                type="number" min={0} max={5}
                                data-mark-grid="ATTENDANCE"
                                data-mark-row={i}
                                data-mark-col={0}
                                value={row.marks === 0 ? '' : row.marks} placeholder="0"
                                onKeyDown={(e) => handleMarkCellKeyDown(e, 'ATTENDANCE', i, 0, 0)}
                                onChange={(e) => updateSimpleRow(i, 'marks', e.target.value === '' ? 0 : Number(e.target.value))}
                                className="h-10 w-32 px-2 mx-auto text-center rounded-xl text-base tabular-nums font-bold bg-background"
                              />
                            </TableCell>
                          )}

                          <TableCell className="text-center bg-primary/[0.01]">
                            {assessment.type === 'ATTENDANCE' ? (
                              <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-sm ${row.marks === 5 ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                                {row.marks === 5 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                                {row.marks} / 5
                              </span>
                            ) : assessment.type === 'QUIZ' ? (
                              <span className="inline-flex items-center justify-center h-10 w-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm border border-primary/20 font-extrabold text-[15px] text-primary transition-all duration-300">
                                {row.marks}
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center h-10 w-16 rounded-xl bg-primary/10 shadow-sm border border-primary/20 font-extrabold text-[15px] text-primary">
                                {row.marks}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

    </DashboardLayout>
  );
}