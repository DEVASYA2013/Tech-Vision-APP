import React, { useState } from 'react';
import {
  GraduationCap,
  Plus,
  Clock,
  Calendar,
  Users,
  AlertCircle,
  Edit,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import { useAuth } from '../context/AuthContext';
import { Batch } from '../types';
import { formatDate } from '../utils/formatters';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const Batches: React.FC = () => {
  const { batches, courses, students, addBatch, updateBatch, deleteBatch } = useInstitute();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'timetable'>('cards');

  const [formData, setFormData] = useState({
    batchId: '',
    batchName: '',
    courseId: '',
    startDate: '',
    endDate: '',
    daysOfWeek: ['Mon', 'Wed', 'Fri'],
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    maxCapacity: 15,
    instructorName: '',
    status: 'active' as Batch['status'],
  });

  const daysOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleOpenAdd = () => {
    setEditingBatch(null);
    setFormData({
      batchId: `BATCH_${Date.now().toString().slice(-4)}`,
      batchName: '',
      courseId: courses[0]?.courseId || '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      daysOfWeek: ['Mon', 'Wed', 'Fri'],
      startTime: '09:00 AM',
      endTime: '10:30 AM',
      maxCapacity: 15,
      instructorName: 'Hardik Shah',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: Batch) => {
    setEditingBatch(b);
    setFormData({
      batchId: b.batchId,
      batchName: b.batchName,
      courseId: b.courseId,
      startDate: b.startDate,
      endDate: b.endDate,
      daysOfWeek: b.daysOfWeek || ['Mon', 'Wed', 'Fri'],
      startTime: b.startTime,
      endTime: b.endTime,
      maxCapacity: b.maxCapacity,
      instructorName: b.instructorName || '',
      status: b.status,
    });
    setIsModalOpen(true);
  };

  const toggleDay = (day: string) => {
    setFormData((prev) => {
      const exists = prev.daysOfWeek.includes(day);
      return {
        ...prev,
        daysOfWeek: exists
          ? prev.daysOfWeek.filter((d) => d !== day)
          : [...prev.daysOfWeek, day],
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.batchName.trim() || !formData.courseId) {
      showToast('Please specify Batch Name and Course.', 'error');
      return;
    }

    const selectedCourseObj = courses.find((c) => c.courseId === formData.courseId);

    try {
      if (editingBatch) {
        await updateBatch(editingBatch.id, {
          batchName: formData.batchName.trim(),
          courseId: formData.courseId,
          courseName: selectedCourseObj?.courseName || formData.courseId,
          startDate: formData.startDate,
          endDate: formData.endDate,
          daysOfWeek: formData.daysOfWeek,
          startTime: formData.startTime,
          endTime: formData.endTime,
          maxCapacity: Number(formData.maxCapacity),
          instructorName: formData.instructorName.trim(),
          status: formData.status,
        });
        showToast(`Batch "${formData.batchName}" updated!`, 'success');
      } else {
        await addBatch({
          batchId: formData.batchId.trim().toUpperCase().replace(/\s+/g, '_'),
          batchName: formData.batchName.trim(),
          courseId: formData.courseId,
          courseName: selectedCourseObj?.courseName || formData.courseId,
          startDate: formData.startDate,
          endDate: formData.endDate,
          daysOfWeek: formData.daysOfWeek,
          startTime: formData.startTime,
          endTime: formData.endTime,
          maxCapacity: Number(formData.maxCapacity),
          instructorName: formData.instructorName.trim(),
          status: formData.status,
        });
        showToast(`Batch "${formData.batchName}" created!`, 'success');
      }
      setIsModalOpen(false);
    } catch {
      showToast('Error saving batch.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-cyan-600" />
            Class Batches & Timetable
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage student batch timings, weekly lecture timetable, and seat capacities.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Batch Cards
            </button>
            <button
              onClick={() => setViewMode('timetable')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'timetable' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Weekly Timetable
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-900/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Batch
            </button>
          )}
        </div>
      </div>

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {batches.map((batch) => {
            const enrolled = students.filter(
              (s) => s.batchId === batch.batchId && s.status === 'active'
            );
            const isFull = enrolled.length >= batch.maxCapacity;

            return (
              <div
                key={batch.batchId}
                className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {batch.batchId}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        isFull
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isFull ? 'Batch Full' : `${batch.maxCapacity - enrolled.length} Seats Free`}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900">{batch.batchName}</h3>
                  <div className="text-xs font-semibold text-cyan-700 mt-1">{batch.courseName}</div>

                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        {batch.startTime} - {batch.endTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{batch.daysOfWeek?.join(', ') || 'All Weekdays'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Instructor: {batch.instructorName || 'Assigned Faculty'}</span>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="mt-5 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-medium">Capacity</span>
                      <span className="font-bold text-slate-900">
                        {enrolled.length} / {batch.maxCapacity} students
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isFull
                            ? 'bg-rose-500'
                            : (enrolled.length / batch.maxCapacity) > 0.8
                            ? 'bg-amber-500'
                            : 'bg-cyan-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (enrolled.length / batch.maxCapacity) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEdit(batch)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(batch)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Delete Batch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Timetable Weekly Grid View */}
      {viewMode === 'timetable' && (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
            Weekly Class Schedule (Tech Vision Lab)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-4 w-24">Day</th>
                  <th className="py-3 px-4">Scheduled Batches & Timings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daysOptions.map((day) => {
                  const dayBatches = batches.filter((b) => b.daysOfWeek?.includes(day));
                  return (
                    <tr key={day} className="hover:bg-slate-50 transition">
                      <td className="py-4 px-4 font-black text-slate-900 uppercase tracking-wider bg-slate-50/50">
                        {day}
                      </td>
                      <td className="py-4 px-4">
                        {dayBatches.length === 0 ? (
                          <span className="text-slate-400 italic">No batches scheduled</span>
                        ) : (
                          <div className="flex flex-wrap gap-2.5">
                            {dayBatches.map((b) => (
                              <div
                                key={b.batchId}
                                className="p-2.5 rounded-xl bg-cyan-50/60 border border-cyan-200 text-slate-800 space-y-0.5"
                              >
                                <div className="font-bold text-xs text-cyan-950">{b.batchName}</div>
                                <div className="text-[11px] text-slate-500 font-medium">
                                  {b.startTime} - {b.endTime} • {b.courseName}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Instructor: {b.instructorName}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Batch Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBatch ? `Edit Batch: ${editingBatch.batchName}` : 'Create New Batch'}
        subtitle="Set class timing, capacity, and lecture days."
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Batch Code / ID *
              </label>
              <input
                type="text"
                required
                disabled={!!editingBatch}
                value={formData.batchId}
                onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                placeholder="e.g. BATCH_MORN_EXCEL"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Batch Name *
              </label>
              <input
                type="text"
                required
                value={formData.batchName}
                onChange={(e) => setFormData({ ...formData, batchName: e.target.value })}
                placeholder="e.g. Morning Python Fast-track"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assigned Course *
              </label>
              <select
                value={formData.courseId}
                onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              >
                {courses.map((c) => (
                  <option key={c.courseId} value={c.courseId}>
                    {c.courseName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Max Student Capacity *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.maxCapacity}
                onChange={(e) => setFormData({ ...formData, maxCapacity: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Start Time
              </label>
              <input
                type="text"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                placeholder="e.g. 09:00 AM"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                End Time
              </label>
              <input
                type="text"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                placeholder="e.g. 10:30 AM"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Class Days
            </label>
            <div className="flex flex-wrap gap-2">
              {daysOptions.map((day) => {
                const isSelected = formData.daysOfWeek.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Instructor Name
            </label>
            <input
              type="text"
              value={formData.instructorName}
              onChange={(e) => setFormData({ ...formData, instructorName: e.target.value })}
              placeholder="e.g. Hardik Shah"
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
              {editingBatch ? 'Save Batch' : 'Create Batch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Batch Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteBatch(deleteTarget.id);
            showToast(`Batch "${deleteTarget.batchName}" deleted.`, 'info');
          }
        }}
        title="Delete Batch"
        message={`Are you sure you want to delete batch "${deleteTarget?.batchName}"?`}
        confirmText="Delete Batch"
        isDestructive
      />
    </div>
  );
};
