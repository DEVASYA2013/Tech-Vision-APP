import React, { useState, useEffect } from 'react';
import { UserCog, Plus, Shield, CheckCircle, XCircle, Mail, Phone, Lock, Trash2, Info } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { UserProfile, UserRole } from '../types';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const StaffManagement: React.FC = () => {
  const { registerStaffMember, deleteStaffUser, userProfile, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [staffUsers, setStaffUsers] = useState<UserProfile[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff' as UserRole,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list = snap.docs.map((d) => d.data() as UserProfile);
      setStaffUsers(list);
      setLoading(false);
    }, (error) => {
      console.warn("Users subscription restricted:", error.message);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
      const err = 'Please enter name, email, and password.';
      setErrorMessage(err);
      showToast(err, 'error');
      return;
    }
    if (formData.password.length < 6) {
      const err = 'Password must be at least 6 characters.';
      setErrorMessage(err);
      showToast(err, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const resultMsg = await registerStaffMember(
        formData.email.trim(),
        formData.password,
        formData.name.trim(),
        formData.phone.trim(),
        formData.role
      );
      showToast(resultMsg || `Staff member "${formData.name}" added successfully!`, 'success');
      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', phone: '', password: '', role: 'staff' });
      setErrorMessage('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating account';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserActive = async (uid: string, currentActive: boolean) => {
    if (uid === userProfile?.uid) {
      showToast('You cannot deactivate your own active session.', 'error');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', uid), {
        isActive: !currentActive,
      });
      showToast('Staff status updated.', 'info');
    } catch {
      showToast('Failed to update staff status.', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStaffUser(deleteTarget.uid);
      showToast(`Staff member "${deleteTarget.displayName || deleteTarget.email}" deleted.`, 'info');
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete staff member';
      showToast(msg, 'error');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-500">
        Access restricted. Only institute administrators can manage staff accounts.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <UserCog className="w-6 h-6 text-cyan-600" />
            Staff & Role Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure faculty permissions, instructor logins, and role-based access control.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMessage('');
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-900/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Staff Member
        </button>
      </div>

      {/* Helpful info banner */}
      <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-200/80 flex items-start gap-3">
        <Info className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
        <div className="text-xs text-cyan-950 leading-relaxed">
          <strong className="font-bold text-cyan-900">How Staff Access Works:</strong> Created staff members can log in using their email and password. Staff members can view students, mark batch attendance, and record fee payments, but cannot alter administrative settings, view audit logs, or delete financial history.
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 font-bold text-slate-600 border-b">
              <tr>
                <th className="py-3 px-4">Name & Profile</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No staff records found. Click &quot;Add Staff Member&quot; to register instructors.
                  </td>
                </tr>
              ) : (
                staffUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {u.displayName || 'Staff Member'}
                      {u.uid === userProfile?.uid && (
                        <span className="ml-2 text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">
                          You
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{u.phone || '—'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.uid !== userProfile?.uid && (
                          <>
                            <button
                              onClick={() => toggleUserActive(u.uid, u.isActive)}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                                u.isActive
                                  ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {u.isActive ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              onClick={() => setDeleteTarget(u)}
                              className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                              title="Delete staff account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Faculty or Staff Member"
        subtitle="Create secure login credentials for instructors and operators without signing yourself out."
        maxWidth="md"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium leading-relaxed">
              <strong>Error:</strong> {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Priya Joshi"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Staff Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="priya@techvision.com"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
            />
            <p className="text-[10px] text-slate-400 mt-1">This email will be used by the staff member to log in.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
            />
            <p className="text-[10px] text-slate-400 mt-1">Must be at least 6 characters.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Role Permission
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              >
                <option value="staff">Staff (Attendance & Fees)</option>
                <option value="admin">Administrator (Full Access)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="10-digit mobile"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl shadow-md shadow-cyan-900/20 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Staff Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Staff Account"
        message={`Are you sure you want to remove staff member "${deleteTarget?.displayName || deleteTarget?.email}"? They will no longer have access to the system.`}
        confirmText="Yes, Remove Staff"
        isDestructive
      />
    </div>
  );
};
