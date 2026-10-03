import React, { useState } from 'react';
import { Settings, Save, Building, MapPin, Phone, Mail, Clock, IndianRupee } from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';

export const InstituteSettings: React.FC = () => {
  const { settings, updateSettings } = useInstitute();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    instituteName: settings.instituteName || 'Tech Vision Computer Class',
    tagline: settings.tagline || 'Empowering Careers Through Practical Computer Education',
    address: settings.address || 'Shop No. 12-14, 2nd Floor, Shivalik Plaza, IIM Road, Panjrapole, Ahmedabad, Gujarat 380015',
    phone: settings.phone || '+91 98250 12345',
    email: settings.email || 'info@techvisionahmedabad.in',
    currency: settings.currency || '₹',
    totalSeats: settings.totalSeats || 20,
    receiptPrefix: settings.receiptPrefix || 'TV/2026/',
    timezone: settings.timezone || 'Asia/Kolkata',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Only administrators can modify institute settings.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings(formData);
      showToast('Institute settings saved successfully!', 'success');
    } catch {
      showToast('Error saving settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-cyan-600" />
            Institute Profile & Settings
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure institute branding, Ahmedabad office address, receipt prefixes, and timezone.
          </p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Institute Name *
            </label>
            <input
              type="text"
              required
              disabled={!isAdmin}
              value={formData.instituteName}
              onChange={(e) => setFormData({ ...formData, instituteName: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Institute Tagline / Header Subtitle
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Premises / Campus Address (Ahmedabad, Gujarat) *
            </label>
            <textarea
              rows={2}
              required
              disabled={!isAdmin}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Contact Phone *
              </label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Institute Email Address
              </label>
              <input
                type="email"
                disabled={!isAdmin}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Receipt Number Prefix *
              </label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={formData.receiptPrefix}
                onChange={(e) => setFormData({ ...formData, receiptPrefix: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                System Timezone
              </label>
              <input
                type="text"
                disabled
                value={formData.timezone}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-600"
              />
            </div>
          </div>

          {isAdmin && (
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-900/20 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Institute Profile'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
