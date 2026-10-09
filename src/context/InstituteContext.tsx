import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  collection,
  onSnapshot,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { useAuth } from './AuthContext';
import {
  Student,
  Course,
  Batch,
  ComputerSeat,
  FeePayment,
  AttendanceSheet,
  InstituteSettings,
  AuditLog,
  InstituteNotification,
  AttendanceRecordItem,
  Enquiry,
} from '../types';
import {
  getTodayDateString,
  addOneMonthToDateString,
  getStudentFeeReminderInfo,
  formatINR,
  formatDate,
} from '../utils/formatters';

interface InstituteContextType {
  students: Student[];
  enquiries: Enquiry[];
  courses: Course[];
  batches: Batch[];
  seats: ComputerSeat[];
  payments: FeePayment[];
  attendanceSheets: AttendanceSheet[];
  settings: InstituteSettings;
  auditLogs: AuditLog[];
  notifications: InstituteNotification[];
  loading: boolean;
  addStudent: (
    studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'paidAmount' | 'outstandingBalance'> & {
      paidAmount?: number;
    }
  ) => Promise<string>;
  updateStudent: (id: string, studentData: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string, reason?: string) => Promise<void>;
  markCourseCompleted: (id: string) => Promise<void>;
  permanentDeleteStudent: (id: string) => Promise<void>;
  addEnquiry: (enquiryData: Omit<Enquiry, 'id' | 'enquiryId' | 'createdAt' | 'updatedAt'> & { enquiryId?: string }) => Promise<string>;
  updateEnquiry: (id: string, enquiryData: Partial<Enquiry>) => Promise<void>;
  deleteEnquiry: (id: string) => Promise<void>;
  convertEnquiryToStudent: (
    enquiryDocId: string,
    admissionDetails: {
      batchId?: string;
      batchName?: string;
      assignedSeatId?: string;
      totalCourseFee: number;
      discount: number;
      initialPayment?: number;
      paymentMethod?: FeePayment['paymentMethod'];
    }
  ) => Promise<string>;
  addCourse: (course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCourse: (id: string, course: Partial<Course>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  addBatch: (batch: Omit<Batch, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBatch: (id: string, batch: Partial<Batch>) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
  recordFeePayment: (
    studentId: string,
    amount: number,
    paymentMethod: FeePayment['paymentMethod'],
    transactionRef?: string,
    remarks?: string
  ) => Promise<FeePayment>;
  reverseFeePayment: (paymentId: string, studentId: string, amount: number, reason: string) => Promise<void>;
  deleteFeePayment: (paymentId: string) => Promise<void>;
  clearAllFeeHistoryAndResetBalances: () => Promise<void>;
  resetAllStudentsAndFees: () => Promise<void>;
  saveAttendance: (date: string, courseId: string, batchId: string, records: AttendanceRecordItem[]) => Promise<void>;
  assignSeat: (seatId: string, studentId: string) => Promise<void>;
  releaseSeat: (seatId: string, studentId?: string) => Promise<void>;
  updateSeatNotes: (seatId: string, notes: string, status?: ComputerSeat['status']) => Promise<void>;
  sync14ComputerLayout: () => Promise<void>;
  updateSettings: (newSettings: Partial<InstituteSettings>) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  loadDemoData: () => Promise<void>;
  clearDemoData: () => Promise<void>;
}

export const TECH_VISION_14_SEATS: Omit<ComputerSeat, 'id'>[] = [
  // Row A - 5 Computers
  { seatId: 'A-01', seatNumber: 'A-01', rowName: 'Row A', status: 'available', computerName: 'Workstation A-1', notes: 'Row A • Workstation 1 (Core i5 / 16GB RAM)', updatedAt: new Date().toISOString() },
  { seatId: 'A-02', seatNumber: 'A-02', rowName: 'Row A', status: 'available', computerName: 'Workstation A-2', notes: 'Row A • Workstation 2 (Core i5 / 16GB RAM)', updatedAt: new Date().toISOString() },
  { seatId: 'A-03', seatNumber: 'A-03', rowName: 'Row A', status: 'available', computerName: 'Workstation A-3', notes: 'Row A • Workstation 3 (Core i5 / 16GB RAM)', updatedAt: new Date().toISOString() },
  { seatId: 'A-04', seatNumber: 'A-04', rowName: 'Row A', status: 'available', computerName: 'Workstation A-4', notes: 'Row A • Workstation 4 (Core i5 / 16GB RAM)', updatedAt: new Date().toISOString() },
  { seatId: 'A-05', seatNumber: 'A-05', rowName: 'Row A', status: 'available', computerName: 'Workstation A-5', notes: 'Row A • Workstation 5 (Core i5 / 16GB RAM)', updatedAt: new Date().toISOString() },
  // Row B - 9 Computers
  { seatId: 'B-01', seatNumber: 'B-01', rowName: 'Row B', status: 'available', computerName: 'Workstation B-1', notes: 'Row B • Workstation 1 (Core i5 / 16GB RAM)', updatedAt: new Date().toISOString() },
  { seatId: 'B-02', seatNumber: 'B-02', rowName: 'Row B', status: 'available', computerName: 'Workstation B-2', notes: 'Row B • Workstation 2 (Core i5 / 16GB RAM)', updatedAt: new Date().toISOString() },
  { seatId: 'B-03', seatNumber: 'B-03', rowName: 'Row B', status: 'available', computerName: 'Workstation B-3', notes: 'Row B • Workstation 3 (Core i5 / 16GB RAM)', updatedAt: new Date().toISOString() },
  { seatId: 'B-04', seatNumber: 'B-04', rowName: 'Row B', status: 'available', computerName: 'Workstation B-4', notes: 'Row B • Workstation 4 (Core i5 / 16GB RAM)', updatedAt: new Date().toISOString() },
  { seatId: 'B-05', seatNumber: 'B-05', rowName: 'Row B', status: 'available', computerName: 'Workstation B-5', notes: 'Row B • Workstation 5 (Core i5 / 16GB RAM)', updatedAt: new Date().toISOString() },
  { seatId: 'B-06', seatNumber: 'B-06', rowName: 'Row B', status: 'available', computerName: 'Workstation B-6', notes: 'Row B • Workstation 6 (Core i5 / 16GB RAM)', updatedAt: new Date().toISOString() },
  { seatId: 'B-07', seatNumber: 'B-07', rowName: 'Row B', status: 'available', computerName: 'Workstation B-7', notes: 'Row B • Workstation 7 (Core i5 / 16GB RAM)', updatedAt: new Date().toISOString() },
  { seatId: 'B-08', seatNumber: 'B-08', rowName: 'Row B', status: 'available', computerName: 'Workstation B-8', notes: 'Row B • Workstation 8 (Core i5 / 16GB RAM)', updatedAt: new Date().toISOString() },
  { seatId: 'B-09', seatNumber: 'B-09', rowName: 'Row B', status: 'available', computerName: 'Workstation B-9', notes: 'Row B • Workstation 9 (Core i5 / 16GB RAM)', updatedAt: new Date().toISOString() },
];

export const STANDARD_12_HOURLY_BATCHES: Omit<Batch, 'id'>[] = [
  { batchId: 'BATCH-01', batchName: 'Batch 1 (08:00 AM - 09:00 AM)', courseId: 'ALL', courseName: 'All Lab Courses', startDate: '2026-01-01', endDate: '2026-12-31', daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], startTime: '08:00 AM', endTime: '09:00 AM', maxCapacity: 14, instructorName: 'Lab Faculty', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { batchId: 'BATCH-02', batchName: 'Batch 2 (09:00 AM - 10:00 AM)', courseId: 'ALL', courseName: 'All Lab Courses', startDate: '2026-01-01', endDate: '2026-12-31', daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], startTime: '09:00 AM', endTime: '10:00 AM', maxCapacity: 14, instructorName: 'Lab Faculty', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { batchId: 'BATCH-03', batchName: 'Batch 3 (10:00 AM - 11:00 AM)', courseId: 'ALL', courseName: 'All Lab Courses', startDate: '2026-01-01', endDate: '2026-12-31', daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], startTime: '10:00 AM', endTime: '11:00 AM', maxCapacity: 14, instructorName: 'Lab Faculty', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { batchId: 'BATCH-04', batchName: 'Batch 4 (11:00 AM - 12:00 PM)', courseId: 'ALL', courseName: 'All Lab Courses', startDate: '2026-01-01', endDate: '2026-12-31', daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], startTime: '11:00 AM', endTime: '12:00 PM', maxCapacity: 14, instructorName: 'Lab Faculty', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { batchId: 'BATCH-05', batchName: 'Batch 5 (12:00 PM - 01:00 PM)', courseId: 'ALL', courseName: 'All Lab Courses', startDate: '2026-01-01', endDate: '2026-12-31', daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], startTime: '12:00 PM', endTime: '01:00 PM', maxCapacity: 14, instructorName: 'Lab Faculty', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { batchId: 'BATCH-06', batchName: 'Batch 6 (01:00 PM - 02:00 PM)', courseId: 'ALL', courseName: 'All Lab Courses', startDate: '2026-01-01', endDate: '2026-12-31', daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], startTime: '01:00 PM', endTime: '02:00 PM', maxCapacity: 14, instructorName: 'Lab Faculty', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { batchId: 'BATCH-07', batchName: 'Batch 7 (02:00 PM - 03:00 PM)', courseId: 'ALL', courseName: 'All Lab Courses', startDate: '2026-01-01', endDate: '2026-12-31', daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], startTime: '02:00 PM', endTime: '03:00 PM', maxCapacity: 14, instructorName: 'Lab Faculty', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { batchId: 'BATCH-08', batchName: 'Batch 8 (03:00 PM - 04:00 PM)', courseId: 'ALL', courseName: 'All Lab Courses', startDate: '2026-01-01', endDate: '2026-12-31', daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], startTime: '03:00 PM', endTime: '04:00 PM', maxCapacity: 14, instructorName: 'Lab Faculty', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { batchId: 'BATCH-09', batchName: 'Batch 9 (04:00 PM - 05:00 PM)', courseId: 'ALL', courseName: 'All Lab Courses', startDate: '2026-01-01', endDate: '2026-12-31', daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], startTime: '04:00 PM', endTime: '05:00 PM', maxCapacity: 14, instructorName: 'Lab Faculty', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { batchId: 'BATCH-10', batchName: 'Batch 10 (05:00 PM - 06:00 PM)', courseId: 'ALL', courseName: 'All Lab Courses', startDate: '2026-01-01', endDate: '2026-12-31', daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], startTime: '05:00 PM', endTime: '06:00 PM', maxCapacity: 14, instructorName: 'Lab Faculty', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { batchId: 'BATCH-11', batchName: 'Batch 11 (06:00 PM - 07:00 PM)', courseId: 'ALL', courseName: 'All Lab Courses', startDate: '2026-01-01', endDate: '2026-12-31', daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], startTime: '06:00 PM', endTime: '07:00 PM', maxCapacity: 14, instructorName: 'Lab Faculty', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { batchId: 'BATCH-12', batchName: 'Batch 12 (07:00 PM - 08:00 PM)', courseId: 'ALL', courseName: 'All Lab Courses', startDate: '2026-01-01', endDate: '2026-12-31', daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], startTime: '07:00 PM', endTime: '08:00 PM', maxCapacity: 14, instructorName: 'Lab Faculty', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const defaultSettings: InstituteSettings = {
  id: 'general',
  instituteName: 'Tech Vision Computer Class',
  address: 'Shop No. 12-14, 2nd Floor, Shivalik Plaza, IIM Road, Panjrapole, Ahmedabad, Gujarat 380015',
  phone: '+91 98250 12345',
  email: 'info@techvisionahmedabad.in',
  website: 'techvisioncomputer.com',
  logoUrl: typeof window !== 'undefined' ? localStorage.getItem('tv_custom_logo') || '/icon.svg' : '/icon.svg',
  currency: '₹',
  totalSeats: 14,
  timezone: 'Asia/Kolkata',
  receiptPrefix: 'TV/2026/',
  tagline: 'IT Education • Creating IT professionals for the next generation',
  updatedAt: new Date().toISOString(),
};

const InstituteContext = createContext<InstituteContextType | undefined>(undefined);

export const InstituteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile, isAdmin } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [seats, setSeats] = useState<ComputerSeat[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [attendanceSheets, setAttendanceSheets] = useState<AttendanceSheet[]>([]);
  const [settings, setSettings] = useState<InstituteSettings>(defaultSettings);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<InstituteNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const isSyncingSeatsRef = useRef(false);
  const hasAutoResetRef = useRef(false);

  // Helper for audit logging
  const logAudit = async (action: string, targetEntity: string, targetId: string, details: string) => {
    try {
      const logEntry: Omit<AuditLog, 'id'> = {
        logId: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        action,
        performedByUid: currentUser?.uid || 'system',
        performedByName: userProfile?.displayName || currentUser?.email || 'System User',
        performedByRole: userProfile?.role || 'admin',
        targetEntity,
        targetId,
        details,
        timestamp: new Date().toISOString(),
      };
      await addDoc(collection(db, 'auditLogs'), logEntry);
    } catch (err) {
      console.warn("Audit log creation skipped:", err);
    }
  };

  // Sync Tech Vision 14-computer lab layout: Row A (5) & Row B (9)
  const sync14ComputerLayout = async (): Promise<void> => {
    try {
      const snap = await getDocs(collection(db, 'seats'));
      const existingSeats = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as ComputerSeat));

      // Remove legacy seats that do not match A-01..A-05 or B-01..B-09
      const validNumbers = new Set(TECH_VISION_14_SEATS.map((s) => s.seatNumber));
      for (const es of existingSeats) {
        if (!validNumbers.has(es.seatNumber) || !validNumbers.has(es.id)) {
          if (es.id && !validNumbers.has(es.id)) {
            await deleteDoc(doc(db, 'seats', es.id)).catch(() => {});
          }
          if (es.seatNumber && !validNumbers.has(es.seatNumber)) {
            await deleteDoc(doc(db, 'seats', es.seatNumber)).catch(() => {});
          }
        }
      }

      // Ensure all 14 seats are present
      for (const s of TECH_VISION_14_SEATS) {
        const found = existingSeats.find((e: ComputerSeat) => e.seatNumber === s.seatNumber);
        if (!found) {
          await setDoc(doc(db, 'seats', s.seatNumber), s);
        } else {
          await updateDoc(doc(db, 'seats', s.seatNumber), {
            rowName: s.rowName,
            computerName: s.computerName,
          }).catch(() => {});
        }
      }

      // Update general settings total seats to 14
      await setDoc(
        doc(db, 'instituteSettings', 'general'),
        {
          totalSeats: 14,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch(() => {});

      await logAudit(
        'LAB_LAYOUT_SYNC',
        'Lab',
        '14_SEATS',
        'Configured Tech Vision 14-PC lab layout: Row A (5 PCs) and Row B (9 PCs).'
      );
    } catch (err) {
      console.warn('Lab layout sync notice:', err);
    }
  };

  // Bootstrap initial 14 seats if collection is empty or contains legacy PC-XX seats
  const bootstrapSeatsIfEmpty = async (currentSeats: ComputerSeat[]) => {
    if (!currentUser || isSyncingSeatsRef.current) return;
    const validNumbers = new Set(TECH_VISION_14_SEATS.map((s) => s.seatNumber));
    const hasInvalidSeats = currentSeats.some((s) => !validNumbers.has(s.seatNumber));
    if (currentSeats.length !== 14 || hasInvalidSeats) {
      isSyncingSeatsRef.current = true;
      await sync14ComputerLayout();
      isSyncingSeatsRef.current = false;
    }
  };

  // Bootstrap initial courses if empty
  const bootstrapCoursesIfEmpty = async (currentCourses: Course[]) => {
    if (currentCourses.length === 0 && currentUser) {
      try {
        const initialCourses: Omit<Course, 'id'>[] = [
          { courseId: 'CCC', courseName: 'CCC (Course on Computer Concepts)', description: 'Government recognized basic IT & digital literacy course.', duration: '3 Months', standardFee: 3500, sessionsCount: 60, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { courseId: 'TALLY', courseName: 'Tally Prime with GST', description: 'Complete computerized accounting, GST filing, inventory & payroll.', duration: '3 Months', standardFee: 6500, sessionsCount: 60, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { courseId: 'BCC', courseName: 'Basic Computer Course & MS Office', description: 'Windows, Word, Excel, PowerPoint, Internet & Typing.', duration: '2 Months', standardFee: 4000, sessionsCount: 45, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { courseId: 'ADV_EXCEL', courseName: 'Advanced Excel & MIS Reporting', description: 'VLOOKUP, XLOOKUP, Pivot Tables, Macros, Power Query & Dashboards.', duration: '1.5 Months', standardFee: 5500, sessionsCount: 30, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { courseId: 'PYTHON', courseName: 'Python Programming Masterclass', description: 'Core Python, OOP, Data Structures, File Handling & Mini Projects.', duration: '3 Months', standardFee: 9000, sessionsCount: 60, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { courseId: 'WEB_DEV', courseName: 'Full Stack Web Development', description: 'HTML5, CSS3, Tailwind, JavaScript, React & Backend APIs.', duration: '6 Months', standardFee: 18000, sessionsCount: 120, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { courseId: 'SQL', courseName: 'SQL & MySQL Workbench', description: 'Database design, relational queries, joins, procedures & indexing.', duration: '2 Months', standardFee: 6000, sessionsCount: 40, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { courseId: 'POWER_BI', courseName: 'Power BI & Data Visualization', description: 'Data modeling, DAX formulas, interactive business reports & charts.', duration: '2 Months', standardFee: 8000, sessionsCount: 40, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { courseId: 'CPP', courseName: 'C & C++ Programming Fundamentals', description: 'Logic building, pointers, OOP paradigms, memory allocation.', duration: '3 Months', standardFee: 7500, sessionsCount: 50, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ];
        for (const c of initialCourses) {
          await setDoc(doc(db, 'courses', c.courseId), c);
        }
      } catch (err) {
        console.warn("Course bootstrap note:", err);
      }
    }
  };

  // Real-time Firestore subscriptions
  useEffect(() => {
    if (!currentUser) {
      setStudents([]);
      setEnquiries([]);
      setCourses([]);
      setBatches([]);
      setSeats([]);
      setPayments([]);
      setAttendanceSheets([]);
      setAuditLogs([]);
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Settings listener
    const unsubSettings = onSnapshot(doc(db, 'instituteSettings', 'general'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as InstituteSettings & { feesAndStudentsResetV1?: boolean };
        const resolvedLogo = data.logoUrl || localStorage.getItem('tv_custom_logo') || '/icon.svg';
        if (data.logoUrl) {
          localStorage.setItem('tv_custom_logo', data.logoUrl);
        }
        setSettings({
          ...defaultSettings,
          ...data,
          website: data.website || 'techvisioncomputer.com',
          logoUrl: resolvedLogo,
        });
        if (!data.feesAndStudentsResetV1 && !hasAutoResetRef.current) {
          hasAutoResetRef.current = true;
          resetAllStudentsAndFees().then(() => {
            setDoc(
              doc(db, 'instituteSettings', 'general'),
              { feesAndStudentsResetV1: true, updatedAt: new Date().toISOString() },
              { merge: true }
            ).catch(() => {});
          }).catch(() => {});
        }
      } else {
        hasAutoResetRef.current = true;
        setDoc(doc(db, 'instituteSettings', 'general'), {
          ...defaultSettings,
          feesAndStudentsResetV1: true,
        }).catch(() => {});
        resetAllStudentsAndFees().catch(() => {});
      }
    }, (error) => {
      console.warn("Settings fetch note:", error.message);
    });

    // 2. Students listener
    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
      setStudents(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'students');
    });

    // 3. Courses listener
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
      setCourses(list);
      bootstrapCoursesIfEmpty(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'courses');
    });

    // 4. Batches listener
    const unsubBatches = onSnapshot(collection(db, 'batches'), async (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Batch));
      list.sort((a, b) => a.batchId.localeCompare(b.batchId, undefined, { numeric: true }));
      setBatches(list);
      // Ensure the 12 standard 1-hour batches exist if batches collection is empty
      if (list.length === 0 && currentUser) {
        try {
          for (const b of STANDARD_12_HOURLY_BATCHES) {
            await setDoc(doc(db, 'batches', b.batchId), b);
          }
        } catch (err) {
          console.warn('Batch bootstrap note:', err);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'batches');
    });

    // 5. Seats listener
    const unsubSeats = onSnapshot(collection(db, 'seats'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ComputerSeat));
      list.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true }));
      setSeats(list);
      bootstrapSeatsIfEmpty(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'seats');
    });

    // 6. Payments listener
    const unsubPayments = onSnapshot(query(collection(db, 'feePayments'), orderBy('createdAt', 'desc'), limit(500)), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as FeePayment));
      setPayments(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'feePayments');
    });

    // 7. Attendance listener
    const unsubAttendance = onSnapshot(query(collection(db, 'attendance'), orderBy('date', 'desc'), limit(300)), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceSheet));
      setAttendanceSheets(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
    });

    // 8. Audit logs listener
    const unsubAudit = onSnapshot(query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(150)), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
      setAuditLogs(list);
      setLoading(false);
    }, (error) => {
      console.warn("Audit logs restricted:", error.message);
      setLoading(false);
    });

    // 9. Enquiries listener
    const unsubEnquiries = onSnapshot(collection(db, 'enquiries'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Enquiry));
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setEnquiries(list);
    }, (error) => {
      console.warn("Enquiries listener note:", error.message);
    });

    return () => {
      unsubSettings();
      unsubStudents();
      unsubCourses();
      unsubBatches();
      unsubSeats();
      unsubPayments();
      unsubAttendance();
      unsubAudit();
      unsubEnquiries();
    };
  }, [currentUser]);

  // Derived Notifications calculation
  useEffect(() => {
    const list: InstituteNotification[] = [];
    const today = getTodayDateString();

    // 1. Unmarked attendance today for active batches
    const activeBatches = batches.filter(b => b.status === 'active');
    const markedBatchIdsToday = new Set(attendanceSheets.filter(a => a.date === today).map(a => a.batchId));

    activeBatches.forEach(b => {
      if (!markedBatchIdsToday.has(b.batchId)) {
        list.push({
          id: `att_${b.batchId}_${today}`,
          notificationId: `att_${b.batchId}`,
          type: 'unmarked_attendance',
          title: `Attendance Pending: ${b.batchName}`,
          message: `Class attendance for ${b.batchName} (${b.startTime} - ${b.endTime}) has not been submitted yet today.`,
          relatedId: b.batchId,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    });

    // 2. 1-Month Fee Due Reminders for students with remaining fee
    const studentsWithRemainingFee = students.filter(
      s => s.status === 'active' && (s.outstandingBalance || 0) > 0
    );

    const oneMonthDueStudents = studentsWithRemainingFee.filter(s => {
      const info = getStudentFeeReminderInfo(s, payments, today);
      return info.isReminderDue;
    });

    // Add individual notification for each student whose 1-month fee reminder is due
    oneMonthDueStudents.forEach(s => {
      const info = getStudentFeeReminderInfo(s, payments, today);
      list.push({
        id: `fee_1mo_due_${s.studentId}_${today}`,
        notificationId: `fee_1mo_due_${s.studentId}`,
        type: 'fee_due',
        title: `1-Month Fee Reminder: ${s.fullName} (GR: ${s.grNo || s.studentId})`,
        message: `1 month completed since ${
          info.referenceType === 'last_payment' ? 'last payment' : 'admission'
        } (${formatDate(info.referenceDate)}). Remaining Fee: ${formatINR(
          s.outstandingBalance
        )} • Contact: ${s.mobile}`,
        relatedId: s.studentId,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    const upcomingReminderStudents = studentsWithRemainingFee.filter(s => {
      const info = getStudentFeeReminderInfo(s, payments, today);
      return !info.isReminderDue;
    });

    if (upcomingReminderStudents.length > 0) {
      list.push({
        id: `fee_pending_summary`,
        notificationId: `fee_pending`,
        type: 'fee_due',
        title: `${upcomingReminderStudents.length} Student(s) Scheduled for 1-Month Fee Reminder`,
        message: `Remaining fees are tracked and will trigger a 1-month reminder alert exactly 1 month after admission or last payment.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Low seat availability
    const availableSeatsCount = seats.filter(s => s.status === 'available').length;
    if (seats.length > 0 && availableSeatsCount <= 3) {
      list.push({
        id: `low_seats_${availableSeatsCount}`,
        notificationId: `low_seats`,
        type: 'low_seats',
        title: `Low Lab Availability: ${availableSeatsCount} Seat(s) Left`,
        message: `Computer workstations are nearing full lab capacity (14 PCs total: 5 Row A, 9 Row B).`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    // 4. Pending Enquiry Follow-ups
    const dueFollowUps = enquiries.filter(
      e => (e.status === 'new' || e.status === 'follow_up' || e.status === 'demo_scheduled') && e.followUpDate && e.followUpDate <= today
    );
    if (dueFollowUps.length > 0) {
      list.push({
        id: `enq_followup_${today}`,
        notificationId: `enq_followup`,
        type: 'enquiry_followup',
        title: `${dueFollowUps.length} Enquiry Follow-up(s) Due`,
        message: `Prospective students have follow-ups scheduled for today or earlier. Check the Enquiries tab.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    setNotifications(list);
  }, [batches, attendanceSheets, students, seats, enquiries, payments]);

  // Helper to resolve a student from local state or directly from Firestore if state hasn't synced yet
  const resolveStudent = async (idOrStudentId: string): Promise<Student | null> => {
    if (!idOrStudentId) return null;
    const local = students.find(s => s.id === idOrStudentId || s.studentId === idOrStudentId);
    if (local) return local;

    try {
      const directSnap = await getDoc(doc(db, 'students', idOrStudentId));
      if (directSnap.exists()) {
        return { id: directSnap.id, ...(directSnap.data() as Omit<Student, 'id'>) };
      }
    } catch {
      // Ignore and try collection scan
    }

    try {
      const allSnap = await getDocs(collection(db, 'students'));
      const matched = allSnap.docs.find(
        d => d.id === idOrStudentId || d.data().studentId === idOrStudentId
      );
      if (matched) {
        return { id: matched.id, ...(matched.data() as Omit<Student, 'id'>) };
      }
    } catch {
      // Ignore
    }

    return null;
  };

  // Student operations
  const addStudent = async (
    data: Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'paidAmount' | 'outstandingBalance'> & {
      paidAmount?: number;
    }
  ): Promise<string> => {
    const now = new Date().toISOString();
    const discount = data.discount || 0;
    const netPayable = Math.max(0, data.totalCourseFee - discount);
    const initialPaid = Math.max(0, Number(data.paidAmount || 0));
    const outstandingBalance = Math.max(0, netPayable - initialPaid);

    // Use provided GR.No / studentId or auto-generate e.g. GR-101
    const count = students.length + 1;
    const rawGrNo = (data.grNo || data.studentId || '').trim();
    const studentId = rawGrNo || `GR-${String(100 + count)}`;
    const grNo = studentId;

    // If workstation is assigned, check if another active student in the SAME 1-hour batch already occupies it
    if (data.assignedSeatId && data.batchId) {
      const conflict = students.find(
        s =>
          s.status === 'active' &&
          s.assignedSeatId === data.assignedSeatId &&
          s.batchId === data.batchId
      );
      if (conflict) {
        throw new Error(
          `Workstation ${data.assignedSeatId} is already assigned to ${conflict.fullName} (GR.No: ${conflict.grNo || conflict.studentId}) during ${data.batchName || data.batchId}. Each workstation supports 1 student per 1-hour batch.`
        );
      }
    }

    const isCompleted = data.courseCompleted ?? data.status === 'completed';
    const effectiveAdmissionDate = data.admissionDate || getTodayDateString();
    const feeReminderDate =
      outstandingBalance > 0
        ? data.feeReminderDate || addOneMonthToDateString(effectiveAdmissionDate)
        : '';

    const newStudent: Omit<Student, 'id'> = {
      ...data,
      studentId,
      grNo,
      admissionDate: effectiveAdmissionDate,
      discount,
      netPayable,
      paidAmount: initialPaid,
      outstandingBalance,
      feeReminderDate,
      courseCompleted: isCompleted,
      certificateIssued: Boolean(data.certificateIssued),
      status: isCompleted ? 'completed' : (data.status || 'active'),
      createdAt: now,
      updatedAt: now,
    };

    try {
      const docRef = await addDoc(collection(db, 'students'), newStudent);

      // If initial fee paid > 0, also create a FeePayment receipt in feePayments
      if (initialPaid > 0) {
        const receiptCount = payments.length + 1;
        const receiptNo = `${settings.receiptPrefix || 'TV/2026/'}${String(receiptCount).padStart(4, '0')}`;
        const initialReceipt: Omit<FeePayment, 'id'> = {
          paymentId: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          receiptNo,
          studentId,
          studentName: data.fullName,
          amount: initialPaid,
          paymentMethod: 'cash',
          transactionRef: '',
          paymentDate: data.admissionDate || getTodayDateString(),
          recordedByStaffId: currentUser?.uid || 'staff',
          recordedByStaffName: userProfile?.displayName || 'Authorized Staff',
          remarks: 'Admission Fee Payment',
          isReversal: false,
          createdAt: now,
        };
        await addDoc(collection(db, 'feePayments'), initialReceipt);
      }

      // If seat assigned and student is active, update the seat record
      if (data.assignedSeatId && !isCompleted) {
        const seatObj =
          seats.find(s => s.seatNumber === data.assignedSeatId || s.seatId === data.assignedSeatId) ||
          TECH_VISION_14_SEATS.find(s => s.seatNumber === data.assignedSeatId || s.seatId === data.assignedSeatId);
        const targetSeatNumber = seatObj ? seatObj.seatNumber : data.assignedSeatId;

        await setDoc(
          doc(db, 'seats', targetSeatNumber),
          {
            ...(seatObj || {
              seatId: targetSeatNumber,
              seatNumber: targetSeatNumber,
              rowName: targetSeatNumber.startsWith('A') ? 'Row A' : 'Row B',
            }),
            status: 'occupied',
            assignedStudentId: studentId,
            assignedStudentName: data.fullName,
            assignedCourseId: data.courseId,
            assignedBatchId: data.batchId || '',
            updatedAt: now,
          },
          { merge: true }
        );
      }

      await logAudit(
        'STUDENT_ADMISSION',
        'Student',
        studentId,
        `Admitted student "${data.fullName}" (GR.No: ${grNo}) in course "${data.courseName}" (${data.batchName || 'General'}, Fee: ₹${netPayable})`
      );

      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'students');
    }
  };

  const updateStudent = async (id: string, data: Partial<Student>): Promise<void> => {
    try {
      const current = await resolveStudent(id);
      if (!current) throw new Error("Student not found");

      const totalFee = data.totalCourseFee ?? current.totalCourseFee;
      const discount = data.discount ?? current.discount;
      const netPayable = Math.max(0, totalFee - discount);
      const paidAmount = data.paidAmount ?? current.paidAmount;
      const outstandingBalance = Math.max(0, netPayable - paidAmount);

      const newGrNo = data.grNo !== undefined ? data.grNo.trim() : (data.studentId !== undefined ? data.studentId.trim() : (current.grNo || current.studentId));
      const newStatus = data.status ?? (data.courseCompleted === true ? 'completed' : current.status);
      const isCourseCompleted = data.courseCompleted !== undefined ? data.courseCompleted : newStatus === 'completed';

      const targetBatchId = data.batchId !== undefined ? data.batchId : current.batchId;
      const targetSeatId = isCourseCompleted ? '' : (data.assignedSeatId !== undefined ? data.assignedSeatId : current.assignedSeatId);

      // Check hourly batch seat conflict if seat or batch changed
      if (targetSeatId && targetBatchId && newStatus === 'active') {
        const conflict = students.find(
          s =>
            s.id !== current.id &&
            s.status === 'active' &&
            s.assignedSeatId === targetSeatId &&
            s.batchId === targetBatchId
        );
        if (conflict) {
          throw new Error(
            `Workstation ${targetSeatId} is already assigned to ${conflict.fullName} (GR.No: ${conflict.grNo || conflict.studentId}) in this 1-hour batch.`
          );
        }
      }

      const updatedFields: Partial<Student> = {
        ...data,
        studentId: newGrNo || current.studentId,
        grNo: newGrNo || current.grNo || current.studentId,
        status: newStatus,
        courseCompleted: isCourseCompleted,
        assignedSeatId: targetSeatId,
        netPayable,
        paidAmount,
        outstandingBalance,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'students', current.id), updatedFields);

      // Handle seat change if altered
      if (targetSeatId !== current.assignedSeatId) {
        if (current.assignedSeatId) {
          await releaseSeat(current.assignedSeatId, current.studentId);
        }
        if (targetSeatId) {
          await assignSeat(targetSeatId, newGrNo || current.studentId);
        }
      }

      await logAudit('STUDENT_UPDATE', 'Student', newGrNo || current.studentId, `Updated profile for "${current.fullName}"`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `students/${id}`);
    }
  };

  const deleteStudent = async (id: string, reason = 'Archived'): Promise<void> => {
    try {
      const current = students.find(s => s.id === id);
      if (!current) return;

      // Release seat if assigned
      if (current.assignedSeatId) {
        await releaseSeat(current.assignedSeatId);
      }

      // Safe archive instead of destructive hard delete
      await updateDoc(doc(db, 'students', id), {
        status: 'inactive',
        internalNotes: `${current.internalNotes || ''}\n[Archived on ${new Date().toLocaleDateString()}: ${reason}]`,
        updatedAt: new Date().toISOString(),
      });

      await logAudit('STUDENT_ARCHIVE', 'Student', current.studentId, `Archived student "${current.fullName}". Reason: ${reason}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `students/${id}`);
    }
  };

  const markCourseCompleted = async (id: string): Promise<void> => {
    try {
      const current = await resolveStudent(id);
      if (!current) return;

      // Release seat for this student's 1-hour batch so other students can use the computer
      if (current.assignedSeatId) {
        await releaseSeat(current.assignedSeatId, current.studentId);
      }

      await updateDoc(doc(db, 'students', current.id), {
        status: 'completed',
        courseCompleted: true,
        assignedSeatId: '',
        updatedAt: new Date().toISOString(),
      });

      await logAudit(
        'COURSE_COMPLETED',
        'Student',
        current.grNo || current.studentId,
        `Marked course completed for student "${current.fullName}". Released workstation for their batch.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `students/${id}`);
    }
  };

  const permanentDeleteStudent = async (id: string): Promise<void> => {
    try {
      const current = students.find(s => s.id === id);
      if (!current) return;

      // Release seat if assigned
      if (current.assignedSeatId) {
        await releaseSeat(current.assignedSeatId);
      }

      // Delete from Firestore
      await deleteDoc(doc(db, 'students', id));

      await logAudit(
        'STUDENT_PERMANENT_DELETE',
        'Student',
        current.studentId,
        `Permanently deleted record for "${current.fullName}" (${current.studentId})`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `students/${id}`);
    }
  };

  // Enquiry operations
  const addEnquiry = async (
    data: Omit<Enquiry, 'id' | 'enquiryId' | 'createdAt' | 'updatedAt'> & { enquiryId?: string }
  ): Promise<string> => {
    const now = new Date().toISOString();
    const year = new Date().getFullYear();
    const count = enquiries.length + 1;
    const enquiryId = data.enquiryId || `ENQ-${year}-${String(count).padStart(3, '0')}`;

    const newEnquiry: Omit<Enquiry, 'id'> = {
      ...data,
      enquiryId,
      handledByName: data.handledByName || userProfile?.displayName || currentUser?.email || 'Counselor',
      createdAt: now,
      updatedAt: now,
    };

    try {
      const docRef = await addDoc(collection(db, 'enquiries'), newEnquiry);
      await logAudit(
        'ENQUIRY_CREATED',
        'Enquiry',
        enquiryId,
        `Recorded course enquiry for "${data.fullName}" (${data.courseName})`
      );
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'enquiries');
    }
  };

  const updateEnquiry = async (id: string, data: Partial<Enquiry>): Promise<void> => {
    try {
      await updateDoc(doc(db, 'enquiries', id), {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      await logAudit('ENQUIRY_UPDATED', 'Enquiry', id, `Updated enquiry record (${data.status || 'details'})`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `enquiries/${id}`);
    }
  };

  const deleteEnquiry = async (id: string): Promise<void> => {
    try {
      const target = enquiries.find(e => e.id === id);
      await deleteDoc(doc(db, 'enquiries', id));
      await logAudit(
        'ENQUIRY_DELETED',
        'Enquiry',
        target?.enquiryId || id,
        `Removed enquiry record for "${target?.fullName || id}"`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `enquiries/${id}`);
    }
  };

  const convertEnquiryToStudent = async (
    enquiryDocId: string,
    admissionDetails: {
      batchId?: string;
      batchName?: string;
      assignedSeatId?: string;
      totalCourseFee: number;
      discount: number;
      initialPayment?: number;
      paymentMethod?: FeePayment['paymentMethod'];
    }
  ): Promise<string> => {
    const enq = enquiries.find(e => e.id === enquiryDocId);
    if (!enq) throw new Error('Enquiry record not found');

    const today = getTodayDateString();
    const year = new Date().getFullYear();
    const count = students.length + 1;
    const studentId = `TV-${year}-${String(count).padStart(3, '0')}`;

    const studentDocId = await addStudent({
      studentId,
      fullName: enq.fullName,
      mobile: enq.mobile,
      email: enq.email || '',
      address: enq.address || '',
      emergencyContact: enq.alternatePhone || '',
      courseId: enq.courseId,
      courseName: enq.courseName,
      batchId: admissionDetails.batchId || '',
      batchName: admissionDetails.batchName || '',
      admissionDate: today,
      startDate: today,
      totalCourseFee: admissionDetails.totalCourseFee,
      discount: admissionDetails.discount || 0,
      netPayable: Math.max(0, admissionDetails.totalCourseFee - (admissionDetails.discount || 0)),
      assignedSeatId: admissionDetails.assignedSeatId || '',
      status: 'active',
      internalNotes: `Converted from Enquiry ${enq.enquiryId}. ${enq.notes || ''}`.trim(),
    });

    if (admissionDetails.initialPayment && admissionDetails.initialPayment > 0) {
      const now = new Date().toISOString();
      const receiptCount = payments.length + 1;
      const receiptNo = `${settings.receiptPrefix || 'TV/2026/'}${String(receiptCount).padStart(4, '0')}`;
      const netPayable = Math.max(0, admissionDetails.totalCourseFee - (admissionDetails.discount || 0));

      const newPayment: Omit<FeePayment, 'id'> = {
        paymentId: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        receiptNo,
        studentId,
        studentName: enq.fullName,
        amount: admissionDetails.initialPayment,
        paymentMethod: admissionDetails.paymentMethod || 'cash',
        transactionRef: '',
        paymentDate: today,
        recordedByStaffId: currentUser?.uid || 'staff',
        recordedByStaffName: userProfile?.displayName || 'Authorized Staff',
        remarks: `Admission fee upon conversion from Enquiry ${enq.enquiryId}`,
        isReversal: false,
        createdAt: now,
      };
      await addDoc(collection(db, 'feePayments'), newPayment);
      await updateDoc(doc(db, 'students', studentDocId), {
        paidAmount: admissionDetails.initialPayment,
        outstandingBalance: Math.max(0, netPayable - admissionDetails.initialPayment),
        updatedAt: now,
      });
    }

    await updateDoc(doc(db, 'enquiries', enquiryDocId), {
      status: 'converted',
      convertedStudentId: studentId,
      updatedAt: new Date().toISOString(),
    });

    await logAudit(
      'ENQUIRY_CONVERTED',
      'Enquiry',
      enq.enquiryId,
      `Converted enquiry ${enq.enquiryId} (${enq.fullName}) into active Student ${studentId}`
    );

    return studentId;
  };

  // Course operations
  const addCourse = async (courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    try {
      const now = new Date().toISOString();
      const course: Omit<Course, 'id'> = {
        ...courseData,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, 'courses', courseData.courseId), course);
      await logAudit('COURSE_CREATE', 'Course', courseData.courseId, `Created course: ${courseData.courseName}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'courses');
    }
  };

  const updateCourse = async (id: string, courseData: Partial<Course>): Promise<void> => {
    try {
      await updateDoc(doc(db, 'courses', id), {
        ...courseData,
        updatedAt: new Date().toISOString(),
      });
      await logAudit('COURSE_UPDATE', 'Course', id, `Updated course: ${id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `courses/${id}`);
    }
  };

  const deleteCourse = async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'courses', id));
      await logAudit('COURSE_DELETE', 'Course', id, `Deleted course: ${id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `courses/${id}`);
    }
  };

  // Batch operations
  const addBatch = async (batchData: Omit<Batch, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    try {
      const now = new Date().toISOString();
      const batch: Omit<Batch, 'id'> = {
        ...batchData,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, 'batches', batchData.batchId), batch);
      await logAudit('BATCH_CREATE', 'Batch', batchData.batchId, `Created batch: ${batchData.batchName}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'batches');
    }
  };

  const updateBatch = async (id: string, batchData: Partial<Batch>): Promise<void> => {
    try {
      await updateDoc(doc(db, 'batches', id), {
        ...batchData,
        updatedAt: new Date().toISOString(),
      });
      await logAudit('BATCH_UPDATE', 'Batch', id, `Updated batch: ${id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `batches/${id}`);
    }
  };

  const deleteBatch = async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'batches', id));
      await logAudit('BATCH_DELETE', 'Batch', id, `Deleted batch: ${id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `batches/${id}`);
    }
  };

  // Fee Payment Operations
  const recordFeePayment = async (
    studentId: string,
    amount: number,
    paymentMethod: FeePayment['paymentMethod'],
    transactionRef = '',
    remarks = ''
  ): Promise<FeePayment> => {
    if (amount <= 0) throw new Error("Payment amount must be greater than zero.");

    const student = await resolveStudent(studentId);
    if (!student) throw new Error("Student not found.");

    const now = new Date().toISOString();
    const receiptCount = payments.length + 1;
    const year = new Date().getFullYear();
    const receiptNo = `${settings.receiptPrefix || 'TV/2026/'}${String(receiptCount).padStart(4, '0')}`;

    const newPayment: Omit<FeePayment, 'id'> = {
      paymentId: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      receiptNo,
      studentId: student.studentId,
      studentName: student.fullName,
      amount,
      paymentMethod,
      transactionRef,
      paymentDate: getTodayDateString(),
      recordedByStaffId: currentUser?.uid || 'staff',
      recordedByStaffName: userProfile?.displayName || 'Authorized Staff',
      remarks,
      isReversal: false,
      createdAt: now,
    };

    try {
      const docRef = await addDoc(collection(db, 'feePayments'), newPayment);

      // Update student's paidAmount & outstandingBalance atomically, and set next 1-month reminder if balance remains
      const updatedPaid = (student.paidAmount || 0) + amount;
      const updatedOutstanding = Math.max(0, student.netPayable - updatedPaid);
      const nextReminderDate =
        updatedOutstanding > 0 ? addOneMonthToDateString(getTodayDateString()) : '';

      await updateDoc(doc(db, 'students', student.id), {
        paidAmount: updatedPaid,
        outstandingBalance: updatedOutstanding,
        feeReminderDate: nextReminderDate,
        updatedAt: now,
      });

      await logAudit(
        'FEE_PAYMENT_RECORDED',
        'FeePayment',
        receiptNo,
        `Collected ₹${amount} (${paymentMethod.toUpperCase()}) from ${student.fullName}. Receipt: ${receiptNo}`
      );

      return { id: docRef.id, ...newPayment };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'feePayments');
    }
  };

  // Financial safety: Reversal record instead of destructive delete
  const reverseFeePayment = async (paymentId: string, studentId: string, amount: number, reason: string): Promise<void> => {
    try {
      const targetPayment = payments.find(p => p.id === paymentId || p.paymentId === paymentId);
      if (!targetPayment) throw new Error("Payment not found");
      if (targetPayment.isReversal) throw new Error("This payment has already been reversed.");

      const student = await resolveStudent(studentId);
      if (!student) throw new Error("Student record not found");

      // Mark payment doc as reversed
      await updateDoc(doc(db, 'feePayments', targetPayment.id), {
        isReversal: true,
        reversalReason: reason,
        updatedAt: new Date().toISOString(),
      });

      // Recalculate student balance
      const newPaid = Math.max(0, (student.paidAmount || 0) - amount);
      const newOutstanding = Math.max(0, student.netPayable - newPaid);

      await updateDoc(doc(db, 'students', student.id), {
        paidAmount: newPaid,
        outstandingBalance: newOutstanding,
        updatedAt: new Date().toISOString(),
      });

      await logAudit(
        'FEE_PAYMENT_REVERSED',
        'FeePayment',
        targetPayment.receiptNo,
        `Reversed receipt ${targetPayment.receiptNo} of ₹${amount}. Reason: ${reason}`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `feePayments/${paymentId}`);
    }
  };

  // Permanently delete a single fee payment record from history and adjust student balance
  const deleteFeePayment = async (paymentId: string): Promise<void> => {
    try {
      const targetPayment = payments.find(p => p.id === paymentId || p.paymentId === paymentId);
      if (!targetPayment) return;

      if (!targetPayment.isReversal) {
        const student = students.find(s => s.studentId === targetPayment.studentId);
        if (student) {
          const newPaid = Math.max(0, (student.paidAmount || 0) - targetPayment.amount);
          const newOutstanding = Math.max(0, student.netPayable - newPaid);
          await updateDoc(doc(db, 'students', student.id), {
            paidAmount: newPaid,
            outstandingBalance: newOutstanding,
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        }
      }

      await deleteDoc(doc(db, 'feePayments', targetPayment.id));
      await logAudit(
        'FEE_PAYMENT_DELETED',
        'FeePayment',
        targetPayment.receiptNo,
        `Deleted fee payment receipt ${targetPayment.receiptNo} (₹${targetPayment.amount}) from fee history.`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `feePayments/${paymentId}`);
    }
  };

  // Delete all fee collection history and reset all existing students' paid fees to 0
  const clearAllFeeHistoryAndResetBalances = async (): Promise<void> => {
    try {
      const now = new Date().toISOString();

      // 1. Delete all feePayments documents
      const paySnap = await getDocs(collection(db, 'feePayments'));
      for (const d of paySnap.docs) {
        await deleteDoc(doc(db, 'feePayments', d.id));
      }

      // 2. Reset all students' paidAmount to 0 and outstandingBalance to netPayable
      const stuSnap = await getDocs(collection(db, 'students'));
      for (const d of stuSnap.docs) {
        const sData = d.data() as Student;
        const netPayable = Math.max(0, (sData.totalCourseFee || 0) - (sData.discount || 0));
        await updateDoc(doc(db, 'students', d.id), {
          paidAmount: 0,
          netPayable,
          outstandingBalance: netPayable,
          updatedAt: now,
        });
      }

      await logAudit(
        'FEE_HISTORY_RESET',
        'FeePayment',
        'ALL',
        'Deleted all recent fee collections and fee history; reset all student fee balances to ₹0 paid.'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'feePayments');
    }
  };

  // Full reset: Delete all fee payments, delete all students, clear attendance, and free all 14 computer seats
  const resetAllStudentsAndFees = async (): Promise<void> => {
    try {
      const now = new Date().toISOString();

      // 1. Delete all feePayments documents
      const paySnap = await getDocs(collection(db, 'feePayments'));
      for (const d of paySnap.docs) {
        await deleteDoc(doc(db, 'feePayments', d.id)).catch(() => {});
      }

      // 2. Delete all students documents
      const stuSnap = await getDocs(collection(db, 'students'));
      for (const d of stuSnap.docs) {
        await deleteDoc(doc(db, 'students', d.id)).catch(() => {});
      }

      // 3. Delete all attendance documents
      const attSnap = await getDocs(collection(db, 'attendance'));
      for (const d of attSnap.docs) {
        await deleteDoc(doc(db, 'attendance', d.id)).catch(() => {});
      }

      // 4. Reset all 14 computer seats to available
      const seatSnap = await getDocs(collection(db, 'seats'));
      const validNumbers = new Set(TECH_VISION_14_SEATS.map((s) => s.seatNumber));
      for (const d of seatSnap.docs) {
        if (!validNumbers.has(d.id)) {
          await deleteDoc(doc(db, 'seats', d.id)).catch(() => {});
        }
      }
      for (const s of TECH_VISION_14_SEATS) {
        await setDoc(doc(db, 'seats', s.seatNumber), {
          ...s,
          status: 'available',
          assignedStudentId: '',
          assignedStudentName: '',
          assignedCourseId: '',
          assignedBatchId: '',
          updatedAt: now,
        }).catch(() => {});
      }

      await logAudit(
        'STUDENTS_AND_FEES_RESET',
        'System',
        'ALL',
        'Reset all students, deleted all fee collection history, and released all 14 computer workstations.'
      );
    } catch (err) {
      console.error('Error resetting students and fees:', err);
      throw err;
    }
  };

  // Attendance operations
  const saveAttendance = async (
    date: string,
    courseId: string,
    batchId: string,
    records: AttendanceRecordItem[]
  ): Promise<void> => {
    try {
      const now = new Date().toISOString();
      const attendanceId = `att_${batchId}_${date.replace(/-/g, '')}`;

      const sheet: Omit<AttendanceSheet, 'id'> = {
        attendanceId,
        date,
        courseId,
        batchId,
        records,
        markedByStaffId: currentUser?.uid || 'staff',
        markedByStaffName: userProfile?.displayName || 'Instructor',
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'attendance', attendanceId), sheet);

      await logAudit(
        'ATTENDANCE_MARKED',
        'Attendance',
        attendanceId,
        `Submitted attendance for batch ${batchId} on ${date} (${records.length} students roll marked)`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'attendance');
    }
  };

  // Seat Management operations (Supports 12 hourly batches per workstation — 1 hour per student)
  const assignSeat = async (seatNumberOrId: string, studentId: string): Promise<void> => {
    try {
      const student = await resolveStudent(studentId);
      if (!student) throw new Error("Student not found");

      const seat =
        seats.find(s => s.seatNumber === seatNumberOrId || s.seatId === seatNumberOrId) ||
        TECH_VISION_14_SEATS.find(s => s.seatNumber === seatNumberOrId || s.seatId === seatNumberOrId);
      if (!seat) throw new Error(`Workstation ${seatNumberOrId} not found`);

      // Prevent conflict ONLY if another active student in the SAME 1-hour batch is already assigned to this workstation
      if (student.batchId) {
        const conflictingStudent = students.find(
          s =>
            s.status === 'active' &&
            s.id !== student.id &&
            s.studentId !== student.studentId &&
            s.assignedSeatId === seat.seatNumber &&
            s.batchId === student.batchId
        );
        if (conflictingStudent) {
          throw new Error(
            `Workstation ${seat.seatNumber} is already occupied by ${conflictingStudent.fullName} (GR.No: ${conflictingStudent.grNo || conflictingStudent.studentId}) during ${student.batchName || student.batchId}. Each workstation can have 1 student per 1-hour batch (up to 12 batches/day).`
          );
        }
      }

      // If student was on another seat, update old seat status if no other active students remain on it
      if (student.assignedSeatId && student.assignedSeatId !== seat.seatNumber) {
        const otherStudentsOnOldSeat = students.filter(
          s =>
            s.status === 'active' &&
            s.id !== student.id &&
            s.assignedSeatId === student.assignedSeatId
        );
        const oldSeat = seats.find(s => s.seatNumber === student.assignedSeatId);
        if (oldSeat) {
          const nextStudent = otherStudentsOnOldSeat[0];
          await setDoc(
            doc(db, 'seats', oldSeat.seatNumber),
            {
              status: nextStudent ? 'occupied' : 'available',
              assignedStudentId: nextStudent ? nextStudent.studentId : '',
              assignedStudentName: nextStudent ? nextStudent.fullName : '',
              assignedCourseId: nextStudent ? nextStudent.courseId : '',
              assignedBatchId: nextStudent ? (nextStudent.batchId || '') : '',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      }

      // Occupy new seat
      await setDoc(
        doc(db, 'seats', seat.seatNumber),
        {
          seatId: seat.seatId,
          seatNumber: seat.seatNumber,
          rowName: seat.rowName || (seat.seatNumber.startsWith('A') ? 'Row A' : 'Row B'),
          status: 'occupied',
          assignedStudentId: student.studentId,
          assignedStudentName: student.fullName,
          assignedCourseId: student.courseId,
          assignedBatchId: student.batchId || '',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Update student profile with assigned seat
      await updateDoc(doc(db, 'students', student.id), {
        assignedSeatId: seat.seatNumber,
        updatedAt: new Date().toISOString(),
      });

      await logAudit(
        'SEAT_ASSIGNED',
        'Seat',
        seat.seatNumber,
        `Assigned ${seat.seatNumber} to ${student.fullName} (${student.batchName || '1-Hour Batch'})`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `seats/${seatNumberOrId}`);
    }
  };

  const releaseSeat = async (seatNumberOrId: string, specificStudentId?: string): Promise<void> => {
    try {
      const seat =
        seats.find(s => s.seatNumber === seatNumberOrId || s.seatId === seatNumberOrId) ||
        TECH_VISION_14_SEATS.find(s => s.seatNumber === seatNumberOrId || s.seatId === seatNumberOrId);
      if (!seat) return;

      const targetStudentId = specificStudentId || seat.assignedStudentId;

      if (targetStudentId) {
        const student = await resolveStudent(targetStudentId);
        if (student) {
          await updateDoc(doc(db, 'students', student.id), {
            assignedSeatId: '',
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Check if any other active students in other 1-hour batches are still assigned to this workstation
      const remainingStudents = students.filter(
        s =>
          s.status === 'active' &&
          s.assignedSeatId === seat.seatNumber &&
          s.studentId !== targetStudentId &&
          s.id !== targetStudentId
      );

      const nextActive = remainingStudents[0];

      await setDoc(
        doc(db, 'seats', seat.seatNumber),
        {
          status: nextActive ? 'occupied' : 'available',
          assignedStudentId: nextActive ? nextActive.studentId : '',
          assignedStudentName: nextActive ? nextActive.fullName : '',
          assignedCourseId: nextActive ? nextActive.courseId : '',
          assignedBatchId: nextActive ? (nextActive.batchId || '') : '',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await logAudit('SEAT_RELEASED', 'Seat', seat.seatNumber, `Released workstation ${seat.seatNumber}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `seats/${seatNumberOrId}`);
    }
  };

  const updateSeatNotes = async (seatNumber: string, notes: string, status?: ComputerSeat['status']): Promise<void> => {
    try {
      const payload: Partial<ComputerSeat> = {
        notes,
        updatedAt: new Date().toISOString(),
      };
      if (status) payload.status = status;
      await updateDoc(doc(db, 'seats', seatNumber), payload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `seats/${seatNumber}`);
    }
  };

  // Settings
  const updateSettings = async (newSettings: Partial<InstituteSettings>): Promise<void> => {
    try {
      const merged = { ...settings, ...newSettings, updatedAt: new Date().toISOString() };
      await setDoc(doc(db, 'instituteSettings', 'general'), merged);
      setSettings(merged);
      await logAudit('SETTINGS_UPDATE', 'Settings', 'general', 'Updated institute configuration');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'instituteSettings/general');
    }
  };

  const markNotificationRead = async (notificationId: string): Promise<void> => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
  };

  // DEMO DATA GENERATOR (Fictional, clearly marked records with safe 1-click removal)
  const loadDemoData = async (): Promise<void> => {
    try {
      const now = new Date().toISOString();
      const today = getTodayDateString();

      // 1. Fictional Batches
      const demoBatches: Omit<Batch, 'id'>[] = [
        {
          batchId: 'BATCH_MORN_EXCEL',
          batchName: 'Morning Advanced Excel & MIS',
          courseId: 'ADV_EXCEL',
          courseName: 'Advanced Excel & MIS Reporting',
          startDate: '2026-09-01',
          endDate: '2026-10-15',
          daysOfWeek: ['Mon', 'Wed', 'Fri'],
          startTime: '08:30 AM',
          endTime: '10:00 AM',
          maxCapacity: 12,
          instructorStaffId: currentUser?.uid,
          instructorName: 'Hardik Shah',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        },
        {
          batchId: 'BATCH_AFTN_PYTHON',
          batchName: 'Afternoon Python & AI Basics',
          courseId: 'PYTHON',
          courseName: 'Python Programming Masterclass',
          startDate: '2026-08-15',
          endDate: '2026-11-15',
          daysOfWeek: ['Tue', 'Thu', 'Sat'],
          startTime: '02:00 PM',
          endTime: '03:30 PM',
          maxCapacity: 15,
          instructorStaffId: currentUser?.uid,
          instructorName: 'Priya Joshi',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        },
        {
          batchId: 'BATCH_EVE_WEBDEV',
          batchName: 'Evening Full Stack Web Dev',
          courseId: 'WEB_DEV',
          courseName: 'Full Stack Web Development',
          startDate: '2026-07-01',
          endDate: '2026-12-31',
          daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          startTime: '06:00 PM',
          endTime: '07:30 PM',
          maxCapacity: 14,
          instructorStaffId: currentUser?.uid,
          instructorName: 'Amit Trivedi',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        }
      ];

      for (const b of demoBatches) {
        await setDoc(doc(db, 'batches', b.batchId), b);
      }

      // 2. Fictional Students (Ahmedabad locality names)
      const demoStudents: Omit<Student, 'id'>[] = [
        {
          studentId: 'TV-2026-001',
          fullName: 'Aarav Patel',
          mobile: '9825123456',
          email: 'aarav.patel.demo@gmail.com',
          address: '42, Shubh Residency, Navrangpura, Ahmedabad',
          emergencyContact: '9825199999 (Father)',
          courseId: 'ADV_EXCEL',
          courseName: 'Advanced Excel & MIS Reporting',
          batchId: 'BATCH_MORN_EXCEL',
          batchName: 'Morning Advanced Excel & MIS',
          admissionDate: '2026-09-02',
          startDate: '2026-09-03',
          expectedEndDate: '2026-10-18',
          totalCourseFee: 5500,
          discount: 500,
          netPayable: 5000,
          paidAmount: 5000,
          outstandingBalance: 0,
          assignedSeatId: 'A-01',
          status: 'active',
          internalNotes: 'Corporate employee at SG Highway. Very punctual.',
          isDemo: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          studentId: 'TV-2026-002',
          fullName: 'Diya Shah',
          mobile: '9879012345',
          email: 'diya.shah.demo@gmail.com',
          address: 'B-203, Nilkanth Flats, Naranpura, Ahmedabad',
          emergencyContact: '9879055555 (Mother)',
          courseId: 'PYTHON',
          courseName: 'Python Programming Masterclass',
          batchId: 'BATCH_AFTN_PYTHON',
          batchName: 'Afternoon Python & AI Basics',
          admissionDate: '2026-08-16',
          startDate: '2026-08-18',
          expectedEndDate: '2026-11-20',
          totalCourseFee: 9000,
          discount: 1000,
          netPayable: 8000,
          paidAmount: 4000,
          outstandingBalance: 4000,
          assignedSeatId: 'A-02',
          status: 'active',
          internalNotes: 'College student at Gujarat University. Preparing for IT placements.',
          isDemo: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          studentId: 'TV-2026-003',
          fullName: 'Keval Mehta',
          mobile: '9909234567',
          email: 'keval.mehta.demo@gmail.com',
          address: '15, Gokul Bungalows, Vastrapur, Ahmedabad',
          emergencyContact: '9909288888',
          courseId: 'WEB_DEV',
          courseName: 'Full Stack Web Development',
          batchId: 'BATCH_EVE_WEBDEV',
          batchName: 'Evening Full Stack Web Dev',
          admissionDate: '2026-07-05',
          startDate: '2026-07-06',
          expectedEndDate: '2026-12-31',
          totalCourseFee: 18000,
          discount: 0,
          netPayable: 18000,
          paidAmount: 12000,
          outstandingBalance: 6000,
          assignedSeatId: 'A-03',
          status: 'active',
          internalNotes: 'Building portfolio projects in React & Node.',
          isDemo: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          studentId: 'TV-2026-004',
          fullName: 'Pooja Dave',
          mobile: '9724567890',
          email: 'pooja.dave.demo@gmail.com',
          address: 'C-501, Suryam Greens, Chandkheda, Ahmedabad',
          emergencyContact: '9724511111',
          courseId: 'CCC',
          courseName: 'CCC (Course on Computer Concepts)',
          batchId: 'BATCH_MORN_EXCEL',
          batchName: 'Morning Advanced Excel & MIS',
          admissionDate: '2026-08-10',
          startDate: '2026-08-12',
          expectedEndDate: '2026-11-12',
          totalCourseFee: 3500,
          discount: 0,
          netPayable: 3500,
          paidAmount: 3500,
          outstandingBalance: 0,
          assignedSeatId: 'B-01',
          status: 'active',
          internalNotes: 'Preparing for Gujarat government exams.',
          isDemo: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          studentId: 'TV-2026-005',
          fullName: 'Harshil Vora',
          mobile: '9426012345',
          email: 'harshil.vora.demo@gmail.com',
          address: 'A-12, Radhe Shyam Society, Maninagar, Ahmedabad',
          emergencyContact: '9426099999',
          courseId: 'POWER_BI',
          courseName: 'Power BI & Data Visualization',
          batchId: 'BATCH_AFTN_PYTHON',
          batchName: 'Afternoon Python & AI Basics',
          admissionDate: '2026-09-10',
          startDate: '2026-09-12',
          expectedEndDate: '2026-11-12',
          totalCourseFee: 8000,
          discount: 500,
          netPayable: 7500,
          paidAmount: 3000,
          outstandingBalance: 4500,
          assignedSeatId: 'B-02',
          status: 'active',
          internalNotes: 'Commerce graduate learning business analytics.',
          isDemo: true,
          createdAt: now,
          updatedAt: now,
        }
      ];

      for (const s of demoStudents) {
        await addDoc(collection(db, 'students'), s);
      }

      // 3. Fictional Fee Payments with receipts
      const demoPayments: Omit<FeePayment, 'id'>[] = [
        {
          paymentId: 'pay_demo_001',
          receiptNo: 'TV/2026/0001',
          studentId: 'TV-2026-001',
          studentName: 'Aarav Patel',
          amount: 5000,
          paymentMethod: 'upi',
          transactionRef: 'UPI/20260902/5421',
          paymentDate: '2026-09-02',
          recordedByStaffId: currentUser?.uid || 'staff',
          recordedByStaffName: 'Priya Joshi',
          remarks: 'Full course fee payment via Google Pay UPI',
          isReversal: false,
          createdAt: '2026-09-02T10:30:00Z',
        },
        {
          paymentId: 'pay_demo_002',
          receiptNo: 'TV/2026/0002',
          studentId: 'TV-2026-002',
          studentName: 'Diya Shah',
          amount: 4000,
          paymentMethod: 'cash',
          transactionRef: 'CASH-REC-01',
          paymentDate: '2026-08-16',
          recordedByStaffId: currentUser?.uid || 'staff',
          recordedByStaffName: 'Hardik Shah',
          remarks: '1st Installment paid in cash at counter',
          isReversal: false,
          createdAt: '2026-08-16T11:45:00Z',
        },
        {
          paymentId: 'pay_demo_003',
          receiptNo: 'TV/2026/0003',
          studentId: 'TV-2026-003',
          studentName: 'Keval Mehta',
          amount: 12000,
          paymentMethod: 'bank_transfer',
          transactionRef: 'HDFC-NEFT-9832104',
          paymentDate: '2026-07-05',
          recordedByStaffId: currentUser?.uid || 'staff',
          recordedByStaffName: 'Priya Joshi',
          remarks: 'NEFT Transfer received in institute account',
          isReversal: false,
          createdAt: '2026-07-05T14:15:00Z',
        },
        {
          paymentId: 'pay_demo_004',
          receiptNo: 'TV/2026/0004',
          studentId: 'TV-2026-004',
          studentName: 'Pooja Dave',
          amount: 3500,
          paymentMethod: 'upi',
          transactionRef: 'UPI/20260810/8812',
          paymentDate: '2026-08-10',
          recordedByStaffId: currentUser?.uid || 'staff',
          recordedByStaffName: 'Hardik Shah',
          remarks: 'Full CCC admission fee via Paytm UPI',
          isReversal: false,
          createdAt: '2026-08-10T16:00:00Z',
        },
        {
          paymentId: 'pay_demo_005',
          receiptNo: 'TV/2026/0005',
          studentId: 'TV-2026-005',
          studentName: 'Harshil Vora',
          amount: 3000,
          paymentMethod: 'cash',
          transactionRef: 'CASH-REC-02',
          paymentDate: '2026-09-10',
          recordedByStaffId: currentUser?.uid || 'staff',
          recordedByStaffName: 'Priya Joshi',
          remarks: 'Initial token fee',
          isReversal: false,
          createdAt: '2026-09-10T12:00:00Z',
        }
      ];

      for (const p of demoPayments) {
        await addDoc(collection(db, 'feePayments'), p);
      }

      // 4. Ensure 14-computer layout exists and occupy A-01, A-02, A-03, B-01, B-02
      await sync14ComputerLayout();
      const seatUpdates = [
        { seat: 'A-01', id: 'TV-2026-001', name: 'Aarav Patel', course: 'ADV_EXCEL', batch: 'BATCH_MORN_EXCEL' },
        { seat: 'A-02', id: 'TV-2026-002', name: 'Diya Shah', course: 'PYTHON', batch: 'BATCH_AFTN_PYTHON' },
        { seat: 'A-03', id: 'TV-2026-003', name: 'Keval Mehta', course: 'WEB_DEV', batch: 'BATCH_EVE_WEBDEV' },
        { seat: 'B-01', id: 'TV-2026-004', name: 'Pooja Dave', course: 'CCC', batch: 'BATCH_MORN_EXCEL' },
        { seat: 'B-02', id: 'TV-2026-005', name: 'Harshil Vora', course: 'POWER_BI', batch: 'BATCH_AFTN_PYTHON' },
      ];

      for (const u of seatUpdates) {
        await updateDoc(doc(db, 'seats', u.seat), {
          status: 'occupied',
          assignedStudentId: u.id,
          assignedStudentName: u.name,
          assignedCourseId: u.course,
          assignedBatchId: u.batch,
          updatedAt: now,
        }).catch(() => {});
      }

      // 4b. Sample Enquiries
      const demoEnquiries: Omit<Enquiry, 'id'>[] = [
        {
          enquiryId: 'ENQ-2026-001',
          fullName: 'Rohan Desai',
          mobile: '9825443322',
          alternatePhone: '9825440000',
          email: 'rohan.desai@gmail.com',
          address: 'Satellite Road, Ahmedabad',
          qualification: 'B.Com 2nd Year Student',
          courseId: 'ADV_EXCEL',
          courseName: 'Advanced Excel & MIS Reporting',
          preferredTiming: 'Morning (08:30 AM - 10:00 AM)',
          preferredRow: 'Row A (5 PCs)',
          quotedFee: 5000,
          source: 'Walk-in',
          enquiryDate: today,
          followUpDate: today,
          status: 'new',
          notes: 'Wants practical training on VLOOKUP, Pivot Tables & Dashboarding.',
          handledByName: 'Hardik Shah',
          isDemo: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          enquiryId: 'ENQ-2026-002',
          fullName: 'Nidhi Panchal',
          mobile: '9978112233',
          email: 'nidhi.p@gmail.com',
          address: 'Paldi, Ahmedabad',
          qualification: '12th Commerce Appeared',
          courseId: 'CCC',
          courseName: 'CCC (Course on Computer Concepts)',
          preferredTiming: 'Afternoon (02:00 PM - 03:30 PM)',
          preferredRow: 'Row B (9 PCs)',
          quotedFee: 3500,
          source: 'Student Referral',
          enquiryDate: today,
          followUpDate: today,
          status: 'follow_up',
          notes: 'Referred by Pooja Dave. Will confirm admission tomorrow with parents.',
          handledByName: 'Priya Joshi',
          isDemo: true,
          createdAt: now,
          updatedAt: now,
        },
      ];

      for (const eq of demoEnquiries) {
        await addDoc(collection(db, 'enquiries'), eq);
      }

      // 5. Sample Attendance for Today
      const demoAttendance: Omit<AttendanceSheet, 'id'> = {
        attendanceId: `att_BATCH_MORN_EXCEL_${today.replace(/-/g, '')}`,
        date: today,
        courseId: 'ADV_EXCEL',
        batchId: 'BATCH_MORN_EXCEL',
        records: [
          { studentId: 'TV-2026-001', studentName: 'Aarav Patel', status: 'present', remarks: 'On time' },
          { studentId: 'TV-2026-004', studentName: 'Pooja Dave', status: 'present', remarks: 'Completed practice module' },
        ],
        markedByStaffId: currentUser?.uid || 'staff',
        markedByStaffName: 'Hardik Shah',
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'attendance', demoAttendance.attendanceId), demoAttendance);

      await logAudit('DEMO_DATA_LOADED', 'System', 'all', 'Loaded fictional demo student, batch, fee, and seat records.');
    } catch (err) {
      console.error("Error loading demo data:", err);
      throw err;
    }
  };

  // Safe removal of fictional demo records
  const clearDemoData = async (): Promise<void> => {
    try {
      // Find all demo students
      const demoStudents = students.filter(s => s.isDemo === true || s.studentId.startsWith('TV-2026-00'));
      for (const s of demoStudents) {
        if (s.assignedSeatId) {
          await releaseSeat(s.assignedSeatId);
        }
        await deleteDoc(doc(db, 'students', s.id));
      }

      // Remove demo payments
      const demoPayments = payments.filter(p => p.receiptNo.startsWith('TV/2026/000'));
      for (const p of demoPayments) {
        await deleteDoc(doc(db, 'feePayments', p.id));
      }

      // Remove demo enquiries
      const demoEnqs = enquiries.filter(e => e.isDemo === true || e.enquiryId.startsWith('ENQ-2026-00'));
      for (const e of demoEnqs) {
        await deleteDoc(doc(db, 'enquiries', e.id));
      }

      await logAudit('DEMO_DATA_CLEARED', 'System', 'all', 'Cleared fictional demo data successfully.');
    } catch (err) {
      console.error("Error clearing demo data:", err);
      throw err;
    }
  };

  return (
    <InstituteContext.Provider
      value={{
        students,
        enquiries,
        courses,
        batches,
        seats,
        payments,
        attendanceSheets,
        settings,
        auditLogs,
        notifications,
        loading,
        addStudent,
        updateStudent,
        deleteStudent,
        markCourseCompleted,
        permanentDeleteStudent,
        addEnquiry,
        updateEnquiry,
        deleteEnquiry,
        convertEnquiryToStudent,
        addCourse,
        updateCourse,
        deleteCourse,
        addBatch,
        updateBatch,
        deleteBatch,
        recordFeePayment,
        reverseFeePayment,
        deleteFeePayment,
        clearAllFeeHistoryAndResetBalances,
        resetAllStudentsAndFees,
        saveAttendance,
        assignSeat,
        releaseSeat,
        updateSeatNotes,
        sync14ComputerLayout,
        updateSettings,
        markNotificationRead,
        loadDemoData,
        clearDemoData,
      }}
    >
      {children}
    </InstituteContext.Provider>
  );
};

export const useInstitute = () => {
  const context = useContext(InstituteContext);
  if (!context) {
    throw new Error('useInstitute must be used within an InstituteProvider');
  }
  return context;
};
