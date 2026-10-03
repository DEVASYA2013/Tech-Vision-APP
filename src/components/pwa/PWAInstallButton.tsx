import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-cyan-500 hover:to-blue-500 transition-all cursor-pointer"
        title="Install Tech Vision App on this device"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-cyan-300 bg-cyan-50/50 px-2.5 py-1 text-xs font-medium text-cyan-800 hover:bg-cyan-100 transition-all"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install PWA</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-cyan-600" />
                  Install on iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <p>In Safari, tap the <strong>Share</strong> button at bottom center.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <p>Scroll down in the action sheet and select <strong>"Add to Home Screen"</strong>.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <p>Tap <strong>Add</strong>. Tech Vision will launch full-screen like a native Android/iOS app!</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
