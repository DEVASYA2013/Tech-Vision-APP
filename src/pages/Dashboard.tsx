import React from 'react';
import {
  Users,
  UserX,
  CheckCircle2,
  XCircle,
  Clock,
  IndianRupee,
  TrendingUp,
  Monitor,
  Check,
  BookOpen,
  UserCheck,
  UserPlus,
  CalendarCheck,
  CreditCard,
  PlusCircle,
  ArrowRight,
  AlertCircle,
  Activity,
  Award,
  ClipboardList,
  Trash2,
  RotateCcw,
  BellRing,
  Phone,
} from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import {
  formatINR,
  formatDate,
  getTodayDateString,
  getCurrentMonthName,
  getStudentFeeReminderInfo,
} from '../utils/formatters';
import { NavTab } from '../components/layout/Sidebar';
import { useToast } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface DashboardProps {
  onNavigate: (tab: NavTab) => void;
  onOpenAddStudent: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onOpenAddStudent }) => {
  const {
    students,
    courses,
    batches,
    seats,
    payments,
    attendanceSheets,
    auditLogs,
    deleteFeePayment,
    clearAllFeeHistoryAndResetBalances,
    resetAllStudentsAndFees,
  } = useInstitute();
  const { showToast } = useToast();
  const [isClearFeesModalOpen, setIsClearFeesModalOpen] = React.useState(false);
  const [isResetAllModalOpen, setIsResetAllModalOpen] = React.useState(false);

  const today = getTodayDateString();

  // 1. Students calculations
  const activeStudents = students.filter((s) => s.status === 'active');
  const inactiveStudents = students.filter((s) => s.status !== 'active');

  // 2. Attendance calculations for today
  const todaySheets = attendanceSheets.filter((a) => a.date === today);
  const presentTodayStudentIds = new Set<string>();
  const absentTodayStudentIds = new Set<string>();

  todaySheets.forEach((sheet) => {
    sheet.records.forEach((r) => {
      if (r.status === 'present') presentTodayStudentIds.add(r.studentId);
      if (r.status === 'absent') absentTodayStudentIds.add(r.studentId);
    });
  });

  const presentTodayCount = presentTodayStudentIds.size;
  const absentTodayCount = absentTodayStudentIds.size;
  const totalMarkedTodayCount = presentTodayCount + absentTodayCount;
  const unmarkedTodayCount = Math.max(0, activeStudents.length - totalMarkedTodayCount);

  // 3. Fee calculations
  const totalOutstandingFees = activeStudents.reduce((acc, s) => acc + (s.outstandingBalance || 0), 0);

  const currentYearMonth = today.slice(0, 7); // 'YYYY-MM'
  const feesCollectedThisMonth = payments
    .filter((p) => !p.isReversal && p.paymentDate.startsWith(currentYearMonth))
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  // 4. Computer Seats calculations (Tech Vision Classroom: 14 Computers)
  const totalSeatsCount = 14;
  const occupiedSeatsCount = seats.filter((s) => s.status === 'occupied').length;
  const availableSeatsCount = seats.filter((s) => s.status === 'available').length || Math.max(0, 14 - occupiedSeatsCount);
  const rowASeats = seats.filter((s) => s.seatNumber.startsWith('A-'));
  const rowBSeats = seats.filter((s) => s.seatNumber.startsWith('B-'));

  // 5. Courses & Staff calculations
  const activeCoursesCount = courses.filter((c) => c.isActive).length;
  // Estimate staff members from unique instructors & audit performers
  const staffMemberIds = new Set<string>();
  batches.forEach((b) => { if (b.instructorStaffId) staffMemberIds.add(b.instructorStaffId); });
  auditLogs.forEach((l) => { if (l.performedByUid) staffMemberIds.add(l.performedByUid); });
  const activeStaffCount = Math.max(1, staffMemberIds.size);

  // Course-wise distribution
  const courseCounts: Record<string, number> = {};
  students.forEach((s) => {
    const name = s.courseName || 'Unassigned';
    courseCounts[name] = (courseCounts[name] || 0) + 1;
  });

  // Recent data & 1-Month Fee Reminders
  const recentStudents = [...students].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const recentPayments = [...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const pendingFeeStudentsWithReminder = activeStudents
    .filter((s) => (s.outstandingBalance || 0) > 0)
    .map((s) => ({
      student: s,
      reminder: getStudentFeeReminderInfo(s, payments, today),
    }))
    .sort((a, b) => a.reminder.daysUntilReminder - b.reminder.daysUntilReminder);

  const oneMonthDueReminders = pendingFeeStudentsWithReminder.filter(
    (item) => item.reminder.isReminderDue
  );
  const studentsWithPendingFees = pendingFeeStudentsWithReminder.slice(0, 6);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Welcome & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white shadow-xl shadow-slate-950/20 border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 text-xs font-semibold mb-2">
            <Award className="w-3.5 h-3.5" />
            Tech Vision Academic Terminal
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Institute Overview & Daily Operations
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Real-time database metrics for attendance, fee collections, and workstation allocation.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('enquiries')}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition flex items-center gap-1.5 shadow-md shadow-amber-900/20 cursor-pointer"
          >
            <ClipboardList className="w-4 h-4" />
            Enquiry Form
          </button>
          <button
            onClick={onOpenAddStudent}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-900/30 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            New Admission
          </button>
          <button
            onClick={() => onNavigate('attendance')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <CalendarCheck className="w-4 h-4 text-cyan-400" />
            Mark Attendance
          </button>
          <button
            onClick={() => onNavigate('fees')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-emerald-400" />
            Collect Fee
          </button>
        </div>
      </div>

      {/* 1-Month Fee Reminder Banner (Triggers when 1 month has passed and fee is still remaining) */}
      {oneMonthDueReminders.length > 0 && (
        <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0 shadow-xs">
                <BellRing className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-rose-950 uppercase tracking-tight">
                    1-Month Fee Collection Reminder ({oneMonthDueReminders.length}{' '}
                    {oneMonthDueReminders.length === 1 ? 'Student' : 'Students'} Due)
                  </h3>
                </div>
                <p className="text-xs text-rose-800 mt-0.5">
                  The following students have completed 1 full month since admission or last fee payment and still have remaining fees due.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('fees')}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              Open Fee Collection
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {oneMonthDueReminders.map(({ student: s, reminder }) => (
              <div
                key={s.id}
                className="p-3 rounded-xl bg-white border border-rose-200 flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-black text-cyan-800 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200">
                      {s.grNo || s.studentId}
                    </span>
                    <span className="font-bold text-xs text-slate-900 truncate">{s.fullName}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5 truncate">
                    {s.courseName} {s.batchName ? `• ${s.batchName}` : ''}
                  </div>
                  <div className="text-[10px] text-rose-700 font-semibold mt-1 flex items-center gap-2">
                    <span>Admitted: {formatDate(s.admissionDate)}</span>
                    <span>•</span>
                    <span>1-Mo Due: {formatDate(reminder.reminderDate)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {s.mobile}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-black text-rose-600">
                    {formatINR(s.outstandingBalance)}
                  </div>
                  <div className="text-[10px] text-slate-400">Remaining</div>
                  <button
                    onClick={() => onNavigate('fees')}
                    className="mt-1.5 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold transition cursor-pointer"
                  >
                    Collect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 12 Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5 sm:gap-4">
        {/* Card 1: Active Students */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Active Students</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{activeStudents.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Currently enrolled</div>
        </div>

        {/* Card 2: Former / Inactive Students */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Completed / Inactive</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{inactiveStudents.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Alumni or archived</div>
        </div>

        {/* Card 3: Present Students Today */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Present Today</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">{presentTodayCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Marked in class</div>
        </div>

        {/* Card 4: Absent Students Today */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Absent Today</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600">{absentTodayCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Missed session</div>
        </div>

        {/* Card 5: Unmarked Attendance */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Unmarked Today</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600">{unmarkedTodayCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Pending batch roll</div>
        </div>

        {/* Card 6: Total Outstanding Fees */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Outstanding Fees</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-rose-600 truncate">{formatINR(totalOutstandingFees)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Pending collection</div>
        </div>

        {/* Card 7: Fees Collected This Month */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Month Collection</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black text-emerald-600 truncate">{formatINR(feesCollectedThisMonth)}</div>
          <div className="text-[11px] text-slate-400 mt-1">{getCurrentMonthName()}</div>
        </div>

        {/* Card 8: Total Computer Seats */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Lab PCs</span>
            <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-600">
              <Monitor className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{totalSeatsCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">5 in Row A • 9 in Row B</div>
        </div>

        {/* Card 9: Occupied Seats */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Occupied Workstations</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Check className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-blue-600">{occupiedSeatsCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Currently in use</div>
        </div>

        {/* Card 10: Available Seats */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Available Seats</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Monitor className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">{availableSeatsCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Ready for allocation</div>
        </div>

        {/* Card 11: Active Courses */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Active Courses</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{activeCoursesCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">CCC, Python, Web...</div>
        </div>

        {/* Card 12: Active Staff */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Active Staff</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{activeStaffCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Faculty & operators</div>
        </div>
      </div>

      {/* Main Visual Panels: Attendance summary & Course Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel 1: Today's Attendance Breakdown */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Today's Class Attendance</h3>
              <p className="text-xs text-slate-400 mt-0.5">{formatDate(today)}</p>
            </div>
            <button
              onClick={() => onNavigate('attendance')}
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
            >
              Open Roll
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Present Percentage</span>
                <span>
                  {activeStudents.length > 0
                    ? Math.round((presentTodayCount / activeStudents.length) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      activeStudents.length > 0
                        ? Math.min(100, (presentTodayCount / activeStudents.length) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="text-xs text-emerald-800 font-medium">Present</div>
                <div className="text-lg font-black text-emerald-700 mt-0.5">{presentTodayCount}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                <div className="text-xs text-rose-800 font-medium">Absent</div>
                <div className="text-lg font-black text-rose-700 mt-0.5">{absentTodayCount}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                <div className="text-xs text-amber-800 font-medium">Pending</div>
                <div className="text-lg font-black text-amber-700 mt-0.5">{unmarkedTodayCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: Course Distribution */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Course Enrollment Distribution</h3>
              <p className="text-xs text-slate-400 mt-0.5">Top registered subjects</p>
            </div>
            <button
              onClick={() => onNavigate('courses')}
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
            >
              Courses
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-3 max-h-52 overflow-y-auto">
            {Object.keys(courseCounts).length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No students enrolled yet. Add students or load demo records.
              </div>
            ) : (
              Object.entries(courseCounts).map(([courseName, count]) => {
                const pct = Math.round((count / students.length) * 100);
                return (
                  <div key={courseName} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 truncate max-w-[200px]">{courseName}</span>
                      <span className="font-bold text-slate-900">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Panel 3: Workstation Lab Quick Status */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">14-Computer Lab Status</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {occupiedSeatsCount} of 14 Occupied (Row A: 5 • Row B: 9)
              </p>
            </div>
            <button
              onClick={() => onNavigate('seats')}
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 cursor-pointer"
            >
              Lab Layout
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick mini-grid of 14 PC seats by Row A (5) & Row B (9) */}
          <div className="mt-3 space-y-2.5">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Row A (5 Computers)
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {(rowASeats.length > 0 ? rowASeats : seats.slice(0, 5)).map((seat) => (
                  <div
                    key={seat.seatNumber}
                    className={`py-1.5 px-1 rounded-lg text-center text-[11px] font-bold border transition ${
                      seat.status === 'occupied'
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : seat.status === 'available'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}
                    title={`${seat.seatNumber}: ${seat.status.toUpperCase()} ${seat.assignedStudentName ? `(${seat.assignedStudentName})` : ''}`}
                  >
                    {seat.seatNumber}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Row B (9 Computers)
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {(rowBSeats.length > 0 ? rowBSeats : seats.slice(5, 14)).map((seat) => (
                  <div
                    key={seat.seatNumber}
                    className={`py-1.5 px-1 rounded-lg text-center text-[11px] font-bold border transition ${
                      seat.status === 'occupied'
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : seat.status === 'available'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}
                    title={`${seat.seatNumber}: ${seat.status.toUpperCase()} ${seat.assignedStudentName ? `(${seat.assignedStudentName})` : ''}`}
                  >
                    {seat.seatNumber}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Available</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Occupied</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> Maintenance</span>
          </p>
        </div>
      </div>

      {/* Tables Row: Recent Admissions & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Admissions */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Recent Student Registrations</h3>
              <p className="text-xs text-slate-400 mt-0.5">Latest enrollments</p>
            </div>
            <div className="flex items-center gap-2">
              {(students.length > 0 || payments.length > 0) && (
                <button
                  onClick={() => setIsResetAllModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                  title="Reset all students and their fees"
                >
                  <Trash2 className="w-3 h-3" />
                  Reset Students & Fees
                </button>
              )}
              <button
                onClick={() => onNavigate('students')}
                className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 cursor-pointer"
              >
                View All
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {recentStudents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No students enrolled yet.
              </div>
            ) : (
              recentStudents.map((s) => (
                <div key={s.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{s.fullName}</div>
                    <div className="text-[11px] text-slate-500">
                      {s.studentId} • {s.courseName}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {s.status}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-1">{formatDate(s.admissionDate)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Recent Fee Collections</h3>
              <p className="text-xs text-slate-400 mt-0.5">Payment receipts recorded</p>
            </div>
            <div className="flex items-center gap-2">
              {payments.length > 0 && (
                <button
                  onClick={() => setIsClearFeesModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                  title="Delete all recent fee collections and reset student balances"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear Fee History
                </button>
              )}
              <button
                onClick={() => onNavigate('fees')}
                className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 cursor-pointer"
              >
                Fee Register
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {recentPayments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No fee payments recorded yet.
              </div>
            ) : (
              recentPayments.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{p.studentName}</div>
                    <div className="text-[11px] text-slate-500">
                      {p.receiptNo} • {p.paymentMethod.toUpperCase()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-extrabold text-emerald-600">{formatINR(p.amount)}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{formatDate(p.paymentDate)}</div>
                    </div>
                    <button
                      onClick={async () => {
                        await deleteFeePayment(p.id);
                        showToast(`Deleted receipt ${p.receiptNo} from fee history.`, 'info');
                      }}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete this fee record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Outstanding Fees Watchlist & Audit Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outstanding Fees Watchlist & 1-Month Reminders */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                Remaining Fees & 1-Month Reminders
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatic reminder exactly 1 month after admission / payment
              </p>
            </div>
            <button
              onClick={() => onNavigate('fees')}
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 cursor-pointer"
            >
              Collect Fees
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {studentsWithPendingFees.length === 0 ? (
              <div className="py-8 text-center text-xs text-emerald-600 font-semibold">
                No pending or overdue fees! All active students are fully paid.
              </div>
            ) : (
              studentsWithPendingFees.map(({ student: s, reminder }) => (
                <div key={s.id} className="py-3 flex items-center justify-between text-xs gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-cyan-800">
                        {s.grNo || s.studentId}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="font-bold text-slate-900 truncate">{s.fullName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {s.courseName} · Phone: {s.mobile}
                    </div>
                    <div
                      className={`text-[10px] font-bold mt-1 ${
                        reminder.isReminderDue
                          ? 'text-rose-600'
                          : reminder.isUpcomingSoon
                          ? 'text-amber-600'
                          : 'text-cyan-700'
                      }`}
                    >
                      {reminder.isReminderDue
                        ? `🔔 1-Month Reminder Due (${formatDate(reminder.reminderDate)})`
                        : `1-Month Reminder: ${formatDate(reminder.reminderDate)} (in ${reminder.daysUntilReminder}d)`}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-rose-600">{formatINR(s.outstandingBalance)}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Paid: {formatINR(s.paidAmount)} / {formatINR(s.netPayable)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit Log Activity Feed */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-600" />
                Recent Institute Activity
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Operational audit trail</p>
            </div>
            <button
              onClick={() => onNavigate('audit')}
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-700"
            >
              Audit Log
            </button>
          </div>

          <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No activity recorded yet.
              </div>
            ) : (
              auditLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="text-xs flex items-start gap-2.5 p-2 rounded-lg bg-slate-50">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-slate-800 font-medium leading-relaxed">{log.details}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      By {log.performedByName} ({log.performedByRole}) • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Confirm Clear Fee History */}
      <ConfirmDialog
        isOpen={isClearFeesModalOpen}
        onClose={() => setIsClearFeesModalOpen(false)}
        onConfirm={async () => {
          await clearAllFeeHistoryAndResetBalances();
          showToast('All recent fee collections and fee history deleted! Student paid fees reset to ₹0.', 'success');
          setIsClearFeesModalOpen(false);
        }}
        title="Clear All Recent Fee Collections & History"
        message="This will permanently delete all fee collection records and reset every student's paid fee balance to ₹0. Continue?"
        confirmText="Delete Fee History"
        isDestructive
      />

      {/* Confirm Reset Students & Fees */}
      <ConfirmDialog
        isOpen={isResetAllModalOpen}
        onClose={() => setIsResetAllModalOpen(false)}
        onConfirm={async () => {
          await resetAllStudentsAndFees();
          showToast('All students and fee records have been completely reset!', 'success');
          setIsResetAllModalOpen(false);
        }}
        title="Reset All Students & Fees"
        message="This will delete all student records, remove all recent fee collections and fee history, and free all 14 computer workstations. Continue?"
        confirmText="Reset Students & Fees"
        isDestructive
      />
    </div>
  );
};
