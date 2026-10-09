import React, { useState, useMemo } from 'react';
import {
  Monitor,
  RefreshCw,
  AlertTriangle,
  Settings,
  GraduationCap,
  Clock,
  Users,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { useInstitute, STANDARD_12_HOURLY_BATCHES } from '../context/InstituteContext';
import { useAuth } from '../context/AuthContext';
import { ComputerSeat, SeatStatus, Student } from '../types';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';

export const SeatManagement: React.FC = () => {
  const {
    seats,
    students,
    batches,
    assignSeat,
    releaseSeat,
    updateStudent,
    updateSeatNotes,
    sync14ComputerLayout,
  } = useInstitute();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const availableBatches = useMemo(() => {
    return batches.length > 0
      ? batches
      : STANDARD_12_HOURLY_BATCHES.map((b) => ({ id: b.batchId, ...b }));
  }, [batches]);

  // 'ALL' or specific batchId (e.g. 'BATCH-01')
  const [selectedBatchId, setSelectedBatchId] = useState<string>('ALL');
  const [selectedSeat, setSelectedSeat] = useState<ComputerSeat | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Assign student in schedule modal
  const [assignBatchId, setAssignBatchId] = useState<string>('');
  const [assignStudentId, setAssignStudentId] = useState<string>('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<SeatStatus>('available');

  // Active students mapped by seatNumber
  const activeStudents = useMemo(
    () => students.filter((s) => s.status === 'active'),
    [students]
  );

  const getStudentsForSeat = (seatNumber: string): Student[] => {
    return activeStudents.filter((s) => s.assignedSeatId === seatNumber);
  };

  const getStudentForSeatAndBatch = (seatNumber: string, batchId: string): Student | undefined => {
    return activeStudents.find(
      (s) => s.assignedSeatId === seatNumber && s.batchId === batchId
    );
  };

  // Partition seats into Row A (5) and Row B (9)
  const rowASeats = seats.filter((s) => s.seatNumber.startsWith('A-') || s.rowName === 'Row A');
  const rowBSeats = seats.filter((s) => s.seatNumber.startsWith('B-') || s.rowName === 'Row B');
  const legacySeats = seats.filter(
    (s) => !s.seatNumber.startsWith('A-') && !s.seatNumber.startsWith('B-')
  );

  const totalHourlyCapacity = (seats.length || 14) * availableBatches.length;
  const totalOccupiedSlots = activeStudents.filter((s) => Boolean(s.assignedSeatId)).length;

  const handleOpenSeatSchedule = (seat: ComputerSeat) => {
    setSelectedSeat(seat);
    const defaultBatch =
      selectedBatchId !== 'ALL' ? selectedBatchId : availableBatches[0]?.batchId || 'BATCH-01';
    setAssignBatchId(defaultBatch);
    setAssignStudentId('');
    setIsScheduleModalOpen(true);
  };

  const handleAssignStudentToSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat || !assignStudentId || !assignBatchId) {
      showToast('Please select a 1-hour batch and a student.', 'error');
      return;
    }

    const student = activeStudents.find(
      (s) => s.id === assignStudentId || s.studentId === assignStudentId
    );
    if (!student) {
      showToast('Student not found.', 'error');
      return;
    }

    const batchObj = availableBatches.find((b) => b.batchId === assignBatchId);

    try {
      // Update student's batch if needed and assign workstation
      await updateStudent(student.id, {
        batchId: assignBatchId,
        batchName: batchObj?.batchName || assignBatchId,
        assignedSeatId: selectedSeat.seatNumber,
      });
      await assignSeat(selectedSeat.seatNumber, student.studentId);
      showToast(
        `Assigned ${student.fullName} (GR.No: ${student.grNo || student.studentId}) to ${selectedSeat.seatNumber} for ${batchObj?.batchName || assignBatchId}!`,
        'success'
      );
      setAssignStudentId('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error assigning workstation';
      showToast(msg, 'error');
    }
  };

  const handleReleaseStudentFromSlot = async (seatNumber: string, student: Student) => {
    try {
      await releaseSeat(seatNumber, student.studentId);
      showToast(
        `Released ${student.fullName} (GR.No: ${student.grNo || student.studentId}) from ${seatNumber}.`,
        'info'
      );
    } catch {
      showToast('Failed to release student from workstation.', 'error');
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
    const seatStudents = getStudentsForSeat(seat.seatNumber);
    const batchStudent =
      selectedBatchId !== 'ALL'
        ? getStudentForSeatAndBatch(seat.seatNumber, selectedBatchId)
        : undefined;

    const isMaintenance = seat.status === 'maintenance';
    const isOccupiedInView =
      selectedBatchId !== 'ALL' ? Boolean(batchStudent) : seatStudents.length > 0;

    return (
      <div
        key={seat.seatNumber}
        onClick={() => handleOpenSeatSchedule(seat)}
        className={`relative rounded-2xl ${compact ? 'p-3' : 'p-4'} transition-all duration-200 border cursor-pointer group flex flex-col justify-between ${
          isMaintenance
            ? 'bg-amber-950/40 border-amber-500/50 hover:border-amber-400'
            : isOccupiedInView
            ? 'bg-blue-950/70 border-blue-500/50 hover:border-blue-400 shadow-md shadow-blue-950/40'
            : 'bg-emerald-950/40 border-emerald-500/50 hover:border-emerald-400 shadow-md shadow-emerald-950/30'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono font-black text-sm text-white tracking-wide">
            {seat.seatNumber}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900/90 text-cyan-300 border border-slate-700">
            {seatStudents.length}/12 Batches
          </span>
        </div>

        {/* PC Screen Visual Illustration */}
        <div className="my-1.5 p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center">
          <Monitor
            className={`${compact ? 'w-6 h-6' : 'w-7 h-7'} ${
              isMaintenance
                ? 'text-amber-400'
                : isOccupiedInView
                ? 'text-blue-400'
                : 'text-emerald-400'
            }`}
          />
        </div>

        {/* Status Info */}
        <div className="mt-1 min-h-[42px]">
          {isMaintenance ? (
            <div className="text-center py-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase">Maintenance</span>
            </div>
          ) : selectedBatchId !== 'ALL' ? (
            batchStudent ? (
              <div>
                <div className="font-bold text-[11px] text-white truncate">
                  {batchStudent.fullName}
                </div>
                <div className="text-[10px] text-cyan-300 font-mono truncate">
                  GR: {batchStudent.grNo || batchStudent.studentId}
                </div>
                <div className="text-[9px] text-slate-400 truncate">
                  {batchStudent.courseName}
                </div>
              </div>
            ) : (
              <div className="text-center py-1">
                <span className="text-[11px] font-bold text-emerald-400">Free in this Hour</span>
                <div className="text-[9px] text-slate-400">Click to Assign</div>
              </div>
            )
          ) : seatStudents.length > 0 ? (
            <div>
              <div className="font-bold text-[11px] text-blue-200 truncate">
                {seatStudents.length} Student{seatStudents.length > 1 ? 's' : ''} Assigned
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold">
                {12 - seatStudents.length} Hourly Slots Free
              </div>
              <div className="text-[9px] text-slate-400 truncate mt-0.5">
                Click to view 12-hr schedule
              </div>
            </div>
          ) : (
            <div className="text-center py-1">
              <span className="text-[11px] font-bold text-emerald-400">All 12 Hours Free</span>
              <div className="text-[9px] text-slate-400">Click to Assign</div>
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
            Computer Lab Workstation Allocation (12 Hourly Batches / PC)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            14 Workstations (5 in Row A, 9 in Row B) × 12 Hourly Batches = {totalHourlyCapacity} Daily Student-Hours ({totalOccupiedSlots} occupied).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin && (
            <button
              onClick={handleSync14Layout}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync 14-PC Layout
            </button>
          )}
        </div>
      </div>

      {/* 1-Hour Batch Selector Bar (12 Batches) */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-600" />
            <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Filter Floor Plan by 1-Hour Batch Time Slot (12 Batches / Day)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Each workstation can be assigned to 12 students per day (1 student per 1-hour batch).
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedBatchId('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedBatchId === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All 12 Batches ({totalOccupiedSlots}/{totalHourlyCapacity})
          </button>
          {availableBatches.map((b) => {
            const countInBatch = activeStudents.filter(
              (s) => s.batchId === b.batchId && Boolean(s.assignedSeatId)
            ).length;
            const isSelected = selectedBatchId === b.batchId;
            return (
              <button
                key={b.batchId}
                type="button"
                onClick={() => setSelectedBatchId(b.batchId)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{b.startTime} - {b.endTime}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected
                      ? 'bg-cyan-800 text-cyan-100'
                      : countInBatch > 0
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {countInBatch}/14
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legacy seats warning notice if present */}
      {legacySeats.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-amber-900 font-medium">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              Detected {legacySeats.length} legacy workstation placeholders. Click to align to your 14-computer layout.
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div>
            <h3 className="text-base font-extrabold tracking-tight flex items-center gap-2">
              <Monitor className="w-5 h-5 text-cyan-400" />
              Tech Vision Lab Floor Plan —{' '}
              {selectedBatchId === 'ALL'
                ? 'All 12 Hourly Batches Overview'
                : availableBatches.find((b) => b.batchId === selectedBatchId)?.batchName ||
                  selectedBatchId}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any computer to view its 12-hour batch schedule or assign/release students per hour.
            </p>
          </div>
        </div>

        {/* Instructor Console */}
        <div className="py-2.5 px-4 rounded-xl bg-slate-800/60 border border-slate-700/80 text-center text-xs font-bold text-slate-300 flex items-center justify-center gap-2">
          <GraduationCap className="w-4 h-4 text-cyan-400" />
          <span>FRONT OF COMPUTER CLASSROOM • INSTRUCTOR CONSOLE & DEMO DISPLAY</span>
        </div>

        {/* ROW A - 5 Workstations */}
        <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Row A — 5 Computers (A-01 to A-05) • Up to 60 Students/Day (12 Batches)
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            {(rowASeats.length > 0 ? rowASeats : seats.slice(0, 5)).map((seat) =>
              renderSeatCard(seat, false)
            )}
          </div>
        </div>

        {/* ROW B - 9 Workstations */}
        <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Row B — 9 Computers (B-01 to B-09) • Up to 108 Students/Day (12 Batches)
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5">
            {(rowBSeats.length > 0 ? rowBSeats : seats.slice(5, 14)).map((seat) =>
              renderSeatCard(seat, true)
            )}
          </div>
        </div>
      </div>

      {/* Workstation 12-Batch Directory Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Workstation Hourly Batch Allocation Directory (14 Terminals × 12 Batches)
          </span>
          <span className="text-xs text-slate-500 font-semibold">
            {totalOccupiedSlots} of {totalHourlyCapacity} Hourly Slots Occupied
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Terminal ID</th>
                <th className="py-3 px-4">Row</th>
                <th className="py-3 px-4">Hourly Capacity</th>
                <th className="py-3 px-4">Assigned Students Across 12 Batches</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {seats.map((seat) => {
                const assignedList = getStudentsForSeat(seat.seatNumber);
                return (
                  <tr key={seat.seatNumber} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-black text-slate-900">
                      {seat.seatNumber}
                    </td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800">
                        {assignedList.length} / 12 Batches Filled
                      </span>
                      <div className="text-[10px] text-emerald-600 font-semibold">
                        {12 - assignedList.length} hourly slots available
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {assignedList.length === 0 ? (
                        <span className="text-slate-400">Available in all 12 hourly batches</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {assignedList.map((st) => (
                            <span
                              key={st.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-[11px] text-blue-900 font-medium"
                            >
                              <strong className="font-mono text-blue-700">
                                {st.grNo || st.studentId}
                              </strong>
                              <span>{st.fullName}</span>
                              <span className="text-[10px] text-slate-500">
                                ({st.batchName || st.batchId || '1-Hr'})
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenSeatSchedule(seat)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-bold text-xs border border-cyan-200 transition cursor-pointer"
                      >
                        Manage 12 Batches
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 12-Batch Schedule & Assignment Modal for Selected Workstation */}
      {selectedSeat && (
        <Modal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          title={`Workstation ${selectedSeat.seatNumber} — 12 Hourly Batches Schedule`}
          subtitle="1 workstation can have up to 12 students (1 student for each 1-hour batch)."
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Quick Assign Form */}
            <form
              onSubmit={handleAssignStudentToSlot}
              className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200 space-y-3"
            >
              <div className="text-xs font-extrabold text-cyan-950 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-cyan-600" />
                Assign Student to {selectedSeat.seatNumber} for a 1-Hour Batch
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    1-Hour Batch Slot *
                  </label>
                  <select
                    value={assignBatchId}
                    onChange={(e) => setAssignBatchId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  >
                    {availableBatches.map((b) => {
                      const occupiedBy = getStudentForSeatAndBatch(
                        selectedSeat.seatNumber,
                        b.batchId
                      );
                      return (
                        <option key={b.batchId} value={b.batchId} disabled={Boolean(occupiedBy)}>
                          {b.batchName} {occupiedBy ? `(Taken: ${occupiedBy.fullName})` : '(Available)'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Select Active Student *
                  </label>
                  <select
                    value={assignStudentId}
                    onChange={(e) => setAssignStudentId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="">Choose student...</option>
                    {activeStudents.map((s) => (
                      <option key={s.id} value={s.studentId}>
                        {s.grNo || s.studentId} — {s.fullName} ({s.courseName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    Assign 1-Hr Slot
                  </button>
                </div>
              </div>
            </form>

            {/* 12 Hourly Slots List */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>12 Hourly Batch Slots on {selectedSeat.seatNumber}</span>
                <span>
                  {getStudentsForSeat(selectedSeat.seatNumber).length} / 12 Slots Occupied
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {availableBatches.map((b) => {
                  const occupant = getStudentForSeatAndBatch(
                    selectedSeat.seatNumber,
                    b.batchId
                  );
                  return (
                    <div
                      key={b.batchId}
                      className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{b.batchName}</span>
                      </div>
                      {occupant ? (
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="font-mono font-bold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200 mr-1.5">
                              {occupant.grNo || occupant.studentId}
                            </span>
                            <span className="font-bold text-slate-900">{occupant.fullName}</span>
                            <span className="text-slate-400 ml-1.5">({occupant.courseName})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleReleaseStudentFromSlot(selectedSeat.seatNumber, occupant)
                            }
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <UserMinus className="w-3 h-3" />
                            Release
                          </button>
                        </div>
                      ) : (
                        <span className="text-emerald-600 font-bold text-[11px]">
                          Available (Free)
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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
    </div>
  );
};
