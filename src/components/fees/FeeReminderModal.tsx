import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  Sparkles,
  Phone,
  Calendar,
  IndianRupee,
  MessageSquare,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Student } from '../../types';
import { useInstitute } from '../../context/InstituteContext';
import { formatINR, formatDate, getStudentFeeReminderInfo, StudentFeeReminderInfo } from '../../utils/formatters';
import { useToast } from '../ui/Toast';

interface FeeReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  reminderInfo?: StudentFeeReminderInfo;
}

type ReminderTone = 'standard' | 'formal' | 'gentle' | 'gujarati' | 'urgent';

export const FeeReminderModal: React.FC<FeeReminderModalProps> = ({
  isOpen,
  onClose,
  student,
  reminderInfo: customReminderInfo,
}) => {
  const { settings, payments } = useInstitute();
  const { showToast } = useToast();

  const [tone, setTone] = useState<ReminderTone>('standard');
  const [message, setMessage] = useState('');
  const [hasCopied, setHasCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Calculate reminder info if not directly passed
  const reminder =
    customReminderInfo ||
    (student ? getStudentFeeReminderInfo(student, payments) : null);

  const generateTemplateMessage = (
    targetStudent: Student,
    currentTone: ReminderTone,
    currentReminder: StudentFeeReminderInfo | null
  ): string => {
    const instName = settings.instituteName || 'Tech Vision Computer Class';
    const course = targetStudent.courseName || 'Computer Course';
    const amountStr = formatINR(targetStudent.outstandingBalance);
    const dueDateStr = currentReminder ? formatDate(currentReminder.reminderDate) : 'due date';
    const contactPhone = settings.phone || '+91 98250 12345';
    const website = settings.website || 'techvisioncomputer.com';

    switch (currentTone) {
      case 'formal':
        return `Dear ${targetStudent.fullName},\n\nOfficial notice from ${instName}, Ahmedabad.\n\nThis is to notify you regarding the outstanding fee balance of ${amountStr} for your ${course} course. According to the established monthly billing cycle, the payment due date is ${dueDateStr}.\n\nTotal Course Fee: ${formatINR(targetStudent.netPayable)}\nAmount Paid Till Date: ${formatINR(targetStudent.paidAmount)}\nPending Balance Due: ${amountStr}\n\nKindly arrange the payment at the institute administration office or via UPI at your earliest convenience.\n\nHelpline: ${contactPhone}\nWebsite: ${website}\n\nAccounts Department,\n${instName}`;

      case 'gentle':
        return `Hello ${targetStudent.fullName}! 😊\n\nHope your learning journey in ${course} is going well at ${instName}.\n\nJust a gentle, friendly reminder that a course fee balance of ${amountStr} is scheduled for ${dueDateStr}. Whenever convenient, please clear the remaining fee at the counter or via online UPI.\n\nIf you have already made this payment today, please let us know so we can update your fee receipt. Thank you!\n\n${instName}\nContact: ${contactPhone}`;

      case 'gujarati':
        return `નમસ્તે ${targetStudent.fullName},\n\n${instName} તરફથી નમ્ર સ્મૃતિપત્ર.\n\nઆપના ${course} કોર્સ માટે ₹${targetStudent.outstandingBalance} ની બાકી ફી જમા કરવાની તારીખ ${dueDateStr} છે. આપની અનુકૂળતા મુજબ ઇન્સ્ટિટ્યૂટ ઓફિસ પર અથવા UPI દ્વારા ફી જમા કરાવવા વિનંતી.\n\nજો ફી જમા કરાવી દીધી હોય તો કૃપા કરી સંપર્ક કરશો.\nઆભાર — ${instName}\nમોબાઈલ: ${contactPhone}`;

      case 'urgent':
        return `URGENT FEE REMINDER: ${targetStudent.fullName}\n\nThis is an urgent notice from ${instName}. An overdue course fee balance of ${amountStr} for ${course} was scheduled for payment on ${dueDateStr} and remains pending.\n\nPlease clear your pending balance immediately to avoid any interruption in class sessions or computer lab seat access.\n\nPending Amount: ${amountStr}\nContact Office: ${contactPhone}\n\n${instName}, Ahmedabad`;

      case 'standard':
      default:
        return `Hello ${targetStudent.fullName}, this is a friendly reminder from ${instName} that ${amountStr} is still pending for your ${course} fees. The due date is ${dueDateStr}. Kindly arrange the payment at your convenience. If you have already paid, please contact us so we can update our records. Thank you — ${instName}. (Phone: ${contactPhone})`;
    }
  };

  useEffect(() => {
    if (student) {
      setMessage(generateTemplateMessage(student, tone, reminder));
      setHasCopied(false);
    }
  }, [student, tone, reminder?.reminderDate]);

  if (!student) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setHasCopied(true);
      showToast('Fee reminder copied to clipboard! Ready to paste into SMS or chat.', 'success');
      setTimeout(() => setHasCopied(false), 3000);
    } catch {
      showToast('Failed to copy to clipboard.', 'error');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Fee Reminder - ${student.fullName}`,
          text: message,
        });
        showToast('Device share sheet opened.', 'info');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  const handleWhatsAppShare = () => {
    const rawDigits = student.mobile.replace(/\D/g, '');
    const cleanPhone = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast(`WhatsApp draft opened for ${student.fullName}. Review and send in WhatsApp.`, 'info');
  };

  const handleRegenerateWithAI = async () => {
    setIsGenerating(true);
    // Simulating quick AI refinement or fallback without blocking UI
    setTimeout(() => {
      setMessage(generateTemplateMessage(student, tone, reminder));
      setIsGenerating(false);
      showToast('Reminder message generated from student records.', 'success');
    }, 300);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Fee Reminder"
      subtitle={`Student: ${student.fullName} (${student.grNo || student.studentId}) • Outstanding: ${formatINR(student.outstandingBalance)}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Student Quick Dossier Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Student</span>
            <span className="font-bold text-slate-900 truncate block">{student.fullName}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Pending Balance</span>
            <span className="font-black text-rose-600 block">{formatINR(student.outstandingBalance)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Monthly Due Date</span>
            <span className="font-bold text-slate-800 block">
              {reminder ? formatDate(reminder.reminderDate) : 'Monthly Cycle'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Contact Mobile</span>
            <span className="font-mono font-bold text-slate-800 block">{student.mobile}</span>
          </div>
        </div>

        {/* Tone Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
              Choose Message Style & Tone:
            </span>
            <span className="text-[10px] font-normal text-slate-400">
              Anchored to admission date ({formatDate(student.admissionDate)})
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {[
              { id: 'standard', label: 'Polite / Standard' },
              { id: 'formal', label: 'Official / Formal' },
              { id: 'gentle', label: 'Gentle / Friendly' },
              { id: 'gujarati', label: 'ગુજરાતી (Regional)' },
              { id: 'urgent', label: 'Overdue Notice' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTone(t.id as ReminderTone)}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition cursor-pointer text-center border ${
                  tone === t.id
                    ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Editable Message Preview */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              Editable Preview (Review & Customize Before Sharing):
            </label>
            <button
              type="button"
              onClick={handleRegenerateWithAI}
              disabled={isGenerating}
              className="text-[11px] font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 cursor-pointer transition"
            >
              <Sparkles className="w-3 h-3" />
              Reset Message
            </button>
          </div>
          <textarea
            rows={7}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full text-xs font-sans p-3 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 leading-relaxed resize-y"
            placeholder="Type or edit reminder message..."
          />
        </div>

        {/* Audit Safety Notice */}
        <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Safety & Accuracy:</strong> Message contains verified outstanding figures from
            saved payment records. Sharing opens your device messaging apps; messages are not sent silently
            by the system.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Close
          </button>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {hasCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  Copy Text
                </>
              )}
            </button>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-cyan-600" />
                Share Device
              </button>
            )}

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/20 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              Share on WhatsApp
              <ExternalLink className="w-3 h-3 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
