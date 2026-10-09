import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  AlertTriangle,
  GraduationCap,
  Phone,
  Monitor,
  Award,
  Archive,
  RotateCcw,
} from 'lucide-react';
import { Student, StudentStatus } from '../types';
import { useInstitute, STANDARD_12_HOURLY_BATCHES } from '../context/InstituteContext';
import { useAuth } from '../context/AuthContext';
import {
  formatINR,
  formatDate,
  getTodayDateString,
  isValidIndianMobile,
  getStudentFeeReminderInfo,
} from '../utils/formatters';
import { exportToCSV } from '../utils/csvExport';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StudentProfile } from './StudentProfile';
import {
  parseStudentsCsvData,
  ParsedStudentCsvRow,
} from './GoogleIntegrations';

export const Students: React.FC = () => {
  const {
    students,
    courses,
    batches,
    seats,
    payments,
    addStudent,
    updateStudent,
    deleteStudent,
    markCourseCompleted,
    permanentDeleteStudent,
    clearAllFeeHistoryAndResetBalances,
    resetAllStudentsAndFees,
  } = useInstitute();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  // Selected student for Profile View
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isResetFeesConfirmOpen, setIsResetFeesConfirmOpen] = useState(false);
  const [isResetAllConfirmOpen, setIsResetAllConfirmOpen] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'balance'>('name');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [isPermanentConfirmOpen, setIsPermanentConfirmOpen] = useState(false);

  // CSV / Google Sheets Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvImportText, setCsvImportText] = useState('');
  const [parsedCsvRows, setParsedCsvRows] = useState<ParsedStudentCsvRow[]>([]);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    grNo: '',
    fullName: '',
    fatherOrHusbandName: '',
    fatherOrHusbandProfession: '',
    dateOfBirth: '',
    qualification: '',
    aadharCardNo: '',
    mobile: '',
    email: '',
    address: '',
    emergencyContact: '',
    courseId: '',
    courseIds: [] as string[],
    batchId: '',
    admissionDate: getTodayDateString(),
    startDate: getTodayDateString(),
    expectedEndDate: '',
    totalCourseFee: 0,
    discount: 0,
    paidAmount: 0,
    assignedSeatId: '',
    courseCompleted: false,
    certificateIssued: false,
    status: 'active' as StudentStatus,
    internalNotes: '',
  });

  const availableBatches = batches.length > 0 ? batches : STANDARD_12_HOURLY_BATCHES.map(b => ({ id: b.batchId, ...b }));
  const todayStr = getTodayDateString();

  const oneMonthDueStudentIds = useMemo(() => {
    const ids = new Set<string>();
    students.forEach((s) => {
      if (s.status === 'active' && (s.outstandingBalance || 0) > 0) {
        const info = getStudentFeeReminderInfo(s, payments, todayStr);
        if (info.isReminderDue) ids.add(s.id);
      }
    });
    return ids;
  }, [students, payments, todayStr]);

  // Filtered & Sorted List
  const filteredStudents = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return students
      .filter((s) => {
        const studentGr = (s.grNo || s.studentId || '').toLowerCase();
        const matchesSearch =
          !q ||
          s.fullName.toLowerCase().includes(q) ||
          (s.fatherOrHusbandName || '').toLowerCase().includes(q) ||
          (s.aadharCardNo || '').toLowerCase().includes(q) ||
          studentGr.includes(q) ||
          s.studentId.toLowerCase().includes(q) ||
          (s.batchName || '').toLowerCase().includes(q) ||
          (s.courseName || '').toLowerCase().includes(q) ||
          s.mobile.includes(q);

        const matchesCourse =
          selectedCourse === 'all' ||
          s.courseId === selectedCourse ||
          (s.courseIds && s.courseIds.includes(selectedCourse)) ||
          s.courseId.split(',').map((id) => id.trim()).includes(selectedCourse);
        const matchesBatch = selectedBatch === 'all' || s.batchId === selectedBatch;
        const matchesStatus =
          selectedStatus === 'all'
            ? true
            : selectedStatus === 'one_month_due'
            ? oneMonthDueStudentIds.has(s.id)
            : s.status === selectedStatus;

        return matchesSearch && matchesCourse && matchesBatch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.fullName.localeCompare(b.fullName);
        if (sortBy === 'date') return b.admissionDate.localeCompare(a.admissionDate);
        if (sortBy === 'balance') return (b.outstandingBalance || 0) - (a.outstandingBalance || 0);
        return 0;
      });
  }, [students, searchTerm, selectedCourse, selectedBatch, selectedStatus, sortBy, oneMonthDueStudentIds]);

  // Paginated List
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    const nextGrNumber = `GR-${100 + students.length + 1}`;
    const today = getTodayDateString();
    const firstCourseId = courses[0]?.courseId || '';
    setFormData({
      grNo: nextGrNumber,
      fullName: '',
      fatherOrHusbandName: '',
      fatherOrHusbandProfession: '',
      dateOfBirth: '',
      qualification: '',
      aadharCardNo: '',
      mobile: '',
      email: '',
      address: '',
      emergencyContact: '',
      courseId: firstCourseId,
      courseIds: firstCourseId ? [firstCourseId] : [],
      batchId: availableBatches[0]?.batchId || 'BATCH-01',
      admissionDate: today,
      startDate: today,
      expectedEndDate: '',
      totalCourseFee: courses[0]?.standardFee || 4000,
      discount: 0,
      paidAmount: 0,
      assignedSeatId: '',
      courseCompleted: false,
      certificateIssued: false,
      status: 'active',
      internalNotes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    const existingCourseIds =
      student.courseIds && student.courseIds.length > 0
        ? student.courseIds
        : student.courseId
          ? student.courseId.split(',').map((c) => c.trim()).filter(Boolean)
          : [];
    setFormData({
      grNo: student.grNo || student.studentId || '',
      fullName: student.fullName,
      fatherOrHusbandName: student.fatherOrHusbandName || '',
      fatherOrHusbandProfession: student.fatherOrHusbandProfession || '',
      dateOfBirth: student.dateOfBirth || '',
      qualification: student.qualification || '',
      aadharCardNo: student.aadharCardNo || '',
      mobile: student.mobile,
      email: student.email || '',
      address: student.address || '',
      emergencyContact: student.emergencyContact || '',
      courseId: existingCourseIds.join(', ') || student.courseId,
      courseIds: existingCourseIds,
      batchId: student.batchId || availableBatches[0]?.batchId || '',
      admissionDate: student.admissionDate || getTodayDateString(),
      startDate: student.startDate || '',
      expectedEndDate: student.expectedEndDate || '',
      totalCourseFee: student.totalCourseFee,
      discount: student.discount,
      paidAmount: student.paidAmount || 0,
      assignedSeatId: student.assignedSeatId || '',
      courseCompleted: Boolean(student.courseCompleted || student.status === 'completed'),
      certificateIssued: Boolean(student.certificateIssued),
      status: student.status,
      internalNotes: student.internalNotes || '',
    });
    setIsModalOpen(true);
  };

  const handleToggleCourseSelection = (targetCourseId: string) => {
    setFormData((prev) => {
      const exists = prev.courseIds.includes(targetCourseId);
      const nextCourseIds = exists
        ? prev.courseIds.filter((id) => id !== targetCourseId)
        : [...prev.courseIds, targetCourseId];

      const summedFee = nextCourseIds.reduce((sum, cid) => {
        const found = courses.find((c) => c.courseId === cid);
        return sum + (found?.standardFee || 0);
      }, 0);

      return {
        ...prev,
        courseIds: nextCourseIds,
        courseId: nextCourseIds.join(', '),
        totalCourseFee: summedFee > 0 ? summedFee : prev.totalCourseFee,
      };
    });
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeCourseIds =
      formData.courseIds.length > 0
        ? formData.courseIds
        : formData.courseId
          ? [formData.courseId]
          : [];

    if (!formData.grNo.trim() || !formData.fullName.trim() || !formData.mobile.trim() || activeCourseIds.length === 0) {
      showToast('Please fill in Student GR.No, Student Name, Contact Mobile, and select at least one Course.', 'error');
      return;
    }

    if (!isValidIndianMobile(formData.mobile)) {
      showToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    // Check duplicate GR.No
    const duplicateGr = students.find(
      (s) =>
        (s.grNo || s.studentId).trim().toLowerCase() === formData.grNo.trim().toLowerCase() &&
        s.id !== editingStudent?.id
    );
    if (duplicateGr) {
      showToast(
        `Student GR.No "${formData.grNo.trim()}" is already assigned to ${duplicateGr.fullName}. Please enter a unique GR.No.`,
        'error'
      );
      return;
    }

    const activeCourseNames = activeCourseIds.map((cid) => {
      const found = courses.find((c) => c.courseId === cid);
      return found ? found.courseName : cid;
    });
    const combinedCourseId = activeCourseIds.join(', ');
    const combinedCourseName = activeCourseNames.join(' + ');
    const selectedBatchObj = availableBatches.find((b) => b.batchId === formData.batchId);

    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, {
          studentId: formData.grNo.trim(),
          grNo: formData.grNo.trim(),
          fullName: formData.fullName.trim(),
          fatherOrHusbandName: formData.fatherOrHusbandName.trim(),
          fatherOrHusbandProfession: formData.fatherOrHusbandProfession.trim(),
          dateOfBirth: formData.dateOfBirth,
          qualification: formData.qualification.trim(),
          aadharCardNo: formData.aadharCardNo.trim(),
          mobile: formData.mobile.trim(),
          email: formData.email.trim(),
          address: formData.address.trim(),
          emergencyContact: formData.emergencyContact.trim(),
          courseId: combinedCourseId,
          courseName: combinedCourseName,
          courseIds: activeCourseIds,
          courseNames: activeCourseNames,
          batchId: formData.batchId,
          batchName: selectedBatchObj?.batchName || '',
          admissionDate: formData.admissionDate || getTodayDateString(),
          startDate: formData.startDate,
          expectedEndDate: formData.expectedEndDate,
          totalCourseFee: Number(formData.totalCourseFee),
          discount: Number(formData.discount),
          paidAmount: Number(formData.paidAmount),
          assignedSeatId: formData.assignedSeatId,
          courseCompleted: formData.courseCompleted,
          certificateIssued: formData.certificateIssued,
          status: formData.courseCompleted ? 'completed' : formData.status,
          internalNotes: formData.internalNotes,
        });
        showToast(`Student record "${formData.fullName}" (GR.No: ${formData.grNo.trim()}) updated!`, 'success');
      } else {
        await addStudent({
          studentId: formData.grNo.trim(),
          grNo: formData.grNo.trim(),
          fullName: formData.fullName.trim(),
          fatherOrHusbandName: formData.fatherOrHusbandName.trim(),
          fatherOrHusbandProfession: formData.fatherOrHusbandProfession.trim(),
          dateOfBirth: formData.dateOfBirth,
          qualification: formData.qualification.trim(),
          aadharCardNo: formData.aadharCardNo.trim(),
          mobile: formData.mobile.trim(),
          email: formData.email.trim(),
          address: formData.address.trim(),
          emergencyContact: formData.emergencyContact.trim(),
          courseId: combinedCourseId,
          courseName: combinedCourseName,
          courseIds: activeCourseIds,
          courseNames: activeCourseNames,
          batchId: formData.batchId,
          batchName: selectedBatchObj?.batchName || '',
          admissionDate: formData.admissionDate || getTodayDateString(),
          startDate: formData.startDate,
          expectedEndDate: formData.expectedEndDate,
          totalCourseFee: Number(formData.totalCourseFee),
          discount: Number(formData.discount),
          netPayable: Math.max(0, Number(formData.totalCourseFee) - Number(formData.discount)),
          paidAmount: Number(formData.paidAmount || 0),
          assignedSeatId: formData.assignedSeatId,
          courseCompleted: formData.courseCompleted,
          certificateIssued: formData.certificateIssued,
          status: formData.courseCompleted ? 'completed' : formData.status,
          internalNotes: formData.internalNotes,
        });
        showToast(`New student "${formData.fullName}" (GR.No: ${formData.grNo.trim()}) admitted!`, 'success');
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving student record.';
      showToast(msg, 'error');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'GR.No',
      'Admission Date',
      'Student full name',
      'Father/Husband Name',
      'Father/Husband profession',
      'Date of birth',
      'Qualification',
      'Aadhar card No.',
      'Mobile number',
      'Emergency contact number',
      'Address',
      'Course',
      'Batch time',
      'Total fees',
      'Discount',
      'Paid fees',
      'Remaining fees',
      'Course completed',
      'Certificate given',
      'Remarks',
      'Status',
    ];
    const rows = filteredStudents.map((s) => [
      s.grNo || s.studentId,
      s.admissionDate,
      s.fullName,
      s.fatherOrHusbandName || '',
      s.fatherOrHusbandProfession || '',
      s.dateOfBirth || '',
      s.qualification || '',
      s.aadharCardNo || '',
      s.mobile,
      s.emergencyContact || '',
      s.address || '',
      s.courseName,
      s.batchName || '',
      s.totalCourseFee,
      s.discount,
      s.paidAmount,
      s.outstandingBalance,
      s.courseCompleted || s.status === 'completed' ? 'Yes' : 'No',
      s.certificateIssued ? 'Yes' : 'No',
      s.internalNotes || '',
      s.status,
    ]);
    exportToCSV('TechVision_Students_Directory', headers, rows);
    showToast('Students directory exported to CSV!', 'success');
  };

  const handleParseImportCsv = (rawText: string) => {
    if (!rawText.trim()) {
      showToast('Please paste CSV / Google Sheet rows or upload a CSV file.', 'error');
      return;
    }

    try {
      const rows = parseStudentsCsvData(rawText, courses, availableBatches, students);
      if (rows.length === 0) {
        showToast('No valid student rows found in CSV.', 'error');
        return;
      }
      setParsedCsvRows(rows);
      showToast(`Parsed ${rows.length} student rows ready for import!`, 'success');
    } catch {
      showToast('Error parsing CSV rows. Please check the column format.', 'error');
    }
  };

  const handleConfirmCsvImport = async () => {
    if (parsedCsvRows.length === 0) return;
    setIsBulkImporting(true);
    let importedCount = 0;
    try {
      for (const row of parsedCsvRows) {
        await addStudent({
          studentId: row.grNo,
          grNo: row.grNo,
          fullName: row.fullName,
          fatherOrHusbandName: row.fatherOrHusbandName,
          fatherOrHusbandProfession: row.fatherOrHusbandProfession,
          dateOfBirth: row.dateOfBirth,
          qualification: row.qualification,
          aadharCardNo: row.aadharCardNo,
          mobile: row.mobile,
          emergencyContact: row.emergencyContact,
          address: row.address,
          courseId: row.courseId,
          courseName: row.courseName,
          courseIds: row.courseIds,
          courseNames: row.courseNames,
          batchId: row.batchId,
          batchName: row.batchName,
          admissionDate: row.admissionDate,
          startDate: row.admissionDate,
          totalCourseFee: row.totalCourseFee,
          discount: row.discount,
          netPayable: row.netPayable,
          paidAmount: row.paidAmount,
          courseCompleted: false,
          certificateIssued: false,
          status: 'active',
          internalNotes: 'Imported via CSV / Google Sheets',
        });
        importedCount++;
      }
      showToast(`Successfully imported ${importedCount} active students!`, 'success');
      setParsedCsvRows([]);
      setCsvImportText('');
      setIsImportModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error importing students.';
      showToast(msg, 'error');
    } finally {
      setIsBulkImporting(false);
    }
  };

  const liveSelectedStudent = selectedStudent
    ? students.find((s) => s.id === selectedStudent.id) || selectedStudent
    : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {liveSelectedStudent ? (
        <StudentProfile
          student={liveSelectedStudent}
          onBack={() => setSelectedStudent(null)}
          onEdit={(st) => handleOpenEditModal(st)}
        />
      ) : (
        <>
          {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-600" />
            Student Directory
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage student registrations, academic courses, seat allocations, and balances.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {students.length > 0 && (
            <>
              <button
                onClick={() => setIsResetFeesConfirmOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Delete all fee collection history and reset all students' paid fees to ₹0"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Fees Only
              </button>
              <button
                onClick={() => setIsResetAllConfirmOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Delete all students, delete all fee history, and free all 14 computers"
              >
                <Trash2 className="w-4 h-4" />
                Reset All Students & Fees
              </button>
            </>
          )}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Import CSV / Sheet
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-900/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Admission
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        {/* Quick status tabs */}
        <div className="flex flex-wrap items-center gap-2 pb-1 border-b border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
          {[
            { id: 'all', label: 'All Students', count: students.length },
            { id: 'active', label: 'Active Enrolled', count: students.filter(s => s.status === 'active').length },
            { id: 'one_month_due', label: '🔔 1-Month Fee Due', count: oneMonthDueStudentIds.size },
            { id: 'completed', label: 'Course Completed', count: students.filter(s => s.status === 'completed').length },
            { id: 'inactive', label: 'Inactive / Archived', count: students.filter(s => s.status === 'inactive').length },
          ].map((tab) => {
            const isSelected = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedStatus(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-cyan-800 text-cyan-100' : 'bg-slate-200 text-slate-700'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Student GR.No, Student Name, Batch Time, or Contact..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
            />
          </div>

          {/* Filter Course */}
          <div>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white text-slate-700 font-medium"
            >
              <option value="all">All Courses</option>
              {courses.map((c) => (
                <option key={c.courseId} value={c.courseId}>
                  {c.courseName}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 1-Hour Batch */}
          <div>
            <select
              value={selectedBatch}
              onChange={(e) => {
                setSelectedBatch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white text-slate-700 font-medium"
            >
              <option value="all">All 12 Hourly Batches</option>
              {availableBatches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.batchName}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white text-slate-700 font-medium"
            >
              <option value="name">Sort by Name</option>
              <option value="date">Sort by Admission Date</option>
              <option value="balance">Sort by Pending Balance</option>
            </select>
          </div>
        </div>

        {/* Active Filters count summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-900">{filteredStudents.length}</strong> student
            records
          </span>
          {(searchTerm || selectedCourse !== 'all' || selectedStatus !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCourse('all');
                setSelectedBatch('all');
                setSelectedStatus('all');
              }}
              className="text-cyan-600 hover:text-cyan-700 font-semibold"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Students Table with All Requested Columns */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 whitespace-nowrap">
              <tr>
                <th className="py-3 px-3">Student GR.No</th>
                <th className="py-3 px-3">Student Name</th>
                <th className="py-3 px-3">Course</th>
                <th className="py-3 px-3">Batch (1-Hr) & PC</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Total Fees</th>
                <th className="py-3 px-3">Remaining Fees</th>
                <th className="py-3 px-3">Fees Paid</th>
                <th className="py-3 px-3">Course Completed</th>
                <th className="py-3 px-3">Certificate Given</th>
                <th className="py-3 px-3">Remarks</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No student records match the search criteria.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s) => {
                  const isCourseDone = Boolean(s.courseCompleted || s.status === 'completed');
                  const isCertGiven = Boolean(s.certificateIssued);
                  const reminderInfo = getStudentFeeReminderInfo(s, payments, todayStr);
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedStudent(s)}
                      className="hover:bg-cyan-50/40 transition cursor-pointer group"
                      title={`Click to view complete student dossier for ${s.fullName}`}
                    >
                      {/* 1. Student GR.No */}
                      <td className="py-3 px-3 font-mono font-black text-cyan-800 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-cyan-50 border border-cyan-200 group-hover:bg-cyan-600 group-hover:text-white group-hover:border-cyan-600 transition">
                          {s.grNo || s.studentId}
                        </span>
                      </td>

                      {/* 2. Student Name & Admission Date */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 group-hover:text-cyan-700 group-hover:underline underline-offset-2 transition flex items-center gap-1">
                          <span>{s.fullName}</span>
                        </div>
                        {s.fatherOrHusbandName && (
                          <div className="text-[10px] text-slate-500 whitespace-nowrap">
                            F/H: {s.fatherOrHusbandName}
                            {s.fatherOrHusbandProfession ? ` (${s.fatherOrHusbandProfession})` : ''}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 whitespace-nowrap">
                          Admission: {formatDate(s.admissionDate)}
                          {s.qualification ? ` • ${s.qualification}` : ''}
                        </div>
                      </td>

                      {/* 3. Course (Single or Multiple) */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(s.courseNames && s.courseNames.length > 0
                            ? s.courseNames
                            : (s.courseName || '').split(/\s*\+\s*/)
                          ).map((cName, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-800 truncate max-w-[180px]"
                              title={cName}
                            >
                              {cName}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* 4. Batch & Workstation */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="text-slate-700 font-semibold text-[11px]">
                          {s.batchName || 'No Batch'}
                        </div>
                        {s.assignedSeatId ? (
                          <span className="inline-block mt-0.5 font-mono text-[10px] font-bold text-cyan-700 bg-cyan-50 px-1.5 py-0.2 rounded border border-cyan-200">
                            PC: {s.assignedSeatId} (1 Hr)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">No Seat</span>
                        )}
                      </td>

                      {/* 5. Contact */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="text-slate-800 font-semibold">{s.mobile}</div>
                        {s.emergencyContact && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[110px]">
                            Alt: {s.emergencyContact}
                          </div>
                        )}
                      </td>

                      {/* 6. Total Fees */}
                      <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {formatINR(s.netPayable)}
                      </td>

                      {/* 7. Remaining Fees & 1-Month Reminder */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div
                          className={`font-black ${
                            s.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {formatINR(s.outstandingBalance)}
                        </div>
                        {s.outstandingBalance > 0 && (
                          <div
                            className={`text-[10px] font-bold mt-0.5 ${
                              reminderInfo.isReminderDue ? 'text-rose-700' : 'text-slate-400'
                            }`}
                            title={reminderInfo.statusText}
                          >
                            {reminderInfo.isReminderDue
                              ? `🔔 1-Mo Due (${formatDate(reminderInfo.reminderDate)})`
                              : `Remind: ${formatDate(reminderInfo.reminderDate)}`}
                          </div>
                        )}
                      </td>

                      {/* 8. Fees Paid */}
                      <td className="py-3 px-3 font-bold text-emerald-600 whitespace-nowrap">
                        {formatINR(s.paidAmount)}
                      </td>

                      {/* 9. Course Completed or Not */}
                      <td
                        className="py-3 px-3 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={async () => {
                            const nextCompleted = !isCourseDone;
                            await updateStudent(s.id, {
                              courseCompleted: nextCompleted,
                              status: nextCompleted ? 'completed' : 'active',
                            });
                            showToast(
                              `Course marked as ${nextCompleted ? 'Completed (Yes)' : 'In Progress (No)'} for ${s.fullName}.`,
                              'info'
                            );
                          }}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                            isCourseDone
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }`}
                          title="Click to toggle Course Completed (Yes / No)"
                        >
                          {isCourseDone ? 'Yes (Completed)' : 'No (Running)'}
                        </button>
                      </td>

                      {/* 10. Certificate Given or Not */}
                      <td
                        className="py-3 px-3 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={async () => {
                            const nextCert = !isCertGiven;
                            await updateStudent(s.id, {
                              certificateIssued: nextCert,
                              certificateIssuedDate: nextCert ? getTodayDateString() : '',
                            });
                            showToast(
                              `Certificate status updated to "${nextCert ? 'Given (Yes)' : 'Pending (No)'}" for ${s.fullName}.`,
                              'info'
                            );
                          }}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                            isCertGiven
                              ? 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Click to toggle Certificate Given (Yes / No)"
                        >
                          {isCertGiven ? 'Yes (Given)' : 'No (Pending)'}
                        </button>
                      </td>

                      {/* 11. Remarks */}
                      <td className="py-3 px-3 max-w-[140px]">
                        <div className="text-[11px] text-slate-600 truncate" title={s.internalNotes || ''}>
                          {s.internalNotes || '—'}
                        </div>
                      </td>

                      {/* 12. Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            s.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : s.status === 'completed'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : s.status === 'on_hold'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {s.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* 13. Actions */}
                      <td
                        className="py-3 px-3 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedStudent(s)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 transition cursor-pointer"
                            title="View Full Student Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(s)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Edit Student Details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {s.status === 'active' && (
                            <button
                              onClick={async () => {
                                await markCourseCompleted(s.id);
                                showToast(`Course completed for ${s.fullName}! Workstation released.`, 'success');
                              }}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                              title="Mark Course Completed (Releases 1-hour workstation slot)"
                            >
                              <Award className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTarget(s)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete or Archive Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Page <strong className="text-slate-900">{currentPage}</strong> of{' '}
            <strong className="text-slate-900">{totalPages}</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? `Edit Student: ${editingStudent.fullName}` : 'New Student Admission'}
        subtitle="Enter Student GR.No, Admission Date, 1-hour batch slot, workstation, and fee details."
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveStudent} className="space-y-4">
          {/* Row 1: Student GR.No & Admission Date */}
          <div className="p-3.5 rounded-2xl bg-cyan-50/60 border border-cyan-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-cyan-950 mb-1">
                Student GR.No (General Register No.) *
              </label>
              <input
                type="text"
                required
                value={formData.grNo}
                onChange={(e) => setFormData({ ...formData, grNo: e.target.value })}
                placeholder="e.g. GR-101 or 101"
                className="w-full px-3.5 py-2 bg-white border border-cyan-300 rounded-xl text-xs font-mono font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
              />
              <span className="text-[10px] text-cyan-800 mt-1 block">
                Used to quickly search and collect fees by GR.No.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-extrabold text-cyan-950">
                  Admission Date *
                </label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, admissionDate: getTodayDateString() })}
                  className="text-[10px] font-bold text-cyan-700 hover:underline cursor-pointer"
                >
                  Fetch Current Date (Today)
                </button>
              </div>
              <input
                type="date"
                required
                value={formData.admissionDate}
                onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-cyan-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
              />
              <span className="text-[10px] text-cyan-800 mt-1 block">
                Auto-fetched from current date or select custom date.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Student Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Rahul Patel"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Father / Husband Name
              </label>
              <input
                type="text"
                value={formData.fatherOrHusbandName}
                onChange={(e) => setFormData({ ...formData, fatherOrHusbandName: e.target.value })}
                placeholder="e.g. Rameshbhai Patel"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Father / Husband Profession
              </label>
              <input
                type="text"
                value={formData.fatherOrHusbandProfession}
                onChange={(e) =>
                  setFormData({ ...formData, fatherOrHusbandProfession: e.target.value })
                }
                placeholder="e.g. Business, Service, Teacher, Accountant"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Qualification
              </label>
              <input
                type="text"
                value={formData.qualification}
                onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                placeholder="e.g. 10th, 12th Commerce, B.Com, BCA, B.Tech"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Aadhar Card No.
              </label>
              <input
                type="text"
                value={formData.aadharCardNo}
                onChange={(e) => setFormData({ ...formData, aadharCardNo: e.target.value })}
                placeholder="e.g. 1234-5678-9012"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contact Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="10-digit mobile number"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Emergency Contact (Parent / Guardian)
              </label>
              <input
                type="text"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                placeholder="Phone & Relation (e.g. 98251... Father)"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Residential Address (Ahmedabad)
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Society, Area, Ahmedabad"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="student@example.com"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Academic Enrollment Section: Multi-Course Selection */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Enrolled Course(s), 1-Hour Batch & Workstation Assignment
            </h4>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Select Enrolled Course(s) — Single or Multiple Courses *
                  </label>
                  <span className="text-[11px] font-bold text-cyan-700">
                    {formData.courseIds.length} course(s) selected
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 max-h-44 overflow-y-auto">
                  {courses.map((c) => {
                    const isChecked = formData.courseIds.includes(c.courseId);
                    return (
                      <label
                        key={c.courseId}
                        className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-cyan-50 border-cyan-400 text-cyan-950 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCourseSelection(c.courseId)}
                          className="mt-0.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <div className="min-w-0">
                          <div className="truncate">{c.courseName}</div>
                          <div className="text-[10px] text-slate-500 font-normal">
                            Fee: ₹{c.standardFee} • {c.duration}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Selecting multiple courses automatically sums their standard fees below (you can still adjust Total Fee manually).
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    1-Hour Batch Time Slot (12 Daily Batches) *
                  </label>
                  <select
                    value={formData.batchId}
                    onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white font-bold"
                  >
                    <option value="">Select 1-Hour Batch Slot</option>
                    {availableBatches.map((b) => (
                      <option key={b.batchId} value={b.batchId}>
                        {b.batchName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assign Workstation for Selected 1-Hour Batch (14 PCs)
                  </label>
                  <select
                    value={formData.assignedSeatId}
                    onChange={(e) => setFormData({ ...formData, assignedSeatId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white font-medium"
                  >
                    <option value="">No Dedicated Seat (Open Lab)</option>
                    <optgroup label="Row A — 5 Computers (A-01 to A-05)">
                      {seats
                        .filter((s) => s.seatNumber.startsWith('A-'))
                        .map((s) => {
                          const occupantInThisBatch = students.find(
                            (st) =>
                              st.status === 'active' &&
                              st.id !== editingStudent?.id &&
                              st.assignedSeatId === s.seatNumber &&
                              st.batchId &&
                              st.batchId === formData.batchId
                          );
                          const totalBatchesOnSeat = students.filter(
                            (st) => st.status === 'active' && st.assignedSeatId === s.seatNumber
                          ).length;
                          return (
                            <option
                              key={s.seatNumber}
                              value={s.seatNumber}
                              disabled={Boolean(occupantInThisBatch)}
                            >
                              {s.seatNumber}{' '}
                              {occupantInThisBatch
                                ? `(Occupied in this 1-hr batch by ${occupantInThisBatch.fullName} [${occupantInThisBatch.grNo || occupantInThisBatch.studentId}])`
                                : `(Available for this 1-hr batch • ${totalBatchesOnSeat}/12 daily batches filled)`}
                            </option>
                          );
                        })}
                    </optgroup>
                    <optgroup label="Row B — 9 Computers (B-01 to B-09)">
                      {seats
                        .filter((s) => s.seatNumber.startsWith('B-'))
                        .map((s) => {
                          const occupantInThisBatch = students.find(
                            (st) =>
                              st.status === 'active' &&
                              st.id !== editingStudent?.id &&
                              st.assignedSeatId === s.seatNumber &&
                              st.batchId &&
                              st.batchId === formData.batchId
                          );
                          const totalBatchesOnSeat = students.filter(
                            (st) => st.status === 'active' && st.assignedSeatId === s.seatNumber
                          ).length;
                          return (
                            <option
                              key={s.seatNumber}
                              value={s.seatNumber}
                              disabled={Boolean(occupantInThisBatch)}
                            >
                              {s.seatNumber}{' '}
                              {occupantInThisBatch
                                ? `(Occupied in this 1-hr batch by ${occupantInThisBatch.fullName} [${occupantInThisBatch.grNo || occupantInThisBatch.studentId}])`
                                : `(Available for this 1-hr batch • ${totalBatchesOnSeat}/12 daily batches filled)`}
                            </option>
                          );
                        })}
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Fee Calculation Section */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Fee Details (Total Fees, Fees Paid & Remaining Fees)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Total Course Fee (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.totalCourseFee}
                  onChange={(e) => setFormData({ ...formData, totalCourseFee: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fees Paid (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.paidAmount}
                  onChange={(e) => setFormData({ ...formData, paidAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-emerald-50/60 border border-emerald-300 rounded-xl text-xs text-emerald-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white font-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Remaining Fees
                </label>
                <div className="px-3 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs font-black text-rose-700">
                  {formatINR(
                    Math.max(
                      0,
                      Math.max(0, formData.totalCourseFee - formData.discount) -
                        (formData.paidAmount || 0)
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Course Completion, Certificate & Status Section */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Completion, Certificate & Status
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Course Completed?
                </label>
                <select
                  value={formData.courseCompleted ? 'yes' : 'no'}
                  onChange={(e) => {
                    const completed = e.target.value === 'yes';
                    setFormData({
                      ...formData,
                      courseCompleted: completed,
                      status: completed ? 'completed' : 'active',
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                >
                  <option value="no">No (Course Running)</option>
                  <option value="yes">Yes (Course Completed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Certificate Given?
                </label>
                <select
                  value={formData.certificateIssued ? 'yes' : 'no'}
                  onChange={(e) =>
                    setFormData({ ...formData, certificateIssued: e.target.value === 'yes' })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                >
                  <option value="no">No (Pending)</option>
                  <option value="yes">Yes (Certificate Given)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Student Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => {
                    const nextStatus = e.target.value as StudentStatus;
                    setFormData({
                      ...formData,
                      status: nextStatus,
                      courseCompleted: nextStatus === 'completed',
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white font-bold"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Remarks / Notes
            </label>
            <textarea
              rows={2}
              value={formData.internalNotes}
              onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
              placeholder="e.g. Installment date, batch preference, certificate remarks..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl shadow-md shadow-cyan-900/20 transition cursor-pointer"
            >
              {editingStudent ? 'Update Student Record' : 'Complete Admission'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete / Course Complete Management Modal */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title={`Manage Student: ${deleteTarget.fullName}`}
          subtitle={`Choose how to handle this student's profile (${deleteTarget.studentId})`}
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
                  onClick={async () => {
                    await markCourseCompleted(deleteTarget.id);
                    showToast(`Course completed for ${deleteTarget.fullName}! Workstation released.`, 'success');
                    setDeleteTarget(null);
                  }}
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
                  onClick={async () => {
                    await deleteStudent(deleteTarget.id, 'User manually archived');
                    showToast(`Student ${deleteTarget.fullName} archived.`, 'info');
                    setDeleteTarget(null);
                  }}
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
                  onClick={() => {
                    if (!isAdmin) {
                      showToast('Only administrators can permanently delete records from the database. You can use Option 1 (Mark Course Completed) or Option 2 (Archive).', 'error');
                      return;
                    }
                    setIsPermanentConfirmOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shrink-0 transition shadow-xs cursor-pointer"
                >
                  Permanent Delete
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Permanent Delete Warning */}
      <ConfirmDialog
        isOpen={isPermanentConfirmOpen}
        onClose={() => setIsPermanentConfirmOpen(false)}
        onConfirm={async () => {
          if (deleteTarget) {
            await permanentDeleteStudent(deleteTarget.id);
            showToast(`Student ${deleteTarget.fullName} permanently deleted.`, 'info');
            setDeleteTarget(null);
            setIsPermanentConfirmOpen(false);
          }
        }}
        title="Permanently Delete Student Record"
        message={`Are you absolutely sure you want to permanently erase "${deleteTarget?.fullName}" (${deleteTarget?.studentId}) from the database? This action cannot be undone.`}
        confirmText="Yes, Permanently Delete"
        isDestructive
      />

      {/* Confirm Reset Student Fees Only */}
      <ConfirmDialog
        isOpen={isResetFeesConfirmOpen}
        onClose={() => setIsResetFeesConfirmOpen(false)}
        onConfirm={async () => {
          await clearAllFeeHistoryAndResetBalances();
          showToast('All fee collection history deleted and student paid amounts reset to ₹0!', 'success');
          setIsResetFeesConfirmOpen(false);
        }}
        title="Reset All Student Fees & Clear Fee History"
        message="This will delete all fee payment history and reset every student's paid fee balance to ₹0 while keeping their student profile. Continue?"
        confirmText="Reset Fees & Clear History"
        isDestructive
      />

      {/* 12-Column CSV / Google Sheets Import Modal (Total Fees Auto-Fetched from Course) */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Active Students from CSV or Google Sheets"
        subtitle="12-Column Sequence (Total Fees Auto-Fetched from Course Catalog): GR.No, Admission Date, Student full name, Date of birth, Qualification, Mobile number, Emergency contact number, Address, Course, Batch time, Discount, Paid fees"
        maxWidth="3xl"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
            <div className="font-bold flex items-center justify-between">
              <span>12-Column Sequence (Total Fees Auto-Fetched from Course Catalog &amp; Supports Multi-Course):</span>
              <input
                ref={csvFileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const text = String(ev.target?.result || '');
                    setCsvImportText(text);
                    handleParseImportCsv(text);
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => csvFileInputRef.current?.click()}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
              >
                Choose .CSV File
              </button>
            </div>
            <div className="font-mono text-[11px] bg-white p-2 rounded-lg border border-emerald-200 text-slate-800 overflow-x-auto">
              GR.No, Admission Date, Student full name, Date of birth, Qualification, Mobile number, Emergency contact number, Address, Course, Batch time, Discount, Paid fees
            </div>
          </div>

          <textarea
            rows={5}
            value={csvImportText}
            onChange={(e) => setCsvImportText(e.target.value)}
            placeholder={`GR.No, Admission Date, Student full name, Date of birth, Qualification, Mobile number, Emergency contact number, Address, Course, Batch time, Discount, Paid fees\nGR-101, 2026-10-01, Aarav Patel, 2004-05-14, B.Com, 9825123456, 9825199999, "Navrangpura, Ahmedabad", "CCC + Tally Prime", 08:00 AM - 09:00 AM, 500, 4000`}
            className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => handleParseImportCsv(csvImportText)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Preview Rows &amp; Auto-Calculate Fees
            </button>
            {parsedCsvRows.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmCsvImport}
                disabled={isBulkImporting}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
              >
                {isBulkImporting ? 'Importing...' : `Import ${parsedCsvRows.length} Active Students`}
              </button>
            )}
          </div>

          {parsedCsvRows.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-x-auto max-h-64">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                  <tr>
                    <th className="py-2 px-2.5">GR.No</th>
                    <th className="py-2 px-2.5">Admission Date</th>
                    <th className="py-2 px-2.5">Full Name</th>
                    <th className="py-2 px-2.5">DOB</th>
                    <th className="py-2 px-2.5">Qualification</th>
                    <th className="py-2 px-2.5">Mobile</th>
                    <th className="py-2 px-2.5">Emergency Contact</th>
                    <th className="py-2 px-2.5">Address</th>
                    <th className="py-2 px-2.5">Course(s)</th>
                    <th className="py-2 px-2.5">Batch Time</th>
                    <th className="py-2 px-2.5">Total (Auto)</th>
                    <th className="py-2 px-2.5">Discount</th>
                    <th className="py-2 px-2.5">Paid</th>
                    <th className="py-2 px-2.5">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedCsvRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2 px-2.5 font-mono font-bold text-cyan-800">{r.grNo}</td>
                      <td className="py-2 px-2.5">{r.admissionDate}</td>
                      <td className="py-2 px-2.5 font-bold">{r.fullName}</td>
                      <td className="py-2 px-2.5">{r.dateOfBirth || '—'}</td>
                      <td className="py-2 px-2.5">{r.qualification || '—'}</td>
                      <td className="py-2 px-2.5 font-mono">{r.mobile}</td>
                      <td className="py-2 px-2.5 font-mono">{r.emergencyContact || '—'}</td>
                      <td className="py-2 px-2.5 max-w-[140px] truncate" title={r.address}>
                        {r.address || '—'}
                      </td>
                      <td className="py-2 px-2.5 font-semibold text-cyan-900">{r.courseName}</td>
                      <td className="py-2 px-2.5">{r.batchName}</td>
                      <td className="py-2 px-2.5 font-bold">
                        {formatINR(r.totalCourseFee)}{' '}
                        {r.isFeeAutoCalculated && (
                          <span className="px-1 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 text-[10px] font-bold">
                            Auto
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2.5">{formatINR(r.discount)}</td>
                      <td className="py-2 px-2.5 font-bold text-emerald-600">{formatINR(r.paidAmount)}</td>
                      <td className="py-2 px-2.5 font-black text-rose-600">{formatINR(r.outstandingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      {/* Confirm Reset All Students & Fees */}
      <ConfirmDialog
        isOpen={isResetAllConfirmOpen}
        onClose={() => setIsResetAllConfirmOpen(false)}
        onConfirm={async () => {
          await resetAllStudentsAndFees();
          showToast('All students and fee records have been completely reset!', 'success');
          setIsResetAllConfirmOpen(false);
        }}
        title="Reset All Students & Fees"
        message="This will permanently delete all student profiles, remove all fee payment history, and release all 14 computer lab workstations. Continue?"
        confirmText="Yes, Reset All Students & Fees"
        isDestructive
      />
    </div>
  );
};
