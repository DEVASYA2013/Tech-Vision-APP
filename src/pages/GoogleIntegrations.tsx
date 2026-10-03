import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle,
  AlertTriangle,
  Download,
  Calendar,
  HardDrive,
  FileCheck,
  Search,
} from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import { useToast } from '../components/ui/Toast';

interface ParsedStudentRow {
  fullName: string;
  mobile: string;
  email?: string;
  courseId: string;
  courseName: string;
  totalCourseFee: number;
  discount?: number;
  isDuplicate?: boolean;
}

export const GoogleIntegrations: React.FC = () => {
  const { students, courses, addStudent } = useInstitute();
  const { showToast } = useToast();

  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Sample CSV format for copy
  const sampleTemplate = `Full Name,Mobile,Email,Course,Fee,Discount
Aarav Patel,9825123456,aarav@gmail.com,PYTHON,9000,500
Diya Shah,9879012345,diya@gmail.com,ADV_EXCEL,5500,0
Keval Mehta,9909234567,keval@gmail.com,CCC,3500,0`;

  const handleParseCsv = () => {
    if (!csvText.trim()) {
      showToast('Please paste CSV text or student spreadsheet data.', 'error');
      return;
    }

    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        showToast('CSV must include a header and at least one student row.', 'error');
        return;
      }

      const rows: ParsedStudentRow[] = [];
      const existingMobiles = new Set(students.map((s) => s.mobile));

      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        const fullName = parts[0] || 'Unknown';
        const mobile = parts[1] || '';
        const email = parts[2] || '';
        const courseCode = parts[3] || 'CCC';
        const fee = Number(parts[4]) || 3500;
        const discount = Number(parts[5]) || 0;

        const matchedCourse = courses.find(
          (c) => c.courseId.toLowerCase() === courseCode.toLowerCase() || c.courseName.toLowerCase().includes(courseCode.toLowerCase())
        );

        rows.push({
          fullName,
          mobile,
          email,
          courseId: matchedCourse?.courseId || courses[0]?.courseId || 'CCC',
          courseName: matchedCourse?.courseName || courses[0]?.courseName || 'Computer Course',
          totalCourseFee: fee,
          discount,
          isDuplicate: existingMobiles.has(mobile),
        });
      }

      setParsedRows(rows);
      showToast(`Parsed ${rows.length} student records from spreadsheet data!`, 'success');
    } catch {
      showToast('Error parsing CSV data. Please check formatting.', 'error');
    }
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;

    setIsImporting(true);
    let successCount = 0;

    try {
      for (const row of parsedRows) {
        await addStudent({
          studentId: '',
          fullName: row.fullName,
          mobile: row.mobile,
          email: row.email,
          courseId: row.courseId,
          courseName: row.courseName,
          admissionDate: new Date().toISOString().slice(0, 10),
          totalCourseFee: row.totalCourseFee,
          discount: row.discount || 0,
          netPayable: Math.max(0, row.totalCourseFee - (row.discount || 0)),
          status: 'active',
        });
        successCount++;
      }
      showToast(`Successfully imported ${successCount} student admissions into database!`, 'success');
      setParsedRows([]);
      setCsvText('');
    } catch {
      showToast('Encountered an error while importing some students.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            Google Integrations & Spreadsheet Importer
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Import student rosters from Google Sheets or CSV, and view Google Drive / Calendar guides.
          </p>
        </div>
      </div>

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Google Sheets Roster Import</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Copy and paste student rows directly from your Google Sheet to bulk-enroll students with
            auto-duplicate detection.
          </p>
          <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
            Ready & Active
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Google Drive Cloud Storage</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Exports to CSV can be saved locally or uploaded to Google Drive. Client-side CSV export is
            available without requiring paid Google Drive API quotas.
          </p>
          <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
            Export via CSV
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Google Calendar Scheduling</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Sync lecture schedules and exam dates with Google Calendar using standard timetable
            exports.
          </p>
          <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
            Optional Integration
          </span>
        </div>
      </div>

      {/* Spreadsheet / CSV Importer Panel */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-600" />
              Import Students from Google Sheet or CSV
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Paste comma-separated rows copied from your Google Sheet.
            </p>
          </div>
          <button
            onClick={() => setCsvText(sampleTemplate)}
            className="text-xs font-bold text-cyan-600 hover:text-cyan-700"
          >
            Load Sample Template
          </button>
        </div>

        <div>
          <textarea
            rows={5}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`Full Name,Mobile,Email,Course,Fee,Discount\nAarav Patel,9825123456,aarav@gmail.com,PYTHON,9000,500...`}
            className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleParseCsv}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Preview & Validate Rows
          </button>
        </div>

        {/* Parsed Preview Table */}
        {parsedRows.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Import Preview ({parsedRows.length} students detected)
                </h4>
                <p className="text-xs text-slate-500">
                  Review matched courses and duplicate flags before writing to database.
                </p>
              </div>

              <button
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-900/20 disabled:opacity-50 cursor-pointer"
              >
                {isImporting ? 'Importing...' : 'Confirm Bulk Import'}
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Full Name</th>
                    <th className="py-2.5 px-3">Mobile</th>
                    <th className="py-2.5 px-3">Course</th>
                    <th className="py-2.5 px-3">Agreed Fee</th>
                    <th className="py-2.5 px-3">Discount</th>
                    <th className="py-2.5 px-3">Validation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{row.fullName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{row.mobile}</td>
                      <td className="py-2.5 px-3 text-slate-800">{row.courseName}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">₹{row.totalCourseFee}</td>
                      <td className="py-2.5 px-3 text-slate-500">₹{row.discount || 0}</td>
                      <td className="py-2.5 px-3">
                        {row.isDuplicate ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            Possible Duplicate Mobile
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                            <CheckCircle className="w-3 h-3" />
                            Valid Record
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
