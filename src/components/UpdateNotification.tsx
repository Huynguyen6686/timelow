import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowUpCircle, X, RefreshCw } from 'lucide-react';

export default function UpdateNotification() {
  const [show, setShow] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Helper helper function to set up update listener
    const handleUpdate = (registration: ServiceWorkerRegistration) => {
      // 1. If there's already a waiting worker, show notify instantly
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShow(true);
        return;
      }

      // 2. Listen for new service worker being installed
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          // When state reaches "installed", it is ready to be activated (waiting status)
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setShow(true);
          }
        });
      });
    };

    // Get current registration
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        handleUpdate(reg);
      }
    });

    // Listen for controller changes (when new sw takes over)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

  }, []);

  const handleUpdateApp = () => {
    if (waitingWorker) {
      // Send command message to SW to activate immediately
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // In case fallback is needed
      window.location.reload();
    }
    setShow(false);
  };

  // Test updater helper for demonstration/simulation
  const simulateUpdateForTesting = () => {
    setShow(true);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-[340px] animate-bounce-short">
      <div className="relative p-4 rounded-2xl bg-gradient-to-br from-amber-950/90 via-slate-900/95 to-slate-950/95 border border-amber-500/30 shadow-[0_15px_40px_rgba(245,158,11,0.25)] backdrop-blur-md overflow-hidden">
        {/* Top organic pulse aura */}
        <span className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-amber-500/10 blur-xl animate-pulse pointer-events-none"></span>

        <div className="flex gap-3 relative z-10 text-left">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <ArrowUpCircle className="h-5 w-5 animate-spin" style={{ animationDuration: '4s' }} />
          </div>

          <div className="flex-1 min-w-0">
            <h5 className="text-[11px] font-black tracking-wider text-amber-400 uppercase flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Bản Cập Nhật Hệ Thống!
            </h5>
            <p className="mt-1 text-[10px] leading-relaxed text-zinc-300 font-medium font-sans">
              Timeflow vừa được nâng cấp tính năng thông minh mới của máy chủ. Bạn có muốn nâng cấp phiên bản ứng dụng ngay không?
            </p>
            
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleUpdateApp}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[10px] font-black uppercase tracking-wider text-slate-950 active:scale-95 transition-transform cursor-pointer shadow-md"
              >
                <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} /> CẬP NHẬT NGAY
              </button>
              <button
                onClick={() => setShow(false)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950/40 border border-white/5 text-[9px] font-black text-zinc-500 hover:text-zinc-300 hover:bg-slate-950/70 transition-all cursor-pointer"
              >
                ĐỂ SAU
              </button>
            </div>
          </div>
        </div>

        {/* Small corner close badge */}
        <button
          onClick={() => setShow(false)}
          className="absolute top-2.5 right-2.5 text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
