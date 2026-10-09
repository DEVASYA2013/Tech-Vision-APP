import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  Share2,
  Copy,
  Check,
  FileText,
  Calendar,
  User,
  Trash2,
  BellRing,
} from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import { useAuth } from '../context/AuthContext';
import { FeePayment, PaymentMethod } from '../types';
import {
  formatINR,
  formatDate,
  numberToWordsINR,
  getTodayDateString,
  getStudentFeeReminderInfo,
} from '../utils/formatters';
import { exportToCSV } from '../utils/csvExport';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const FeeManagement: React.FC = () => {
  const {
    students,
    payments,
    settings,
    recordFeePayment,
    reverseFeePayment,
    deleteFeePayment,
    clearAllFeeHistoryAndResetBalances,
    resetAllStudentsAndFees,
  } = useInstitute();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'full'>('all');

  // Modal states
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<FeePayment | null>(null);
  const [reversalTarget, setReversalTarget] = useState<FeePayment | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [deletePaymentTarget, setDeletePaymentTarget] = useState<FeePayment | null>(null);
  const [isClearFeeHistoryOpen, setIsClearFeeHistoryOpen] = useState(false);
  const [isFullResetOpen, setIsFullResetOpen] = useState(false);
  const [whatsappStudent, setWhatsappStudent] = useState<typeof students[0] | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // New Payment Form
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [modalStudentSearch, setModalStudentSearch] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active student for recording
  const selectedStudentObj = students.find(
    (s) => s.studentId === selectedStudentId || s.grNo === selectedStudentId
  );

  // Filter students inside Record Payment modal by Name, GR.No, or Batch Time
  const modalFilteredStudents = useMemo(() => {
    const q = modalStudentSearch.toLowerCase().trim();
    if (!q) return students;
    return students.filter((s) => {
      const gr = (s.grNo || s.studentId || '').toLowerCase();
      const name = s.fullName.toLowerCase();
      const batch = (s.batchName || '').toLowerCase();
      const mobile = s.mobile.toLowerCase();
      return gr.includes(q) || name.includes(q) || batch.includes(q) || mobile.includes(q);
    });
  }, [students, modalStudentSearch]);

  const handleOpenRecordModal = (studentId = '') => {
    setModalStudentSearch('');
    const targetId = studentId || students[0]?.studentId || '';
    setSelectedStudentId(targetId);
    const firstStudent = students.find((s) => s.studentId === targetId || s.grNo === targetId);
    setPaymentAmount(firstStudent?.outstandingBalance || 1000);
    setPaymentMethod('upi');
    setTransactionRef('');
    setPaymentRemarks('');
    setIsRecordModalOpen(true);
  };

  const handleStudentSelect = (sId: string) => {
    setSelectedStudentId(sId);
    const found = students.find((s) => s.studentId === sId || s.grNo === sId);
    if (found && found.outstandingBalance > 0) {
      setPaymentAmount(found.outstandingBalance);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || paymentAmount <= 0) {
      showToast('Please select a student and valid amount.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const receipt = await recordFeePayment(
        selectedStudentId,
        Number(paymentAmount),
        paymentMethod,
        transactionRef,
        paymentRemarks
      );
      showToast(`Payment of ₹${paymentAmount} recorded! Receipt: ${receipt.receiptNo}`, 'success');
      setIsRecordModalOpen(false);
      setSelectedReceiptForPrint(receipt); // open printable receipt automatically
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error recording payment';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReversal = async () => {
    if (!reversalTarget) return;
    if (!reversalReason.trim()) {
      showToast('Please state a reason for payment reversal.', 'error');
      return;
    }

    try {
      await reverseFeePayment(
        reversalTarget.id,
        reversalTarget.studentId,
        reversalTarget.amount,
        reversalReason
      );
      showToast(`Receipt ${reversalTarget.receiptNo} reversed. Balance updated.`, 'info');
      setReversalTarget(null);
      setReversalReason('');
    } catch {
      showToast('Error reversing payment.', 'error');
    }
  };

  const handleConfirmDeleteSinglePayment = async () => {
    if (!deletePaymentTarget) return;
    try {
      await deleteFeePayment(deletePaymentTarget.id);
      showToast(`Receipt ${deletePaymentTarget.receiptNo} permanently deleted from history.`, 'info');
      setDeletePaymentTarget(null);
    } catch {
      showToast('Error deleting payment receipt.', 'error');
    }
  };

  const handleConfirmClearFeeHistory = async () => {
    try {
      await clearAllFeeHistoryAndResetBalances();
      showToast('All fee collection history deleted & student fee balances reset to ₹0 paid!', 'success');
      setIsClearFeeHistoryOpen(false);
    } catch {
      showToast('Error clearing fee history.', 'error');
    }
  };

  const handleConfirmFullReset = async () => {
    try {
      await resetAllStudentsAndFees();
      showToast('All students, fee collections, and fee history have been completely reset!', 'success');
      setIsFullResetOpen(false);
    } catch {
      showToast('Error resetting students and fees.', 'error');
    }
  };

  // Filtered Payments (search by Student Name, GR.No, Batch time, or Receipt No)
  const filteredPayments = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return payments.filter((p) => {
      const linkedStudent = students.find(
        (s) => s.studentId === p.studentId || s.grNo === p.studentId
      );
      const batchName = (linkedStudent?.batchName || '').toLowerCase();
      const grNo = (linkedStudent?.grNo || p.studentId || '').toLowerCase();
      const matchesSearch =
        !q ||
        p.studentName.toLowerCase().includes(q) ||
        grNo.includes(q) ||
        p.studentId.toLowerCase().includes(q) ||
        batchName.includes(q) ||
        p.receiptNo.toLowerCase().includes(q) ||
        (p.transactionRef && p.transactionRef.toLowerCase().includes(q));

      const matchesMode = filterMode === 'all' || p.paymentMethod === filterMode;
      return matchesSearch && matchesMode;
    });
  }, [payments, students, searchTerm, filterMode]);

  // Quick Student Fee Lookup (search by Name, GR.No, or Batch time to pay fees in 1 click)
  const todayStr = getTodayDateString();
  const studentsWithReminderList = useMemo(() => {
    return students
      .filter((s) => s.status === 'active' && (s.outstandingBalance || 0) > 0)
      .map((s) => ({
        student: s,
        reminder: getStudentFeeReminderInfo(s, payments, todayStr),
      }))
      .sort((a, b) => a.reminder.daysUntilReminder - b.reminder.daysUntilReminder);
  }, [students, payments, todayStr]);

  const oneMonthDueCount = useMemo(
    () => studentsWithReminderList.filter((item) => item.reminder.isReminderDue).length,
    [studentsWithReminderList]
  );

  const matchingStudentsForFeePay = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return students
      .filter((s) => {
        if (!q) return s.outstandingBalance > 0;
        const gr = (s.grNo || s.studentId || '').toLowerCase();
        const name = s.fullName.toLowerCase();
        const batch = (s.batchName || '').toLowerCase();
        return gr.includes(q) || name.includes(q) || batch.includes(q) || s.mobile.includes(q);
      })
      .map((s) => ({
        student: s,
        reminder: getStudentFeeReminderInfo(s, payments, todayStr),
      }))
      .sort((a, b) => a.reminder.daysUntilReminder - b.reminder.daysUntilReminder)
      .slice(0, 12);
  }, [students, payments, searchTerm, todayStr]);

  // Overall Financial Totals
  const totalCollected = payments.filter((p) => !p.isReversal).reduce((acc, p) => acc + p.amount, 0);
  const totalOutstanding = students.reduce((acc, s) => acc + (s.outstandingBalance || 0), 0);

  const handleExportCSV = () => {
    const headers = [
      'Receipt No',
      'Date',
      'Student ID',
      'Student Name',
      'Amount',
      'Payment Mode',
      'Transaction Ref',
      'Received By',
      'Status',
      'Remarks',
    ];
    const rows = filteredPayments.map((p) => [
      p.receiptNo,
      p.paymentDate,
      p.studentId,
      p.studentName,
      p.amount,
      p.paymentMethod.toUpperCase(),
      p.transactionRef || '',
      p.recordedByStaffName,
      p.isReversal ? 'REVERSED' : 'VALID',
      p.remarks || '',
    ]);
    exportToCSV('TechVision_Fee_Transactions', headers, rows);
    showToast('Payment history exported to CSV.', 'success');
  };

  // WhatsApp Fee Reminder Draft
  const generateFeeReminderText = (s: typeof students[0]) => {
    const info = getStudentFeeReminderInfo(s, payments, todayStr);
    return `Hello ${s.fullName} (GR.No: ${s.grNo || s.studentId}),\n\nGreetings from ${settings.instituteName || 'Tech Vision Computer Class'}, Ahmedabad.\n\nThis is your 1-month fee reminder regarding your enrolled course: ${s.courseName}.\n\n• Admission Date: ${formatDate(s.admissionDate)}\n• 1-Month Fee Due Date: ${formatDate(info.reminderDate)}\n• Total Net Fee: ₹${s.netPayable}\n• Paid Amount: ₹${s.paidAmount}\n• Remaining Fee Balance: ₹${s.outstandingBalance}\n\nPlease clear the remaining fee at the institute counter or via UPI at your earliest convenience.\n\nThank you!\nTech Vision Computer Class\nPhone: ${settings.phone}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraft(true);
    showToast('Fee reminder message copied to clipboard!', 'success');
    setTimeout(() => setCopiedDraft(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-600" />
            Fee Management & Receipts
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Collect course fees, generate printable tax/fee receipts, and track pending dues.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {(payments.length > 0 || students.some((s) => s.paidAmount > 0)) && (
            <button
              onClick={() => setIsClearFeeHistoryOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Delete all fee receipts and reset student paid balances to ₹0"
            >
              <RotateCcw className="w-4 h-4" />
              Clear Fee History & Reset Balances
            </button>
          )}
          {(payments.length > 0 || students.length > 0) && (
            <button
              onClick={() => setIsFullResetOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Delete all students, delete all fee history, and free all 14 computers"
            >
              <Trash2 className="w-4 h-4" />
              Reset All Students & Fees
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export Payments
          </button>
          <button
            onClick={() => handleOpenRecordModal()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-900/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total Collected Till Date</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">{formatINR(totalCollected)}</div>
          <div className="text-[11px] text-slate-400 mt-1">{payments.length} transactions recorded</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total Remaining Fees</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600">{formatINR(totalOutstanding)}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Across {studentsWithReminderList.length} active student(s)
          </div>
        </div>

        <div
          className={`p-5 rounded-2xl border shadow-xs ${
            oneMonthDueCount > 0
              ? 'bg-rose-50/70 border-rose-200'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
            <span>1-Month Fee Reminders Due</span>
            <div
              className={`p-1.5 rounded-lg ${
                oneMonthDueCount > 0
                  ? 'bg-rose-600 text-white'
                  : 'bg-amber-50 text-amber-600'
              }`}
            >
              <BellRing className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`mt-2 text-2xl font-black ${
              oneMonthDueCount > 0 ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {oneMonthDueCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Remind exactly 1 month after admission/payment
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Payment Mode Split</span>
            <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xs font-bold text-slate-700 flex flex-wrap gap-2">
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800">
              UPI: {payments.filter((p) => p.paymentMethod === 'upi' && !p.isReversal).length}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800">
              Cash: {payments.filter((p) => p.paymentMethod === 'cash' && !p.isReversal).length}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800">
              Bank: {payments.filter((p) => p.paymentMethod === 'bank_transfer' && !p.isReversal).length}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">Cashless options preferred</div>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search student by Name, GR.No, or Batch Time (or Receipt No) to pay fees..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium text-slate-700"
            >
              <option value="all">All Payment Methods</option>
              <option value="upi">UPI (Google Pay / PhonePe / Paytm)</option>
              <option value="cash">Cash Counter</option>
              <option value="bank_transfer">Bank Transfer (NEFT / IMPS)</option>
              <option value="cheque">Cheque</option>
              <option value="card">Debit / Credit Card</option>
            </select>
          </div>
        </div>

        {/* Quick Student Fee Pay Results by GR.No, Name, or Batch Time + 1-Month Fee Reminder */}
        {matchingStudentsForFeePay.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-600 mb-2 flex items-center justify-between">
              <span>
                {searchTerm
                  ? `Matching Students for "${searchTerm}" (Click Pay Fees or Remind)`
                  : 'Students with Remaining Fees & 1-Month Reminder Schedule (Sorted by Due Date)'}
              </span>
              <span className="text-slate-400">{matchingStudentsForFeePay.length} shown</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {matchingStudentsForFeePay.map(({ student: st, reminder }) => (
                <div
                  key={st.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition ${
                    reminder.isReminderDue
                      ? 'bg-rose-50/70 border-rose-300 hover:border-rose-400'
                      : 'bg-slate-50 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-900 font-mono text-[10px] font-black">
                        {st.grNo || st.studentId}
                      </span>
                      <span className="font-bold text-slate-900 text-xs truncate">
                        {st.fullName}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {st.batchName || st.courseName} • {st.mobile}
                    </div>
                    <div className="text-[10px] font-bold text-rose-600 mt-0.5">
                      Remaining: {formatINR(st.outstandingBalance)} • Paid: {formatINR(st.paidAmount)}
                    </div>
                    <div
                      className={`text-[10px] font-semibold mt-0.5 ${
                        reminder.isReminderDue ? 'text-rose-700 font-extrabold' : 'text-cyan-700'
                      }`}
                    >
                      {reminder.isReminderDue
                        ? `🔔 1-Month Reminder Due (${formatDate(reminder.reminderDate)})`
                        : `Remind after 1 Mo: ${formatDate(reminder.reminderDate)} (${reminder.daysUntilReminder}d)`}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenRecordModal(st.studentId)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer transition"
                    >
                      Pay Fees
                    </button>
                    <button
                      type="button"
                      onClick={() => setWhatsappStudent(st)}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-bold cursor-pointer transition flex items-center justify-center gap-1"
                      title="Send 1-Month Fee Reminder message"
                    >
                      <Share2 className="w-3 h-3 text-emerald-600" />
                      Remind
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Payment Receipts & Ledger ({filteredPayments.length} entries)
          </span>
          <span className="text-xs text-slate-400 font-medium">
            Financial safety: Overwrites are blocked; audited reversals only.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Receipt No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4">Received By</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {p.receiptNo}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(p.paymentDate)}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.studentName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{p.studentId}</div>
                    </td>
                    <td className="py-3 px-4 font-black text-emerald-600 text-sm">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-800">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {p.transactionRef || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.recordedByStaffName}</td>
                    <td className="py-3 px-4">
                      {p.isReversal ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          Reversed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Paid
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedReceiptForPrint(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 transition cursor-pointer"
                          title="Print Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {!p.isReversal && (
                          <button
                            onClick={() => {
                              setReversalTarget(p);
                              setReversalReason('Reversed by user');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            title="Reverse Payment"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeletePaymentTarget(p)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Receipt from History"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Fee Payment"
        subtitle="Issue an authorized receipt for course fee collection."
        maxWidth="lg"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Search Student by GR.No, Student Name, or Batch Time
            </label>
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={modalStudentSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setModalStudentSearch(val);
                  const q = val.toLowerCase().trim();
                  if (q) {
                    const firstMatch = students.find(
                      (s) =>
                        (s.grNo || s.studentId).toLowerCase().includes(q) ||
                        s.fullName.toLowerCase().includes(q) ||
                        (s.batchName || '').toLowerCase().includes(q)
                    );
                    if (firstMatch) {
                      handleStudentSelect(firstMatch.studentId);
                    }
                  }
                }}
                placeholder="Type GR.No (e.g. GR-101), Student Name, or Batch Time (e.g. 08:00 AM)..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Student ({modalFilteredStudents.length} matching) *
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => handleStudentSelect(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            >
              {modalFilteredStudents.map((s) => (
                <option key={s.id} value={s.studentId}>
                  GR.No: {s.grNo || s.studentId} — {s.fullName} ({s.batchName || s.courseName}) — Remaining: ₹{s.outstandingBalance}
                </option>
              ))}
            </select>
          </div>

          {selectedStudentObj && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-slate-400">Total Fee</span>
                <div className="font-bold text-slate-800">{formatINR(selectedStudentObj.netPayable)}</div>
              </div>
              <div>
                <span className="text-slate-400">Already Paid</span>
                <div className="font-bold text-emerald-600">{formatINR(selectedStudentObj.paidAmount)}</div>
              </div>
              <div>
                <span className="text-slate-400">Pending Dues</span>
                <div className="font-black text-rose-600">{formatINR(selectedStudentObj.outstandingBalance)}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Amount (₹) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-black focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Words: {numberToWordsINR(paymentAmount)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Payment Mode *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                <option value="upi">UPI (GPay, PhonePe, Paytm)</option>
                <option value="cash">Cash Counter</option>
                <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="cheque">Cheque</option>
                <option value="card">Debit / Credit Card</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Transaction / Reference Number (Optional)
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. UPI Ref / Cheque No / Bank UTR"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Remarks
            </label>
            <input
              type="text"
              value={paymentRemarks}
              onChange={(e) => setPaymentRemarks(e.target.value)}
              placeholder="e.g. 1st Installment / Full course clearance"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-md shadow-emerald-900/20 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Generate & Issue Receipt'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Receipt Modal */}
      {selectedReceiptForPrint && (
        <Modal
          isOpen={!!selectedReceiptForPrint}
          onClose={() => setSelectedReceiptForPrint(null)}
          title="Institute Fee Receipt"
          subtitle="Print or save this receipt for student records."
          maxWidth="2xl"
        >
          <div className="p-6 bg-white border border-slate-300 rounded-xl space-y-6 print:border-none print:p-0">
            {/* Institute Header */}
            <div className="text-center pb-4 border-b-2 border-slate-800">
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                {settings.instituteName}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">{settings.address}</p>
              <p className="text-xs text-slate-600">
                Phone: {settings.phone} • Email: {settings.email} • Website: {settings.website || 'techvisioncomputer.com'}
              </p>
              <div className="mt-2 inline-block px-3 py-1 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest rounded">
                Official Fee Receipt
              </div>
            </div>

            {/* Receipt Meta */}
            <div className="grid grid-cols-2 text-xs gap-4">
              <div>
                <span className="text-slate-400">Receipt Number:</span>
                <span className="font-bold text-slate-900 ml-2 font-mono">
                  {selectedReceiptForPrint.receiptNo}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Date:</span>
                <span className="font-bold text-slate-900 ml-2">
                  {formatDate(selectedReceiptForPrint.paymentDate)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Student Name:</span>
                <span className="font-bold text-slate-900 ml-2">
                  {selectedReceiptForPrint.studentName}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Student ID:</span>
                <span className="font-mono font-bold text-slate-900 ml-2">
                  {selectedReceiptForPrint.studentId}
                </span>
              </div>
            </div>

            {/* Amount Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-slate-700">Amount Received:</span>
                <span className="font-black text-xl text-slate-900">
                  {formatINR(selectedReceiptForPrint.amount)}
                </span>
              </div>
              <div className="text-xs text-slate-600 pt-1 border-t border-slate-200">
                <strong>In Words:</strong> {numberToWordsINR(selectedReceiptForPrint.amount)}
              </div>
              <div className="text-xs text-slate-600 flex justify-between pt-1">
                <span>
                  <strong>Payment Mode:</strong> {selectedReceiptForPrint.paymentMethod.toUpperCase()}
                </span>
                {selectedReceiptForPrint.transactionRef && (
                  <span>
                    <strong>Ref No:</strong> {selectedReceiptForPrint.transactionRef}
                  </span>
                )}
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-8 flex justify-between items-end text-xs text-slate-600">
              <div className="text-center">
                <div className="w-36 border-b border-slate-400 pb-1">
                  {selectedReceiptForPrint.recordedByStaffName}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Authorized Cashier / Staff</div>
              </div>
              <div className="text-center">
                <div className="w-36 border-b border-slate-400 pb-1">Tech Vision Computer Class</div>
                <div className="text-[10px] text-slate-400 mt-1">Institute Seal & Signature</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 print:hidden">
            <button
              onClick={() => setSelectedReceiptForPrint(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Close
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </button>
          </div>
        </Modal>
      )}

      {/* Payment Reversal Confirmation */}
      <ConfirmDialog
        isOpen={!!reversalTarget}
        onClose={() => setReversalTarget(null)}
        onConfirm={handleConfirmReversal}
        title="Reverse Payment Receipt"
        message={`Are you sure you want to reverse Receipt ${reversalTarget?.receiptNo} of ₹${reversalTarget?.amount}? The student's outstanding balance will be restored accordingly.`}
        confirmText="Confirm Reversal"
        isDestructive
      />

      {/* Delete Single Payment Receipt Confirmation */}
      <ConfirmDialog
        isOpen={!!deletePaymentTarget}
        onClose={() => setDeletePaymentTarget(null)}
        onConfirm={handleConfirmDeleteSinglePayment}
        title="Delete Fee Receipt from History"
        message={`Permanently delete Receipt ${deletePaymentTarget?.receiptNo} (₹${deletePaymentTarget?.amount} for ${deletePaymentTarget?.studentName}) from fee history?`}
        confirmText="Delete Receipt"
        isDestructive
      />

      {/* Clear All Fee History & Reset Student Balances Confirmation */}
      <ConfirmDialog
        isOpen={isClearFeeHistoryOpen}
        onClose={() => setIsClearFeeHistoryOpen(false)}
        onConfirm={handleConfirmClearFeeHistory}
        title="Clear All Fee History & Reset Student Balances"
        message="This will permanently delete all recorded fee payment receipts and reset every student's paid fee amount to ₹0. Continue?"
        confirmText="Clear Fee History & Reset Fees"
        isDestructive
      />

      {/* Reset All Students & Fees Confirmation */}
      <ConfirmDialog
        isOpen={isFullResetOpen}
        onClose={() => setIsFullResetOpen(false)}
        onConfirm={handleConfirmFullReset}
        title="Reset All Students & Fee History"
        message="This will permanently delete all students, remove all recent fee collections and fee history, and release all 14 computer lab workstations. Continue?"
        confirmText="Reset All Students & Fees"
        isDestructive
      />
    </div>
  );
};
