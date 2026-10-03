import React from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  CreditCard,
  Monitor,
  BookOpen,
  BarChart3,
  UserCog,
  Bot,
  FileSpreadsheet,
  ShieldCheck,
  Settings,
  HelpCircle,
  Database,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useInstitute } from '../../context/InstituteContext';
import { useToast } from '../ui/Toast';

export type NavTab =
  | 'dashboard'
  | 'students'
  | 'batches'
  | 'attendance'
  | 'fees'
  | 'seats'
  | 'courses'
  | 'reports'
  | 'staff'
  | 'ai'
  | 'google'
  | 'audit'
  | 'settings'
  | 'backup';

interface SidebarProps {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const { isAdmin, userProfile } = useAuth();
  const { students, loadDemoData, clearDemoData } = useInstitute();
  const { showToast } = useToast();

  const hasDemoData = students.some((s) => s.isDemo);

  const handleLoadDemo = async () => {
    try {
      await loadDemoData();
      showToast('Fictional demo data loaded successfully! You can explore all features.', 'success');
    } catch {
      showToast('Failed to load demo data.', 'error');
    }
  };

  const handleClearDemo = async () => {
    try {
      await clearDemoData();
      showToast('Fictional demo data cleared.', 'info');
    } catch {
      showToast('Failed to clear demo records.', 'error');
    }
  };

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard, role: 'all' },
    { id: 'students' as NavTab, label: 'Student Directory', icon: Users, role: 'all' },
    { id: 'batches' as NavTab, label: 'Batches & Timetable', icon: GraduationCap, role: 'all' },
    { id: 'attendance' as NavTab, label: 'Daily Attendance', icon: CalendarCheck, role: 'all' },
    { id: 'fees' as NavTab, label: 'Fees & Receipts', icon: CreditCard, role: 'all' },
    { id: 'seats' as NavTab, label: 'Computer Lab Seats', icon: Monitor, role: 'all' },
    { id: 'courses' as NavTab, label: 'Courses Catalog', icon: BookOpen, role: 'all' },
    { id: 'reports' as NavTab, label: 'Reports & Exports', icon: BarChart3, role: 'all' },
    { id: 'staff' as NavTab, label: 'Staff Management', icon: UserCog, role: 'admin' },
    { id: 'ai' as NavTab, label: 'AI Institute Assistant', icon: Bot, role: 'all' },
    { id: 'google' as NavTab, label: 'Google Integrations', icon: FileSpreadsheet, role: 'all' },
    { id: 'audit' as NavTab, label: 'Audit Trail', icon: ShieldCheck, role: 'admin' },
    { id: 'settings' as NavTab, label: 'Institute Settings', icon: Settings, role: 'admin' },
    { id: 'backup' as NavTab, label: 'Backup & Recovery', icon: HelpCircle, role: 'all' },
  ];

  const filteredNavItems = navItems.filter(
    (item) => item.role === 'all' || (item.role === 'admin' && isAdmin)
  );

  const handleNavClick = (tab: NavTab) => {
    setCurrentTab(tab);
    setIsMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto bg-slate-900 text-slate-200">
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-900/30 text-white shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                TECH VISION
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  CLASS
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium truncate">
                Ahmedabad, Gujarat
              </div>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Mode Action Banner */}
        <div className="mx-3.5 my-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Demo Records
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                hasDemoData
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {hasDemoData ? 'Active' : 'Off'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-2.5">
            Test admissions, payments, and seats with realistic sample data.
          </p>
          <div className="flex items-center gap-2">
            {!hasDemoData ? (
              <button
                onClick={handleLoadDemo}
                className="w-full py-1.5 px-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Database className="w-3 h-3" />
                Load Demo Data
              </button>
            ) : (
              <button
                onClick={handleClearDemo}
                className="w-full py-1.5 px-2 bg-slate-700 hover:bg-red-900/60 hover:text-red-200 text-slate-300 rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1.5 border border-slate-600"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
                Clear Demo Data
              </button>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="px-3 space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
                {item.id === 'ai' && (
                  <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-900/80 text-cyan-300 border border-cyan-700">
                    AI
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User / Institute Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 text-xs shrink-0">
            {userProfile?.displayName?.slice(0, 2).toUpperCase() || 'TV'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate">
              {userProfile?.displayName || 'User'}
            </div>
            <div className="text-[10px] text-cyan-400 uppercase font-semibold tracking-wider">
              {isAdmin ? 'Administrator' : 'Staff Member'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 left-0 z-30 shadow-2xl">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85%] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
