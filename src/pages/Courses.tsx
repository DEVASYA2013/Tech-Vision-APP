import React, { useState } from 'react';
import { BookOpen, Plus, Edit, Trash2, Users, Clock, IndianRupee, CheckCircle } from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import { useAuth } from '../context/AuthContext';
import { Course } from '../types';
import { formatINR } from '../utils/formatters';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const Courses: React.FC = () => {
  const { courses, students, addCourse, updateCourse, deleteCourse } = useInstitute();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);

  const [formData, setFormData] = useState({
    courseId: '',
    courseName: '',
    description: '',
    duration: '',
    standardFee: 3500,
    sessionsCount: 45,
    isActive: true,
  });

  const handleOpenAdd = () => {
    setEditingCourse(null);
    setFormData({
      courseId: `COURSE_${Date.now().toString().slice(-4)}`,
      courseName: '',
      description: '',
      duration: '3 Months',
      standardFee: 4000,
      sessionsCount: 60,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Course) => {
    setEditingCourse(c);
    setFormData({
      courseId: c.courseId,
      courseName: c.courseName,
      description: c.description,
      duration: c.duration,
      standardFee: c.standardFee,
      sessionsCount: c.sessionsCount || 45,
      isActive: c.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseName.trim() || !formData.courseId.trim()) {
      showToast('Please enter Course Name and Code.', 'error');
      return;
    }

    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, {
          courseName: formData.courseName.trim(),
          description: formData.description.trim(),
          duration: formData.duration.trim(),
          standardFee: Number(formData.standardFee),
          sessionsCount: Number(formData.sessionsCount),
          isActive: formData.isActive,
        });
        showToast(`Course "${formData.courseName}" updated. Note: Existing enrolled students retain agreed fees.`, 'success');
      } else {
        await addCourse({
          courseId: formData.courseId.trim().toUpperCase().replace(/\s+/g, '_'),
          courseName: formData.courseName.trim(),
          description: formData.description.trim(),
          duration: formData.duration.trim(),
          standardFee: Number(formData.standardFee),
          sessionsCount: Number(formData.sessionsCount),
          isActive: formData.isActive,
        });
        showToast(`Course "${formData.courseName}" created!`, 'success');
      }
      setIsModalOpen(false);
    } catch {
      showToast('Error saving course.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-cyan-600" />
            Course Catalog & Pricing
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure offered computer courses, syllabus durations, and standard fees.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-900/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Course
          </button>
        )}
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map((course) => {
          const enrolledCount = students.filter(
            (s) => s.courseId === course.courseId && s.status === 'active'
          ).length;

          return (
            <div
              key={course.courseId}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
                    {course.courseId}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      course.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {course.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                  {course.courseName}
                </h3>
                <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                  {course.description || 'Comprehensive practical computer training module.'}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Fee</span>
                    <div className="font-black text-slate-900 mt-0.5">{formatINR(course.standardFee)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Duration</span>
                    <div className="font-bold text-slate-800 mt-0.5">{course.duration}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Enrolled</span>
                    <div className="font-black text-cyan-700 mt-0.5">{enrolledCount}</div>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenEdit(course)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(course)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Delete Course"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Course Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCourse ? `Edit Course: ${editingCourse.courseName}` : 'Add New Course'}
        subtitle="Changes to standard fee will not affect already-enrolled students."
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Course Code / ID *
              </label>
              <input
                type="text"
                required
                disabled={!!editingCourse}
                value={formData.courseId}
                onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                placeholder="e.g. PYTHON / CCC / ADV_EXCEL"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Course Full Title *
              </label>
              <input
                type="text"
                required
                value={formData.courseName}
                onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                placeholder="e.g. Python Programming Masterclass"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Duration
              </label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g. 3 Months / 60 Hours"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Standard Course Fee (₹) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.standardFee}
                onChange={(e) => setFormData({ ...formData, standardFee: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Course Description & Syllabus Highlights
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Outline what students will learn..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
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
              className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-md shadow-cyan-900/20 transition cursor-pointer"
            >
              {editingCourse ? 'Save Changes' : 'Create Course'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Course Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteCourse(deleteTarget.id);
            showToast(`Course "${deleteTarget.courseName}" deleted.`, 'info');
          }
        }}
        title="Delete Course"
        message={`Are you sure you want to delete course "${deleteTarget?.courseName}"? Existing student records will retain their course names.`}
        confirmText="Delete Course"
        isDestructive
      />
    </div>
  );
};
