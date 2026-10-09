import React, { useState } from 'react';
import {
  Menu,
  Bell,
  LogOut,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useInstitute } from '../../context/InstituteContext';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { NavTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  setIsMobileOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  setIsMobileOpen,
}) => {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  const { settings, notifications, markNotificationRead } = useInstitute();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const websiteDomain = settings.website || 'techvisioncomputer.com';
  const websiteHref = websiteDomain.startsWith('http')
    ? websiteDomain
    : `https://${websiteDomain}`;

  const tabTitles: Record<NavTab, string> = {
    dashboard: 'Institute Dashboard',
    enquiries: 'Student Course Enquiries & Admission Form',
    students: 'Student Management & Admissions',
    batches: 'Class Batches & Timetable',
    attendance: 'Daily Student Attendance',
    fees: 'Fee Management & Payment Receipts',
    seats: 'Computer Lab Workstation Allocation (14 PCs)',
    courses: 'Course Catalog & Pricing',
    reports: 'Reports & Data Exports',
    staff: 'Staff Access & Roles',
    ai: 'AI Institute Assistant',
    google: 'Google Sheets & Integrations',
    audit: 'System Audit Trail',
    settings: 'Institute Settings & Profile',
    backup: 'Backup, Recovery & Documentation',
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={() => setIsMobileOpen(true)}
          className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page Title & Location */}
        <div>
          <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            {tabTitles[currentTab] || 'Management System'}
          </h1>
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
            <span className="flex items-center gap-1 text-cyan-700">
              <MapPin className="w-3 h-3" />
              {settings.address ? 'Ahmedabad, Gujarat' : 'Tech Vision Institute'}
            </span>
            <span className="text-slate-300">•</span>
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-bold text-cyan-700 hover:text-cyan-800 hover:underline transition"
            >
              <Globe className="w-3 h-3 text-cyan-600" />
              {websiteDomain}
              <ExternalLink className="w-2.5 h-2.5 text-cyan-500" />
            </a>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              Asia/Kolkata (IST)
            </span>
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-cyan-600 text-white font-bold text-[10px] flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-cyan-600" />
                  Institute Alerts
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {notifications.length} active
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No pending alerts or reminders.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`p-3.5 hover:bg-slate-50 transition cursor-pointer text-xs ${
                        !n.isRead ? 'bg-cyan-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {n.type === 'fee_due' && (
                          <div className="p-1 rounded-md bg-amber-100 text-amber-700 shrink-0">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        )}
                        {n.type === 'unmarked_attendance' && (
                          <div className="p-1 rounded-md bg-rose-100 text-rose-700 shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                        )}
                        {n.type === 'low_seats' && (
                          <div className="p-1 rounded-md bg-blue-100 text-blue-700 shrink-0">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">{n.title}</p>
                          <p className="text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer border border-transparent hover:border-slate-200"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-700 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
              {userProfile?.displayName?.slice(0, 2).toUpperCase() || 'TV'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-900 max-w-[120px] truncate leading-tight">
                {userProfile?.displayName || currentUser?.email || 'User'}
              </div>
              <div className="text-[10px] text-cyan-600 font-semibold uppercase tracking-wider">
                {isAdmin ? 'Admin' : 'Staff'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* Profile Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {userProfile?.displayName || 'User'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser?.email}</p>
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Active Session
                </div>
              </div>

              <div className="py-1">
                {isAdmin && (
                  <button
                    onClick={() => {
                      setCurrentTab('settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Institute Settings
                  </button>
                )}
                <button
                  onClick={() => {
                    setCurrentTab('backup');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Help & Documentation
                </button>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={() => {
                    logout();
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
