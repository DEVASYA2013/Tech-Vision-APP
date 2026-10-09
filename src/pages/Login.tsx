import React, { useState } from 'react';
import { GraduationCap, Mail, Lock, LogIn, ArrowRight, Globe, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { PWAInstallButton } from '../components/pwa/PWAInstallButton';

interface LoginProps {
  onOpenFirstAdmin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onOpenFirstAdmin }) => {
  const { signInWithEmail, signInWithGoogle, isFirstAdminSetupAvailable } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!email || !password) {
      const msg = 'Please enter both email and password.';
      setLoginError(msg);
      showToast(msg, 'error');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      showToast('Signed in successfully!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
      setLoginError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      showToast('Signed in with Google! Welcome Administrator.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign in failed';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 sm:p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-white rounded-3xl p-7 sm:p-10 shadow-2xl border border-slate-100">
        {/* Brand Logo & Name */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-950 p-1.5 shadow-xl shadow-cyan-900/30 border border-slate-800 mb-3">
            <img
              src={localStorage.getItem('tv_custom_logo') || '/pwa-192x192.png'}
              alt="Tech Vision Computer Class Logo"
              className="w-full h-full rounded-xl object-contain"
            />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            TECH VISION
          </h2>
          <p className="text-xs uppercase tracking-widest font-bold text-cyan-600 mt-0.5">
            COMPUTER CLASS • IT EDUCATION
          </p>
          <a
            href="https://techvisioncomputer.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-[11px] font-bold transition"
          >
            <Globe className="w-3 h-3 text-cyan-600" />
            techvisioncomputer.com
            <ExternalLink className="w-2.5 h-2.5 text-cyan-600" />
          </a>
          <p className="text-xs text-slate-500 mt-2">
            Secure Management Portal for Staff & Administration
          </p>
          <div className="mt-3 flex justify-center">
            <PWAInstallButton />
          </div>
        </div>

        {/* Primary 1-Click Google Sign-in */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
          <p className="text-xs font-bold text-slate-800 mb-1">
            Master Administrator Login
          </p>
          <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
            Firebase Google Authentication is configured and linked directly to your administrator account.
          </p>
          <button
            type="button"
            onClick={handleGoogleSignIn}
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
            Sign In with Google Account
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Or Staff Email / Password
          </span>
          <div className="border-t border-slate-200 w-full" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {loginError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium leading-relaxed">
              {loginError}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Staff Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@techvision.com"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Staff Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Authenticating...' : 'Sign In with Email'}
          </button>
        </form>

        {/* First Admin Setup Link */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            Need to register a custom administrator email?
          </p>
          <button
            type="button"
            onClick={onOpenFirstAdmin}
            className="mt-1 text-xs font-bold text-cyan-600 hover:text-cyan-700 inline-flex items-center gap-1 transition"
          >
            First Administrator Setup
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
