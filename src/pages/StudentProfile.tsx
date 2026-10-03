import React, { useState } from 'react';
import {
  ArrowLeft,
  Printer,
  Edit,
  Archive,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Monitor,
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  ShieldAlert,
  BookOpen,
  Trash2,
  Award,
} from 'lucide-react';
import { Student } from '../types';
import { useInstitute } from '../context/InstituteContext';
import { useAuth } from '../context/AuthContext';
import { formatINR, formatDate } from '../utils/formatters';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface StudentProfileProps {
  student: Student;
  onBack: () => void;
  onEdit: (student: Student) => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({
  student,
  onBack,
  onEdit,
}) => {
  const { deleteStudent, markCourseCompleted, permanentDeleteStudent, payments, attendanceSheets, auditLogs, settings } = useInstitute();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'fees' | 'course' | 'activity'>('overview');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPermanentConfirmOpen, setIsPermanentConfirmOpen] = useState(false);

  // Student specific records
  const studentPayments = payments.filter((p) => p.studentId === student.studentId);
  const studentAuditLogs = auditLogs.filter(
    (l) => l.targetId === student.studentId || l.details.includes(student.fullName)
  );

  // Attendance statistics for this student
  let totalClasses = 0;
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let leaveCount = 0;

  const attendanceHistory: { date: string; status: string; remarks?: string }[] = [];

  attendanceSheets.forEach((sheet) => {
    const record = sheet.records.find((r) => r.studentId === student.studentId);
    if (record) {
      totalClasses++;
      if (record.status === 'present') presentCount++;
      else if (record.status === 'absent') absentCount++;
      else if (record.status === 'late') lateCount++;
      else if (record.status === 'leave') leaveCount++;
      attendanceHistory.push({
        date: sheet.date,
        status: record.status,
        remarks: record.remarks,
      });
    }
  });

  const attendancePct = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

  const handleMarkCompleted = async () => {
    try {
      await markCourseCompleted(student.id);
      showToast(`Congratulations! Course marked completed for ${student.fullName}. Workstation released.`, 'success');
      setIsDeleteModalOpen(false);
    } catch {
      showToast('Failed to update student status.', 'error');
    }
  };

  const handleArchive = async () => {
    try {
      await deleteStudent(student.id, 'Course completed / Archived');
      showToast(`Student ${student.fullName} archived safely.`, 'info');
      setIsDeleteModalOpen(false);
      onBack();
    } catch {
      showToast('Failed to archive student.', 'error');
    }
  };

  const handlePermanentDelete = async () => {
    try {
      await permanentDeleteStudent(student.id);
      showToast(`Student ${student.fullName} permanently deleted from database.`, 'info');
      setIsPermanentConfirmOpen(false);
      setIsDeleteModalOpen(false);
      onBack();
    } catch {
      showToast('Failed to delete student.', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Students Directory
        </button>

        <div className="flex items-center gap-2">
          {student.status === 'active' && (
            <button
              onClick={handleMarkCompleted}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Student completed course: frees computer seat and keeps alumni records"
            >
              <Award className="w-3.5 h-3.5" />
              Mark Course Completed
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Profile
          </button>

          <button
            onClick={() => onEdit(student)}
            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit Profile
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            title="Delete student profile or mark course finished"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete / Course Over
          </button>
        </div>
      </div>

      {/* Course Lifecycle Banner - Quick actions when course is over or needs deletion */}
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
          student.status === 'completed'
            ? 'bg-blue-50/70 border-blue-200'
            : student.status === 'active'
            ? 'bg-emerald-50/70 border-emerald-200'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              student.status === 'completed'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Student Course Status & Workstation
            </h4>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              {student.status === 'active'
                ? `Enrolled in "${student.courseName}". When their course finishes, click "Mark Course Completed" to free computer workstation (${student.assignedSeatId || 'No seat assigned'}) for new admissions while preserving certificates and receipts.`
                : student.status === 'completed'
                ? `Course completed! Computer terminal was released for incoming students. Records preserved for verification.`
                : `Student status is ${student.status}.`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {student.status === 'active' && (
            <button
              onClick={handleMarkCompleted}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Marks course as completed, frees workstation, keeps receipts"
            >
              <Award className="w-4 h-4" />
              Mark Course Completed
            </button>
          )}
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Open options to complete or permanently erase profile"
          >
            <Trash2 className="w-4 h-4" />
            Delete / Remove Profile
          </button>
        </div>
      </div>

      {/* Main Student Header Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-700 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-cyan-950/20 shrink-0">
            {student.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-900">{student.fullName}</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                {student.studentId}
              </span>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  student.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : student.status === 'completed'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : student.status === 'on_hold'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {student.status.replace('_', ' ')}
              </span>
              {student.isDemo && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  Demo
                </span>
              )}
            </div>

            <p className="text-xs font-semibold text-cyan-700 mt-1 flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              {student.courseName} {student.batchName ? `• ${student.batchName}` : ''}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-3 font-medium">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {student.mobile}
              </span>
              {student.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {student.email}
                </span>
              )}
              {student.assignedSeatId && (
                <span className="flex items-center gap-1.5 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                  <Monitor className="w-3.5 h-3.5" />
                  Seat: {student.assignedSeatId}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Financial Badge */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-1 min-w-[200px] text-right">
          <span className="text-xs text-slate-500 font-medium">Outstanding Balance</span>
          <span
            className={`text-2xl font-black ${
              student.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {formatINR(student.outstandingBalance)}
          </span>
          <div className="text-[11px] text-slate-400">
            Paid {formatINR(student.paidAmount)} of {formatINR(student.netPayable)}
          </div>
        </div>
      </div>

      {/* Profile Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto text-xs font-bold">
        {[
          { id: 'overview', label: 'Overview & Details', icon: User },
          { id: 'attendance', label: `Attendance (${attendancePct}%)`, icon: Calendar },
          { id: 'fees', label: `Fee History (${studentPayments.length})`, icon: CreditCard },
          { id: 'course', label: 'Course & Seat Info', icon: BookOpen },
          { id: 'activity', label: 'Activity Logs', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-3 px-3 transition flex items-center gap-1.5 whitespace-nowrap border-b-2 cursor-pointer ${
                isActive
                  ? 'border-cyan-600 text-cyan-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
              Personal & Contact Information
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Full Name</span>
                <span className="font-bold text-slate-900">{student.fullName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Student ID</span>
                <span className="font-mono font-bold text-slate-900">{student.studentId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Mobile Number</span>
                <span className="font-bold text-slate-900">{student.mobile}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Email Address</span>
                <span className="font-medium text-slate-900">{student.email || 'Not provided'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Emergency Contact</span>
                <span className="font-medium text-slate-900">{student.emergencyContact || 'Not provided'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Address / Location</span>
                <span className="font-medium text-slate-900 max-w-[240px] text-right">
                  {student.address || 'Ahmedabad, Gujarat'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
              Academic & Admission Timeline
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Course Name</span>
                <span className="font-bold text-slate-900">{student.courseName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Assigned Batch</span>
                <span className="font-bold text-slate-900">{student.batchName || 'General Batch'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Admission Date</span>
                <span className="font-medium text-slate-900">{formatDate(student.admissionDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Course Start Date</span>
                <span className="font-medium text-slate-900">{formatDate(student.startDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Expected Completion</span>
                <span className="font-medium text-slate-900">{formatDate(student.expectedEndDate)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Assigned PC Seat</span>
                <span className="font-bold text-cyan-700">{student.assignedSeatId || 'None (Open Lab)'}</span>
              </div>
            </div>

            {student.internalNotes && (
              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Internal Faculty Notes
                </div>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {student.internalNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Attendance */}
      {activeTab === 'attendance' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-xs text-slate-500 font-medium">Total Classes Held</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{totalClasses}</div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
              <div className="text-xs text-emerald-700 font-medium">Present</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">{presentCount}</div>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-center">
              <div className="text-xs text-rose-700 font-medium">Absent</div>
              <div className="text-2xl font-black text-rose-700 mt-1">{absentCount}</div>
            </div>
            <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-100 text-center">
              <div className="text-xs text-cyan-800 font-medium">Attendance Pct</div>
              <div className="text-2xl font-black text-cyan-700 mt-1">{attendancePct}%</div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
              Attendance Session Roll History
            </h4>
            {attendanceHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No attendance sessions recorded yet for this student.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {attendanceHistory.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{formatDate(item.date)}</span>
                      {item.remarks && (
                        <span className="text-slate-400 ml-2">({item.remarks})</span>
                      )}
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'late'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Fees */}
      {activeTab === 'fees' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Agreed Course Fee</div>
              <div className="text-lg font-black text-slate-900 mt-1">{formatINR(student.totalCourseFee)}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Discount Approved</div>
              <div className="text-lg font-black text-slate-900 mt-1">{formatINR(student.discount)}</div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="text-xs text-emerald-700">Amount Paid</div>
              <div className="text-lg font-black text-emerald-700 mt-1">{formatINR(student.paidAmount)}</div>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
              <div className="text-xs text-rose-700">Remaining Balance</div>
              <div className="text-lg font-black text-rose-700 mt-1">{formatINR(student.outstandingBalance)}</div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
              Recorded Receipts & Transactions
            </h4>
            {studentPayments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No payment transactions recorded for this student yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-y border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Receipt No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Received By</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentPayments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 px-3 font-mono font-bold text-cyan-700">{p.receiptNo}</td>
                        <td className="py-3 px-3 text-slate-600">{formatDate(p.paymentDate)}</td>
                        <td className="py-3 px-3 font-bold text-slate-800 uppercase">{p.paymentMethod}</td>
                        <td className="py-3 px-3 font-extrabold text-slate-900">{formatINR(p.amount)}</td>
                        <td className="py-3 px-3 text-slate-600">{p.recordedByStaffName}</td>
                        <td className="py-3 px-3">
                          {p.isReversal ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              Reversed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Course & Seat */}
      {activeTab === 'course' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
            Assigned Workstation & Lab Placement
          </h3>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-cyan-50/50 border border-cyan-200">
            <div className="w-12 h-12 rounded-xl bg-cyan-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md">
              {student.assignedSeatId || 'PC-?'}
            </div>
            <div>
              <div className="font-extrabold text-slate-900 text-sm">
                Workstation: {student.assignedSeatId || 'Unassigned (Floating Station)'}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Lab: Main Computer Center • Tech Vision, Ahmedabad
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Activity Logs */}
      {activeTab === 'activity' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
            Audit Trail for {student.fullName}
          </h3>
          {studentAuditLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No audit entries recorded for this student.
            </div>
          ) : (
            studentAuditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-slate-50 text-xs space-y-1">
                <div className="font-bold text-slate-800">{log.action}: {log.details}</div>
                <div className="text-[11px] text-slate-400">
                  By {log.performedByName} ({log.performedByRole}) on {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Course Completion & Delete Management Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={`Manage Student: ${student.fullName}`}
        subtitle="Choose how to handle this student's profile now that their course is over."
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" />
                  Option 1: Mark Course Completed (Recommended)
                </h4>
                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                  Use this when the student finished their syllabus. This frees up their assigned
                  computer terminal for new students, marks them as an alumnus, and keeps all payment
                  receipts and attendance history safe for verification and certificates.
                </p>
              </div>
              <button
                onClick={handleMarkCompleted}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 transition shadow-xs cursor-pointer"
              >
                Mark Completed
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Archive className="w-4 h-4 text-slate-500" />
                  Option 2: Archive Student (Set to Inactive)
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Hides the student from active lists, releases their computer seat, and archives the
                  record while keeping historical audit trails.
                </p>
              </div>
              <button
                onClick={handleArchive}
                className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold shrink-0 transition shadow-xs cursor-pointer"
              >
                Archive Student
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-rose-950 flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  Option 3: Permanently Delete Record
                </h4>
                <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                  Completely and irreversibly removes this student profile from Cloud Firestore.
                  Releases any assigned computer seat.
                </p>
              </div>
              <button
                onClick={() => setIsPermanentConfirmOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shrink-0 transition shadow-xs cursor-pointer"
              >
                Permanent Delete
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Permanent Delete Warning */}
      <ConfirmDialog
        isOpen={isPermanentConfirmOpen}
        onClose={() => setIsPermanentConfirmOpen(false)}
        onConfirm={handlePermanentDelete}
        title="Permanently Delete Student Record"
        message={`Are you absolutely sure you want to permanently erase "${student.fullName}" (${student.studentId}) from the database? This action cannot be undone.`}
        confirmText="Yes, Permanently Delete"
        isDestructive
      />
    </div>
  );
};
