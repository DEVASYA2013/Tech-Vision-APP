import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, User, Phone, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';

interface FirstAdminSetupProps {
  onBackToLogin: () => void;
}

export const FirstAdminSetup: React.FC<FirstAdminSetupProps> = ({ onBackToLogin }) => {
  const { registerFirstAdmin, signInWithGoogle } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSetup = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      showToast('Master Administrator initialized with Google Account!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google initialization failed';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setLoading(true);
    try {
      await registerFirstAdmin(email, password, name, phone);
      showToast('First administrator registered successfully! Welcome to Tech Vision.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      if (msg.includes('operation-not-allowed')) {
        showToast(
          'Email/Password provider is disabled in Firebase Console. Please click "Initialize Administrator with Google Account" above for instant 1-click setup.',
          'error'
        );
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 sm:p-6 relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg bg-white rounded-3xl p-7 sm:p-10 shadow-2xl border border-slate-100">
        <button
          onClick={onBackToLogin}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>

        <div className="mb-6">
          <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            First Administrator Setup
          </h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Initialize the master institute administrator account. This grants full administrative
            authority over students, courses, fee transactions, and staff access.
          </p>
        </div>

        {/* 1-Click Google Administrator Setup */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
            Fastest Method (Ready Immediately)
          </span>
          <p className="text-xs font-bold text-slate-800 mt-2 mb-1">
            Initialize with Google Account
          </p>
          <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
            Your Google Account is pre-authorized in security rules as the Master Administrator.
          </p>
          <button
            type="button"
            onClick={handleGoogleSetup}
            disabled={loading}
            className="w-full py-3 px-4 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl text-xs font-extrabold shadow-sm transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Initialize Administrator with Google
          </button>
        </div>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Or Custom Email / Password
          </span>
          <div className="border-t border-slate-200 w-full" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Administrator Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Director / Head Instructor"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Institute Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@techvision.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Contact Mobile Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98250 12345"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-cyan-50/60 rounded-xl border border-cyan-100 text-[11px] text-cyan-900 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
            <span>
              Security notice: Tech Vision does not store plaintext passwords. All roles and access
              rights are cryptographically enforced in Cloud Firestore.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-900/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {loading ? 'Initializing Administrator...' : 'Create Master Administrator'}
          </button>
        </form>
      </div>
    </div>
  );
};
