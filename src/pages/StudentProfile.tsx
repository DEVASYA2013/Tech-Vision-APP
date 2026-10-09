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
  BookOpen,
  Trash2,
  Award,
  BellRing,
  IndianRupee,
  Copy,
  Check,
  Plus,
  IdCard,
  Briefcase,
  Sparkles,
} from 'lucide-react';
import { Student, PaymentMethod } from '../types';
import { useInstitute } from '../context/InstituteContext';
import {
  formatINR,
  formatDate,
  getTodayDateString,
  getStudentFeeReminderInfo,
} from '../utils/formatters';
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
  const {
    courses,
    updateStudent,
    deleteStudent,
    markCourseCompleted,
    permanentDeleteStudent,
    recordFeePayment,
    payments,
    attendanceSheets,
    auditLogs,
    settings,
  } = useInstitute();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<
    'all' | 'personal' | 'academic' | 'fees' | 'attendance' | 'activity'
  >('all');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPermanentConfirmOpen, setIsPermanentConfirmOpen] = useState(false);

  // Quick Fee Payment Modal inside StudentProfile
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(student.outstandingBalance || 0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('upi');
  const [payRef, setPayRef] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [copiedReminder, setCopiedReminder] = useState(false);

  // Student specific records
  const studentPayments = payments.filter(
    (p) => p.studentId === student.studentId || p.studentId === student.grNo
  );
  const studentAuditLogs = auditLogs.filter(
    (l) =>
      l.targetId === student.studentId ||
      l.targetId === student.grNo ||
      l.details.includes(student.fullName)
  );

  // 1-Month Fee Reminder calculation
  const todayStr = getTodayDateString();
  const reminderInfo = getStudentFeeReminderInfo(student, payments, todayStr);

  // Enrolled courses array
  const enrolledCoursesList =
    student.courseNames && student.courseNames.length > 0
      ? student.courseNames
      : (student.courseName || '')
          .split(/\s*\+\s*/)
          .map((c) => c.trim())
          .filter(Boolean);

  // Attendance statistics for this student
  let totalClasses = 0;
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let leaveCount = 0;

  const attendanceHistory: { date: string; status: string; remarks?: string }[] = [];

  attendanceSheets.forEach((sheet) => {
    const record = sheet.records.find(
      (r) => r.studentId === student.studentId || r.studentId === student.grNo
    );
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
  const isCourseDone = Boolean(student.courseCompleted || student.status === 'completed');
  const isCertGiven = Boolean(student.certificateIssued);
  const feePaidPct =
    student.netPayable > 0
      ? Math.min(100, Math.round(((student.paidAmount || 0) / student.netPayable) * 100))
      : 100;

  const handleToggleCourseCompleted = async () => {
    try {
      const nextCompleted = !isCourseDone;
      await updateStudent(student.id, {
        courseCompleted: nextCompleted,
        status: nextCompleted ? 'completed' : 'active',
      });
      showToast(
        `Course marked as ${nextCompleted ? 'Completed (Yes)' : 'Running (No)'} for ${student.fullName}.`,
        'success'
      );
    } catch {
      showToast('Failed to update course completion status.', 'error');
    }
  };

  const handleToggleCertificateGiven = async () => {
    try {
      const nextCert = !isCertGiven;
      await updateStudent(student.id, {
        certificateIssued: nextCert,
        certificateIssuedDate: nextCert ? getTodayDateString() : '',
      });
      showToast(
        `Certificate status updated to "${nextCert ? 'Given (Yes)' : 'Pending (No)'}" for ${student.fullName}.`,
        'success'
      );
    } catch {
      showToast('Failed to update certificate status.', 'error');
    }
  };

  const handleMarkCompleted = async () => {
    try {
      await markCourseCompleted(student.id);
      showToast(
        `Congratulations! Course marked completed for ${student.fullName}. Workstation released.`,
        'success'
      );
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

  const handleQuickRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) {
      showToast('Please enter a valid payment amount.', 'error');
      return;
    }
    setIsPaying(true);
    try {
      const receipt = await recordFeePayment(
        student.studentId,
        Number(payAmount),
        payMethod,
        payRef,
        payRemarks || 'Fee installment collected from Student Profile'
      );
      showToast(
        `Payment of ${formatINR(payAmount)} recorded! Receipt: ${receipt.receiptNo}`,
        'success'
      );
      setIsPayModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error recording fee payment';
      showToast(msg, 'error');
    } finally {
      setIsPaying(false);
    }
  };

  const handleCopyOneMonthReminder = () => {
    const msg = `Hello ${student.fullName} (GR.No: ${student.grNo || student.studentId}),\n\nGreetings from ${
      settings.instituteName || 'Tech Vision Computer Class'
    }, Ahmedabad (${settings.website || 'techvisioncomputer.com'}).\n\nThis is a 1-month fee reminder for your course: ${student.courseName}.\n• Admission Date: ${formatDate(
      student.admissionDate
    )}\n• 1-Month Reminder Date: ${formatDate(reminderInfo.reminderDate)}\n• Total Net Fee: ${formatINR(
      student.netPayable
    )}\n• Paid Fees: ${formatINR(student.paidAmount)}\n• Remaining Fees Due: ${formatINR(
      student.outstandingBalance
    )}\n\nPlease clear your remaining fee balance at the institute counter or via UPI. Thank you!`;
    navigator.clipboard.writeText(msg);
    setCopiedReminder(true);
    showToast('1-Month Fee Reminder message copied to clipboard!', 'success');
    setTimeout(() => setCopiedReminder(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Action & Navigation Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-600" />
          Back to Student Directory
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {student.outstandingBalance > 0 && (
            <button
              onClick={() => {
                setPayAmount(student.outstandingBalance);
                setIsPayModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Pay Remaining Fee ({formatINR(student.outstandingBalance)})
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Full Dossier
          </button>

          <button
            onClick={() => onEdit(student)}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit Student Details
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Manage / Delete
          </button>
        </div>
      </div>

      {/* Executive Student Dossier Header Card */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 py-5 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-cyan-950/40 shrink-0 border-2 border-white/15">
              {student.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  GR.No: {student.grNo || student.studentId}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  · Status: {student.status.replace('_', ' ')}
                </span>
                <span className="text-xs text-slate-400">
                  · Admitted: {formatDate(student.admissionDate)}
                </span>
                <a
                  href={`https://${(settings.website || 'techvisioncomputer.com').replace(/^https?:\/\//, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-cyan-300 hover:text-cyan-200 underline"
                >
                  · {settings.website || 'techvisioncomputer.com'}
                </a>
              </div>

              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {student.fullName}
              </h1>

              {student.fatherOrHusbandName && (
                <p className="text-xs text-slate-300 font-medium">
                  Father / Husband:{' '}
                  <strong className="text-white">{student.fatherOrHusbandName}</strong>
                  {student.fatherOrHusbandProfession
                    ? ` (${student.fatherOrHusbandProfession})`
                    : ''}
                  {student.qualification ? ` · Qualification: ${student.qualification}` : ''}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-cyan-200 pt-1">
                <span className="flex items-center gap-1.5 font-semibold">
                  <GraduationCap className="w-4 h-4 text-cyan-400" />
                  {enrolledCoursesList.join(' + ')}
                </span>
                <span className="text-slate-500">·</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Batch: {student.batchName || 'Unassigned Batch'}
                </span>
                <span className="text-slate-500">·</span>
                <span className="flex items-center gap-1.5 font-mono font-bold text-amber-300">
                  <Monitor className="w-3.5 h-3.5" />
                  PC Seat: {student.assignedSeatId ? `${student.assignedSeatId} (1 Hr)` : 'Unassigned'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Financial Box inside Header */}
          <div className="p-4 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 min-w-[250px] space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Remaining Fee Balance</span>
              <span className="font-mono text-[11px] text-cyan-300">{feePaidPct}% Paid</span>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span
                className={`text-2xl font-black ${
                  student.outstandingBalance > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {formatINR(student.outstandingBalance)}
              </span>
              <span className="text-xs text-slate-300">
                Paid <strong className="text-emerald-300">{formatINR(student.paidAmount)}</strong> /{' '}
                {formatINR(student.netPayable)}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  student.outstandingBalance > 0 ? 'bg-cyan-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${feePaidPct}%` }}
              />
            </div>
            {student.outstandingBalance > 0 ? (
              <div className="text-[11px] text-amber-300 font-semibold flex items-center gap-1.5 pt-0.5">
                <BellRing className="w-3.5 h-3.5 shrink-0" />
                <span>
                  1-Month Reminder: {formatDate(reminderInfo.reminderDate)}{' '}
                  {reminderInfo.isReminderDue
                    ? '(DUE NOW)'
                    : `(in ${reminderInfo.daysUntilReminder}d)`}
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1.5 pt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>All course fees cleared in full</span>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Quick Status Bar below Dark Header */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">Course Completed:</span>
              <button
                type="button"
                onClick={handleToggleCourseCompleted}
                className={`px-3 py-1 rounded-lg font-bold border transition cursor-pointer ${
                  isCourseDone
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}
              >
                {isCourseDone ? 'Yes (Completed)' : 'No (Running)'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">Certificate Given:</span>
              <button
                type="button"
                onClick={handleToggleCertificateGiven}
                className={`px-3 py-1 rounded-lg font-bold border transition cursor-pointer ${
                  isCertGiven
                    ? 'bg-cyan-50 text-cyan-800 border-cyan-300 hover:bg-cyan-100'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {isCertGiven
                  ? `Yes (${
                      student.certificateIssuedDate
                        ? formatDate(student.certificateIssuedDate)
                        : 'Given'
                    })`
                  : 'No (Pending)'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-600 font-medium">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-cyan-600" />
              Mobile: <strong className="text-slate-900">{student.mobile}</strong>
            </span>
            {student.emergencyContact && (
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-600" />
                Emergency: <strong className="text-slate-900">{student.emergencyContact}</strong>
              </span>
            )}
            {student.aadharCardNo && (
              <span className="flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5 text-slate-500" />
                Aadhar: <strong className="font-mono text-slate-900">{student.aadharCardNo}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 1-Month Fee Reminder Alert Card (Visible whenever student has remaining fees) */}
      {student.outstandingBalance > 0 && (
        <div
          className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            reminderInfo.isReminderDue
              ? 'bg-rose-50/90 border-rose-300'
              : 'bg-amber-50/70 border-amber-200'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                reminderInfo.isReminderDue
                  ? 'bg-rose-600 text-white'
                  : 'bg-amber-500 text-slate-950'
              }`}
            >
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={`text-sm font-black ${
                    reminderInfo.isReminderDue ? 'text-rose-950' : 'text-amber-950'
                  }`}
                >
                  {reminderInfo.isReminderDue
                    ? '1-Month Fee Reminder is DUE NOW!'
                    : `1-Month Automatic Fee Reminder Scheduled for ${formatDate(
                        reminderInfo.reminderDate
                      )}`}
                </h3>
                <span className="text-xs font-bold text-slate-600">
                  · Remaining Fee: {formatINR(student.outstandingBalance)}
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                {reminderInfo.referenceType === 'last_payment'
                  ? `Last fee payment was on ${formatDate(reminderInfo.referenceDate)}. `
                  : `Admitted on ${formatDate(student.admissionDate)}. `}
                Exact 1-month reminder date is{' '}
                <strong className="text-slate-900">{formatDate(reminderInfo.reminderDate)}</strong> (
                {reminderInfo.isReminderDue
                  ? `${Math.abs(reminderInfo.daysUntilReminder)} day(s) past 1-month mark`
                  : `${reminderInfo.daysUntilReminder} day(s) remaining`}
                ).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyOneMonthReminder}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {copiedReminder ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Copied Reminder
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-cyan-600" />
                  Copy 1-Month Reminder
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setPayAmount(student.outstandingBalance);
                setIsPayModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Collect Fee Now
            </button>
          </div>
        </div>
      )}

      {/* Section Filter Bar (Default: Complete Student Dossier showing every single detail) */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/70 rounded-xl overflow-x-auto text-xs font-bold">
        {[
          { id: 'all', label: 'Complete Student Dossier (All Details)', icon: Sparkles },
          { id: 'personal', label: 'Personal & Family Details', icon: User },
          { id: 'academic', label: 'Courses, Batch & PC Seat', icon: BookOpen },
          { id: 'fees', label: `Fee Ledger & Receipts (${studentPayments.length})`, icon: CreditCard },
          { id: 'attendance', label: `Attendance (${attendancePct}%)`, icon: Calendar },
          { id: 'activity', label: `Activity Trail (${studentAuditLogs.length})`, icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-600' : 'text-slate-500'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* SECTION 1 & 2: Personal, Family, Identity & Academic Details */}
      {(activeTab === 'all' || activeTab === 'personal' || activeTab === 'academic') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Personal, Family & Identity Details */}
          {(activeTab === 'all' || activeTab === 'personal') && (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-600" />
                    1. Personal, Family & Identity Details
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Complete student registration & guardian particulars
                  </p>
                </div>
                <button
                  onClick={() => onEdit(student)}
                  className="text-xs font-bold text-cyan-600 hover:text-cyan-700 cursor-pointer"
                >
                  Edit
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">Student GR.No</div>
                  <div className="font-mono font-black text-cyan-800 text-sm mt-0.5">
                    {student.grNo || student.studentId}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">Student Full Name</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{student.fullName}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">
                    Father / Husband Name
                  </div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {student.fatherOrHusbandName || 'Not provided'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-slate-400" />
                    Father / Husband Profession
                  </div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {student.fatherOrHusbandProfession || 'Not provided'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">Date of Birth</div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {student.dateOfBirth ? formatDate(student.dateOfBirth) : 'Not provided'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">
                    Academic Qualification
                  </div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {student.qualification || 'Not provided'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">Aadhar Card No.</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {student.aadharCardNo || 'Not provided'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">Email Address</div>
                  <div className="font-medium text-slate-900 mt-0.5 truncate">
                    {student.email || 'Not provided'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-cyan-50/50 border border-cyan-100">
                  <div className="text-[11px] text-cyan-700 font-medium">Primary Mobile Number</div>
                  <div className="font-mono font-black text-slate-900 text-sm mt-0.5">
                    {student.mobile}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                  <div className="text-[11px] text-amber-800 font-medium">
                    Emergency Contact Number
                  </div>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                    {student.emergencyContact || 'Not provided'}
                  </div>
                </div>

                <div className="sm:col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    Residential Address
                  </div>
                  <div className="font-semibold text-slate-900 mt-0.5 leading-relaxed">
                    {student.address || 'Ahmedabad, Gujarat'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card 2: Academic, Enrolled Courses, Batch & Workstation Details */}
          {(activeTab === 'all' || activeTab === 'academic') && (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-cyan-600" />
                    2. Enrolled Courses, 1-Hour Batch & Lab Workstation
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Course syllabus, batch timing, computer seat & certificate status
                  </p>
                </div>
                <button
                  onClick={() => onEdit(student)}
                  className="text-xs font-bold text-cyan-600 hover:text-cyan-700 cursor-pointer"
                >
                  Change Batch / Seat
                </button>
              </div>

              {/* Multi-Course Breakdown */}
              <div className="p-3.5 rounded-xl bg-cyan-50/50 border border-cyan-200/80 space-y-2">
                <div className="text-[11px] font-bold text-cyan-900 uppercase tracking-wider">
                  Enrolled Course(s) ({enrolledCoursesList.length})
                </div>
                <div className="space-y-1.5">
                  {enrolledCoursesList.map((cName, idx) => {
                    const matchedCourse = courses.find(
                      (c) => c.courseName.toLowerCase() === cName.toLowerCase()
                    );
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-white border border-cyan-100 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-black text-slate-900">{cName}</span>
                          {matchedCourse && (
                            <span className="text-slate-500 ml-2">
                              · Duration: {matchedCourse.duration}
                            </span>
                          )}
                        </div>
                        {matchedCourse && (
                          <span className="font-mono font-bold text-cyan-700">
                            Std Fee: {formatINR(matchedCourse.standardFee)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">
                    Assigned 1-Hour Batch Time
                  </div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {student.batchName || 'General Batch'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">
                    Assigned Lab Workstation (14 PCs)
                  </div>
                  <div className="font-mono font-black text-cyan-700 mt-0.5">
                    {student.assignedSeatId
                      ? `PC ${student.assignedSeatId} (1-Hour Slot)`
                      : 'No Fixed Seat Assigned'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">Admission Date</div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {formatDate(student.admissionDate)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">Course Start Date</div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {formatDate(student.startDate || student.admissionDate)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">
                    Course Completed Status
                  </div>
                  <div
                    className={`font-black mt-0.5 ${
                      isCourseDone ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {isCourseDone ? 'Yes (Course Completed)' : 'No (Currently Running)'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">
                    Certificate Given Status
                  </div>
                  <div
                    className={`font-black mt-0.5 ${
                      isCertGiven ? 'text-cyan-700' : 'text-slate-600'
                    }`}
                  >
                    {isCertGiven
                      ? `Yes (Issued ${
                          student.certificateIssuedDate
                            ? formatDate(student.certificateIssuedDate)
                            : ''
                        })`
                      : 'No (Certificate Pending)'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">
                    Expected Completion Date
                  </div>
                  <div className="font-medium text-slate-900 mt-0.5">
                    {student.expectedEndDate ? formatDate(student.expectedEndDate) : 'Standard Duration'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-400 font-medium">Profile Status</div>
                  <div className="font-black uppercase text-slate-900 mt-0.5">
                    {student.status.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Remarks / Internal Notes */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Remarks / Internal Faculty Notes
                </div>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {student.internalNotes || 'No additional remarks recorded for this student.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: Complete Fee Ledger, 1-Month Fee Reminder & Payment Receipts */}
      {(activeTab === 'all' || activeTab === 'fees') && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-emerald-600" />
                3. Complete Fee Summary, 1-Month Reminder & Payment History
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Total course fee, discount, paid installments, remaining balance, and receipts
              </p>
            </div>
            {student.outstandingBalance > 0 && (
              <button
                onClick={() => {
                  setPayAmount(student.outstandingBalance);
                  setIsPayModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Record Payment
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] text-slate-500">Total Course Fee</div>
              <div className="text-base font-black text-slate-900 mt-1">
                {formatINR(student.totalCourseFee)}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] text-slate-500">Discount Given</div>
              <div className="text-base font-black text-slate-900 mt-1">
                {formatINR(student.discount)}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] text-slate-500">Net Payable Fee</div>
              <div className="text-base font-black text-slate-900 mt-1">
                {formatINR(student.netPayable)}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-[11px] text-emerald-800 font-medium">Total Fees Paid</div>
              <div className="text-base font-black text-emerald-700 mt-1">
                {formatINR(student.paidAmount)}
              </div>
            </div>
            <div
              className={`p-3.5 rounded-xl border ${
                student.outstandingBalance > 0
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <div
                className={`text-[11px] font-medium ${
                  student.outstandingBalance > 0 ? 'text-rose-800' : 'text-emerald-800'
                }`}
              >
                Remaining Fees
              </div>
              <div
                className={`text-base font-black mt-1 ${
                  student.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {formatINR(student.outstandingBalance)}
              </div>
            </div>
            <div
              className={`p-3.5 rounded-xl border ${
                student.outstandingBalance > 0 && reminderInfo.isReminderDue
                  ? 'bg-rose-100/80 border-rose-300'
                  : 'bg-cyan-50/70 border-cyan-200'
              }`}
            >
              <div className="text-[11px] text-slate-600 font-medium">1-Month Fee Reminder</div>
              <div className="text-xs font-black text-slate-900 mt-1">
                {student.outstandingBalance > 0
                  ? formatDate(reminderInfo.reminderDate)
                  : 'Fully Cleared'}
              </div>
              {student.outstandingBalance > 0 && (
                <div
                  className={`text-[10px] font-bold mt-0.5 ${
                    reminderInfo.isReminderDue ? 'text-rose-700' : 'text-cyan-700'
                  }`}
                >
                  {reminderInfo.isReminderDue
                    ? 'Reminder Due Now!'
                    : `In ${reminderInfo.daysUntilReminder} day(s)`}
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">
              Recorded Fee Payment Receipts ({studentPayments.length})
            </h4>
            {studentPayments.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                No separate payment receipt transactions recorded for this student yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Receipt No</th>
                      <th className="py-2.5 px-3">Payment Date</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3">Amount Paid</th>
                      <th className="py-2.5 px-3">Reference / Remarks</th>
                      <th className="py-2.5 px-3">Recorded By</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-mono font-bold text-cyan-700">
                          {p.receiptNo}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{formatDate(p.paymentDate)}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 uppercase">
                          {p.paymentMethod}
                        </td>
                        <td className="py-2.5 px-3 font-black text-emerald-700">
                          {formatINR(p.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {p.remarks || p.transactionRef || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{p.recordedByStaffName}</td>
                        <td className="py-2.5 px-3 font-bold">
                          {p.isReversal ? (
                            <span className="text-rose-600">Reversed</span>
                          ) : (
                            <span className="text-emerald-700">Valid</span>
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

      {/* SECTION 4 & 5: Attendance Summary & Activity Trail */}
      {(activeTab === 'all' || activeTab === 'attendance' || activeTab === 'activity') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 4: Attendance Summary */}
          {(activeTab === 'all' || activeTab === 'attendance') && (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-600" />
                  4. Class Attendance Record ({attendancePct}%)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Daily batch attendance summary for {student.fullName}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2.5 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-medium">Sessions</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">{totalClasses}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="text-[10px] text-emerald-700 font-medium">Present</div>
                  <div className="text-lg font-black text-emerald-700 mt-0.5">{presentCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                  <div className="text-[10px] text-rose-700 font-medium">Absent</div>
                  <div className="text-lg font-black text-rose-700 mt-0.5">{absentCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-100">
                  <div className="text-[10px] text-cyan-800 font-medium">Late/Leave</div>
                  <div className="text-lg font-black text-cyan-700 mt-0.5">
                    {lateCount + leaveCount}
                  </div>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
                {attendanceHistory.length === 0 ? (
                  <div className="py-6 text-center text-slate-400">
                    No attendance sessions marked for this student yet.
                  </div>
                ) : (
                  attendanceHistory.map((item, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{formatDate(item.date)}</span>
                        {item.remarks && (
                          <span className="text-slate-400 ml-2">({item.remarks})</span>
                        )}
                      </div>
                      <span
                        className={`font-bold uppercase text-[11px] ${
                          item.status === 'present'
                            ? 'text-emerald-700'
                            : item.status === 'late'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Card 5: Activity & Audit Trail */}
          {(activeTab === 'all' || activeTab === 'activity') && (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-600" />
                  5. Student Activity & Audit Logs
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Chronological record of admission, fee updates, and changes
                </p>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2.5">
                {studentAuditLogs.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No audit entries recorded for this student yet.
                  </div>
                ) : (
                  studentAuditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1"
                    >
                      <div className="font-bold text-slate-800">{log.details}</div>
                      <div className="text-[11px] text-slate-400">
                        {log.action} · By {log.performedByName} ({log.performedByRole}) ·{' '}
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Record Fee Payment Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title={`Collect Fee: ${student.fullName} (GR: ${student.grNo || student.studentId})`}
        subtitle={`Remaining Balance: ${formatINR(student.outstandingBalance)} • Course: ${student.courseName}`}
        maxWidth="md"
      >
        <form onSubmit={handleQuickRecordPayment} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400">Net Payable:</span>{' '}
              <strong className="text-slate-900">{formatINR(student.netPayable)}</strong>
            </div>
            <div>
              <span className="text-slate-400">Already Paid:</span>{' '}
              <strong className="text-emerald-700">{formatINR(student.paidAmount)}</strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Amount Being Paid Now (₹) *
            </label>
            <input
              type="number"
              min={1}
              max={student.outstandingBalance || undefined}
              value={payAmount}
              onChange={(e) => setPayAmount(Number(e.target.value))}
              required
              className="w-full px-3.5 py-2 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode *</label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
              <option value="cash">Cash Counter</option>
              <option value="bank_transfer">Bank Transfer (NEFT / IMPS)</option>
              <option value="card">Debit / Credit Card</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              UPI / Transaction Reference (Optional)
            </label>
            <input
              type="text"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="e.g. UTR / UPI Ref No."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Remarks</label>
            <input
              type="text"
              value={payRemarks}
              onChange={(e) => setPayRemarks(e.target.value)}
              placeholder="e.g. 1-Month Installment Paid"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsPayModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPaying}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isPaying ? 'Recording...' : `Confirm ${formatINR(payAmount)} Payment`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Course Completion & Delete Management Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={`Manage Student: ${student.fullName}`}
        subtitle="Choose how to handle this student's profile or course completion."
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
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Final Confirmation for Permanent Delete */}
      <ConfirmDialog
        isOpen={isPermanentConfirmOpen}
        onClose={() => setIsPermanentConfirmOpen(false)}
        onConfirm={handlePermanentDelete}
        title="Permanently Delete Student?"
        message={`Are you sure you want to permanently erase ${student.fullName} (${student.studentId}) from the database? This cannot be undone.`}
        confirmText="Yes, Delete Forever"
        isDestructive
      />
    </div>
  );
};
