import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  Users,
  CreditCard,
  Monitor,
  CheckCircle2,
  Calendar,
  IndianRupee,
  FileText,
} from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import { formatINR, formatDate, getTodayDateString } from '../utils/formatters';
import { exportToCSV } from '../utils/csvExport';
import { useToast } from '../components/ui/Toast';

type ReportType =
  | 'active_students'
  | 'new_admissions'
  | 'former_students'
  | 'daily_attendance'
  | 'monthly_attendance'
  | 'attendance_pct'
  | 'course_distribution'
  | 'batch_capacity'
  | 'seat_utilization'
  | 'daily_collection'
  | 'monthly_collection'
  | 'pending_fees'
  | 'staff_activity';

export const Reports: React.FC = () => {
  const { students, courses, batches, seats, payments, attendanceSheets, auditLogs } = useInstitute();
  const { showToast } = useToast();

  const [selectedReport, setSelectedReport] = useState<ReportType>('active_students');
  const [dateFilter, setDateFilter] = useState(getTodayDateString());

  const reportsList = [
    { id: 'active_students', title: 'Active Students List', icon: Users, category: 'Students' },
    { id: 'new_admissions', title: 'Recent Admissions', icon: Users, category: 'Students' },
    { id: 'former_students', title: 'Former / Alumni Students', icon: Users, category: 'Students' },
    { id: 'daily_attendance', title: 'Daily Attendance Report', icon: CheckCircle2, category: 'Attendance' },
    { id: 'attendance_pct', title: 'Student Attendance %', icon: CheckCircle2, category: 'Attendance' },
    { id: 'pending_fees', title: 'Pending Dues & Balances', icon: CreditCard, category: 'Finance' },
    { id: 'daily_collection', title: 'Fee Collection by Day', icon: IndianRupee, category: 'Finance' },
    { id: 'monthly_collection', title: 'Monthly Collection Summary', icon: IndianRupee, category: 'Finance' },
    { id: 'course_distribution', title: 'Course Enrollment Count', icon: FileText, category: 'Academic' },
    { id: 'batch_capacity', title: 'Batch Seat Capacity', icon: Calendar, category: 'Academic' },
    { id: 'seat_utilization', title: 'Computer Lab Seat Utilization', icon: Monitor, category: 'Lab' },
    { id: 'staff_activity', title: 'Staff Activity & Audit Logs', icon: FileSpreadsheet, category: 'Audit' },
  ];

  const handleExportCurrent = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    const filename = `TechVision_Report_${selectedReport}`;

    if (selectedReport === 'active_students') {
      headers = ['Student ID', 'Full Name', 'Mobile', 'Course', 'Net Payable', 'Paid', 'Outstanding'];
      rows = students
        .filter((s) => s.status === 'active')
        .map((s) => [s.studentId, s.fullName, s.mobile, s.courseName, s.netPayable, s.paidAmount, s.outstandingBalance]);
    } else if (selectedReport === 'new_admissions') {
      headers = ['Student ID', 'Full Name', 'Admission Date', 'Course', 'Mobile', 'Fee'];
      rows = students.map((s) => [s.studentId, s.fullName, s.admissionDate, s.courseName, s.mobile, s.netPayable]);
    } else if (selectedReport === 'former_students') {
      headers = ['Student ID', 'Full Name', 'Course', 'Status'];
      rows = students
        .filter((s) => s.status !== 'active')
        .map((s) => [s.studentId, s.fullName, s.courseName, s.status]);
    } else if (selectedReport === 'pending_fees') {
      headers = ['Student ID', 'Full Name', 'Course', 'Mobile', 'Total Fee', 'Paid', 'Pending Dues'];
      rows = students
        .filter((s) => (s.outstandingBalance || 0) > 0)
        .map((s) => [s.studentId, s.fullName, s.courseName, s.mobile, s.netPayable, s.paidAmount, s.outstandingBalance]);
    } else if (selectedReport === 'daily_collection') {
      headers = ['Receipt No', 'Date', 'Student ID', 'Student Name', 'Amount', 'Payment Mode'];
      rows = payments
        .filter((p) => !p.isReversal)
        .map((p) => [p.receiptNo, p.paymentDate, p.studentId, p.studentName, p.amount, p.paymentMethod.toUpperCase()]);
    } else if (selectedReport === 'seat_utilization') {
      headers = ['Seat No', 'Status', 'Assigned Student', 'Course', 'Hardware Specs'];
      rows = seats.map((s) => [s.seatNumber, s.status.toUpperCase(), s.assignedStudentName || '—', s.assignedCourseId || '—', s.notes || '']);
    } else {
      headers = ['Entity', 'Details', 'Timestamp'];
      rows = auditLogs.map((l) => [l.targetEntity, l.details, l.timestamp]);
    }

    exportToCSV(filename, headers, rows);
    showToast('Report exported successfully to CSV!', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-600" />
            Reports & Operational Exports
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Generate printable audit rosters, financial summaries, and student statistics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
          <button
            onClick={handleExportCurrent}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-900/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Selected to CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Reports Navigation */}
        <div className="lg:col-span-1 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Available Institute Reports
          </div>
          {reportsList.map((r) => {
            const Icon = r.icon;
            const isSelected = selectedReport === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedReport(r.id as ReportType)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-50 text-cyan-900 font-bold border border-cyan-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-cyan-600' : 'text-slate-400'}`} />
                <span className="truncate">{r.title}</span>
              </button>
            );
          })}
        </div>

        {/* Right Report Preview Display */}
        <div className="lg:col-span-3 rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {reportsList.find((r) => r.id === selectedReport)?.title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Generated in real-time from Firestore</p>
            </div>
            <div className="text-xs text-slate-500">
              Institute: <strong>Tech Vision, Ahmedabad</strong>
            </div>
          </div>

          {/* Dynamic Table based on selectedReport */}
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            {selectedReport === 'active_students' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-600 border-b">
                  <tr>
                    <th className="py-2.5 px-3">Student ID</th>
                    <th className="py-2.5 px-3">Full Name</th>
                    <th className="py-2.5 px-3">Course</th>
                    <th className="py-2.5 px-3">Mobile</th>
                    <th className="py-2.5 px-3 text-right">Fee Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students
                    .filter((s) => s.status === 'active')
                    .map((s) => (
                      <tr key={s.id}>
                        <td className="py-2.5 px-3 font-mono font-bold">{s.studentId}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{s.fullName}</td>
                        <td className="py-2.5 px-3 text-slate-700">{s.courseName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{s.mobile}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatINR(s.outstandingBalance)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {selectedReport === 'pending_fees' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-600 border-b">
                  <tr>
                    <th className="py-2.5 px-3">Student ID</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Course</th>
                    <th className="py-2.5 px-3">Mobile</th>
                    <th className="py-2.5 px-3 text-right">Net Payable</th>
                    <th className="py-2.5 px-3 text-right">Amount Paid</th>
                    <th className="py-2.5 px-3 text-right">Pending Dues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students
                    .filter((s) => (s.outstandingBalance || 0) > 0)
                    .map((s) => (
                      <tr key={s.id}>
                        <td className="py-2.5 px-3 font-mono font-bold">{s.studentId}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{s.fullName}</td>
                        <td className="py-2.5 px-3 text-slate-700">{s.courseName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{s.mobile}</td>
                        <td className="py-2.5 px-3 text-right">{formatINR(s.netPayable)}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">
                          {formatINR(s.paidAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-600 font-black">
                          {formatINR(s.outstandingBalance)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {selectedReport === 'daily_collection' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-600 border-b">
                  <tr>
                    <th className="py-2.5 px-3">Receipt No</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Ref No</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments
                    .filter((p) => !p.isReversal)
                    .map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.receiptNo}</td>
                        <td className="py-2.5 px-3 text-slate-600">{formatDate(p.paymentDate)}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{p.studentName}</td>
                        <td className="py-2.5 px-3 uppercase font-semibold">{p.paymentMethod}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                          {p.transactionRef || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                          {formatINR(p.amount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {selectedReport === 'seat_utilization' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-600 border-b">
                  <tr>
                    <th className="py-2.5 px-3">Seat ID</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Assigned Student</th>
                    <th className="py-2.5 px-3">Course / Batch</th>
                    <th className="py-2.5 px-3">Hardware Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {seats.map((s) => (
                    <tr key={s.seatNumber}>
                      <td className="py-2.5 px-3 font-mono font-bold">{s.seatNumber}</td>
                      <td className="py-2.5 px-3">
                        <span className="uppercase font-bold text-[10px] px-2 py-0.5 rounded bg-slate-100">
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold">{s.assignedStudentName || '—'}</td>
                      <td className="py-2.5 px-3">{s.assignedCourseId || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-500">{s.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedReport === 'course_distribution' && (
              <div className="space-y-4 py-2">
                {courses.map((c) => {
                  const count = students.filter((s) => s.courseId === c.courseId).length;
                  return (
                    <div key={c.courseId} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{c.courseName} ({c.courseId})</div>
                        <div className="text-[11px] text-slate-400">Standard Fee: ₹{c.standardFee} • {c.duration}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-base text-cyan-700">{count} Students</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedReport === 'staff_activity' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-600 border-b">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Staff Member</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((l) => (
                    <tr key={l.id}>
                      <td className="py-2.5 px-3 text-slate-400">{new Date(l.timestamp).toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-cyan-800">{l.action}</td>
                      <td className="py-2.5 px-3 font-semibold">{l.performedByName}</td>
                      <td className="py-2.5 px-3 text-slate-700">{l.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
