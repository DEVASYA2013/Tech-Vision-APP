/**
 * Formatting and utility helpers for Tech Vision Computer Class (Ahmedabad, India)
 */

export function formatINR(amount: number): string {
  if (isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatTime(timeString?: string): string {
  if (!timeString) return '-';
  return timeString;
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthName(): string {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date());
}

export function numberToWordsINR(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(num: number): string {
    if ((num = num.toString().length > 9 ? parseFloat(num.toString().substring(0, 9)) : num) === 0) return '';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += Number(n[1]) !== 0 ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
    str += Number(n[2]) !== 0 ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
    str += Number(n[3]) !== 0 ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
    str += Number(n[4]) !== 0 ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
    str += Number(n[5]) !== 0 ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
    return str;
  }

  const rounded = Math.round(amount);
  return `${inWords(rounded).trim()} Rupees Only`;
}

export function isValidIndianMobile(phone: string): boolean {
  const clean = phone.replace(/[\s\-\+]/g, '');
  return clean.length >= 10 && /^\d+$/.test(clean);
}

/**
 * Adds exactly 1 calendar month to a YYYY-MM-DD date string.
 * Example: '2026-09-07' -> '2026-10-07'
 */
export function addOneMonthToDateString(dateStr?: string): string {
  const baseStr = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())
    ? dateStr.trim()
    : getTodayDateString();
  const [y, m, d] = baseStr.split('-').map(Number);
  // Target month in 0-indexed JS Date: m (since m is 1-indexed, m is next month in 0-indexed)
  const targetYear = m === 12 ? y + 1 : y;
  const targetMonth = m === 12 ? 1 : m + 1;
  // Max days in targetMonth
  const maxDayInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
  const clampedDay = Math.min(d, maxDayInTargetMonth);
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

export interface StudentFeeReminderInfo {
  hasRemainingFee: boolean;
  referenceDate: string;
  referenceType: 'admission' | 'last_payment';
  reminderDate: string; // YYYY-MM-DD (exact 1 month after referenceDate)
  daysUntilReminder: number; // <= 0 means 1 month has completed and reminder is due!
  daysElapsed: number;
  isReminderDue: boolean; // true when fee is remaining AND >= 1 month has passed
  isExactOneMonthToday: boolean;
  isUpcomingSoon: boolean; // within next 7 days
  statusText: string;
}

export function getStudentFeeReminderInfo(
  student: {
    studentId: string;
    admissionDate?: string;
    outstandingBalance?: number;
    feeReminderDate?: string;
  },
  payments?: Array<{
    studentId: string;
    paymentDate: string;
    isReversal?: boolean;
  }>,
  todayStr?: string
): StudentFeeReminderInfo {
  const today = todayStr || getTodayDateString();
  const hasRemainingFee = (student.outstandingBalance || 0) > 0;
  const admissionDate =
    student.admissionDate && /^\d{4}-\d{2}-\d{2}$/.test(student.admissionDate)
      ? student.admissionDate
      : today;

  // Check if student made a more recent valid fee payment after admission
  let latestPaymentDate = '';
  if (payments && payments.length > 0) {
    for (const p of payments) {
      if (
        p.studentId === student.studentId &&
        !p.isReversal &&
        p.paymentDate &&
        /^\d{4}-\d{2}-\d{2}$/.test(p.paymentDate)
      ) {
        if (!latestPaymentDate || p.paymentDate > latestPaymentDate) {
          latestPaymentDate = p.paymentDate;
        }
      }
    }
  }

  const useLastPayment = Boolean(latestPaymentDate && latestPaymentDate > admissionDate);
  const referenceDate = useLastPayment ? latestPaymentDate : admissionDate;
  const referenceType: 'admission' | 'last_payment' = useLastPayment ? 'last_payment' : 'admission';

  const reminderDate =
    student.feeReminderDate && /^\d{4}-\d{2}-\d{2}$/.test(student.feeReminderDate)
      ? student.feeReminderDate
      : addOneMonthToDateString(referenceDate);

  const parseUTC = (ymd: string) => {
    const [yr, mo, da] = ymd.split('-').map(Number);
    return Date.UTC(yr, mo - 1, da);
  };

  const todayMs = parseUTC(today);
  const reminderMs = parseUTC(reminderDate);
  const referenceMs = parseUTC(referenceDate);

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const daysUntilReminder = Math.round((reminderMs - todayMs) / MS_PER_DAY);
  const daysElapsed = Math.max(0, Math.round((todayMs - referenceMs) / MS_PER_DAY));

  const isReminderDue = hasRemainingFee && daysUntilReminder <= 0;
  const isExactOneMonthToday = hasRemainingFee && daysUntilReminder === 0;
  const isUpcomingSoon = hasRemainingFee && daysUntilReminder > 0 && daysUntilReminder <= 7;

  let statusText = 'No Remaining Fee';
  if (hasRemainingFee) {
    if (daysUntilReminder === 0) {
      statusText = `Due Today • 1 Month Completed (${formatDate(reminderDate)})`;
    } else if (daysUntilReminder < 0) {
      statusText = `1-Month Reminder Due • ${Math.abs(daysUntilReminder)} day${Math.abs(daysUntilReminder) === 1 ? '' : 's'} past ${formatDate(reminderDate)}`;
    } else {
      statusText = `Remind on ${formatDate(reminderDate)} (in ${daysUntilReminder} day${daysUntilReminder === 1 ? '' : 's'})`;
    }
  }

  return {
    hasRemainingFee,
    referenceDate,
    referenceType,
    reminderDate,
    daysUntilReminder,
    daysElapsed,
    isReminderDue,
    isExactOneMonthToday,
    isUpcomingSoon,
    statusText,
  };
}

