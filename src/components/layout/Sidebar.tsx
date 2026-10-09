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
  ClipboardList,
  X,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useInstitute } from '../../context/InstituteContext';
import { useToast } from '../ui/Toast';

export type NavTab =
  | 'dashboard'
  | 'enquiries'
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
  const { students, enquiries, settings, loadDemoData, clearDemoData } = useInstitute();
  const { showToast } = useToast();

  const websiteDomain = settings.website || 'techvisioncomputer.com';
  const websiteHref = websiteDomain.startsWith('http')
    ? websiteDomain
    : `https://${websiteDomain}`;

  const hasDemoData = students.some((s) => s.isDemo);
  const openEnquiriesCount = enquiries.filter(
    (e) => e.status === 'new' || e.status === 'follow_up' || e.status === 'demo_scheduled'
  ).length;

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
    { id: 'enquiries' as NavTab, label: 'Enquiries & Form', icon: ClipboardList, role: 'all' },
    { id: 'students' as NavTab, label: 'Student Directory', icon: Users, role: 'all' },
    { id: 'batches' as NavTab, label: 'Batches & Timetable', icon: GraduationCap, role: 'all' },
    { id: 'attendance' as NavTab, label: 'Daily Attendance', icon: CalendarCheck, role: 'all' },
    { id: 'fees' as NavTab, label: 'Fees & Receipts', icon: CreditCard, role: 'all' },
    { id: 'seats' as NavTab, label: 'Computer Lab (14 PCs)', icon: Monitor, role: 'all' },
    { id: 'courses' as NavTab, label: 'Courses Catalog', icon: BookOpen, role: 'all' },
    { id: 'reports' as NavTab, label: 'Reports & Exports', icon: BarChart3, role: 'all' },
    { id: 'staff' as NavTab, label: 'Staff Management', icon: UserCog, role: 'admin' },
    { id: 'ai' as NavTab, label: 'AI Institute Assistant', icon: Bot, role: 'all' },
    { id: 'google' as NavTab, label: 'Google Integrations', icon: FileSpreadsheet, role: 'all' },
    { id: 'audit' as NavTab, label: 'Audit Trail', icon: ShieldCheck, role: 'admin' },
    { id: 'settings' as NavTab, label: 'Institute Settings', icon: Settings, role: 'admin' },
    { id: 'backup' as NavTab, label: 'Backup & Recovery', icon: HelpCircle, role: 'all' },
  ];

  const canAccessAdminTabs = isAdmin && userProfile?.role !== 'staff';

  const filteredNavItems = navItems.filter(
    (item) => item.role === 'all' || (item.role === 'admin' && canAccessAdminTabs)
  );

  const handleNavClick = (tab: NavTab) => {
    const targetItem = navItems.find((i) => i.id === tab);
    if (targetItem?.role === 'admin' && !canAccessAdminTabs) {
      return;
    }
    setCurrentTab(tab);
    setIsMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto bg-slate-900 text-slate-200">
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src={settings.logoUrl || '/pwa-192x192.png'}
              alt="Tech Vision Computer Class Logo"
              className="w-11 h-11 rounded-xl object-contain bg-slate-950 border border-slate-700/80 shadow-lg shadow-cyan-900/30 shrink-0"
            />
            <div>
              <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                TECH VISION
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  CLASS
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium truncate">
                IT Education • Ahmedabad
              </div>
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition mt-0.5"
              >
                <Globe className="w-2.5 h-2.5" />
                {websiteDomain}
              </a>
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
                {item.id === 'enquiries' && openEnquiriesCount > 0 && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {openEnquiriesCount}
                  </span>
                )}
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
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-2.5">
        <a
          href={websiteHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-cyan-400 transition"
        >
          <span className="flex items-center gap-1.5 truncate">
            <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            {websiteDomain}
          </span>
          <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
        </a>
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
