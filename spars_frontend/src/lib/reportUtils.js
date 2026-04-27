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
  if (percentage >= 40) return '#eab308';
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

function hexToRgb(hexStr, fallback = [79, 70, 229]) {
  if (Array.isArray(hexStr)) return hexStr;
  let hex = (hexStr || '').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
  if (hex.length === 6) {
    return [parseInt(hex.slice(0,2), 16), parseInt(hex.slice(2,4), 16), parseInt(hex.slice(4,6), 16)];
  }
  return fallback;
}

function drawSummaryCards(doc, startY, cards) {
  const count = cards.length;
  if (count === 0) return startY;
  const padding = 14;
  const totalWidth = 210 - (padding * 2);
  const spacing = 4;
  const cardWidth = (totalWidth - (spacing * (count - 1))) / count;
  const cardHeight = 18;

  cards.forEach((card, i) => {
    const x = padding + (i * (cardWidth + spacing));
    
    // Background and border
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'S');
    
    // Label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    const labelUpper = (card.label || '').toUpperCase();
    doc.text(labelUpper, x + (cardWidth/2), startY + 6, { align: 'center' });
    
    // Value
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const [r, g, b] = hexToRgb(card.color || '#3b82f6');
    doc.setTextColor(r, g, b);
    doc.text(String(card.value), x + (cardWidth/2), startY + 15, { align: 'center' });
  });

  return startY + cardHeight + 6;
}

function drawBarChart(doc, data, startX, startY, width, height, title) {
  if (!data || data.length === 0) return startY;

  // Chart Container
  doc.setFillColor(252, 253, 255);
  doc.roundedRect(startX, startY, width, height, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(startX, startY, width, height, 3, 3, 'S');

  if (title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(title, startX + 5, startY + 6);
  }

  const chartTop = startY + 12;
  const chartHeight = height - 20;
  const chartWidth = width - 18;
  const chartLeft = startX + 12;
  
  const maxDataVal = Math.max(...data.map(d => d.max ?? d.value ?? 0));
  const chartMax = Math.max(maxDataVal, 10) === 10 ? 10 : Math.ceil(maxDataVal / 10) * 10;
  
  // Draw grid lines
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.1);
  [0, 0.25, 0.5, 0.75, 1].forEach(pct => {
    const y = chartTop + chartHeight - (pct * chartHeight);
    doc.line(chartLeft, y, chartLeft + chartWidth, y);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(String(Math.round(chartMax * pct)), chartLeft - 2, y + 2, { align: 'right' });
  });

  if (data.length > 0) {
    const presetBarWidth = Math.min((chartWidth / data.length) * 0.5, 14);
    const spacing = (chartWidth - (presetBarWidth * data.length)) / (data.length + 1);

    data.forEach((d, i) => {
      const x = chartLeft + spacing + (i * (presetBarWidth + spacing));
      const valPct = Math.min((d.value / chartMax), 1);
      const barHeight = valPct * chartHeight;
      const [r, g, b] = hexToRgb(d.color || getPerformanceColor((d.value/(d.max||chartMax))*100));

      if (d.max) {
         doc.setFillColor(241, 245, 249);
         doc.rect(x, chartTop, presetBarWidth, chartHeight, 'F');
      }

      doc.setFillColor(r, g, b);
      doc.rect(x, chartTop + chartHeight - barHeight, presetBarWidth, barHeight, 'F');

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      
      const label = d.label.length > 8 ? d.label.substring(0,6)+'..' : d.label;
      doc.text(label, x + (presetBarWidth / 2), chartTop + chartHeight + 5, { align: 'center' });
      
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(r, g, b);
      const valText = d.displayValue || String(Math.round(d.value));
      doc.text(valText, x + (presetBarWidth / 2), chartTop + chartHeight - barHeight - 2, { align: 'center' });
    });
  }
  return startY + height + 6;
}

// ─────────────────────────────────────────────
// Student Performance PDF
// ─────────────────────────────────────────────
export async function exportStudentReportPDF(report) {
  const doc = new jsPDF();
  await drawHeader(doc, 'Student Performance Report');

  // Summary Metrics Section
  let y = 46;
  const numericPercentage = Number(report?.percentage ?? 0);
  const gradeObj = getGrade(numericPercentage);
  const isPass = numericPercentage >= 40;
  const studentName = report?.studentName || 'Student';
  const regNo = report?.regNo || 'N/A';
  const branch = report?.branch || 'N/A';
  const semester = report?.semester || 'N/A';
  const section = report?.section || 'N/A';
  const safeRows = Array.isArray(report?.rows) ? report.rows : [];

  const subjectSections = Object.values(
    safeRows.reduce((acc, row) => {
      const subjectName = row?.subjectName || row?.subject || report?.subjectName || report?.subject || 'Assessment Details';
      const subjectCode = row?.subjectCode || report?.subjectCode || '';
      const key = `${subjectName}|${subjectCode}`;
      if (!acc[key]) {
        acc[key] = {
          subjectName,
          subjectCode,
          rows: [],
        };
      }
      acc[key].rows.push(row);
      return acc;
    }, {})
  ).map((sectionGroup) => {
    const totalMarks = sectionGroup.rows.reduce((sum, row) => sum + Number(row.marks ?? 0), 0);
    const maxPossible = sectionGroup.rows.reduce((sum, row) => sum + Number(row.maxMarks ?? 0), 0);
    const percentage = maxPossible > 0 ? +((totalMarks / maxPossible) * 100).toFixed(1) : 0;
    return {
      ...sectionGroup,
      totalMarks,
      maxPossible,
      percentage,
    };
  }).sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  
  y = drawSummaryCards(doc, y, [
    { label: 'Overall Score', value: `${report?.totalMarks ?? 0} / ${report?.maxPossible ?? 0}`, color: '#3b82f6' },
    { label: 'Percentage', value: `${numericPercentage}%`, color: getPerformanceColor(numericPercentage) },
    { label: 'Grade', value: report?.grade ?? gradeObj.grade, color: gradeObj.color },
    { label: 'Status', value: isPass ? 'Pass' : 'Fail', color: isPass ? '#10b981' : '#ef4444' }
  ]);

  y = infoBox(doc, [
    ['Name',     studentName],
    ['Reg. No.', regNo],
    ['Class Details', `${branch} — Semester ${semester} (Section ${section})`],
  ], y);

  if (subjectSections.length > 0) {
    if (y + 24 > 280) {
      doc.addPage();
      y = 20;
    }

    for (const subjectSection of subjectSections) {
      if (y + 34 > 280) {
        doc.addPage();
        y = 20;
      }

      const subjectLabel = subjectSection.subjectCode
        ? `${subjectSection.subjectName} (${subjectSection.subjectCode})`
        : subjectSection.subjectName;

      y = sectionTitle(doc, subjectLabel, y);
      y = drawSummaryCards(doc, y, [
        { label: 'Assessments', value: subjectSection.rows.length, color: '#0ea5e9' },
        { label: 'Total Score', value: `${subjectSection.totalMarks} / ${subjectSection.maxPossible}`, color: '#6366f1' },
        { label: 'Subject %', value: `${subjectSection.percentage}%`, color: getPerformanceColor(subjectSection.percentage) },
      ]);

      const assessmentGraphData = subjectSection.rows.map((row) => ({
        label: row.type,
        value: Number(row.percentage ?? 0),
        max: 100,
        displayValue: `${row.marks} / ${row.maxMarks} (${Number(row.percentage ?? 0)}%)`,
        color: getPerformanceColor(Number(row.percentage ?? 0)),
      }));

      y = drawBarChart(doc, assessmentGraphData, 14, y, 182, 50, 'Assessment Performance Chart (Normalized %)');
      y += 2;
    }
  }

  if (report.coData && report.coData.length > 0) {
    if (y + 50 > 280) { doc.addPage(); y = 20; }
    
    const coGraphData = report.coData.map(co => ({
      label: co.co, value: parseFloat(co.avg), max: 100, displayValue: `${co.avg}%`,
      color: parseFloat(co.avg) >= 60 ? '#10b981' : '#ef4444' // CO Threshold assumes 60 based on older code
    }));
    
    y = drawBarChart(doc, coGraphData, 14, y, 182, 45, 'Course Outcome (CO) Attainment');
  }

  doc.save(`${report.studentName.replace(/ /g, '_')}_report.pdf`);
}

// ─────────────────────────────────────────────
// Class Report PDF
// ─────────────────────────────────────────────
export async function exportClassReportPDF(classLabel, rows, avgPct, passCount, failCount, coData = [], subjectName = '', subjectCode = '') {
  const doc = new jsPDF();
  const titleSuffix = subjectName ? `| ${subjectCode} - ${subjectName}` : `| ${classLabel}`;
  await drawHeader(doc, 'Class Performance Report', titleSuffix);

  const numericAvg = Number(avgPct) || 0;
  const safeRows = Array.isArray(rows) ? rows : [];
  const atRiskCount = safeRows.filter((r) => Number(r.pct ?? r.percentage ?? 0) < 40).length;

  let y = 46;
  
  // 1. Summary Cards
  y = drawSummaryCards(doc, y, [
    { label: 'Total Students', value: safeRows.length, color: '#0ea5e9' },
    { label: 'Class Average', value: `${numericAvg.toFixed(1)}%`, color: '#6366f1' },
    { label: 'Passed Students', value: passCount, color: '#10b981' },
    { label: 'At Risk (<40%)', value: atRiskCount, color: '#ef4444' }
  ]);
  
  // 2. Grade Distribution
  const buckets = [0, 0, 0, 0];
  safeRows.forEach(r => {
    const val = Number(r.pct ?? r.percentage ?? 0);
    if (val < 40) buckets[0]++;
    else if (val < 60) buckets[1]++;
    else if (val < 75) buckets[2]++;
    else buckets[3]++;
  });
  const distGraph = [
    { label: 'At Risk (<40%)', value: buckets[0], max: safeRows.length, color: '#ef4444' },
    { label: 'Average (40-59%)', value: buckets[1], max: safeRows.length, color: '#f59e0b' },
    { label: 'Good (60-74%)', value: buckets[2], max: safeRows.length, color: '#6366f1' },
    { label: 'Excellent (75%+)', value: buckets[3], max: safeRows.length, color: '#10b981' }
  ];
  y = drawBarChart(doc, distGraph, 14, y, 182, 45, 'Grade Distribution Overview');

  // 3. CO Attainment Analysis (Chart & Table)
  if (Array.isArray(coData) && coData.length > 0) {
    y += 6;
    const coGraphData = coData.map(co => ({
      label: co.co || `CO${co.coNumber}`,
      value: parseFloat(co.avg || 0),
      max: 100,
      displayValue: `${co.avg}%`,
      color: parseFloat(co.avg || 0) >= 60 ? '#10b981' : '#ef4444'
    }));
    y = drawBarChart(doc, coGraphData, 14, y, 182, 45, 'CO Attainment Overview');

    y = sectionTitle(doc, 'CO Attainment Details', y);
    autoTable(doc, {
      startY: y,
      head: [['CO', 'Avg Obtained', 'Max Possible', 'Attainment %', 'Target', 'Status']],
      body: coData.map(co => [
        co.co || `CO${co.coNumber}`,
        co.obtained?.toFixed(2) || co.avg || '0.00',
        co.max?.toFixed(2) || '100.00',
        `${parseFloat(co.avg || 0).toFixed(1)}%`,
        '60%',
        parseFloat(co.avg || 0) >= 60 ? 'Attained' : 'Critical'
      ]),
      headStyles: { fillColor: [16, 185, 129], fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      didParseCell: data => {
        if (data.column.index === 5 && data.section === 'body') {
          data.cell.styles.textColor = data.cell.raw === 'Attained' ? [5, 150, 105] : [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // 4. Detailed Student Roster
  if (y > 240) { doc.addPage(); y = 20; }
  y = sectionTitle(doc, 'Student Performance Roster (Component Breakdown)', y);

  autoTable(doc, {
    startY: y,
    head: [['Rank', 'Student Name', 'Reg No.', 'Mid', 'Quiz', 'Asgn', 'Att', 'Tot/40', 'PCT', 'Grade']],
    body: safeRows.map((r, i) => [
      i + 1,
      r.name.length > 20 ? r.name.substring(0, 20) + '..' : r.name,
      r.regNo,
      r.midsem ?? '-',
      r.quiz ?? '-',
      r.assignment ?? '-',
      r.attendance ?? '-',
      Number(r.totalOutOf40 || 0).toFixed(1),
      `${Number(r.pct || 0).toFixed(1)}%`,
      r.grade || 'F',
    ]),
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [250, 251, 255] },
    styles: { fontSize: 7, cellPadding: 2, valign: 'middle', halign: 'center' },
    columnStyles: { 
      1: { halign: 'left', cellWidth: 35 },
      2: { halign: 'left', cellWidth: 25 }
    },
    didParseCell: data => {
      if (data.section === 'body') {
        const rowData = safeRows[data.row.index];
        const pct = Number(rowData.pct || 0);
        
        // Match UI row colors
        if (pct >= 75) data.cell.styles.fillColor = [209, 250, 229];
        else if (pct >= 40) data.cell.styles.fillColor = [254, 243, 199];
        else data.cell.styles.fillColor = [254, 226, 226];

        if (data.column.index === 8) data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  doc.save(`Class_Report_${classLabel.replace(/ /g, '_')}_${subjectCode || 'Full'}.pdf`);
}

// ─────────────────────────────────────────────
// CO Attainment PDF
// ─────────────────────────────────────────────
export async function exportCOAttainmentPDF(classLabel, coData, threshold = 60) {
  const doc = new jsPDF();
  await drawHeader(doc, 'CO Attainment Report', `| ${classLabel}`);

  const attainedCount = coData.filter(c => c.avg >= threshold).length;
  const overallAvg = coData.length > 0 ? (coData.reduce((s, c) => s + c.avg, 0) / coData.length).toFixed(1) : 0;

  let y = 46;
  y = drawSummaryCards(doc, y, [
    { label: 'Total COs', value: coData.length, color: '#3b82f6' },
    { label: 'COs Attained', value: attainedCount, color: '#10b981' },
    { label: 'Target Set', value: `${threshold}%`, color: '#f59e0b' },
    { label: 'Avg Attainment', value: `${overallAvg}%`, color: '#6366f1' }
  ]);

  const coGraphData = coData.map((co, idx) => ({
    label: `CO ${co.co || (idx + 1)}`,
    value: parseFloat(co.avg),
    max: 100,
    displayValue: `${co.avg}%`,
    color: parseFloat(co.avg) >= threshold ? '#10b981' : '#ef4444'
  }));

  y = drawBarChart(doc, coGraphData, 14, y, 182, 50, `CO Attainment Overview (Threshold: ${threshold}%)`);

  y = sectionTitle(doc, `CO Attainment Details`, y);

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
    'Status': r.status,
    'MidSem': r.midsem ?? '',
    'Quiz': r.quiz ?? '',
    'Assignment': r.assignment ?? r.assign1 ?? '',
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
