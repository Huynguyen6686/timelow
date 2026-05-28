import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../store/AppContext';
import { Button } from '@/components/ui/button';
import { LogOut, Calendar, Play, Sun, Moon, Bell, AlertTriangle, AlertCircle, Volume2, Clock, Smartphone, Share2, Info, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { GlowEffect } from './GlowEffect';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { lazy, Suspense, useState, useEffect } from 'react';
import DeadlinePushManager from './DeadlinePushManager';

const AIAssistant = lazy(() => import('./AIAssistant'));
const DeadlineToastNotifier = lazy(() => import('./DeadlineToastNotifier'));
const StreakCelebrationToast = lazy(() => import('./StreakCelebrationToast'));

export default function Layout() {
  const { user, loading, login, loginAsGuest, logout, theme, setTheme, tasks, syncStatus } = useAppContext();
  const location = useLocation();
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [isAppInstallOpen, setIsAppInstallOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center pb-20">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground animate-pulse font-medium tracking-widest uppercase text-sm">Đang tải...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-6 py-8 max-w-md mx-auto sm:border-x overflow-hidden">
        <GlowEffect glowColor="rgba(52, 211, 153, 0.3)" tiltSpeed={8} glowSize={160} borderRadius="28px" scaleOnHover={true} className="mb-6">
          <div className="w-20 h-20 bg-primary/10 rounded-[28px] shadow-[inset_4px_4px_10px_rgba(0,0,0,0.2),inset_-2px_-2px_5px_rgba(255,255,255,0.05)] border border-primary/20 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </GlowEffect>
        <h1 className="text-4xl font-black tracking-tight mb-2 drop-shadow-md text-foreground bg-clip-text">TimeFlow</h1>
        <p className="text-center text-muted-foreground mb-8 font-medium text-sm leading-relaxed max-w-[300px]">Quản lý thời gian, thiết lập thói quen và tối ưu hóa sự tập trung chi tiết 3D.</p>
        
        <div className="w-full max-w-[300px] space-y-4">
          <GlowEffect glowColor="rgba(52, 211, 153, 0.45)" tiltSpeed={4} glowSize={110} borderRadius="16px" className="w-full">
            <Button onClick={login} className="w-full text-base py-6 rounded-2xl font-black uppercase tracking-wider bg-gradient-to-b from-primary/90 to-primary text-emerald-950 shadow-[0_10px_20px_rgba(52,211,153,0.3),inset_0_2px_5px_rgba(255,255,255,0.4),inset_0_-2px_5px_rgba(0,0,0,0.2)] border border-primary/50 hover:scale-103 transition-all">
              Đăng nhập bằng Google
            </Button>
          </GlowEffect>

          <GlowEffect glowColor="rgba(255, 255, 255, 0.12)" tiltSpeed={2} glowSize={90} borderRadius="16px" className="w-full">
            <Button onClick={loginAsGuest} variant="outline" className="w-full text-base py-6 rounded-2xl font-bold bg-[#1a1e28]/40 border border-white/15 text-muted-foreground hover:text-foreground hover:bg-[#1a1e28]/70 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)] hover:scale-102 transition-all">
              <Play className="w-4 h-4 mr-1.5 fill-current" /> Dùng thử chế độ Demo
            </Button>
          </GlowEffect>
        </div>
      </div>
    );
  }

  const isDashboard = location.pathname === '/';
  const syncDetails = syncStatus === 'syncing'
    ? { label: 'Đang lưu', icon: Loader2, className: 'text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse' }
    : syncStatus === 'error'
      ? { label: 'Lỗi lưu', icon: CloudOff, className: 'text-rose-400 bg-rose-500/10 border-rose-500/20' }
      : syncStatus === 'synced'
      ? { label: 'Đã lưu', icon: Cloud, className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
      : null;
  const SyncIcon = syncDetails?.icon;

  // Calculate upcoming/overdue tasks with deadlines for notification badge
  const nowTime = Date.now();
  const deadlineTasks = (tasks || []).filter(t => 
    t.status !== 'Completed' && 
    t.deadline && 
    // Deadline is in the past (overdue) OR upcoming within next 24 hours
    (t.deadline < nowTime || t.deadline - nowTime <= 36 * 60 * 60 * 1000)
  ).sort((a, b) => (a.deadline || 0) - (b.deadline || 0));

  const getDeadlineStatus = (deadlineTime: number) => {
    const diff = deadlineTime - nowTime;
    const isOverdue = diff < 0;
    const absDiff = Math.abs(diff);

    const days = Math.floor(absDiff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((absDiff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((absDiff % (60 * 60 * 1000)) / (60 * 1000));

    let timeString = '';
    if (days > 0) {
      timeString = `${days} ngày ${hours}g`;
    } else if (hours > 0) {
      timeString = `${hours}g ${minutes}ph`;
    } else {
      timeString = `${minutes}ph`;
    }

    return {
      isOverdue,
      timeString: isOverdue ? `Quá hạn ${timeString}` : `Còn ${timeString}`,
      colorClass: isOverdue ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/10'
    };
  };

  const playAlertSynth = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Beep 1
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.1);

      // Beep 2 (delayed slightly)
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.setValueAtTime(1000, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.15);
      }, 120);

    } catch (e) {
      console.log("Audio Alert failed to play or restricted", e);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-black sm:flex sm:items-center sm:justify-center p-0 sm:p-3 font-sans selection:bg-primary/30 overflow-auto">
      <div className="w-full h-[100dvh] sm:h-[min(850px,calc(100dvh-24px))] bg-background text-foreground max-w-[400px] mx-auto sm:border-[10px] sm:border-gray-900 sm:rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-white/5 bg-background/80 backdrop-blur-xl z-40 sticky top-0 shadow-[0_4px_30px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-primary/30 cursor-pointer shadow-[0_0_15px_rgba(52,211,153,0.2)]" onClick={logout} title="Đăng xuất">
              <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-foreground font-bold text-emerald-950">{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/60 uppercase leading-none mt-1" style={{ textShadow: '0 2px 10px rgba(255,255,255,0.1)' }}>Timeflow</h1>
                {isOffline && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-black uppercase tracking-wider animate-pulse shadow-sm mt-0.5">
                    <CloudOff className="w-2.5 h-2.5" /> Offline
                  </span>
                )}
              </div>
              {isDashboard && (
                <span className="text-[10px] text-muted-foreground capitalize mt-1 font-medium drop-shadow-sm">
                  {format(new Date(), 'EEEE, d MMMM', { locale: vi })}
                </span>
              )}
              {syncDetails && SyncIcon && (
                <span className={`mt-1 inline-flex w-fit items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${syncDetails.className}`}>
                  <SyncIcon className="h-3 w-3" />
                  {syncDetails.label}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={"ghost"} 
              size={"icon"} 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="text-primary shrink-0 rounded-[14px] bg-primary/10 hover:bg-primary/20 border border-primary/20 shadow-[inset_0_1px_3px_rgba(255,255,255,0.1)] active:scale-95 transition-all"
              title={theme === 'dark' ? 'Chuyển sang Chế độ sáng' : 'Chuyển sang Chế độ tối'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 drop-shadow-sm" /> : <Moon className="w-5 h-5 drop-shadow-sm" />}
            </Button>

            {/* Mobile PWA Installation Guide Trigger */}
            <Button 
              variant={"ghost"} 
              size={"icon"} 
              onClick={() => setIsAppInstallOpen(true)}
              className="text-amber-400 shrink-0 rounded-[14px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.15)] active:scale-95 transition-all animate-pulse"
              title="Cài đặt trên điện thoại (App Mobile)"
            >
              <Smartphone className="w-5 h-5 drop-shadow-sm" />
            </Button>

            <Dialog open={isAppInstallOpen} onOpenChange={setIsAppInstallOpen}>
              <DialogContent className="sm:max-w-[360px] bg-slate-900 border border-white/5 text-foreground rounded-3xl shadow-2xl p-5 overflow-hidden">
                <DialogHeader className="border-b border-white/5 pb-3">
                  <DialogTitle className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-amber-400 animate-bounce" />
                    Cài Đặt App Trên Điện Thoại
                  </DialogTitle>
                </DialogHeader>

                <div className="pt-3.5 space-y-4 text-left">
                  {/* Floating App Icon representation */}
                  <div className="flex items-center gap-3.5 p-3 bg-slate-950/40 rounded-2xl border border-white/[0.03] shadow-md">
                    <div className="relative shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 p-[1px] shadow-lg">
                      <div className="w-full h-full rounded-[15px] bg-[#0c101d] flex items-center justify-center">
                        <img src="/icon.svg" alt="Timeflow Icon" className="w-10 h-10 rounded-lg" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-slate-100">Timeflow Tracker</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                        Chạy full-screen 100%, load siêu nhanh, hỗ trợ cả Offline mượt mà như app gốc tải qua App Store / CH Play!
                      </p>
                    </div>
                  </div>

                  {/* Tabs layout for systems */}
                  <div className="space-y-3.5">
                    {/* iPhone / iOS Block */}
                    <div className="space-y-2 p-3 bg-slate-950/20 rounded-2xl border border-teal-500/10">
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-teal-400 tracking-wider uppercase">
                        <span className="px-1.5 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 text-[9px]">iOS</span>
                        <span>DÀNH CHO iPHONE (SAFARI)</span>
                      </div>
                      <ol className="list-decimal pl-4.5 text-[10px] text-zinc-300 space-y-1.5 font-medium">
                        <li>Mở trình duyệt <strong>Safari</strong> trên iPhone và truy cập link ứng dụng này.</li>
                        <li>Bấm vào nút <strong>Chia sẻ (Share)</strong> <Share2 className="w-3.5 h-3.5 inline inline-block text-sky-400 mx-0.5" /> ở thanh công cụ phía dưới Safari.</li>
                        <li>Cuộn xuống và chọn mục <strong>&ldquo;Thêm vào MH chính&rdquo; (Add to Home Screen)</strong>.</li>
                        <li>Đặt tên app là <strong>Timeflow</strong> và nhấn nút <strong>&ldquo;Thêm&rdquo; (Add)</strong> ở góc phải.</li>
                      </ol>
                    </div>

                    {/* Android Block */}
                    <div className="space-y-2 p-3 bg-slate-950/20 rounded-2xl border border-amber-500/10">
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-400 tracking-wider uppercase">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px]">Android</span>
                        <span>DÀNH CHO ANDROID (CHROME)</span>
                      </div>
                      <ol className="list-decimal pl-4.5 text-[10px] text-zinc-300 space-y-1.5 font-medium">
                        <li>Mở trình duyệt <strong>Google Chrome</strong> trên điện thoại Android của bạn.</li>
                        <li>Chạm vào biểu tượng <strong>3 Dấu chấm</strong> dọc ở góc trên bên phải Chrome.</li>
                        <li>Chọn mục <strong>&ldquo;Cài đặt ứng dụng&rdquo; (Install App)</strong> hoặc <strong>&ldquo;Thêm vào Màn hình chính&rdquo;</strong>.</li>
                        <li>Xác nhận chọn <strong>&ldquo;Cài đặt&rdquo; (Install)</strong> trong cửa sổ bật lên.</li>
                      </ol>
                    </div>
                  </div>

                  {/* Highlight Benefits */}
                  <div className="flex gap-2 p-2.5 bg-slate-950/60 rounded-xl border border-white/5 text-[9px] text-zinc-500 leading-normal">
                    <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      Sau khi thêm, bạn có thể ra màn hình chính, gỡ tab trình duyệt và mở <strong>Timeflow</strong> trực tiếp từ icon! App sẽ tự giấu thanh công cụ để bạn có không gian làm việc rộng rãi nhất.
                    </span>
                  </div>

                  <Button 
                    onClick={() => setIsAppInstallOpen(false)}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:scale-102 transition-transform text-slate-950 font-black text-xs uppercase tracking-widest mt-1 shadow-md"
                  >
                    ĐÃ HIỂU! TRẢI NGHIỆM NGAY
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Deadline Notification Dialog Trigger */}
            <Dialog open={isNotifyOpen} onOpenChange={setIsNotifyOpen}>
              <DialogTrigger
                render={
                  <Button 
                    variant={"ghost"} 
                    size={"icon"} 
                    className="text-primary shrink-0 rounded-[14px] bg-primary/10 hover:bg-primary/20 border border-primary/20 shadow-[inset_0_1px_3px_rgba(255,255,255,0.1)] relative"
                    title="Thông báo hạn chót (Deadline)"
                  />
                }
              >
                <Bell className="w-5 h-5 drop-shadow-sm" />
                {deadlineTasks.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white border-2 border-slate-950 animate-pulse shadow-md">
                    {deadlineTasks.length}
                  </span>
                )}
              </DialogTrigger>
              <DialogContent className="sm:max-w-[360px] bg-slate-900 border border-white/5 text-foreground rounded-3xl shadow-2xl p-6 overflow-hidden">
                <DialogHeader className="border-b border-white/5 pb-3">
                  <DialogTitle className="text-base font-black tracking-tight text-white flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-primary animate-bounce" />
                      Nhắc Nhở Hạn Chót
                    </span>
                    <Button 
                      onClick={playAlertSynth} 
                      variant="ghost" 
                      size="icon" 
                      className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
                      title="Test âm chuông cảnh báo"
                    >
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    </Button>
                  </DialogTitle>
                </DialogHeader>

                <div className="pt-3 space-y-4 text-left">
                  <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
                    Danh sách nhiệm vụ có hạn chót gấp hoặc đã quá hạn trong vòng 36 tiếng qua:
                  </p>

                  <DeadlinePushManager />

                  <div className="max-h-[280px] overflow-y-auto space-y-2.5 pr-1 py-1 scrollbar-thin">
                    {deadlineTasks.length > 0 ? (
                      deadlineTasks.map(t => {
                        const statusDetails = t.deadline ? getDeadlineStatus(t.deadline) : null;
                        return (
                          <div 
                            key={t.id} 
                            className="p-3 bg-slate-950/40 rounded-2xl border border-white/[0.03] hover:border-white/10 transition-all flex items-start gap-2.5 relative group"
                          >
                            {statusDetails?.isOverdue ? (
                              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            )}
                            
                            <div className="flex-1 space-y-1 overflow-hidden">
                              <h4 className="text-xs font-extrabold text-white truncate leading-tight pr-4">
                                {t.title}
                              </h4>
                              <p className="text-[10px] text-zinc-500 line-clamp-1">
                                {t.description || "Không có mô tả thêm"}
                              </p>
                              
                              <div className="flex items-center gap-1.5 pt-1">
                                {statusDetails && (
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-[5px] border uppercase tracking-wider ${statusDetails.colorClass}`}>
                                    {statusDetails.timeString}
                                  </span>
                                )}
                                <span className={`text-[9px] font-bold px-1 py-0.5 rounded-[4px] opacity-80 ${
                                  t.priority === 'High' || t.priority === 'Critical'
                                  ? 'bg-rose-500/10 text-rose-400' 
                                  : 'bg-zinc-800 text-zinc-400'
                                }`}>
                                  {t.priority}
                                </span>
                              </div>
                            </div>
                            
                            <span className="absolute right-3 top-3 w-1.5 h-1.5 rounded-full bg-primary animate-ping opacity-70 group-hover:block hidden"></span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 space-y-2 border border-dashed border-white/5 rounded-2xl bg-slate-950/20">
                        <AlertTriangle className="w-8 h-8 text-zinc-600 mx-auto animate-pulse" />
                        <p className="text-xs text-zinc-500 font-bold">Không có việc gấp cận hạn!</p>
                        <p className="text-[10px] text-zinc-600">Thật yên bình. Bạn đang quản lý tốt lắm.</p>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    onClick={() => {
                      setIsNotifyOpen(false);
                      setIsNotifyOpen(false); // Double guard to ensure close before navigations
                    }}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500/80 to-teal-500/80 hover:scale-102 transition-transform text-slate-950 font-black text-xs uppercase tracking-wider"
                  >
                    Xem tất cả nhiệm vụ
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>
        <main className="pt-6 pb-[120px] md:p-6 md:pb-[120px] flex-1 min-h-0 overflow-x-hidden overflow-y-auto hide-scrollbar bg-gradient-to-b from-background via-background to-background/50 relative flex flex-col">
          <div className="px-4 flex-1 relative flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="flex-1 flex flex-col"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
        <div id="floating-actions-container" className="absolute bottom-[110px] right-6 z-[45]"></div>
        <Suspense fallback={null}>
          <AIAssistant />
          <DeadlineToastNotifier />
          <StreakCelebrationToast />
        </Suspense>
        <BottomNav />
      </div>
    </div>
  );
}
