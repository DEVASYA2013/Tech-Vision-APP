export type UserRole = 'admin' | 'staff';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  staffPassword?: string;
  isActive: boolean;
  permissions?: string[];
  createdAt: string;
  updatedAt?: string;
}

export type StudentStatus = 'active' | 'completed' | 'on_hold' | 'inactive';

export interface Student {
  id: string; // firestore doc id
  studentId: string; // e.g. GR-101 or TV-2026-001
  grNo?: string; // Student GR.No
  fullName: string;
  fatherOrHusbandName?: string;
  fatherOrHusbandProfession?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  qualification?: string;
  aadharCardNo?: string;
  photoUrl?: string;
  mobile: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  courseId: string;
  courseName: string;
  courseIds?: string[]; // Multiple enrolled course IDs
  courseNames?: string[]; // Multiple enrolled course names
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
  feeReminderDate?: string; // YYYY-MM-DD (exact 1-month reminder date when fee is remaining)
  assignedSeatId?: string; // e.g. A-01, B-01
  courseCompleted?: boolean;
  certificateIssued?: boolean;
  certificateIssuedDate?: string;
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
  website?: string;
  logoUrl?: string;
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
  type: 'fee_due' | 'unmarked_attendance' | 'low_seats' | 'batch_full' | 'info' | 'enquiry_followup';
  title: string;
  message: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
}

export type EnquiryStatus = 'new' | 'follow_up' | 'demo_scheduled' | 'converted' | 'closed';

export interface Enquiry {
  id: string; // firestore doc id
  enquiryId: string; // e.g. ENQ-2026-001
  fullName: string;
  mobile: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  qualification?: string; // e.g. 12th Pass, B.Com Student, Working Professional
  courseId: string;
  courseName: string;
  preferredTiming?: string; // e.g. Morning (8:00 AM - 11:00 AM)
  preferredRow?: string; // e.g. Row A (5 PCs) / Row B (9 PCs) / Any
  quotedFee: number;
  source: string; // Walk-in, Phone Call, Referral, Social Media, Pamphlet
  enquiryDate: string; // YYYY-MM-DD
  followUpDate?: string; // YYYY-MM-DD
  status: EnquiryStatus;
  notes?: string;
  handledByName?: string;
  convertedStudentId?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

