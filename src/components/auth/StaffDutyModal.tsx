import React, { useState } from 'react';
import {
  UserCheck,
  CheckCircle2,
  ArrowRight,
  X,
  Shield,
  Sparkles,
  LogIn,
} from 'lucide-react';
import { useAuth, StaffDutyName, getScheduledStaffDutyByTime } from '../../context/AuthContext';
import { useToast } from '../ui/Toast';

interface StaffDutyModalProps {
  canCloseWithoutSelect?: boolean;
}

export const StaffDutyModal: React.FC<StaffDutyModalProps> = ({ canCloseWithoutSelect = false }) => {
  const { activeStaffDuty, setActiveStaffDuty, isStaffDutyModalOpen, setIsStaffDutyModalOpen } = useAuth();
  const { showToast } = useToast();

  const scheduled = getScheduledStaffDutyByTime();
  const [selectedStaff, setSelectedStaff] = useState<StaffDutyName>(
    activeStaffDuty || scheduled.staff
  );

  if (!isStaffDutyModalOpen) return null;

  const handleConfirm = (staffName?: StaffDutyName) => {
    const target = staffName || selectedStaff;
    setActiveStaffDuty(target);
    showToast(`Active on duty: ${target}. Welcome to Tech Vision Computer Class!`, 'success');
  };

  const handleClose = () => {
    if (activeStaffDuty) {
      setIsStaffDutyModalOpen(false);
    } else {
      showToast('Please select who is on duty to continue.', 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] animate-in zoom-in-95 duration-200">
        {/* Top Header Banner */}
        <div className="relative bg-gradient-to-r from-slate-950 via-cyan-950 to-blue-950 text-white p-5 sm:p-6 shrink-0">
          {canCloseWithoutSelect && activeStaffDuty && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 p-1 flex items-center justify-center shadow-lg shrink-0">
              <img
                src={localStorage.getItem('tv_custom_logo') || '/logo.png'}
                alt="Tech Vision Logo"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 block">
                Tech Vision Computer Class
              </span>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                Who is on Duty Right Now?
              </h2>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mt-1">
            Staff Account: <span className="font-semibold text-cyan-300 font-mono">techvisioncomputerclass@gmail.com</span>
            <br />
            Select your name so fee payments, attendance sheets, and student updates are accurately recorded under you.
          </p>
        </div>

        {/* Scrollable Staff Selection Body */}
        <div className="p-4 sm:p-6 space-y-4 bg-slate-50 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Diya Patel Card */}
            <div
              onClick={() => setSelectedStaff('Diya Patel')}
              className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                selectedStaff === 'Diya Patel'
                  ? 'bg-white border-cyan-600 shadow-xl shadow-cyan-900/10 scale-[1.02]'
                  : 'bg-white/90 border-slate-200 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-black text-lg flex items-center justify-center shadow-md">
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

              <div className="mt-3.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900">Diya Patel</h3>
                  {scheduled.staff === 'Diya Patel' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800">
                      Current Shift
                    </span>
                  )}
                </div>
                <div className="text-xs font-semibold text-cyan-700 mt-0.5">8:00 AM – 2:00 PM</div>
              </div>

              {/* Instant Tap to Enter button directly on card */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirm('Diya Patel');
                }}
                className={`mt-4 w-full py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedStaff === 'Diya Patel'
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-900/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Enter as Diya</span>
              </button>
            </div>

            {/* Jinal Prajapati Card */}
            <div
              onClick={() => setSelectedStaff('Jinal Prajapati')}
              className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                selectedStaff === 'Jinal Prajapati'
                  ? 'bg-white border-emerald-600 shadow-xl shadow-emerald-900/10 scale-[1.02]'
                  : 'bg-white/90 border-slate-200 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-black text-lg flex items-center justify-center shadow-md">
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

              <div className="mt-3.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900">Jinal Prajapati</h3>
                  {scheduled.staff === 'Jinal Prajapati' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Current Shift
                    </span>
                  )}
                </div>
                <div className="text-xs font-semibold text-emerald-700 mt-0.5">2:00 PM – 8:00 PM</div>
              </div>

              {/* Instant Tap to Enter button directly on card */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirm('Jinal Prajapati');
                }}
                className={`mt-4 w-full py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedStaff === 'Jinal Prajapati'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Enter as Jinal</span>
              </button>
            </div>
          </div>

          {/* Equal Permissions Notice */}
          <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-950 text-xs flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-blue-600 shrink-0" />
            <p className="leading-relaxed">
              Both Diya Patel and Jinal Prajapati share identical rights and full faculty access to student admissions, fees, attendance, and lab workstations.
            </p>
          </div>
        </div>

        {/* Sticky Always-Visible Enter Button Footer for Mobile and Desktop */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-200 shadow-xl shrink-0">
          <button
            type="button"
            onClick={() => handleConfirm()}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-slate-950 via-cyan-900 to-blue-950 hover:from-slate-900 hover:to-blue-900 text-white font-black text-sm sm:text-base transition shadow-xl shadow-cyan-950/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <UserCheck className="w-5 h-5 text-cyan-400" />
            <span>Enter App as {selectedStaff}</span>
            <ArrowRight className="w-5 h-5 text-cyan-300" />
          </button>
        </div>
      </div>
    </div>
  );
};
