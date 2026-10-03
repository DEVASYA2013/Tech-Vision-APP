import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Printer,
  Save,
  Users,
  Calendar,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import { AttendanceStatus, AttendanceRecordItem } from '../types';
import { getTodayDateString, formatDate } from '../utils/formatters';
import { exportToCSV } from '../utils/csvExport';
import { useToast } from '../components/ui/Toast';

export const Attendance: React.FC = () => {
  const { batches, courses, students, attendanceSheets, saveAttendance } = useInstitute();
  const { showToast } = useToast();

  const today = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedBatchId, setSelectedBatchId] = useState(batches[0]?.batchId || '');
  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Active batch object
  const currentBatch = batches.find((b) => b.batchId === selectedBatchId);
  const enrolledStudents = students.filter(
    (s) => s.batchId === selectedBatchId && s.status === 'active'
  );

  // Sync attendance state when date or batch changes
  useEffect(() => {
    if (!selectedBatchId) return;

    // Check if an attendance sheet already exists for this date and batch
    const existingSheet = attendanceSheets.find(
      (a) => a.date === selectedDate && a.batchId === selectedBatchId
    );

    if (existingSheet && existingSheet.records.length > 0) {
      setRecords(existingSheet.records);
    } else {
      // Initialize with enrolled students with default 'present' or unselected
      const initial: AttendanceRecordItem[] = enrolledStudents.map((s) => ({
        studentId: s.studentId,
        studentName: s.fullName,
        status: 'present',
        remarks: '',
      }));
      setRecords(initial);
    }
  }, [selectedDate, selectedBatchId, attendanceSheets, enrolledStudents.length]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status } : r))
    );
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, remarks } : r))
    );
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setRecords((prev) => prev.map((r) => ({ ...r, status })));
    showToast(`Marked all students as ${status.toUpperCase()}`, 'info');
  };

  const handleSave = async () => {
    if (!selectedBatchId) {
      showToast('Please select a batch first.', 'error');
      return;
    }
    if (records.length === 0) {
      showToast('No students enrolled in this batch to mark.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await saveAttendance(
        selectedDate,
        currentBatch?.courseId || '',
        selectedBatchId,
        records
      );
      showToast(`Attendance saved successfully for ${formatDate(selectedDate)}!`, 'success');
    } catch {
      showToast('Failed to save attendance records.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Student ID', 'Student Name', 'Status', 'Date', 'Batch', 'Remarks'];
    const rows = records.map((r) => [
      r.studentId,
      r.studentName,
      r.status.toUpperCase(),
      selectedDate,
      currentBatch?.batchName || selectedBatchId,
      r.remarks || '',
    ]);
    exportToCSV(`TechVision_Attendance_${selectedBatchId}_${selectedDate}`, headers, rows);
    showToast('Attendance report exported to CSV.', 'success');
  };

  // Calculations for current roll
  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const lateCount = records.filter((r) => r.status === 'late').length;
  const leaveCount = records.filter((r) => r.status === 'leave').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-cyan-600" />
            Daily Student Attendance
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Mark class roll, track student presence, and maintain historical session records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Roll
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || records.length === 0}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-900/20 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </div>

      {/* Selector Bar */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Attendance Date (Asia/Kolkata)
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
            />
          </div>

          {/* Batch Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Class Batch
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
            >
              {batches.length === 0 && <option value="">No Batches Created</option>}
              {batches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.batchName} ({b.startTime} - {b.endTime})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Stats: Present / Absent */}
          <div className="flex items-center gap-2 pt-5">
            <div className="flex-1 p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
              <span className="text-[10px] text-emerald-800 font-bold uppercase">Present</span>
              <div className="text-base font-black text-emerald-700">{presentCount}</div>
            </div>
            <div className="flex-1 p-2 rounded-xl bg-rose-50 border border-rose-100 text-center">
              <span className="text-[10px] text-rose-800 font-bold uppercase">Absent</span>
              <div className="text-base font-black text-rose-700">{absentCount}</div>
            </div>
          </div>

          {/* Quick Mark All Buttons */}
          <div className="flex items-center gap-2 pt-5">
            <button
              onClick={() => handleMarkAll('present')}
              className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              All Present
            </button>
            <button
              onClick={() => handleMarkAll('absent')}
              className="flex-1 py-2 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              All Absent
            </button>
          </div>
        </div>
      </div>

      {/* Roll Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-600" />
            <span>
              Enrolled Students in {currentBatch?.batchName || 'Selected Batch'}:{' '}
              <strong className="text-slate-900">{records.length}</strong>
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Instructor: <strong>{currentBatch?.instructorName || 'Assigned Staff'}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4 text-center">Attendance Status</th>
                <th className="py-3 px-4">Remarks / Module Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No active students assigned to this batch yet. Assign students to this batch in
                    Student Directory.
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => (
                  <tr key={r.studentId} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 text-center text-slate-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {r.studentId}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {r.studentName}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.studentId, 'present')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            r.status === 'present'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Present (P)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.studentId, 'absent')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            r.status === 'absent'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Absent (A)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.studentId, 'late')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            r.status === 'late'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Late (L)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.studentId, 'leave')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            r.status === 'leave'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                          }`}
                        >
                          Leave (LV)
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={r.remarks || ''}
                        onChange={(e) => handleRemarksChange(r.studentId, e.target.value)}
                        placeholder="e.g. Lab task completed, arrived 15m late..."
                        className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:bg-white"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
