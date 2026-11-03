import React, { useState } from 'react';
import {
  UserCheck,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  X,
  Laptop,
  GraduationCap,
} from 'lucide-react';
import { useAuth, StaffDutyName } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';

interface StaffDutyModalProps {
  canCloseWithoutSelect?: boolean;
}

export const StaffDutyModal: React.FC<StaffDutyModalProps> = ({ canCloseWithoutSelect = false }) => {
  const { activeStaffDuty, setActiveStaffDuty, isStaffDutyModalOpen, setIsStaffDutyModalOpen } = useAuth();
  const { showToast } = useToast();

  const [selectedStaff, setSelectedStaff] = useState<StaffDutyName>(
    activeStaffDuty || 'Diya Patel'
  );

  if (!isStaffDutyModalOpen) return null;

  const handleConfirm = () => {
    setActiveStaffDuty(selectedStaff);
    showToast(`Active on duty: ${selectedStaff}. Actions will be recorded in audit log.`, 'success');
  };

  const handleClose = () => {
    if (activeStaffDuty) {
      setIsStaffDutyModalOpen(false);
    } else {
      showToast('Please select who is currently on duty to continue.', 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Header Banner */}
        <div className="relative bg-gradient-to-r from-slate-950 via-cyan-950 to-blue-950 text-white p-6 sm:p-8">
          {canCloseWithoutSelect && activeStaffDuty && (
            <button
              onClick={handleClose}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3.5 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 p-1 flex items-center justify-center shadow-lg">
              <img
                src={localStorage.getItem('tv_custom_logo') || '/logo.png'}
                alt="Tech Vision Logo"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-400 block">
                Tech Vision Computer Class
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Who is on Duty Right Now?
              </h2>
            </div>
          </div>

          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Staff Account: <span className="font-semibold text-cyan-300 font-mono">techvisioncomputerclass@gmail.com</span>
            <br />
            Select who is managing the institute desk and computer lab so fee collections, attendance, and admissions are logged to your name.
          </p>
        </div>

        {/* Staff Selection Options */}
        <div className="p-6 sm:p-8 space-y-4 bg-slate-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Diya Patel Card */}
            <div
              onClick={() => setSelectedStaff('Diya Patel')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                selectedStaff === 'Diya Patel'
                  ? 'bg-white border-cyan-600 shadow-xl shadow-cyan-900/10 scale-[1.02]'
                  : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                  DP
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                    selectedStaff === 'Diya Patel'
                      ? 'border-cyan-600 bg-cyan-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {selectedStaff === 'Diya Patel' && <CheckCircle2 className="w-4 h-4 fill-white text-cyan-600" />}
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-lg font-black text-slate-900">Diya Patel</h3>
                </div>
                <div className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-[11px] font-bold">
                  <Laptop className="w-3 h-3 text-cyan-600" />
                  Faculty & Lab Instructor
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Responsible for student guidance, lab sessions, practical batches, and day-to-day class coordination.
                </p>
              </div>
            </div>

            {/* Jinal Prajapati Card */}
            <div
              onClick={() => setSelectedStaff('Jinal Prajapati')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                selectedStaff === 'Jinal Prajapati'
                  ? 'bg-white border-emerald-600 shadow-xl shadow-emerald-900/10 scale-[1.02]'
                  : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                  JP
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                    selectedStaff === 'Jinal Prajapati'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {selectedStaff === 'Jinal Prajapati' && <CheckCircle2 className="w-4 h-4 fill-white text-emerald-600" />}
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-lg font-black text-slate-900">Jinal Prajapati</h3>
                </div>
                <div className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                  <GraduationCap className="w-3 h-3 text-emerald-600" />
                  Faculty & Administration
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Responsible for admissions, course counselling, fee collection receipts, and student attendance.
                </p>
              </div>
            </div>
          </div>

          {/* Audit Trail Note */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
            <p className="leading-relaxed">
              <span className="font-bold">Transparent Audit Trail:</span> The Administrator can see exactly who recorded payments, admitted students, and saved attendance under <strong className="text-blue-950 font-bold">{selectedStaff}</strong>.
            </p>
          </div>

          {/* Action button */}
          <div className="pt-2">
            <button
              onClick={handleConfirm}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-900 to-blue-900 hover:from-slate-800 hover:to-blue-800 text-white font-black text-sm transition shadow-lg shadow-cyan-950/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span>Continue as {selectedStaff}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
