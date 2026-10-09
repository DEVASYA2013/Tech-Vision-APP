import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  BookOpen,
  Clock,
  UserPlus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Printer,
  ChevronDown,
  ChevronUp,
  Monitor,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import { Enquiry, EnquiryStatus, PaymentMethod } from '../types';
import { formatINR, formatDate, getTodayDateString } from '../utils/formatters';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const Enquiries: React.FC = () => {
  const {
    enquiries,
    courses,
    batches,
    seats,
    settings,
    addEnquiry,
    updateEnquiry,
    deleteEnquiry,
    convertEnquiryToStudent,
  } = useInstitute();
  const { showToast } = useToast();

  const today = getTodayDateString();
  const activeCourses = courses.filter((c) => c.isActive);
  const availableSeats = seats.filter((s) => s.status === 'available');
  const rowAAvailable = availableSeats.filter((s) => s.seatNumber.startsWith('A-'));
  const rowBAvailable = availableSeats.filter((s) => s.seatNumber.startsWith('B-'));

  // Toggle visibility of the inline Enquiry Form (open by default so user can immediately fill enquiries)
  const [isFormExpanded, setIsFormExpanded] = useState(true);
  const [editingEnquiry, setEditingEnquiry] = useState<Enquiry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const defaultCourse = activeCourses[0];
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    alternatePhone: '',
    email: '',
    address: '',
    qualification: 'College Student',
    courseId: defaultCourse?.courseId || 'CCC',
    preferredTiming: 'Morning (08:30 AM - 10:30 AM)',
    preferredRow: 'Any (14 Lab PCs)',
    quotedFee: defaultCourse?.standardFee || 3500,
    source: 'Walk-in',
    enquiryDate: today,
    followUpDate: today,
    status: 'new' as EnquiryStatus,
    notes: '',
  });

  // Update default course fee if courses load asynchronously and form is untouched
  useEffect(() => {
    if (!editingEnquiry && activeCourses.length > 0 && !formData.fullName) {
      const matched = activeCourses.find((c) => c.courseId === formData.courseId) || activeCourses[0];
      if (matched) {
        setFormData((prev) => ({
          ...prev,
          courseId: matched.courseId,
          quotedFee: matched.standardFee,
        }));
      }
    }
  }, [courses]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [courseFilter, setCourseFilter] = useState<string>('ALL');

  // Convert to Admission Modal state
  const [convertTarget, setConvertTarget] = useState<Enquiry | null>(null);
  const [convertBatchId, setConvertBatchId] = useState('');
  const [convertSeatId, setConvertSeatId] = useState('');
  const [convertTotalFee, setConvertTotalFee] = useState(0);
  const [convertDiscount, setConvertDiscount] = useState(0);
  const [convertInitialPayment, setConvertInitialPayment] = useState(0);
  const [convertPaymentMethod, setConvertPaymentMethod] = useState<PaymentMethod>('cash');
  const [isConverting, setIsConverting] = useState(false);

  // Print slip & Delete confirmation state
  const [printTarget, setPrintTarget] = useState<Enquiry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Enquiry | null>(null);

  const handleCourseChange = (newCourseId: string) => {
    const found = courses.find((c) => c.courseId === newCourseId);
    setFormData((prev) => ({
      ...prev,
      courseId: newCourseId,
      quotedFee: found ? found.standardFee : prev.quotedFee,
    }));
  };

  const resetForm = () => {
    const firstCourse = activeCourses[0];
    setEditingEnquiry(null);
    setFormData({
      fullName: '',
      mobile: '',
      alternatePhone: '',
      email: '',
      address: '',
      qualification: 'College Student',
      courseId: firstCourse?.courseId || 'CCC',
      preferredTiming: 'Morning (08:30 AM - 10:30 AM)',
      preferredRow: 'Any (14 Lab PCs)',
      quotedFee: firstCourse?.standardFee || 3500,
      source: 'Walk-in',
      enquiryDate: today,
      followUpDate: today,
      status: 'new',
      notes: '',
    });
  };

  const handleEditClick = (enq: Enquiry) => {
    setEditingEnquiry(enq);
    setFormData({
      fullName: enq.fullName,
      mobile: enq.mobile,
      alternatePhone: enq.alternatePhone || '',
      email: enq.email || '',
      address: enq.address || '',
      qualification: enq.qualification || 'College Student',
      courseId: enq.courseId,
      preferredTiming: enq.preferredTiming || 'Morning (08:30 AM - 10:30 AM)',
      preferredRow: enq.preferredRow || 'Any (14 Lab PCs)',
      quotedFee: enq.quotedFee || 0,
      source: enq.source || 'Walk-in',
      enquiryDate: enq.enquiryDate || today,
      followUpDate: enq.followUpDate || today,
      status: enq.status,
      notes: enq.notes || '',
    });
    setIsFormExpanded(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.mobile.trim()) {
      showToast('Please enter student name and mobile number.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCourse = courses.find((c) => c.courseId === formData.courseId);
      const courseName = selectedCourse ? selectedCourse.courseName : formData.courseId;

      if (editingEnquiry) {
        await updateEnquiry(editingEnquiry.id, {
          ...formData,
          courseName,
          quotedFee: Number(formData.quotedFee) || 0,
        });
        showToast(`Enquiry ${editingEnquiry.enquiryId} updated successfully!`, 'success');
      } else {
        await addEnquiry({
          ...formData,
          courseName,
          quotedFee: Number(formData.quotedFee) || 0,
        });
        showToast(`New enquiry for ${formData.fullName} saved!`, 'success');
      }
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save enquiry';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenConvert = (enq: Enquiry) => {
    const courseObj = courses.find((c) => c.courseId === enq.courseId);
    const stdFee = courseObj?.standardFee || enq.quotedFee || 4000;
    const impliedDiscount = Math.max(0, stdFee - (enq.quotedFee || stdFee));
    const matchingBatches = batches.filter((b) => b.courseId === enq.courseId && b.status === 'active');

    setConvertTarget(enq);
    setConvertBatchId(matchingBatches[0]?.batchId || batches[0]?.batchId || '');
    setConvertSeatId(availableSeats[0]?.seatNumber || '');
    setConvertTotalFee(stdFee);
    setConvertDiscount(impliedDiscount);
    setConvertInitialPayment(0);
    setConvertPaymentMethod('cash');
  };

  const handleConfirmConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertTarget) return;

    setIsConverting(true);
    try {
      const selectedBatch = batches.find((b) => b.batchId === convertBatchId);
      const newStudentId = await convertEnquiryToStudent(convertTarget.id, {
        batchId: selectedBatch?.batchId || '',
        batchName: selectedBatch?.batchName || '',
        assignedSeatId: convertSeatId,
        totalCourseFee: Number(convertTotalFee) || 0,
        discount: Number(convertDiscount) || 0,
        initialPayment: Number(convertInitialPayment) || 0,
        paymentMethod: convertPaymentMethod,
      });

      showToast(
        `Converted ${convertTarget.fullName} to Active Student (${newStudentId})!`,
        'success'
      );
      setConvertTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error converting enquiry';
      showToast(msg, 'error');
    } finally {
      setIsConverting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEnquiry(deleteTarget.id);
      showToast(`Enquiry for ${deleteTarget.fullName} deleted.`, 'info');
      setDeleteTarget(null);
    } catch {
      showToast('Failed to delete enquiry.', 'error');
    }
  };

  // Filtered enquiries
  const filteredEnquiries = enquiries.filter((e) => {
    const matchesSearch =
      e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.mobile.includes(searchQuery) ||
      e.enquiryId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.courseName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    const matchesCourse = courseFilter === 'ALL' || e.courseId === courseFilter;

    return matchesSearch && matchesStatus && matchesCourse;
  });

  // Summary metrics
  const newCount = enquiries.filter((e) => e.status === 'new').length;
  const followUpCount = enquiries.filter(
    (e) => e.status === 'follow_up' || e.status === 'demo_scheduled'
  ).length;
  const dueTodayCount = enquiries.filter(
    (e) =>
      (e.status === 'new' || e.status === 'follow_up' || e.status === 'demo_scheduled') &&
      e.followUpDate &&
      e.followUpDate <= today
  ).length;
  const convertedCount = enquiries.filter((e) => e.status === 'converted').length;

  const statusBadge = (status: EnquiryStatus) => {
    switch (status) {
      case 'new':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-50 text-cyan-700 border border-cyan-200">
            New Enquiry
          </span>
        );
      case 'follow_up':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
            Follow-Up
          </span>
        );
      case 'demo_scheduled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">
            Demo Class
          </span>
        );
      case 'converted':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
            Converted ✓
          </span>
        );
      case 'closed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
            Closed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-cyan-600" />
            Student Course Enquiries & Admission Form
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Fill out new walk-in or phone enquiries, schedule follow-ups, and convert leads to active students across your 14-computer lab.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsFormExpanded(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-950/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Fill New Enquiry Form
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Enquiries</span>
            <ClipboardList className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{enquiries.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{newCount} brand new leads</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Active Follow-Ups</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600">{followUpCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">In pipeline / Demo class</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Follow-Ups Due Today</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600">{dueTodayCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Requires call or reminder</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Converted to Admission</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">{convertedCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {availableSeats.length} of 14 Lab PCs free (A:{rowAAvailable.length}, B:{rowBAvailable.length})
          </div>
        </div>
      </div>

      {/* ENQUIRY FORM CARD */}
      <div className="rounded-2xl bg-white border-2 border-cyan-500/30 shadow-md overflow-hidden">
        <div
          onClick={() => setIsFormExpanded(!isFormExpanded)}
          className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold tracking-tight flex items-center gap-2">
                {editingEnquiry
                  ? `Edit Enquiry Record — ${editingEnquiry.enquiryId}`
                  : 'Course Enquiry Registration Form'}
                {editingEnquiry && (
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-black uppercase">
                    Editing Mode
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-300">
                Fill visitor details, interested computer course, preferred batch time, and follow-up date.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            {isFormExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {isFormExpanded && (
          <form onSubmit={handleSubmitForm} className="p-6 space-y-5 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Student Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Visitor / Student Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Kavan Patel"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile / WhatsApp Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="e.g. 9825012345"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                />
              </div>

              {/* Alternate / Parent Mobile */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Parent / Alternate Number
                </label>
                <input
                  type="tel"
                  value={formData.alternatePhone}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                  placeholder="Optional alternate phone"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                />
              </div>

              {/* Email */}
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

              {/* Interested Course */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Interested Course *
                </label>
                <select
                  value={formData.courseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                >
                  {courses.map((c) => (
                    <option key={c.courseId} value={c.courseId}>
                      {c.courseName} ({formatINR(c.standardFee)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quoted Fee */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quoted / Offered Fee (₹) *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={formData.quotedFee}
                  onChange={(e) => setFormData({ ...formData, quotedFee: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                />
              </div>

              {/* Preferred Batch Timing */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Preferred Batch Timing
                </label>
                <select
                  value={formData.preferredTiming}
                  onChange={(e) => setFormData({ ...formData, preferredTiming: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                >
                  <option value="Morning (08:30 AM - 10:30 AM)">Morning (08:30 AM - 10:30 AM)</option>
                  <option value="Late Morning (10:30 AM - 12:30 PM)">Late Morning (10:30 AM - 12:30 PM)</option>
                  <option value="Afternoon (02:00 PM - 04:00 PM)">Afternoon (02:00 PM - 04:00 PM)</option>
                  <option value="Evening (04:00 PM - 06:00 PM)">Evening (04:00 PM - 06:00 PM)</option>
                  <option value="Late Evening (06:00 PM - 08:00 PM)">Late Evening (06:00 PM - 08:00 PM)</option>
                  <option value="Weekend Special Batch">Weekend Special Batch</option>
                </select>
              </div>

              {/* Preferred Computer Row */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Preferred Lab Row (14 PCs)
                </label>
                <select
                  value={formData.preferredRow}
                  onChange={(e) => setFormData({ ...formData, preferredRow: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                >
                  <option value="Any (14 Lab PCs)">Any Available (14 PCs Total)</option>
                  <option value="Row A (5 PCs: A-01 to A-05)">Row A — 5 Computers (A-01 to A-05)</option>
                  <option value="Row B (9 PCs: B-01 to B-09)">Row B — 9 Computers (B-01 to B-09)</option>
                </select>
              </div>

              {/* Qualification / Occupation */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Qualification / Current Profile
                </label>
                <select
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                >
                  <option value="10th / 12th School Student">10th / 12th School Student</option>
                  <option value="College Student (B.Com / BCA / BBA / BA)">College Student (B.Com / BCA / BBA / BA)</option>
                  <option value="Engineering / IT Student">Engineering / IT Student</option>
                  <option value="Working Professional / Job">Working Professional / Job</option>
                  <option value="Job Seeker / Govt Exam Aspirant">Job Seeker / Govt Exam Aspirant</option>
                  <option value="Business Owner / Self-Employed">Business Owner / Self-Employed</option>
                  <option value="Homemaker">Homemaker</option>
                </select>
              </div>

              {/* Enquiry Source */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  How Did They Hear About Us?
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                >
                  <option value="Walk-in">Direct Walk-in</option>
                  <option value="Phone Call">Phone Enquiry</option>
                  <option value="Student Referral">Existing Student Referral</option>
                  <option value="Google / Maps">Google Search / Maps</option>
                  <option value="Instagram / Facebook">Instagram / WhatsApp / Social</option>
                  <option value="Banner / Pamphlet">Local Banner / Pamphlet</option>
                </select>
              </div>

              {/* Enquiry Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enquiry Date
                </label>
                <input
                  type="date"
                  value={formData.enquiryDate}
                  onChange={(e) => setFormData({ ...formData, enquiryDate: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                />
              </div>

              {/* Next Follow-Up Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Next Follow-Up Reminder Date
                </label>
                <input
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Residential Area / Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Residential Area / Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Panjrapole, Ambawadi, Navrangpura, Paldi..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                />
              </div>

              {/* Enquiry Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enquiry Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as EnquiryStatus })
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                >
                  <option value="new">New Enquiry</option>
                  <option value="follow_up">Follow-Up In Progress</option>
                  <option value="demo_scheduled">Demo Lecture Scheduled</option>
                  <option value="converted">Converted to Admission</option>
                  <option value="closed">Closed / Not Joining</option>
                </select>
              </div>

              {/* Remarks / Counseling Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Counseling Remarks / Notes
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Wants demo class on Monday at 9 AM, interested in certificate..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-cyan-600" />
                <span>
                  Classroom Lab Availability: <strong>{availableSeats.length} / 14 Computers Free</strong> (Row A: {rowAAvailable.length}/5 • Row B: {rowBAvailable.length}/9)
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {editingEnquiry ? 'Cancel Edit' : 'Clear Form'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition shadow-md shadow-cyan-950/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting
                    ? 'Saving Enquiry...'
                    : editingEnquiry
                    ? 'Update Enquiry Record'
                    : 'Save Enquiry Form'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100">
          {[
            { id: 'ALL', label: `All Enquiries (${enquiries.length})` },
            { id: 'new', label: `New (${newCount})` },
            { id: 'follow_up', label: `Follow-Up (${enquiries.filter((e) => e.status === 'follow_up').length})` },
            { id: 'demo_scheduled', label: `Demo Scheduled (${enquiries.filter((e) => e.status === 'demo_scheduled').length})` },
            { id: 'converted', label: `Converted (${convertedCount})` },
            { id: 'closed', label: `Closed (${enquiries.filter((e) => e.status === 'closed').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by visitor name, mobile number, enquiry ID, or course..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
            />
          </div>

          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
          >
            <option value="ALL">All Courses</option>
            {courses.map((c) => (
              <option key={c.courseId} value={c.courseId}>
                {c.courseName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Enquiries Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Recorded Enquiries Log ({filteredEnquiries.length})
          </span>
          <span className="text-[11px] text-slate-500">
            Click &ldquo;Admit Student&rdquo; on any enquiry to assign a batch and computer seat (Row A or Row B).
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Enquiry ID & Date</th>
                <th className="py-3.5 px-4">Visitor / Candidate</th>
                <th className="py-3.5 px-4">Interested Course</th>
                <th className="py-3.5 px-4">Timing & Row Pref</th>
                <th className="py-3.5 px-4">Follow-Up</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEnquiries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No enquiries found matching your filter. Fill out the Course Enquiry Form above to add one!
                  </td>
                </tr>
              ) : (
                filteredEnquiries.map((enq) => {
                  const isDue =
                    (enq.status === 'new' ||
                      enq.status === 'follow_up' ||
                      enq.status === 'demo_scheduled') &&
                    enq.followUpDate &&
                    enq.followUpDate <= today;

                  return (
                    <tr key={enq.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">{enq.enquiryId}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {formatDate(enq.enquiryDate)} • {enq.source}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {enq.fullName}
                          {enq.isDemo && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold">
                              DEMO
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5 font-medium">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-cyan-600" />
                            {enq.mobile}
                          </span>
                          {enq.address && (
                            <span className="text-slate-400 truncate max-w-[140px]">
                              • {enq.address}
                            </span>
                          )}
                        </div>
                        {enq.qualification && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {enq.qualification}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{enq.courseName}</div>
                        <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                          Quoted Fee: {formatINR(enq.quotedFee)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-700 font-medium">
                          {enq.preferredTiming || 'Flexible'}
                        </div>
                        <div className="text-[10px] text-cyan-700 font-semibold mt-0.5">
                          {enq.preferredRow || 'Any Lab Row'}
                        </div>
                        {enq.notes && (
                          <div
                            className="text-[10px] text-slate-400 italic truncate max-w-[180px] mt-0.5"
                            title={enq.notes}
                          >
                            &ldquo;{enq.notes}&rdquo;
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {enq.followUpDate ? (
                          <div>
                            <div
                              className={`font-bold ${
                                isDue ? 'text-rose-600' : 'text-slate-700'
                              }`}
                            >
                              {formatDate(enq.followUpDate)}
                            </div>
                            {isDue && (
                              <span className="inline-block text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 mt-0.5">
                                Follow-up Due
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div>{statusBadge(enq.status)}</div>
                        {enq.convertedStudentId && (
                          <div className="text-[10px] font-mono text-emerald-700 font-bold mt-1">
                            ID: {enq.convertedStudentId}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {enq.status !== 'converted' && (
                            <button
                              type="button"
                              onClick={() => handleOpenConvert(enq)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                              title="Convert Enquiry to Enrolled Student"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Admit Student
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setPrintTarget(enq)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                            title="Print Enquiry Slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditClick(enq)}
                            className="p-1.5 rounded-lg text-cyan-600 hover:bg-cyan-50 transition cursor-pointer"
                            title="Edit Enquiry"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(enq)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Enquiry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* Convert Enquiry to Student Admission Modal */}
      {convertTarget && (
        <Modal
          isOpen={!!convertTarget}
          onClose={() => setConvertTarget(null)}
          title={`Confirm Admission — ${convertTarget.fullName}`}
          subtitle={`Convert Enquiry ${convertTarget.enquiryId} (${convertTarget.courseName}) into an enrolled Student and allocate one of your 14 computers.`}
          maxWidth="lg"
        >
          <form onSubmit={handleConfirmConvert} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">Candidate:</span>{' '}
                <strong className="text-slate-900">{convertTarget.fullName}</strong>
              </div>
              <div>
                <span className="text-slate-400">Mobile:</span>{' '}
                <strong className="text-slate-900">{convertTarget.mobile}</strong>
              </div>
              <div>
                <span className="text-slate-400">Course:</span>{' '}
                <strong className="text-cyan-700">{convertTarget.courseName}</strong>
              </div>
              <div>
                <span className="text-slate-400">Quoted Fee:</span>{' '}
                <strong className="text-emerald-700">{formatINR(convertTarget.quotedFee)}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assign Class Batch
                </label>
                <select
                  value={convertBatchId}
                  onChange={(e) => setConvertBatchId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                >
                  <option value="">-- Unassigned / Select Later --</option>
                  {batches
                    .filter((b) => b.status === 'active')
                    .map((b) => (
                      <option key={b.batchId} value={b.batchId}>
                        {b.batchName} ({b.startTime} - {b.endTime})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Allocate Computer Seat (14 Lab PCs)
                </label>
                <select
                  value={convertSeatId}
                  onChange={(e) => setConvertSeatId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                >
                  <option value="">-- Do Not Assign Seat Yet --</option>
                  <optgroup label="Row A — 5 Computers (A-01 to A-05)">
                    {seats
                      .filter((s) => s.seatNumber.startsWith('A-'))
                      .map((s) => (
                        <option
                          key={s.seatNumber}
                          value={s.seatNumber}
                          disabled={s.status !== 'available'}
                        >
                          {s.seatNumber} — {s.status === 'available' ? 'Available' : `Occupied (${s.assignedStudentName})`}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Row B — 9 Computers (B-01 to B-09)">
                    {seats
                      .filter((s) => s.seatNumber.startsWith('B-'))
                      .map((s) => (
                        <option
                          key={s.seatNumber}
                          value={s.seatNumber}
                          disabled={s.status !== 'available'}
                        >
                          {s.seatNumber} — {s.status === 'available' ? 'Available' : `Occupied (${s.assignedStudentName})`}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Standard Course Fee (₹)
                </label>
                <input
                  type="number"
                  value={convertTotalFee}
                  onChange={(e) => setConvertTotalFee(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fee Discount (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={convertDiscount}
                  onChange={(e) => setConvertDiscount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Initial Fee Collected Today (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={convertInitialPayment}
                  onChange={(e) => setConvertInitialPayment(Number(e.target.value))}
                  placeholder="0 if paying later"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Mode
                </label>
                <select
                  value={convertPaymentMethod}
                  onChange={(e) => setConvertPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="bank_transfer">Bank Transfer / NEFT</option>
                  <option value="card">Debit / Credit Card</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-900">
                Net Payable Fee:{' '}
                <strong>{formatINR(Math.max(0, convertTotalFee - convertDiscount))}</strong>
              </span>
              <span className="font-semibold text-emerald-800">
                Balance Due After Today:{' '}
                <strong>
                  {formatINR(
                    Math.max(0, convertTotalFee - convertDiscount - convertInitialPayment)
                  )}
                </strong>
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConvertTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isConverting}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {isConverting ? 'Enrolling Student...' : 'Confirm & Create Admission'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Printable Enquiry Slip Modal */}
      {printTarget && (
        <Modal
          isOpen={!!printTarget}
          onClose={() => setPrintTarget(null)}
          title={`Course Enquiry Slip — ${printTarget.enquiryId}`}
          subtitle="Printable counseling summary sheet for student & office records."
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-5 rounded-2xl border-2 border-slate-800 bg-white space-y-3 text-xs">
              <div className="border-b border-slate-200 pb-3 text-center">
                <div className="text-base font-black text-slate-900 uppercase">
                  {settings.instituteName || 'TECH VISION COMPUTER CLASS'}
                </div>
                <div className="text-[11px] text-slate-500">{settings.address}</div>
                <div className="text-[11px] font-semibold text-cyan-700 mt-0.5">
                  Phone: {settings.phone} • 14-Computer Practical Lab (Row A: 5, Row B: 9)
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-100 px-3 py-1.5 rounded-lg font-bold">
                <span>ENQUIRY NO: {printTarget.enquiryId}</span>
                <span>DATE: {formatDate(printTarget.enquiryDate)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 py-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">CANDIDATE NAME</span>
                  <span className="font-bold text-slate-900 text-sm">{printTarget.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">MOBILE NUMBER</span>
                  <span className="font-bold text-slate-900 text-sm">{printTarget.mobile}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">INTERESTED COURSE</span>
                  <span className="font-bold text-cyan-700">{printTarget.courseName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">QUOTED COURSE FEE</span>
                  <span className="font-bold text-emerald-700">{formatINR(printTarget.quotedFee)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">PREFERRED TIMING</span>
                  <span className="font-semibold text-slate-800">
                    {printTarget.preferredTiming || 'Flexible'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">PREFERRED LAB ROW</span>
                  <span className="font-semibold text-slate-800">
                    {printTarget.preferredRow || 'Any (14 PCs)'}
                  </span>
                </div>
              </div>

              {printTarget.notes && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-bold">
                    COUNSELOR REMARKS
                  </span>
                  <p className="text-slate-700 mt-0.5">{printTarget.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t border-dashed border-slate-300 flex justify-between text-[10px] text-slate-500">
                <span>Counselor: {printTarget.handledByName || 'Institute Desk'}</span>
                <span>Next Follow-Up: {formatDate(printTarget.followUpDate || today)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPrintTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Slip
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Delete Enquiry Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Enquiry Record"
        message={`Are you sure you want to delete the enquiry record for ${deleteTarget?.fullName} (${deleteTarget?.enquiryId})?`}
        confirmText="Delete Enquiry"
      />
    </div>
  );
};
