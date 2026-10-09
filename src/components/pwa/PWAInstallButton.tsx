import React, { useState } from 'react';
import { Download, Smartphone, Monitor, CheckCircle2, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowInstallModal(true);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:from-cyan-500 hover:to-blue-500 transition-all cursor-pointer"
        title="Install Tech Vision Computer Class on Android, Windows, or iOS"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{isIOS ? 'Install on iOS' : 'Install App'}</span>
      </button>

      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <img
                  src="/pwa-192x192.png"
                  alt="Tech Vision Computer Class"
                  className="w-9 h-9 rounded-xl shadow-xs"
                />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Install Tech Vision Computer Class
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Standalone App for Android, Windows &amp; iOS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600">
              {isInstallable && (
                <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-cyan-950">Direct 1-Click Install Ready</p>
                    <p className="text-[11px] text-cyan-800">
                      Your browser supports direct standalone installation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await install();
                      if (ok) setShowInstallModal(false);
                    }}
                    className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shrink-0 cursor-pointer"
                  >
                    Install Now
                  </button>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-cyan-600" />
                  Android Phone / Tablet (or Android APK)
                </div>
                <p className="leading-relaxed">
                  1. Open in <strong>Chrome for Android</strong>, tap the menu{' '}
                  <strong>(⋮)</strong> and tap <strong>&ldquo;Install app&rdquo;</strong> or{' '}
                  <strong>&ldquo;Add to Home screen&rdquo;</strong>.
                </p>
                <p className="leading-relaxed text-[11px] text-slate-500">
                  2. To build a native <strong>.apk / .aab</strong> package, enter your deployed URL into{' '}
                  <strong>PWABuilder.com</strong> or <strong>Bubblewrap CLI</strong> (uses{' '}
                  <code className="text-cyan-700 font-mono">/manifest.webmanifest</code>).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-blue-600" />
                  Windows / Desktop (Chrome &amp; Microsoft Edge)
                </div>
                <p className="leading-relaxed">
                  Click the <strong>Install icon</strong> in the right side of the browser address bar, or open browser menu <strong>(⋮) &rarr; Save and share &rarr; Install Tech Vision Computer Class</strong>.
                </p>
              </div>

              {isIOS && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    iPhone / iPad (Safari)
                  </div>
                  <p className="leading-relaxed">
                    Tap the <strong>Share</strong> button in Safari toolbar and select{' '}
                    <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowInstallModal(false)}
              className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
