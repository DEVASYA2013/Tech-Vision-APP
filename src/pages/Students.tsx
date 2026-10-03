import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Download,
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
} from 'lucide-react';
import { Student, StudentStatus } from '../types';
import { useInstitute } from '../context/InstituteContext';
import { useAuth } from '../context/AuthContext';
import { formatINR, formatDate, getTodayDateString, isValidIndianMobile } from '../utils/formatters';
import { exportToCSV } from '../utils/csvExport';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StudentProfile } from './StudentProfile';

export const Students: React.FC = () => {
  const {
    students,
    courses,
    batches,
    seats,
    addStudent,
    updateStudent,
    deleteStudent,
    markCourseCompleted,
    permanentDeleteStudent,
  } = useInstitute();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  // Selected student for Profile View
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

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

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    email: '',
    address: '',
    emergencyContact: '',
    courseId: '',
    batchId: '',
    admissionDate: getTodayDateString(),
    startDate: getTodayDateString(),
    expectedEndDate: '',
    totalCourseFee: 0,
    discount: 0,
    assignedSeatId: '',
    status: 'active' as StudentStatus,
    internalNotes: '',
  });

  // Filtered & Sorted List
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        const matchesSearch =
          s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.mobile.includes(searchTerm);

        const matchesCourse = selectedCourse === 'all' || s.courseId === selectedCourse;
        const matchesBatch = selectedBatch === 'all' || s.batchId === selectedBatch;
        const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;

        return matchesSearch && matchesCourse && matchesBatch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.fullName.localeCompare(b.fullName);
        if (sortBy === 'date') return b.admissionDate.localeCompare(a.admissionDate);
        if (sortBy === 'balance') return (b.outstandingBalance || 0) - (a.outstandingBalance || 0);
        return 0;
      });
  }, [students, searchTerm, selectedCourse, selectedBatch, selectedStatus, sortBy]);

  // Paginated List
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setFormData({
      fullName: '',
      mobile: '',
      email: '',
      address: '',
      emergencyContact: '',
      courseId: courses[0]?.courseId || '',
      batchId: batches[0]?.batchId || '',
      admissionDate: getTodayDateString(),
      startDate: getTodayDateString(),
      expectedEndDate: '',
      totalCourseFee: courses[0]?.standardFee || 4000,
      discount: 0,
      assignedSeatId: '',
      status: 'active',
      internalNotes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      fullName: student.fullName,
      mobile: student.mobile,
      email: student.email || '',
      address: student.address || '',
      emergencyContact: student.emergencyContact || '',
      courseId: student.courseId,
      batchId: student.batchId || '',
      admissionDate: student.admissionDate,
      startDate: student.startDate || '',
      expectedEndDate: student.expectedEndDate || '',
      totalCourseFee: student.totalCourseFee,
      discount: student.discount,
      assignedSeatId: student.assignedSeatId || '',
      status: student.status,
      internalNotes: student.internalNotes || '',
    });
    setIsModalOpen(true);
  };

  const handleCourseChange = (courseId: string) => {
    const found = courses.find((c) => c.courseId === courseId);
    setFormData((prev) => ({
      ...prev,
      courseId,
      totalCourseFee: found?.standardFee || prev.totalCourseFee,
    }));
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.mobile.trim() || !formData.courseId) {
      showToast('Please fill in student name, mobile, and course.', 'error');
      return;
    }

    if (!isValidIndianMobile(formData.mobile)) {
      showToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    // Check potential duplicate phone number warning
    const duplicate = students.find(
      (s) => s.mobile === formData.mobile && s.id !== editingStudent?.id
    );
    if (duplicate && !editingStudent) {
      const confirmDup = window.confirm(
        `Notice: A student (${duplicate.fullName}, ID: ${duplicate.studentId}) is already registered with mobile number ${formData.mobile}. Do you wish to proceed with this admission?`
      );
      if (!confirmDup) return;
    }

    const selectedCourseObj = courses.find((c) => c.courseId === formData.courseId);
    const selectedBatchObj = batches.find((b) => b.batchId === formData.batchId);

    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, {
          fullName: formData.fullName.trim(),
          mobile: formData.mobile.trim(),
          email: formData.email.trim(),
          address: formData.address.trim(),
          emergencyContact: formData.emergencyContact.trim(),
          courseId: formData.courseId,
          courseName: selectedCourseObj?.courseName || formData.courseId,
          batchId: formData.batchId,
          batchName: selectedBatchObj?.batchName || '',
          admissionDate: formData.admissionDate,
          startDate: formData.startDate,
          expectedEndDate: formData.expectedEndDate,
          totalCourseFee: Number(formData.totalCourseFee),
          discount: Number(formData.discount),
          assignedSeatId: formData.assignedSeatId,
          status: formData.status,
          internalNotes: formData.internalNotes,
        });
        showToast(`Student record "${formData.fullName}" updated successfully!`, 'success');
        if (selectedStudent?.id === editingStudent.id) {
          setSelectedStudent({
            ...selectedStudent,
            ...formData,
            courseName: selectedCourseObj?.courseName || formData.courseId,
            batchName: selectedBatchObj?.batchName || '',
            totalCourseFee: Number(formData.totalCourseFee),
            discount: Number(formData.discount),
          });
        }
      } else {
        await addStudent({
          studentId: '', // Context will auto-generate TV-2026-XXX
          fullName: formData.fullName.trim(),
          mobile: formData.mobile.trim(),
          email: formData.email.trim(),
          address: formData.address.trim(),
          emergencyContact: formData.emergencyContact.trim(),
          courseId: formData.courseId,
          courseName: selectedCourseObj?.courseName || formData.courseId,
          batchId: formData.batchId,
          batchName: selectedBatchObj?.batchName || '',
          admissionDate: formData.admissionDate,
          startDate: formData.startDate,
          expectedEndDate: formData.expectedEndDate,
          totalCourseFee: Number(formData.totalCourseFee),
          discount: Number(formData.discount),
          netPayable: Math.max(0, Number(formData.totalCourseFee) - Number(formData.discount)),
          assignedSeatId: formData.assignedSeatId,
          status: formData.status,
          internalNotes: formData.internalNotes,
        });
        showToast(`New student "${formData.fullName}" admitted successfully!`, 'success');
      }
      setIsModalOpen(false);
    } catch {
      showToast('Error saving student record.', 'error');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Student ID',
      'Full Name',
      'Mobile',
      'Email',
      'Course',
      'Batch',
      'Admission Date',
      'Total Fee',
      'Discount',
      'Net Payable',
      'Paid Amount',
      'Outstanding Balance',
      'Seat',
      'Status',
    ];
    const rows = filteredStudents.map((s) => [
      s.studentId,
      s.fullName,
      s.mobile,
      s.email || '',
      s.courseName,
      s.batchName || '',
      s.admissionDate,
      s.totalCourseFee,
      s.discount,
      s.netPayable,
      s.paidAmount,
      s.outstandingBalance,
      s.assignedSeatId || '',
      s.status,
    ]);
    exportToCSV('TechVision_Students_Directory', headers, rows);
    showToast('Students directory exported to CSV!', 'success');
  };

  // If a student is selected, display complete StudentProfile
  if (selectedStudent) {
    const liveStudent = students.find((s) => s.id === selectedStudent.id) || selectedStudent;
    return (
      <StudentProfile
        student={liveStudent}
        onBack={() => setSelectedStudent(null)}
        onEdit={(st) => handleOpenEditModal(st)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
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

        <div className="flex items-center gap-2.5">
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
              placeholder="Search by student name, ID, or mobile..."
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

          {/* Filter Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white text-slate-700 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
              <option value="inactive">Inactive / Archived</option>
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

      {/* Students Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Course & Batch</th>
                <th className="py-3 px-4">Workstation</th>
                <th className="py-3 px-4">Fee Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No student records match the search criteria.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {s.studentId}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{s.fullName}</div>
                      <div className="text-[11px] text-slate-400">Admitted: {formatDate(s.admissionDate)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{s.mobile}</div>
                      {s.email && <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{s.email}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{s.courseName}</div>
                      <div className="text-[11px] text-slate-500">{s.batchName || 'General'}</div>
                    </td>
                    <td className="py-3 px-4">
                      {s.assignedSeatId ? (
                        <span className="font-mono font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                          {s.assignedSeatId}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div
                        className={`font-black ${
                          s.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {formatINR(s.outstandingBalance)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Paid: {formatINR(s.paidAmount)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedStudent(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 transition"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Edit Student"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {s.status === 'active' && (
                          <button
                            onClick={async () => {
                              await markCourseCompleted(s.id);
                              showToast(`Course completed for ${s.fullName}! Workstation released.`, 'success');
                            }}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition flex items-center gap-1 cursor-pointer"
                            title="Mark Course Completed (Frees workstation terminal)"
                          >
                            <Award className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="hidden xl:inline">Course Over</span>
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete student profile or mark course completed"
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

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? `Edit Student: ${editingStudent.fullName}` : 'New Student Admission'}
        subtitle="Complete the student enrollment form and assign lab workstation."
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveStudent} className="space-y-4">
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
                Mobile Number *
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
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="student@example.com"
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

          <div>
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

          {/* Academic Enrollment Section */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Course & Batch Assignment
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enrolled Course *
                </label>
                <select
                  value={formData.courseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white font-medium"
                >
                  {courses.map((c) => (
                    <option key={c.courseId} value={c.courseId}>
                      {c.courseName} (Standard: ₹{c.standardFee})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Batch Schedule
                </label>
                <select
                  value={formData.batchId}
                  onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white font-medium"
                >
                  <option value="">No Batch / Self-Paced</option>
                  {batches.map((b) => (
                    <option key={b.batchId} value={b.batchId}>
                      {b.batchName} ({b.startTime} - {b.endTime})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assign Computer Lab Workstation
                </label>
                <select
                  value={formData.assignedSeatId}
                  onChange={(e) => setFormData({ ...formData, assignedSeatId: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white font-medium"
                >
                  <option value="">No Dedicated Seat (Open Lab)</option>
                  {seats.map((s) => (
                    <option
                      key={s.seatNumber}
                      value={s.seatNumber}
                      disabled={s.status === 'occupied' && s.assignedStudentId !== editingStudent?.studentId}
                    >
                      {s.seatNumber} {s.status === 'occupied' && s.assignedStudentId !== editingStudent?.studentId ? `(Occupied: ${s.assignedStudentName})` : '(Available)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Student Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as StudentStatus })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white font-medium"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Fee Calculation Section */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Fee Agreement
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Approved Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Net Payable Amount
                </label>
                <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-black text-emerald-700">
                  {formatINR(Math.max(0, formData.totalCourseFee - formData.discount))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Internal Faculty Notes (Restricted)
            </label>
            <textarea
              rows={2}
              value={formData.internalNotes}
              onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
              placeholder="e.g. Prior coding background, corporate discount, timing preference"
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
    </div>
  );
};
