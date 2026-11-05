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
  PartyPopper,
  CalendarOff,
  Plus,
  Trash2,
  X,
  Info,
  Check,
  Sparkles,
} from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import { AttendanceStatus, AttendanceRecordItem, ClassClosure } from '../types';
import { getTodayDateString, formatDate } from '../utils/formatters';
import { exportToCSV } from '../utils/csvExport';
import { useToast } from '../components/ui/Toast';

const FESTIVAL_PRESETS = [
  { title: 'Diwali Celebration & Vacation', type: 'festival', reason: 'Deepawali Festival & New Year Holidays', days: 7 },
  { title: 'Uttarayan / Makar Sankranti', type: 'festival', reason: 'Kite Flying Festival & State Holiday', days: 2 },
  { title: 'Independence Day', type: 'holiday', reason: 'National Holiday (15th August)', days: 1 },
  { title: 'Republic Day', type: 'holiday', reason: 'National Holiday (26th January)', days: 1 },
  { title: 'Janmashtami Celebration', type: 'festival', reason: 'Lord Krishna Janmashtami', days: 1 },
  { title: 'Ganesh Chaturthi', type: 'festival', reason: 'Ganesh Utsav Celebration', days: 2 },
  { title: 'Holi - Dhuleti Vacation', type: 'festival', reason: 'Festival of Colors Vacation', days: 2 },
  { title: 'Summer Vacation Break', type: 'holiday', reason: 'Annual Summer Vacation Break', days: 10 },
  { title: 'Annual Project Exhibition', type: 'event', reason: 'Institute Computer Exhibition & Project Showcase', days: 1 },
  { title: 'Server / Lab Maintenance', type: 'other', reason: 'Hardware & OS upgrades across 14 lab workstations', days: 1 },
];

const addDaysToDate = (dateStr: string, days: number): string => {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + (days - 1));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr;
  }
};

const getDaysDifference = (startStr: string, endStr: string): number => {
  try {
    const [y1, m1, d1] = startStr.split('-').map(Number);
    const [y2, m2, d2] = endStr.split('-').map(Number);
    const date1 = new Date(y1, m1 - 1, d1);
    const date2 = new Date(y2, m2 - 1, d2);
    const diffTime = date2.getTime() - date1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  } catch {
    return 1;
  }
};

export const Attendance: React.FC = () => {
  const {
    batches,
    students,
    attendanceSheets,
    settings,
    saveAttendance,
    isDateSunday,
    isClassClosedOnDate,
    closeClassesForDate,
    reopenClassesForDate,
  } = useInstitute();
  const { showToast } = useToast();

  const today = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedBatchId, setSelectedBatchId] = useState(batches[0]?.batchId || '');
  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Modals
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [isHolidaysListOpen, setIsHolidaysListOpen] = useState(false);

  // Closure Form state (Supports 1 day, multiple days, or any desired duration)
  const [closureDate, setClosureDate] = useState(selectedDate);
  const [closureEndDate, setClosureEndDate] = useState(selectedDate);
  const [closureTitle, setClosureTitle] = useState('');
  const [closureReason, setClosureReason] = useState('');
  const [closureType, setClosureType] = useState<ClassClosure['type']>('celebration');
  const [isSubmittingClosure, setIsSubmittingClosure] = useState(false);

  // Active batch object
  const currentBatch = batches.find((b) => b.batchId === selectedBatchId);
  const enrolledStudents = students.filter(
    (s) => s.batchId === selectedBatchId && s.status === 'active'
  );

  // Date closure check
  const closureStatus = isClassClosedOnDate(selectedDate);
  const isSunday = closureStatus.isSunday;
  const isDateClosed = closureStatus.isClosed;
  const currentClosure = closureStatus.closure;

  // Sync attendance state when date or batch changes
  const existingSheet = attendanceSheets.find(
    (a) => a.date === selectedDate && a.batchId === selectedBatchId
  );
  const isSheetSaved = Boolean(existingSheet && existingSheet.records.length > 0);

  useEffect(() => {
    if (!selectedBatchId) return;

    if (existingSheet && existingSheet.records.length > 0) {
      setRecords(existingSheet.records);
    } else {
      // Every batch's attendance initially appears blank/unmarked until explicitly entered
      const initial: AttendanceRecordItem[] = enrolledStudents.map((s) => ({
        studentId: s.studentId,
        studentName: s.fullName,
        status: 'unmarked',
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
    const label = status === 'unmarked' ? 'Blank / Unmarked' : status.toUpperCase();
    showToast(`Marked all students as ${label}`, 'info');
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

  const openCloseModalForCurrentDate = () => {
    setClosureDate(selectedDate);
    setClosureEndDate(selectedDate);
    setClosureTitle('');
    setClosureReason('');
    setClosureType('celebration');
    setIsClosureModalOpen(true);
  };

  const setHolidayDays = (numDays: number) => {
    setClosureEndDate(addDaysToDate(closureDate, numDays));
  };

  const handlePresetSelect = (preset: typeof FESTIVAL_PRESETS[0]) => {
    setClosureTitle(preset.title);
    setClosureType(preset.type as ClassClosure['type']);
    setClosureReason(preset.reason);
    if (preset.days && preset.days > 1) {
      setClosureEndDate(addDaysToDate(closureDate, preset.days));
    } else {
      setClosureEndDate(closureDate);
    }
  };

  const handleConfirmClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closureTitle.trim()) {
      showToast('Please enter the celebration or closure event name.', 'error');
      return;
    }
    setIsSubmittingClosure(true);
    try {
      const effectiveEndDate = closureEndDate >= closureDate ? closureEndDate : closureDate;
      await closeClassesForDate(
        closureDate,
        closureTitle,
        closureReason,
        closureType,
        effectiveEndDate !== closureDate ? effectiveEndDate : undefined
      );
      const totalDays = getDaysDifference(closureDate, effectiveEndDate);
      const durationText = totalDays > 1
        ? `${totalDays} Days (${formatDate(closureDate)} to ${formatDate(effectiveEndDate)})`
        : formatDate(closureDate);
      showToast(`Classes closed for ${durationText} on occasion of "${closureTitle}".`, 'success');
      setIsClosureModalOpen(false);
    } catch (err: unknown) {
      console.error("Failed to declare class closure:", err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Failed to declare class closure: ${msg}`, 'error');
    } finally {
      setIsSubmittingClosure(false);
    }
  };

  const handleReopenClasses = async (dateToReopen: string) => {
    try {
      await reopenClassesForDate(dateToReopen);
      showToast(`Re-opened classes for ${formatDate(dateToReopen)}. Students can attend.`, 'success');
    } catch (err: unknown) {
      console.error("Failed to reopen classes:", err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Failed to reopen classes: ${msg}`, 'error');
    }
  };

  // Calculations for current roll
  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const unmarkedCount = records.filter((r) => r.status === 'unmarked' || !r.status).length;
  const declaredClosures = settings.closedDates || [];

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
            Mark class roll, manage Sunday leave, and declare class closures for celebrations or events.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Close Class for a Day / Declare Holiday Button */}
          <button
            onClick={openCloseModalForCurrentDate}
            className="px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <PartyPopper className="w-4 h-4 text-amber-600" />
            Declare Holiday / Vacation
          </button>

          {/* View Scheduled Closures */}
          <button
            onClick={() => setIsHolidaysListOpen(true)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <CalendarOff className="w-4 h-4 text-slate-500" />
            <span>Holidays ({declaredClosures.length})</span>
          </button>

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

      {/* SPECIAL NOTICE BANNERS: Sunday Leave OR Manual Closure */}
      {isSunday && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white border border-indigo-700/60 shadow-lg shadow-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <CalendarOff className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-800/80 text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-0.5">
                Automatic Weekly Off
              </div>
              <h3 className="text-base font-black text-white">
                Sunday Holiday: Classes Closed
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                Tech Vision Computer Class is closed every Sunday. Students have a scheduled weekly leave and are not marked absent.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-200 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 self-start sm:self-center">
            {formatDate(selectedDate)}
          </span>
        </div>
      )}

      {currentClosure && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white border border-amber-500 shadow-lg shadow-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
              <PartyPopper className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold text-white uppercase tracking-wider mb-0.5">
                <Sparkles className="w-3 h-3" />
                Special Closure: {currentClosure.type.toUpperCase()}
                {currentClosure.endDate && currentClosure.endDate !== currentClosure.date && (
                  <span className="ml-1 px-1.5 py-0.2 bg-black/20 rounded font-mono">
                    {getDaysDifference(currentClosure.date, currentClosure.endDate)} Days Vacation
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-white">
                Classes Closed: {currentClosure.title}
              </h3>
              <p className="text-xs text-amber-100 mt-0.5">
                {currentClosure.endDate && currentClosure.endDate !== currentClosure.date ? (
                  <span className="font-semibold text-white mr-1.5">
                    Holiday Range: {formatDate(currentClosure.date)} to {formatDate(currentClosure.endDate)} •
                  </span>
                ) : null}
                {currentClosure.reason || 'Institute declared closed for students.'}
                {currentClosure.closedBy ? ` • Marked by ${currentClosure.closedBy}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => handleReopenClasses(currentClosure.id || selectedDate)}
              className="px-3.5 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-black transition shadow-sm cursor-pointer"
            >
              Re-open Classes
            </button>
          </div>
        </div>
      )}

      {/* Selector Bar */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Picker */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Attendance Date (Asia/Kolkata)
              </label>
              {isSunday && (
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded-md">
                  Sunday Off
                </span>
              )}
              {currentClosure && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded-md">
                  Closed
                </span>
              )}
            </div>
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

          {/* Quick Stats: Present / Absent / Blank */}
          <div className="flex items-center gap-2 pt-5">
            <div className="flex-1 p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
              <span className="text-[10px] text-emerald-800 font-bold uppercase">Present</span>
              <div className="text-base font-black text-emerald-700">{presentCount}</div>
            </div>
            <div className="flex-1 p-2 rounded-xl bg-rose-50 border border-rose-100 text-center">
              <span className="text-[10px] text-rose-800 font-bold uppercase">Absent</span>
              <div className="text-base font-black text-rose-700">{absentCount}</div>
            </div>
            <div className="flex-1 p-2 rounded-xl bg-slate-100 border border-slate-200 text-center">
              <span className="text-[10px] text-slate-600 font-bold uppercase">Blank</span>
              <div className="text-base font-black text-slate-700">{unmarkedCount}</div>
            </div>
          </div>

          {/* Quick Mark All Buttons */}
          <div className="flex items-center gap-1.5 pt-5">
            <button
              onClick={() => handleMarkAll('present')}
              className="flex-1 py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              All Present
            </button>
            <button
              onClick={() => handleMarkAll('absent')}
              className="flex-1 py-2 px-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              All Absent
            </button>
            <button
              onClick={() => handleMarkAll('unmarked')}
              className="flex-1 py-2 px-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              title="Clear all to unrecorded/blank"
            >
              Clear Blank
            </button>
          </div>
        </div>

        {/* Batch Attendance Status Banner */}
        <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
          isDateClosed
            ? 'bg-amber-50/80 border-amber-200 text-amber-950'
            : isSheetSaved
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : 'bg-amber-50/70 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-2">
            {isDateClosed ? (
              <CalendarOff className="w-4 h-4 text-amber-700 shrink-0" />
            ) : isSheetSaved ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <div>
              <span className="font-bold">
                {isSunday
                  ? 'Sunday Weekly Off (Classes Closed)'
                  : currentClosure
                  ? `Classes Officially Closed: ${currentClosure.title}`
                  : isSheetSaved
                  ? 'Batch Attendance Recorded'
                  : 'Batch Attendance Not Yet Marked'}
              </span>
              <span className="text-[11px] ml-1.5 opacity-80">
                {isSunday
                  ? 'Automatic weekly holiday. Roll is not required on Sundays.'
                  : currentClosure
                  ? `Students have holiday for ${currentClosure.title}.`
                  : isSheetSaved
                  ? `Saved for ${currentBatch?.batchName || selectedBatchId} on ${formatDate(selectedDate)} (Marked by ${existingSheet?.markedByStaffName || 'Staff'})`
                  : `All students start as blank/unmarked for ${formatDate(selectedDate)} until marked and saved.`}
              </span>
            </div>
          </div>
          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
            isDateClosed
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : isSheetSaved
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : 'bg-amber-100 text-amber-800 border-amber-300'
          }`}>
            {isSunday
              ? 'Sunday Off'
              : currentClosure
              ? 'Closed Day'
              : isSheetSaved
              ? 'Saved Roll'
              : 'Blank / Unmarked'}
          </span>
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
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.studentId, 'present')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            r.status === 'present'
                              ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400'
                              : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Present (P)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.studentId, 'absent')}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            r.status === 'absent'
                              ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400'
                              : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Absent (A)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.studentId, 'late')}
                          className={`px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            r.status === 'late'
                              ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-400'
                              : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Late (L)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.studentId, 'leave')}
                          className={`px-2 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            r.status === 'leave'
                              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400'
                              : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                          }`}
                        >
                          Leave (LV)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(r.studentId, 'unmarked')}
                          className={`px-2 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            r.status === 'unmarked' || !r.status
                              ? 'bg-slate-700 text-white shadow-sm ring-2 ring-slate-400'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title="Clear to blank / unmarked"
                        >
                          Blank (—)
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

      {/* MODAL: Declare Class Closure / Holiday / Vacation */}
      {isClosureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative overflow-hidden animate-in zoom-in-95 max-h-[92dvh] overflow-y-auto">
            <button
              onClick={() => setIsClosureModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                <PartyPopper className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Declare Holiday / Vacation
                </h3>
                <p className="text-xs text-slate-500">
                  Declare holiday for 1 day, multiple days, or as many days as desired (Diwali vacation, Uttarayan, etc.).
                </p>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Quick Celebration & Vacation Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {FESTIVAL_PRESETS.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 text-[11px] font-semibold transition cursor-pointer border border-slate-200"
                  >
                    + {preset.title} {preset.days && preset.days > 1 ? `(${preset.days}d)` : ''}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleConfirmClosure} className="space-y-3.5">
              {/* Duration Type selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Holiday Duration Mode
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setClosureEndDate(closureDate);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                      closureEndDate === closureDate
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    1 Single Day Holiday
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (closureEndDate <= closureDate) {
                        setClosureEndDate(addDaysToDate(closureDate, 3));
                      }
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                      closureEndDate > closureDate
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Multiple Days / Vacation
                  </button>
                </div>

                {/* Quick days shortcuts */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className="text-[11px] text-slate-500 font-semibold">Quick Duration:</span>
                  {[1, 2, 3, 5, 7, 10, 14, 21, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setHolidayDays(d)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition cursor-pointer ${
                        getDaysDifference(closureDate, closureEndDate) === d
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-100 hover:bg-amber-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {d} {d === 1 ? 'Day' : 'Days'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Date & End Date Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={closureDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setClosureDate(newStart);
                      if (closureEndDate < newStart) {
                        setClosureEndDate(newStart);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    End Date (Up to Any Date)
                  </label>
                  <input
                    type="date"
                    required
                    min={closureDate}
                    value={closureEndDate}
                    onChange={(e) => setClosureEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Total Duration Banner */}
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarOff className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    Total Vacation:{' '}
                    <strong className="text-amber-900">
                      {getDaysDifference(closureDate, closureEndDate)}{' '}
                      {getDaysDifference(closureDate, closureEndDate) === 1 ? 'Day' : 'Days'}
                    </strong>{' '}
                    ({formatDate(closureDate)}
                    {closureEndDate > closureDate ? ` to ${formatDate(closureEndDate)}` : ''})
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Celebration / Event Name
                </label>
                <input
                  type="text"
                  required
                  value={closureTitle}
                  onChange={(e) => setClosureTitle(e.target.value)}
                  placeholder="e.g. Diwali Celebration & Vacation, Uttarayan, Summer Vacation"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Closure Category
                </label>
                <select
                  value={closureType}
                  onChange={(e) => setClosureType(e.target.value as ClassClosure['type'])}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
                >
                  <option value="festival">Festival & Cultural Celebration (Diwali, Uttarayan, etc.)</option>
                  <option value="holiday">Vacation / Public Holiday</option>
                  <option value="celebration">Institute Celebration</option>
                  <option value="event">Academic Event / Exhibition</option>
                  <option value="other">Maintenance / Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason / Announcement for Students
                </label>
                <textarea
                  rows={2}
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  placeholder="e.g. Classes remain closed for Diwali festivities. Regular sessions resume Monday."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>No Attendance Penalties:</strong> On declared holiday days, student absence streak reminders are paused and attendance pending notifications are disabled.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClosureModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClosure}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-black transition shadow-md shadow-amber-900/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingClosure
                    ? 'Saving Holiday...'
                    : `Declare ${getDaysDifference(closureDate, closureEndDate)} Day${getDaysDifference(closureDate, closureEndDate) > 1 ? 's' : ''} Holiday`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View All Scheduled Closures & Holidays */}
      {isHolidaysListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative overflow-hidden animate-in zoom-in-95">
            <button
              onClick={() => setIsHolidaysListOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shadow-md">
                  <CalendarOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Institute Holidays & Class Closures
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sundays are automatic weekly leave. Custom holiday ranges and single-day closures are listed below.
                  </p>
                </div>
              </div>
            </div>

            {/* Sunday Notice */}
            <div className="p-3 mb-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Every Sunday:</strong> Scheduled weekly leave across all batches (Automatic).
              </span>
            </div>

            {/* List of Custom Closures */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
              {declaredClosures.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No custom festival or celebration closures scheduled yet.
                </div>
              ) : (
                declaredClosures.map((c) => {
                  const isRange = Boolean(c.endDate && c.endDate !== c.date);
                  const daysCount = isRange ? getDaysDifference(c.date, c.endDate!) : 1;
                  return (
                    <div key={c.id || c.date} className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">{c.title}</span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                            {c.type}
                          </span>
                          {isRange && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-100 text-cyan-800 border border-cyan-200">
                              {daysCount} Days
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Dates:{' '}
                          <strong className="text-slate-700">
                            {isRange
                              ? `${formatDate(c.date)} → ${formatDate(c.endDate!)} (${daysCount} days)`
                              : formatDate(c.date)}
                          </strong>
                          {c.reason ? ` • ${c.reason}` : ''}
                        </div>
                        {c.closedBy && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Declared by: {c.closedBy}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleReopenClasses(c.id || c.date)}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Re-open
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setIsHolidaysListOpen(false);
                  openCloseModalForCurrentDate();
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add New Holiday / Vacation
              </button>
              <button
                onClick={() => setIsHolidaysListOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
