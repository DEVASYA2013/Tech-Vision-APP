export type UserRole = 'admin' | 'staff';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  isActive: boolean;
  permissions?: string[];
  createdAt: string;
  updatedAt?: string;
}

export type StudentStatus = 'active' | 'completed' | 'on_hold' | 'inactive';

export interface Student {
  id: string; // firestore doc id
  studentId: string; // e.g. TV-2026-001
  fullName: string;
  photoUrl?: string;
  mobile: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  courseId: string;
  courseName: string;
  batchId?: string;
  batchName?: string;
  admissionDate: string; // YYYY-MM-DD
  startDate?: string;
  expectedEndDate?: string;
  totalCourseFee: number;
  discount: number;
  netPayable: number;
  paidAmount: number;
  outstandingBalance: number;
  assignedSeatId?: string; // e.g. PC-01
  status: StudentStatus;
  internalNotes?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  courseId: string;
  courseName: string;
  description: string;
  duration: string;
  standardFee: number;
  sessionsCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  id: string;
  batchId: string;
  batchName: string;
  courseId: string;
  courseName: string;
  startDate: string;
  endDate: string;
  daysOfWeek: string[]; // ['Mon', 'Wed', 'Fri']
  startTime: string; // e.g. '09:00 AM'
  endTime: string; // e.g. '10:30 AM'
  maxCapacity: number;
  instructorStaffId?: string;
  instructorName?: string;
  status: 'active' | 'completed' | 'upcoming';
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface AttendanceRecordItem {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface AttendanceSheet {
  id: string;
  attendanceId: string;
  date: string; // YYYY-MM-DD
  courseId: string;
  batchId: string;
  records: AttendanceRecordItem[];
  markedByStaffId: string;
  markedByStaffName: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'card';

export interface FeePayment {
  id: string;
  paymentId: string;
  receiptNo: string; // e.g. RCPT-2026-001
  studentId: string;
  studentName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
  paymentDate: string; // YYYY-MM-DD
  recordedByStaffId: string;
  recordedByStaffName: string;
  remarks?: string;
  isReversal?: boolean;
  reversalReason?: string;
  createdAt: string;
}

export type SeatStatus = 'available' | 'occupied' | 'inactive' | 'maintenance';

export interface ComputerSeat {
  id: string;
  seatId: string;
  seatNumber: string; // e.g. A-01, B-01
  rowName?: string; // 'Row A' | 'Row B'
  status: SeatStatus;
  assignedStudentId?: string;
  assignedStudentName?: string;
  assignedCourseId?: string;
  assignedBatchId?: string;
  computerName?: string;
  notes?: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  logId: string;
  action: string;
  performedByUid: string;
  performedByName: string;
  performedByRole: string;
  targetEntity: string;
  targetId: string;
  details: string;
  timestamp: string;
}

export interface InstituteSettings {
  id: string;
  instituteName: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  totalSeats: number;
  timezone: string;
  receiptPrefix: string;
  tagline?: string;
  updatedAt: string;
}

export interface InstituteNotification {
  id: string;
  notificationId: string;
  type: 'fee_due' | 'unmarked_attendance' | 'low_seats' | 'batch_full' | 'info';
  title: string;
  message: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
}
