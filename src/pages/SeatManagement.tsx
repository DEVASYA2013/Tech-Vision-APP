import React, { useState } from 'react';
import {
  Monitor,
  UserCheck,
  UserX,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Edit,
  User,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import { useAuth } from '../context/AuthContext';
import { ComputerSeat, SeatStatus } from '../types';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const SeatManagement: React.FC = () => {
  const { seats, students, assignSeat, releaseSeat, updateSeatNotes, sync14ComputerLayout } = useInstitute();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [selectedSeat, setSelectedSeat] = useState<ComputerSeat | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<ComputerSeat | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Student selection for seat assignment
  const [assignStudentId, setAssignStudentId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<SeatStatus>('available');

  const occupiedSeats = seats.filter((s) => s.status === 'occupied');
  const availableSeats = seats.filter((s) => s.status === 'available');
  const maintenanceSeats = seats.filter((s) => s.status === 'maintenance');
  const inactiveSeats = seats.filter((s) => s.status === 'inactive');

  // Partition seats into Row A (5) and Row B (9)
  const rowASeats = seats.filter((s) => s.seatNumber.startsWith('A-') || s.rowName === 'Row A');
  const rowBSeats = seats.filter((s) => s.seatNumber.startsWith('B-') || s.rowName === 'Row B');
  const legacySeats = seats.filter(
    (s) => !s.seatNumber.startsWith('A-') && !s.seatNumber.startsWith('B-')
  );

  const handleOpenAssign = (seat: ComputerSeat) => {
    setSelectedSeat(seat);
    const activeStudents = students.filter((s) => s.status === 'active');
    setAssignStudentId(activeStudents[0]?.studentId || '');
    setIsAssignModalOpen(true);
  };

  const handleConfirmAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat || !assignStudentId) return;

    try {
      await assignSeat(selectedSeat.seatNumber, assignStudentId);
      showToast(`Workstation ${selectedSeat.seatNumber} assigned successfully!`, 'success');
      setIsAssignModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error assigning seat';
      showToast(msg, 'error');
    }
  };

  const handleConfirmRelease = async () => {
    if (!releaseTarget) return;
    try {
      await releaseSeat(releaseTarget.seatNumber);
      showToast(`Workstation ${releaseTarget.seatNumber} released!`, 'info');
      setReleaseTarget(null);
    } catch {
      showToast('Error releasing workstation.', 'error');
    }
  };

  const handleOpenEdit = (seat: ComputerSeat) => {
    setSelectedSeat(seat);
    setEditNotes(seat.notes || '');
    setEditStatus(seat.status);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat) return;
    try {
      await updateSeatNotes(selectedSeat.seatNumber, editNotes, editStatus);
      showToast(`Workstation ${selectedSeat.seatNumber} configuration updated.`, 'success');
      setIsEditModalOpen(false);
    } catch {
      showToast('Error updating seat configuration.', 'error');
    }
  };

  const handleSync14Layout = async () => {
    setIsSyncing(true);
    try {
      await sync14ComputerLayout();
      showToast('Classroom layout synchronized: 14 Computers (5 in Row A, 9 in Row B)!', 'success');
    } catch {
      showToast('Failed to sync lab layout.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const renderSeatCard = (seat: ComputerSeat, compact = false) => {
    const isOccupied = seat.status === 'occupied';
    const isAvailable = seat.status === 'available';
    const isMaintenance = seat.status === 'maintenance';

    return (
      <div
        key={seat.seatNumber}
        className={`relative rounded-2xl ${compact ? 'p-3' : 'p-4'} transition-all duration-200 border cursor-pointer group flex flex-col justify-between ${
          isOccupied
            ? 'bg-blue-950/70 border-blue-500/50 hover:border-blue-400 shadow-md shadow-blue-950/40'
            : isAvailable
            ? 'bg-emerald-950/40 border-emerald-500/50 hover:border-emerald-400 shadow-md shadow-emerald-950/30'
            : isMaintenance
            ? 'bg-amber-950/40 border-amber-500/50 hover:border-amber-400'
            : 'bg-slate-800/40 border-slate-700/60 opacity-60'
        }`}
        onClick={() => {
          if (isOccupied) {
            setReleaseTarget(seat);
          } else if (isAvailable) {
            handleOpenAssign(seat);
          } else {
            handleOpenEdit(seat);
          }
        }}
      >
        {/* Seat Top Status Indicator */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono font-black text-sm text-white tracking-wide">
            {seat.seatNumber}
          </span>
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isOccupied
                ? 'bg-blue-400 shadow-sm shadow-blue-400 animate-pulse'
                : isAvailable
                ? 'bg-emerald-400'
                : isMaintenance
                ? 'bg-amber-400'
                : 'bg-slate-500'
            }`}
          />
        </div>

        {/* PC Screen Visual Illustration */}
        <div className="my-1.5 p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center">
          <Monitor
            className={`${compact ? 'w-6 h-6' : 'w-7 h-7'} ${
              isOccupied
                ? 'text-blue-400'
                : isAvailable
                ? 'text-emerald-400'
                : isMaintenance
                ? 'text-amber-400'
                : 'text-slate-500'
            }`}
          />
        </div>

        {/* Assigned Student Details or Available Status */}
        <div className="mt-1 min-h-[38px]">
          {isOccupied ? (
            <div>
              <div className="font-bold text-[11px] text-white truncate">
                {seat.assignedStudentName || 'Occupied'}
              </div>
              <div className="text-[10px] text-blue-300 truncate font-mono">
                {seat.assignedStudentId}
              </div>
              <div className="text-[9px] text-slate-400 truncate mt-0.5">
                {seat.assignedCourseId}
              </div>
            </div>
          ) : isAvailable ? (
            <div className="text-center py-1">
              <span className="text-[11px] font-bold text-emerald-400">Available</span>
              <div className="text-[9px] text-slate-400">Click to Assign</div>
            </div>
          ) : (
            <div className="text-center py-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase">
                {seat.status}
              </span>
            </div>
          )}
        </div>

        {/* Edit Button on hover */}
        {isAdmin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(seat);
            }}
            className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition cursor-pointer"
            title="Configure Workstation"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Monitor className="w-6 h-6 text-cyan-600" />
            Computer Lab Workstation Allocation
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tech Vision Computer Class: 14 Workstations (5 in Row A, 9 in Row B).
          </p>
        </div>

        {/* Actions & Legend */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin && (
            <button
              onClick={handleSync14Layout}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              title="Resets or confirms the exact 14-computer configuration: 5 in Row A, 9 in Row B"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync 14-PC Layout
            </button>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold bg-white p-2 rounded-xl border border-slate-200/80 shadow-xs">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
              Available ({availableSeats.length})
            </span>
            <span className="flex items-center gap-1.5 text-blue-700">
              <span className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-200" />
              Occupied ({occupiedSeats.length})
            </span>
            <span className="flex items-center gap-1.5 text-amber-700">
              <span className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-amber-200" />
              Maintenance ({maintenanceSeats.length})
            </span>
          </div>
        </div>
      </div>

      {/* Legacy seats warning notice if present */}
      {legacySeats.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-amber-900 font-medium">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              Detected {legacySeats.length} legacy workstation placeholders (PC-XX). Click to align your database to your exact 14-computer layout (Row A: 5 PCs, Row B: 9 PCs).
            </span>
          </div>
          <button
            onClick={handleSync14Layout}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shrink-0 transition shadow-xs cursor-pointer"
          >
            Apply 14-PC Layout
          </button>
        </div>
      )}

      {/* Visual Lab Floor Plan (Row A: 5 PCs, Row B: 9 PCs) */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-800 space-y-6">
        {/* Lab Top Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div>
            <h3 className="text-base font-extrabold tracking-tight flex items-center gap-2">
              <Monitor className="w-5 h-5 text-cyan-400" />
              Tech Vision Computer Lab — 14 Workstations Floor Plan
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any workstation to assign a student or release the computer.
            </p>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div className="px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-xs font-bold text-cyan-300">
              Row A: {rowASeats.filter((s) => s.status === 'occupied').length} / 5 Occupied
            </div>
            <div className="px-3 py-1 rounded-xl bg-blue-950/80 border border-blue-800/80 text-xs font-bold text-blue-300">
              Row B: {rowBSeats.filter((s) => s.status === 'occupied').length} / 9 Occupied
            </div>
          </div>
        </div>

        {/* Instructor Whiteboard / Front Console Indicator */}
        <div className="py-2.5 px-4 rounded-xl bg-slate-800/60 border border-slate-700/80 text-center text-xs font-bold text-slate-300 flex items-center justify-center gap-2 shadow-inner">
          <GraduationCap className="w-4 h-4 text-cyan-400" />
          <span>FRONT OF COMPUTER CLASSROOM • INSTRUCTOR CONSOLE & DEMO DISPLAY</span>
        </div>

        {/* ROW A - 5 Workstations */}
        <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Row A — 5 Computers (A-01 to A-05)
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-cyan-300">
              {rowASeats.filter((s) => s.status === 'available').length} Available
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            {(rowASeats.length > 0 ? rowASeats : seats.slice(0, 5)).map((seat) =>
              renderSeatCard(seat, false)
            )}
          </div>
        </div>

        {/* Walkway Aisle Divider */}
        <div className="flex items-center gap-3 px-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          <div className="flex-1 h-px bg-slate-800" />
          <span>Central Lab Aisle & Walking Passage</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* ROW B - 9 Workstations */}
        <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Row B — 9 Computers (B-01 to B-09)
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-blue-300">
              {rowBSeats.filter((s) => s.status === 'available').length} Available
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5">
            {(rowBSeats.length > 0 ? rowBSeats : seats.slice(5, 14)).map((seat) =>
              renderSeatCard(seat, true)
            )}
          </div>
        </div>
      </div>

      {/* Workstation Table view */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Workstation Inventory & Allocation Directory (14 Terminals)
          </span>
          <span className="text-xs text-slate-500 font-semibold">
            {occupiedSeats.length} of {seats.length || 14} Occupied
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Terminal ID</th>
                <th className="py-3 px-4">Row</th>
                <th className="py-3 px-4">Terminal Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Student</th>
                <th className="py-3 px-4">Course / Batch</th>
                <th className="py-3 px-4">Hardware Specs</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {seats.map((seat) => (
                <tr key={seat.seatNumber} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {seat.seatNumber}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-600">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        seat.seatNumber.startsWith('A-')
                          ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {seat.seatNumber.startsWith('A-') ? 'Row A' : 'Row B'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {seat.computerName || `Terminal ${seat.seatNumber}`}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        seat.status === 'available'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : seat.status === 'occupied'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {seat.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {seat.assignedStudentName ? (
                      <div>
                        <div className="font-bold text-slate-900">{seat.assignedStudentName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {seat.assignedStudentId}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {seat.assignedCourseId || '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate">
                    {seat.notes || 'Core i5 / 16GB RAM'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {seat.status === 'available' && (
                        <button
                          onClick={() => handleOpenAssign(seat)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-semibold transition cursor-pointer"
                        >
                          Assign
                        </button>
                      )}
                      {seat.status === 'occupied' && (
                        <button
                          onClick={() => setReleaseTarget(seat)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold transition cursor-pointer"
                        >
                          Release
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleOpenEdit(seat)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          title="Edit workstation settings"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Seat Modal */}
      {selectedSeat && (
        <Modal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          title={`Assign Workstation ${selectedSeat.seatNumber}`}
          subtitle={`Select an active student for Workstation ${selectedSeat.seatNumber}.`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmAssign} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Active Student *
              </label>
              <select
                value={assignStudentId}
                onChange={(e) => setAssignStudentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              >
                {students
                  .filter((s) => s.status === 'active')
                  .map((s) => (
                    <option key={s.studentId} value={s.studentId}>
                      {s.fullName} ({s.studentId}) — {s.courseName}
                    </option>
                  ))}
              </select>
            </div>

            <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-100 text-xs text-cyan-900 leading-relaxed">
              Assigning {selectedSeat.seatNumber} will link this workstation to the student's profile
              and mark the workstation as Occupied across the system.
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-md shadow-cyan-900/20 transition cursor-pointer"
              >
                Confirm Allocation
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Seat Modal */}
      {selectedSeat && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Configure Workstation ${selectedSeat.seatNumber}`}
          subtitle="Update hardware specifications or maintenance status."
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Workstation Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as SeatStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Under Maintenance</option>
                <option value="inactive">Inactive / Decommissioned</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hardware Notes / Specs
              </label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="e.g. Core i5, 16GB RAM, 512GB SSD, Dell 24-inch"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Release Dialog */}
      <ConfirmDialog
        isOpen={!!releaseTarget}
        onClose={() => setReleaseTarget(null)}
        onConfirm={handleConfirmRelease}
        title="Release Workstation"
        message={`Are you sure you want to release ${releaseTarget?.seatNumber} currently assigned to ${releaseTarget?.assignedStudentName || 'student'}? The workstation will become Available for new admissions.`}
        confirmText="Release Workstation"
      />
    </div>
  );
};
