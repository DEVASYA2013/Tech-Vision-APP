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
/**
 * Calculates a specific monthly cycle date anchored to an original billing anchor date.
 * Consistent across shorter months (e.g. 31 Jan -> 28 Feb -> 31 Mar).
 */
export function getCycleDateForMonthOffset(anchorDateStr: string, monthOffset: number): string {
  const baseStr = anchorDateStr && /^\d{4}-\d{2}-\d{2}$/.test(anchorDateStr.trim())
    ? anchorDateStr.trim()
    : getTodayDateString();
  const [y, m, d] = baseStr.split('-').map(Number);
  const totalMonths = (m - 1) + monthOffset;
  const targetYear = y + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12 + 1;
  const maxDays = new Date(targetYear, targetMonth, 0).getDate();
  const clampedDay = Math.min(d, maxDays);
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

/**
 * Adds one calendar month to a date string while respecting the day of month.
 */
export function addOneMonthToDateString(dateStr?: string): string {
  return getCycleDateForMonthOffset(dateStr || getTodayDateString(), 1);
}

export interface StudentFeeReminderInfo {
  hasRemainingFee: boolean;
  anchorDate: string; // The stable billing anchor (admission date or established cycle)
  anchorDay: number; // Day of month (e.g. 12 or 31)
  currentCycleIndex: number; // 1 = 1st month, 2 = 2nd month...
  referenceDate: string; // Anchor date
  referenceType: 'admission' | 'cycle_anchor' | 'last_payment';
  reminderDate: string; // YYYY-MM-DD - exact monthly cycle due date
  daysUntilReminder: number; // <= 0 means fee is currently due or overdue
  daysElapsed: number; // Days overdue if past due date
  isReminderDue: boolean; // true when fee is remaining AND due date <= today
  isExactOneMonthToday: boolean;
  isUpcomingSoon: boolean; // within next 7 days
  statusText: string;
}

/**
 * Core business rule:
 * A student's monthly fee cycle is anchored to their admission date (or established billing schedule),
 * NOT to the date on which they eventually make a late payment.
 * 
 * Example:
 * Admission date: 12 July.
 * Cycle 1 due date: 12 August.
 * If unpaid on 18 August -> fee remains overdue by 6 days.
 * If student pays on 18 August -> next cycle due date is 12 September (NOT 18 September).
 * Shorter calendar months (e.g. 31st) clamp to the end of month and restore to the 31st in longer months.
 */
export function getStudentFeeReminderInfo(
  student: {
    studentId: string;
    admissionDate?: string;
    startDate?: string;
    outstandingBalance?: number;
    feeReminderDate?: string;
    grNo?: string;
  },
  payments?: Array<{
    studentId: string;
    paymentDate: string;
    isReversal?: boolean;
    amount?: number;
  }>,
  todayStr?: string
): StudentFeeReminderInfo {
  const today = todayStr || getTodayDateString();
  const hasRemainingFee = (student.outstandingBalance || 0) > 0;
  
  // 1. Establish stable billing anchor from admission date or start date
  const anchorDate =
    student.admissionDate && /^\d{4}-\d{2}-\d{2}$/.test(student.admissionDate)
      ? student.admissionDate
      : student.startDate && /^\d{4}-\d{2}-\d{2}$/.test(student.startDate)
      ? student.startDate
      : today;
  const [, , dStr] = anchorDate.split('-');
  const anchorDay = parseInt(dStr, 10) || 1;

  if (!hasRemainingFee) {
    return {
      hasRemainingFee: false,
      anchorDate,
      anchorDay,
      currentCycleIndex: 0,
      referenceDate: anchorDate,
      referenceType: 'admission',
      reminderDate: anchorDate,
      daysUntilReminder: 999,
      daysElapsed: 0,
      isReminderDue: false,
      isExactOneMonthToday: false,
      isUpcomingSoon: false,
      statusText: 'No Remaining Fee',
    };
  }

  // 2. Inspect valid payments made by this student
  const validPayments = (payments || [])
    .filter(
      (p) =>
        (p.studentId === student.studentId || (student.grNo && p.studentId === student.grNo)) &&
        !p.isReversal &&
        p.paymentDate &&
        /^\d{4}-\d{2}-\d{2}$/.test(p.paymentDate)
    )
    .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));

  // 3. Find the current cycle due date anchored to anchorDate
  // Cycle 1 is 1 month after admission, Cycle 2 is 2 months, etc.
  let cycleIndex = 1;
  while (cycleIndex < 120) { // Safety ceiling: 10 years of monthly cycles
    const cycleDueDate = getCycleDateForMonthOffset(anchorDate, cycleIndex);
    
    // Check if there is a payment recorded on or after this cycle's due date
    const hasPaymentForCycle = validPayments.some((p) => p.paymentDate >= cycleDueDate);

    if (hasPaymentForCycle) {
      // This cycle received a payment, so advance to evaluate the next cycle
      cycleIndex++;
      continue;
    }

    // No payment on or after this cycle's due date. This cycle is the current due cycle.
    break;
  }

  // If student has an explicit override feeReminderDate set manually by admin:
  const reminderDate =
    student.feeReminderDate && /^\d{4}-\d{2}-\d{2}$/.test(student.feeReminderDate)
      ? student.feeReminderDate
      : getCycleDateForMonthOffset(anchorDate, cycleIndex);

  const parseUTC = (ymd: string) => {
    const [yr, mo, da] = ymd.split('-').map(Number);
    return Date.UTC(yr, mo - 1, da);
  };

  const todayMs = parseUTC(today);
  const reminderMs = parseUTC(reminderDate);

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const daysUntilReminder = Math.round((reminderMs - todayMs) / MS_PER_DAY);
  const daysOverdue = Math.max(0, Math.round((todayMs - reminderMs) / MS_PER_DAY));

  const isReminderDue = hasRemainingFee && daysUntilReminder <= 0;
  const isExactOneMonthToday = hasRemainingFee && daysUntilReminder === 0;
  const isUpcomingSoon = hasRemainingFee && daysUntilReminder > 0 && daysUntilReminder <= 7;

  let statusText = 'No Remaining Fee';
  if (hasRemainingFee) {
    if (daysUntilReminder === 0) {
      statusText = `Monthly Due Today (${formatDate(reminderDate)})`;
    } else if (daysUntilReminder < 0) {
      statusText = `Overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} (Due: ${formatDate(reminderDate)})`;
    } else {
      statusText = `Due on ${formatDate(reminderDate)} (in ${daysUntilReminder} day${daysUntilReminder === 1 ? '' : 's'})`;
    }
  }

  return {
    hasRemainingFee,
    anchorDate,
    anchorDay,
    currentCycleIndex: cycleIndex,
    referenceDate: anchorDate,
    referenceType: 'cycle_anchor',
    reminderDate,
    daysUntilReminder,
    daysElapsed: daysOverdue,
    isReminderDue,
    isExactOneMonthToday,
    isUpcomingSoon,
    statusText,
  };
}

/**
 * Multi-Batch (Multi-Hour) Helper Functions
 * Supports both legacy single-batch students (batchId/batchName) and multi-batch students (batchIds/batchNames).
 */
export function getStudentBatchIds(student?: { batchId?: string; batchIds?: string[] } | null): string[] {
  if (!student) return [];
  if (Array.isArray(student.batchIds) && student.batchIds.length > 0) {
    return student.batchIds.filter(Boolean);
  }
  if (student.batchId) {
    return student.batchId
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }
  return [];
}

export function getStudentBatchNames(student?: { batchName?: string; batchNames?: string[] } | null): string[] {
  if (!student) return [];
  if (Array.isArray(student.batchNames) && student.batchNames.length > 0) {
    return student.batchNames.filter(Boolean);
  }
  if (student.batchName) {
    return student.batchName
      .split('+')
      .map((n) => n.trim())
      .filter(Boolean);
  }
  return [];
}

export function studentHasBatch(
  student: { batchId?: string; batchIds?: string[] } | null | undefined,
  targetBatchId: string
): boolean {
  if (!student || !targetBatchId) return false;
  return getStudentBatchIds(student).includes(targetBatchId);
}

export function getStudentHoursLabel(student?: { batchId?: string; batchIds?: string[] } | null): string {
  const count = getStudentBatchIds(student).length;
  if (count <= 1) return '1 Hr';
  return `${count} Hrs`;
}


