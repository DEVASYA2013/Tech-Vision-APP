import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  getDocs,
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
} from '../types';
import { getTodayDateString } from '../utils/formatters';

interface InstituteContextType {
  students: Student[];
  courses: Course[];
  batches: Batch[];
  seats: ComputerSeat[];
  payments: FeePayment[];
  attendanceSheets: AttendanceSheet[];
  settings: InstituteSettings;
  auditLogs: AuditLog[];
  notifications: InstituteNotification[];
  loading: boolean;
  addStudent: (studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'paidAmount' | 'outstandingBalance'>) => Promise<string>;
  updateStudent: (id: string, studentData: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string, reason?: string) => Promise<void>;
  markCourseCompleted: (id: string) => Promise<void>;
  permanentDeleteStudent: (id: string) => Promise<void>;
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
  saveAttendance: (date: string, courseId: string, batchId: string, records: AttendanceRecordItem[]) => Promise<void>;
  assignSeat: (seatId: string, studentId: string) => Promise<void>;
  releaseSeat: (seatId: string) => Promise<void>;
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

const defaultSettings: InstituteSettings = {
  id: 'general',
  instituteName: 'Tech Vision Computer Class',
  address: 'Shop No. 12-14, 2nd Floor, Shivalik Plaza, IIM Road, Panjrapole, Ahmedabad, Gujarat 380015',
  phone: '+91 98250 12345',
  email: 'info@techvisionahmedabad.in',
  currency: '₹',
  totalSeats: 14,
  timezone: 'Asia/Kolkata',
  receiptPrefix: 'TV/2026/',
  tagline: 'Empowering Careers Through Practical Computer Education',
  updatedAt: new Date().toISOString(),
};

const InstituteContext = createContext<InstituteContextType | undefined>(undefined);

export const InstituteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile, isAdmin } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [seats, setSeats] = useState<ComputerSeat[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [attendanceSheets, setAttendanceSheets] = useState<AttendanceSheet[]>([]);
  const [settings, setSettings] = useState<InstituteSettings>(defaultSettings);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<InstituteNotification[]>([]);
  const [loading, setLoading] = useState(true);

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
        if (!validNumbers.has(es.seatNumber)) {
          await deleteDoc(doc(db, 'seats', es.seatNumber)).catch(() => {});
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
    if (!currentUser) return;
    const hasLegacySeats = currentSeats.some((s) => s.seatNumber.startsWith('PC-'));
    if (currentSeats.length === 0 || hasLegacySeats) {
      await sync14ComputerLayout();
    }
  };

  // Bootstrap initial courses if empty
  const bootstrapCoursesIfEmpty = async (currentCourses: Course[]) => {
    if (currentCourses.length === 0 && currentUser) {
      try {
        const initialCourses: Omit<Course, 'id'>[] = [
          { courseId: 'CCC', courseName: 'CCC (Course on Computer Concepts)', description: 'Government recognized basic IT & digital literacy course.', duration: '3 Months', standardFee: 3500, sessionsCount: 60, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
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
        setSettings(snap.data() as InstituteSettings);
      } else {
        setDoc(doc(db, 'instituteSettings', 'general'), defaultSettings).catch(() => {});
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
    const unsubBatches = onSnapshot(collection(db, 'batches'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Batch));
      setBatches(list);
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

    return () => {
      unsubSettings();
      unsubStudents();
      unsubCourses();
      unsubBatches();
      unsubSeats();
      unsubPayments();
      unsubAttendance();
      unsubAudit();
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

    // 2. Students with overdue balance
    const overdueStudents = students.filter(s => s.status === 'active' && s.outstandingBalance > 0);
    if (overdueStudents.length > 0) {
      list.push({
        id: `fee_pending_summary`,
        notificationId: `fee_pending`,
        type: 'fee_due',
        title: `${overdueStudents.length} Students Have Pending Fees`,
        message: `Total overdue fee balance across active students requires collection follow-up.`,
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
        message: `Computer workstations are nearing full lab capacity. Consider adjusting batch schedules.`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    setNotifications(list);
  }, [batches, attendanceSheets, students, seats]);

  // Student operations
  const addStudent = async (data: Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'paidAmount' | 'outstandingBalance'>): Promise<string> => {
    const now = new Date().toISOString();
    const discount = data.discount || 0;
    const netPayable = Math.max(0, data.totalCourseFee - discount);

    // Auto-generate student ID if not provided: e.g. TV-2026-001
    const count = students.length + 1;
    const year = new Date().getFullYear();
    const studentId = data.studentId || `TV-${year}-${String(count).padStart(3, '0')}`;

    const newStudent: Omit<Student, 'id'> = {
      ...data,
      studentId,
      discount,
      netPayable,
      paidAmount: 0,
      outstandingBalance: netPayable,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const docRef = await addDoc(collection(db, 'students'), newStudent);

      // If seat assigned, update the seat record
      if (data.assignedSeatId) {
        await assignSeat(data.assignedSeatId, studentId);
      }

      await logAudit(
        'STUDENT_ADMISSION',
        'Student',
        studentId,
        `Enrolled student "${data.fullName}" in course "${data.courseName}" (Fee: ₹${netPayable})`
      );

      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'students');
    }
  };

  const updateStudent = async (id: string, data: Partial<Student>): Promise<void> => {
    try {
      const current = students.find(s => s.id === id);
      if (!current) throw new Error("Student not found");

      const totalFee = data.totalCourseFee ?? current.totalCourseFee;
      const discount = data.discount ?? current.discount;
      const netPayable = Math.max(0, totalFee - discount);
      const paidAmount = data.paidAmount ?? current.paidAmount;
      const outstandingBalance = Math.max(0, netPayable - paidAmount);

      const updatedFields = {
        ...data,
        netPayable,
        outstandingBalance,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'students', id), updatedFields);

      // Handle seat change if altered
      if (data.assignedSeatId !== undefined && data.assignedSeatId !== current.assignedSeatId) {
        if (current.assignedSeatId) {
          await releaseSeat(current.assignedSeatId);
        }
        if (data.assignedSeatId) {
          await assignSeat(data.assignedSeatId, current.studentId);
        }
      }

      await logAudit('STUDENT_UPDATE', 'Student', current.studentId, `Updated profile for "${current.fullName}"`);
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
      const current = students.find(s => s.id === id);
      if (!current) return;

      // Release seat if assigned so other students can use the computer
      if (current.assignedSeatId) {
        await releaseSeat(current.assignedSeatId);
      }

      await updateDoc(doc(db, 'students', id), {
        status: 'completed',
        assignedSeatId: '',
        updatedAt: new Date().toISOString(),
      });

      await logAudit(
        'COURSE_COMPLETED',
        'Student',
        current.studentId,
        `Marked course completed for student "${current.fullName}". Released workstation.`
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

    const student = students.find(s => s.studentId === studentId || s.id === studentId);
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

      // Update student's paidAmount & outstandingBalance atomically
      const updatedPaid = (student.paidAmount || 0) + amount;
      const updatedOutstanding = Math.max(0, student.netPayable - updatedPaid);

      await updateDoc(doc(db, 'students', student.id), {
        paidAmount: updatedPaid,
        outstandingBalance: updatedOutstanding,
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

      const student = students.find(s => s.studentId === studentId);
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

  // Seat Management operations
  const assignSeat = async (seatNumberOrId: string, studentId: string): Promise<void> => {
    try {
      const student = students.find(s => s.studentId === studentId || s.id === studentId);
      if (!student) throw new Error("Student not found");

      const seat = seats.find(s => s.seatNumber === seatNumberOrId || s.seatId === seatNumberOrId);
      if (!seat) throw new Error(`Workstation ${seatNumberOrId} not found`);

      // Prevent conflict: If seat is occupied by another student, disallow unless same student
      if (seat.status === 'occupied' && seat.assignedStudentId && seat.assignedStudentId !== student.studentId) {
        throw new Error(`Workstation ${seat.seatNumber} is already occupied by ${seat.assignedStudentName || 'another student'}. Release it first.`);
      }

      // If student was on another seat, release old seat
      if (student.assignedSeatId && student.assignedSeatId !== seat.seatNumber) {
        const oldSeat = seats.find(s => s.seatNumber === student.assignedSeatId);
        if (oldSeat) {
          await updateDoc(doc(db, 'seats', oldSeat.seatNumber), {
            status: 'available',
            assignedStudentId: '',
            assignedStudentName: '',
            assignedCourseId: '',
            assignedBatchId: '',
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Occupy new seat
      await updateDoc(doc(db, 'seats', seat.seatNumber), {
        status: 'occupied',
        assignedStudentId: student.studentId,
        assignedStudentName: student.fullName,
        assignedCourseId: student.courseId,
        assignedBatchId: student.batchId || '',
        updatedAt: new Date().toISOString(),
      });

      // Update student profile with assigned seat
      await updateDoc(doc(db, 'students', student.id), {
        assignedSeatId: seat.seatNumber,
        updatedAt: new Date().toISOString(),
      });

      await logAudit('SEAT_ASSIGNED', 'Seat', seat.seatNumber, `Assigned ${seat.seatNumber} to ${student.fullName}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `seats/${seatNumberOrId}`);
    }
  };

  const releaseSeat = async (seatNumberOrId: string): Promise<void> => {
    try {
      const seat = seats.find(s => s.seatNumber === seatNumberOrId || s.seatId === seatNumberOrId);
      if (!seat) return;

      const previousStudentId = seat.assignedStudentId;

      await updateDoc(doc(db, 'seats', seat.seatNumber), {
        status: 'available',
        assignedStudentId: '',
        assignedStudentName: '',
        assignedCourseId: '',
        assignedBatchId: '',
        updatedAt: new Date().toISOString(),
      });

      if (previousStudentId) {
        const student = students.find(s => s.studentId === previousStudentId);
        if (student) {
          await updateDoc(doc(db, 'students', student.id), {
            assignedSeatId: '',
            updatedAt: new Date().toISOString(),
          });
        }
      }

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
          assignedSeatId: 'PC-01',
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
          assignedSeatId: 'PC-02',
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
          assignedSeatId: 'PC-03',
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
          assignedSeatId: 'PC-04',
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
          assignedSeatId: 'PC-05',
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

      // 4. Update PC-01 to PC-05 to occupied
      const seatUpdates = [
        { seat: 'PC-01', id: 'TV-2026-001', name: 'Aarav Patel', course: 'ADV_EXCEL', batch: 'BATCH_MORN_EXCEL' },
        { seat: 'PC-02', id: 'TV-2026-002', name: 'Diya Shah', course: 'PYTHON', batch: 'BATCH_AFTN_PYTHON' },
        { seat: 'PC-03', id: 'TV-2026-003', name: 'Keval Mehta', course: 'WEB_DEV', batch: 'BATCH_EVE_WEBDEV' },
        { seat: 'PC-04', id: 'TV-2026-004', name: 'Pooja Dave', course: 'CCC', batch: 'BATCH_MORN_EXCEL' },
        { seat: 'PC-05', id: 'TV-2026-005', name: 'Harshil Vora', course: 'POWER_BI', batch: 'BATCH_AFTN_PYTHON' },
      ];

      for (const u of seatUpdates) {
        await updateDoc(doc(db, 'seats', u.seat), {
          status: 'occupied',
          assignedStudentId: u.id,
          assignedStudentName: u.name,
          assignedCourseId: u.course,
          assignedBatchId: u.batch,
          updatedAt: now,
        });
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
        addCourse,
        updateCourse,
        deleteCourse,
        addBatch,
        updateBatch,
        deleteBatch,
        recordFeePayment,
        reverseFeePayment,
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
