import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

let _logoDataUrlPromise = null;

async function getOutrLogoDataUrl() {
  if (!_logoDataUrlPromise) {
    _logoDataUrlPromise = fetch('/outr.png')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load logo');
        return res.blob();
      })
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          })
      )
      .catch(() => null);
  }
  return _logoDataUrlPromise;
}

// ─────────────────────────────────────────────
// Grade helper
// ─────────────────────────────────────────────
export function getGrade(percentage) {
  if (percentage >= 90) return { grade: 'O',  color: '#16a34a' };
  if (percentage >= 80) return { grade: 'A+', color: '#22c55e' };
  if (percentage >= 70) return { grade: 'A',  color: '#84cc16' };
  if (percentage >= 60) return { grade: 'B+', color: '#eab308' };
  if (percentage >= 50) return { grade: 'B',  color: '#f97316' };
  if (percentage >= 40) return { grade: 'C',  color: '#ef4444' };
  return { grade: 'F', color: '#dc2626' };
}

export function getPerformanceColor(percentage) {
  if (percentage >= 75) return '#16a34a';
  if (percentage >= 50) return '#eab308';
  return '#ef4444';
}

// ─────────────────────────────────────────────
// Shared PDF helpers
// ─────────────────────────────────────────────
async function drawHeader(doc, title, subtitle = '') {
  // Clean white header container
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 42, 'F');
  doc.setDrawColor(224, 231, 255);
  doc.setLineWidth(0.5);
  doc.line(14, 38, 196, 38);

  const logoDataUrl = await getOutrLogoDataUrl();
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 171, 8, 24, 24);
  }

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(12.5);
  doc.setFont('helvetica', 'bold');
  doc.text('ODISHA UNIVERSITY OF TECHNOLOGY AND RESEARCH, BHUBANESWAR', 14, 13);
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Academic Performance Intelligence Report', 14, 19);
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}`, 14, 25.5);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(147, 51, 234);
  doc.text(title, 14, 32.5);
  if (subtitle) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(217, 70, 239);
    doc.text(subtitle, 14 + doc.getTextWidth(title) + 4, 32.5);
  }
}

function infoBox(doc, items, startY) {
  doc.setFillColor(248, 250, 255);
  doc.roundedRect(14, startY, 182, items.length * 7 + 6, 4, 4, 'F');
  doc.setDrawColor(219, 234, 254);
  doc.roundedRect(14, startY, 182, items.length * 7 + 6, 4, 4, 'S');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  let y = startY + 9;
  items.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text(`${label}:`, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 55);
    doc.text(String(val), 60, y);
    y += 7;
  });
  return y + 2;
}

function sectionTitle(doc, text, y) {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text(text, 14, y);
  doc.setDrawColor(165, 180, 252);
  doc.setLineWidth(0.4);
  doc.line(14, y + 2, 196, y + 2);
  doc.setTextColor(30, 41, 59);
  return y + 8;
}

// ─────────────────────────────────────────────
// Student Performance PDF
// ─────────────────────────────────────────────
export async function exportStudentReportPDF(report) {
  const doc = new jsPDF();
  await drawHeader(doc, 'Student Performance Report');

  let y = infoBox(doc, [
    ['Name',     report.studentName],
    ['Reg. No.', report.regNo],
    ['Branch',   report.branch],
    ['Semester', String(report.semester)],
    ['Section',  report.section],
  ], 46);

  y = sectionTitle(doc, 'Assessment Breakdown', y + 4);

  autoTable(doc, {
    startY: y,
    head: [['Subject', 'Assessment Type', 'Marks', 'Max', 'Percentage', 'Grade']],
    body: report.rows.map(r => [
      r.subject,
      r.type,
      r.marks,
      r.maxMarks,
      r.percentage + '%',
      getGrade(parseFloat(r.percentage)).grade,
    ]),
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 255] },
    styles: { fontSize: 8, cellPadding: 3 },
    didParseCell: data => {
      if (data.column.index === 5 && data.section === 'body') {
        const g = data.cell.raw;
        const colors = { O: [22,163,74], 'A+': [34,197,94], A: [132,204,22], 'B+': [234,179,8], B: [249,115,22], C: [239,68,68], F: [220,38,38] };
        data.cell.styles.textColor = colors[g] || [30,30,60];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  // CO Attainment table (if provided)
  if (report.coData && report.coData.length > 0) {
    y = sectionTitle(doc, 'Course Outcome (CO) Attainment', y + 4);
    autoTable(doc, {
      startY: y,
      head: [['CO', 'Obtained', 'Max', 'Attainment %', 'Status']],
      body: report.coData.map(co => [
        co.co,
        co.obtained,
        co.max,
        co.avg + '%',
        co.avg >= 60 ? '✓ Attained' : '✗ Not Attained',
      ]),
      headStyles: { fillColor: [22, 120, 100], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 255, 248] },
      styles: { fontSize: 8, cellPadding: 3 },
      didParseCell: data => {
        if (data.column.index === 4 && data.section === 'body') {
          data.cell.styles.textColor = data.cell.raw.startsWith('✓') ? [22,163,74] : [220,38,38];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Summary box
  if (y + 28 > 280) { doc.addPage(); y = 20; }
  doc.setFillColor(250, 245, 255);
  doc.roundedRect(14, y, 182, 28, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(126, 34, 206);
  doc.text('Summary', 20, y + 10);
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.text(`Total: ${report.totalMarks} / ${report.maxPossible}`, 20, y + 20);
  doc.text(`Percentage: ${report.percentage}%`, 80, y + 20);
  doc.text(`Grade: ${report.grade}`, 152, y + 20);

  doc.save(`${report.studentName.replace(/ /g, '_')}_report.pdf`);
}

// ─────────────────────────────────────────────
// Class Report PDF
// ─────────────────────────────────────────────
export async function exportClassReportPDF(classLabel, rows, avgPct, passCount, failCount) {
  const doc = new jsPDF();
  await drawHeader(doc, 'Class Performance Report', `| ${classLabel}`);

  let y = 46;
  y = infoBox(doc, [
    ['Class',     classLabel],
    ['Students',  rows.length],
    ['Avg Score', avgPct + '%'],
    ['Pass / Fail', `${passCount} / ${failCount}`],
  ], y);

  y = sectionTitle(doc, 'Student Performance Roster', y + 4);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Student Name', 'Reg. No.', 'Total', 'Max', 'Percentage', 'Grade', 'Percentile', 'Status']],
    body: rows.map((r, i) => [
      i + 1,
      r.name,
      r.regNo,
      r.totalMarks,
      r.maxPossible,
      r.percentage + '%',
      r.grade,
      r.percentile ? r.percentile + '%' : '—',
      r.status,
    ]),
    headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 255] },
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    didParseCell: data => {
      if (data.column.index === 8 && data.section === 'body') {
        data.cell.styles.textColor = data.cell.raw === 'Pass' ? [22,163,74] : [220,38,38];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  const fy = doc.lastAutoTable.finalY + 10;
  if (fy + 22 <= 280) {
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(14, fy, 182, 18, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(2, 132, 199);
    doc.text(`Class Avg: ${avgPct}%   |   Pass: ${passCount}   |   Fail: ${failCount}`, 20, fy + 12);
  }

  doc.save(`Class_${classLabel.replace(/ /g, '_')}_report.pdf`);
}

// ─────────────────────────────────────────────
// CO Attainment PDF
// ─────────────────────────────────────────────
export async function exportCOAttainmentPDF(classLabel, coData, threshold = 60) {
  const doc = new jsPDF();
  await drawHeader(doc, 'CO Attainment Report', `| ${classLabel}`);

  let y = 46;
  y = sectionTitle(doc, `Course Outcome Attainment — ${classLabel} (Threshold: ${threshold}%)`, y + 2);

  autoTable(doc, {
    startY: y,
    head: [['Course Outcome', 'Avg Obtained', 'Max Possible', 'Attainment %', 'Threshold', 'Status']],
    body: coData.map(co => [
      co.co,
      co.obtained.toFixed(2),
      co.max,
      co.avg + '%',
      threshold + '%',
      co.avg >= threshold ? '✓ Attained' : '✗ Not Attained',
    ]),
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [236, 253, 245] },
    styles: { fontSize: 9, cellPadding: 4 },
    didParseCell: data => {
      if (data.column.index === 5 && data.section === 'body') {
        data.cell.styles.textColor = data.cell.raw.startsWith('✓') ? [22,163,74] : [220,38,38];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  const attained = coData.filter(c => c.avg >= threshold).length;
  const fy = doc.lastAutoTable.finalY + 10;
  if (fy + 28 <= 280) {
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(14, fy, 182, 24, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(5, 150, 105);
    doc.text('Attainment Summary', 20, fy + 10);
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    doc.text(`${attained} of ${coData.length} COs attained the ${threshold}% threshold`, 20, fy + 20);
  }

  doc.save(`CO_Attainment_${classLabel.replace(/ /g, '_')}.pdf`);
}

// ─────────────────────────────────────────────
// Excel Exports
// ─────────────────────────────────────────────
export function exportToExcel(sheetData, filename, sheetName = 'Report') {
  const ws = XLSX.utils.json_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// Multi-sheet: one sheet per assessment type
export function exportAssessmentBreakdownExcel(data, filename) {
  // data = { MIDSEM: [...], QUIZ: [...], ASSIGNMENT: [...], ATTENDANCE: [...] }
  const wb = XLSX.utils.book_new();
  Object.entries(data).forEach(([type, rows]) => {
    if (rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, type.slice(0, 31));
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// Class roster with percentile
export function exportClassRosterExcel(rows, metadata) {
  // rows have: name, regNo, totalMarks, maxPossible, pct, grade, status, percentile, assessmentBreakdown
  const summaryData = rows.map((r, i) => ({
    'Rank': i + 1,
    'Student Name': r.name,
    'Reg. No.': r.regNo,
    'Total Marks': r.totalMarks,
    'Max Possible': r.maxPossible,
    'Percentage (%)': r.pct,
    'Grade': r.grade,
    'Percentile': r.percentile || '',
    'Status': r.status,
    'MidSem': r.midsem ?? '',
    'Quiz (Best)': r.quiz ?? '',
    'Assignment 1': r.assign1 ?? '',
    'Assignment 2': r.assign2 ?? '',
    'Attendance': r.attendance ?? '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws, 'Class Roster');

  // Metadata sheet
  const metaWs = XLSX.utils.json_to_sheet([
    { Field: 'Branch', Value: metadata.branch },
    { Field: 'Semester', Value: metadata.semester },
    { Field: 'Section', Value: metadata.section },
    { Field: 'Total Students', Value: rows.length },
    { Field: 'Class Average', Value: metadata.avgPct + '%' },
    { Field: 'Pass Count', Value: metadata.passCount },
    { Field: 'Fail Count', Value: metadata.failCount },
    { Field: 'Generated', Value: new Date().toLocaleDateString() },
  ]);
  XLSX.utils.book_append_sheet(wb, metaWs, 'Metadata');

  XLSX.writeFile(wb, `${metadata.branch}_S${metadata.semester}_Sec${metadata.section}_roster.xlsx`);
}

// ─────────────────────────────────────────────
// Sample template download
// ─────────────────────────────────────────────
export function downloadImportTemplate() {
  const sample = [
    { RegNo: '2024CS001', AssessmentType: 'MIDSEM',     SubjectCode: 'CS301', TotalMarks: 16 },
    { RegNo: '2024CS002', AssessmentType: 'QUIZ',       SubjectCode: 'CS301', TotalMarks: 4  },
    { RegNo: '2024CS003', AssessmentType: 'ASSIGNMENT', SubjectCode: 'CS302', TotalMarks: 4  },
  ];
  exportToExcel(sample, 'marks_import_template', 'Marks');
}
