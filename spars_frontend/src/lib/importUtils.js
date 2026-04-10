import * as XLSX from 'xlsx';
export function parseMarksExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result);
        const workbook = XLSX.read(data, {
          type: 'array',
        });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        const rows = json.map((row) => ({
          regNo: String(row['RegNo'] ?? row['regNo'] ?? row['Reg No'] ?? ''),
          assessmentType: String(
            row['AssessmentType'] ?? row['Type'] ?? ''
          ).toUpperCase(),
          subjectCode: String(row['SubjectCode'] ?? row['Subject Code'] ?? ''),
          totalMarks: Number(row['TotalMarks'] ?? row['Marks'] ?? 0),
        }));
        resolve(rows.filter((r) => r.regNo));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
