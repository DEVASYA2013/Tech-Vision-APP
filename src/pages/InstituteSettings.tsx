import React, { useState } from 'react';
import { Settings, Save, Globe, ExternalLink, Upload, CheckCircle2, Smartphone } from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';

export const InstituteSettings: React.FC = () => {
  const { settings, updateSettings } = useInstitute();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    instituteName: settings.instituteName || 'Tech Vision Computer Class',
    tagline: settings.tagline || 'Creating IT Professionals for the Next Generation',
    address: settings.address || 'Shop No. 12-14, 2nd Floor, Shivalik Plaza, IIM Road, Panjrapole, Ahmedabad, Gujarat 380015',
    phone: settings.phone || '+91 98250 12345',
    email: settings.email || 'info@techvisionahmedabad.in',
    website: settings.website || 'techvisioncomputer.com',
    logoUrl: settings.logoUrl || '/pwa-512x512.png',
    currency: settings.currency || '₹',
    totalSeats: 14,
    receiptPrefix: settings.receiptPrefix || 'TV/2026/',
    timezone: settings.timezone || 'Asia/Kolkata',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 512, 512);
          const scale = Math.min(512 / img.width, 512 / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.drawImage(img, (512 - w) / 2, (512 - h) / 2, w, h);
          const dataUrl = canvas.toDataURL('image/png');
          setFormData((prev) => ({ ...prev, logoUrl: dataUrl }));
          localStorage.setItem('tv_custom_logo', dataUrl);
          showToast(
            `Logo loaded (${img.width}×${img.height}px) and formatted to 512×512 PNG! Click Save to apply everywhere.`,
            'success'
          );
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const websiteUrl = formData.website.startsWith('http')
    ? formData.website
    : `https://${formData.website || 'techvisioncomputer.com'}`;

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
            Configure institute branding, official website (techvisioncomputer.com), Ahmedabad office address, and receipt prefixes.
          </p>
        </div>

        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs font-bold transition shadow-2xs w-fit"
        >
          <Globe className="w-4 h-4 text-cyan-600" />
          {formData.website || 'techvisioncomputer.com'}
          <ExternalLink className="w-3.5 h-3.5 text-cyan-600" />
        </a>
      </div>

      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Official App Logo & PWA Icons Section */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={formData.logoUrl || '/pwa-192x192.png'}
                alt="Tech Vision Computer Class Logo"
                className="w-16 h-16 rounded-2xl object-contain bg-slate-950 border border-slate-300 shadow-md shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-900">
                    Official Tech Vision App Logo &amp; PWA Icons
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    192×192 &amp; 512×512 Ready
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Configured for Android APK (<code className="text-cyan-700 font-mono">manifest.webmanifest</code>), Windows desktop shortcut, and maskable home screen icons.
                </p>
              </div>
            </div>
            {isAdmin && (
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold transition cursor-pointer shrink-0 shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-cyan-600" />
                Upload Custom Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Website *
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-cyan-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  disabled={!isAdmin}
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="techvisioncomputer.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-cyan-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                />
              </div>
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
