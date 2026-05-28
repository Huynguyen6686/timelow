import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/src/store/AppContext';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Coffee, Sparkles, Music } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { GlowEffect } from '@/src/components/GlowEffect';
import { lofiGenerator } from '@/src/utils/lofiGenerator';
import YouTubePlayer from '@/src/components/YouTubePlayer';

type Mode = 'Focus' | 'Break';

export default function Pomodoro() {
  const { addFocusTime, activeTask, setActiveTask, updateTask } = useAppContext();
  
  const [mode, setMode] = useState<Mode>('Focus');
  const [focusDuration, setFocusDuration] = useState(25); // in minutes
  const [breakDuration, setBreakDuration] = useState(5); // in minutes
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isLofiPlaying, setIsLofiPlaying] = useState(false);

  // Clean up ambient audio on unmount
  useEffect(() => {
    return () => {
      lofiGenerator.stop();
    };
  }, []);

  const toggleLofi = () => {
    if (isLofiPlaying) {
      lofiGenerator.stop();
      setIsLofiPlaying(false);
    } else {
      lofiGenerator.start();
      setIsLofiPlaying(true);
    }
  };
  
  // Precise background-safe timer states
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const expectedNextTickRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeTask) {
      setMode('Focus');
      const duration = activeTask.estimatedTime || 25;
      setFocusDuration(duration);
      setTimeLeft(duration * 60);
      setIsActive(true);
    }
  }, [activeTask]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      // If we don't have a target end time, or if timeLeft changed from outside (e.g. manual reset)
      if (!endTimeRef.current || timeLeft !== expectedNextTickRef.current) {
        endTimeRef.current = Date.now() + timeLeft * 1000;
      }

      timerRef.current = setTimeout(() => {
        const remaining = Math.max(0, Math.ceil((endTimeRef.current! - Date.now()) / 1000));
        expectedNextTickRef.current = remaining;
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          endTimeRef.current = null;
          expectedNextTickRef.current = null;
          handleComplete();
        }
      }, 1000);
    } else {
      endTimeRef.current = null;
      expectedNextTickRef.current = null;
      if (timeLeft === 0) {
        handleComplete();
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const playCompletionSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gainNode.gain.setValueAtTime(0, start);
        gainNode.gain.linearRampToValueAtTime(0.12, start + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc.start(start);
        osc.stop(start + duration);
      };

      const now = audioCtx.currentTime;
      playTone(523.25, now, 0.8);      // C5
      playTone(659.25, now + 0.15, 0.8); // E5
      playTone(783.99, now + 0.3, 0.8);  // G5
      playTone(1046.50, now + 0.45, 1.5); // C6
    } catch (e) {
      console.warn("Chime sound blocked by browser policy:", e);
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    playCompletionSound();
    if (mode === 'Focus') {
      addFocusTime(focusDuration);
      if (activeTask) {
        updateTask(activeTask.id, { status: 'Completed' });
        setActiveTask(null);
      }
      setMode('Break');
      setTimeLeft(breakDuration * 60);
    } else {
      setMode('Focus');
      setTimeLeft(focusDuration * 60);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'Focus' ? focusDuration * 60 : breakDuration * 60);
  };

  const handleCancelActiveTask = () => {
    setIsActive(false);
    setActiveTask(null);
    setFocusDuration(25);
    setTimeLeft(25 * 60);
  };

  const handleCompleteActiveTaskEarly = () => {
    setIsActive(false);
    if (activeTask) {
      updateTask(activeTask.id, { status: 'Completed' });
      const spentMinutes = Math.max(1, Math.ceil((focusDuration * 60 - timeLeft) / 60));
      addFocusTime(spentMinutes);
      setActiveTask(null);
    }
    setFocusDuration(25);
    setTimeLeft(25 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  const totalTime = mode === 'Focus' ? focusDuration * 60 : breakDuration * 60;
  const progress = 100 - ((timeLeft / totalTime) * 100);

  const card3DClass = "bg-background/40 border-t border-l border-white/10 border-b border-r border-black/50 shadow-[10px_10px_20px_rgba(0,0,0,0.3),-5px_-5px_15px_rgba(255,255,255,0.02)]";
  const innerShadowClass = "bg-background/20 shadow-[inset_4px_4px_10px_rgba(0,0,0,0.5),inset_-2px_-2px_6px_rgba(255,255,255,0.03)]";

  return (
    <div className="space-y-8 flex flex-col items-center justify-center min-h-[calc(100vh-140px)] relative overflow-hidden">
      
      {/* Background flare */}
      <div className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-10 blur-[100px] rounded-full pointer-events-none transition-colors duration-1000", mode === 'Focus' ? "bg-primary" : "bg-blue-500")}></div>

      <div className="text-center space-y-2 relative z-10 w-full mb-4">
        <div className={cn("mx-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-[16px] border border-white/5", innerShadowClass)}>
            {mode === 'Focus' ? <Sparkles className="w-4 h-4 text-primary" /> : <Coffee className="w-4 h-4 text-blue-400" />}
            <span className="text-xs font-bold uppercase tracking-widest text-foreground drop-shadow-sm">{mode === 'Focus' ? 'Phiên tập trung' : 'Thời gian nghỉ'}</span>
        </div>
      </div>

      {activeTask && (
        <div className="bg-primary/5 border border-primary/20 rounded-[24px] p-4 text-center space-y-2 max-w-[340px] w-full relative z-10 shadow-[inset_1px_1px_3px_rgba(255,255,255,0.02)]">
           <div className="text-[10px] text-primary font-bold uppercase tracking-widest">Đang thực hiện nhiệm vụ</div>
           <div className="font-extrabold text-sm text-foreground line-clamp-2 px-2 drop-shadow-sm">{activeTask.title}</div>
           {activeTask.estimatedTime && (
             <div className="text-[10px] text-muted-foreground font-bold">Thời gian ước lượng: {activeTask.estimatedTime} phút</div>
           )}
           <div className="flex gap-2 justify-center pt-2">
             <Button 
               size="sm" 
               variant="outline" 
               onClick={handleCancelActiveTask}
               className="h-8 rounded-lg text-xs bg-transparent border-white/5 hover:bg-slate-850 hover:text-foreground text-muted-foreground font-semibold"
             >
               Hủy bỏ
             </Button>
             
             <Button 
               size="sm" 
               onClick={handleCompleteActiveTaskEarly}
               className="h-8 rounded-lg text-xs bg-gradient-to-b from-primary to-primary/95 text-emerald-950 font-black tracking-wide border border-primary/30 shadow-[0_4px_10px_rgba(52,211,153,0.15)] uppercase"
             >
               Hoàn thành sớm
             </Button>
           </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-[340px]">
         <div className="p-0 flex flex-col items-center justify-center">
            <div className={cn("relative w-72 h-72 flex items-center justify-center rounded-full", innerShadowClass)}>
                {/* Decorative outer rings */}
                <div className="absolute inset-0 rounded-full border-t border-l border-white/5 border-b border-r border-black/50"></div>
                <div className="absolute inset-4 rounded-full border border-black/50 shadow-[0_4px_10px_rgba(0,0,0,0.5)]"></div>

                <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                    cx="144"
                    cy="144"
                    r="126"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-black/40"
                    />
                    <circle
                    cx="144"
                    cy="144"
                    r="126"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={126 * 2 * Math.PI}
                    strokeDashoffset={126 * 2 * Math.PI * (1 - progress / 100)}
                    className={cn("transition-all duration-1000 ease-linear", mode === 'Focus' ? "text-primary drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" : "text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]")}
                    strokeLinecap="round"
                    />
                </svg>
                <div className="text-center z-10 flex flex-col items-center drop-shadow-xl">
                    <div className="text-[80px] font-black font-mono tracking-tighter leading-none mb-1 text-foreground" style={{ textShadow: '0 4px 15px rgba(0,0,0,0.6)' }}>
                        {String(minutes).padStart(2, '0')}
                    </div>
                    <div className="text-[60px] font-bold font-mono tracking-tighter leading-none text-muted-foreground/60" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>
                        {String(seconds).padStart(2, '0')}
                    </div>
                </div>
            </div>
         </div>
      </div>

      <div className="flex flex-col items-center gap-6 mt-12 relative z-10">
        <div className="flex gap-6 items-center">
            <GlowEffect glowColor={mode === 'Focus' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(59, 130, 246, 0.15)'} tiltSpeed={4} glowSize={60} borderRadius="22px">
                <Button size="icon" variant="outline" className={cn("h-16 w-16 rounded-[22px] text-muted-foreground hover:text-foreground w-full h-full", card3DClass)} onClick={resetTimer}>
                    <RotateCcw className="w-7 h-7 drop-shadow-sm" />
                </Button>
            </GlowEffect>
            
            <GlowEffect glowColor={mode === 'Focus' ? 'rgba(52, 211, 153, 0.6)' : 'rgba(59, 130, 246, 0.6)'} tiltSpeed={5} glowSize={90} borderRadius="32px">
                <Button 
                    size="icon" 
                    className={cn(
                        "w-24 h-24 rounded-[32px] text-lg transition-all duration-300 w-full h-full", 
                        isActive 
                            ? (mode === 'Focus' ? 'bg-background text-primary shadow-[inset_4px_4px_10px_rgba(0,0,0,0.6),inset_-2px_-2px_5px_rgba(255,255,255,0.05)] border border-primary/20' : 'bg-background text-blue-400 shadow-[inset_4px_4px_10px_rgba(0,0,0,0.6),inset_-2px_-2px_5px_rgba(255,255,255,0.05)] border border-blue-500/20')
                            : (mode === 'Focus' ? 'bg-gradient-to-br from-primary/90 to-primary text-emerald-950 shadow-[0_15px_30px_rgba(52,211,153,0.4),inset_0_2px_5px_rgba(255,255,255,0.5),inset_0_-3px_5px_rgba(0,0,0,0.3)] border border-primary/50 hover:brightness-110' : 'bg-gradient-to-br from-blue-500/90 to-blue-600 text-white shadow-[0_15px_30px_rgba(59,130,246,0.4),inset_0_2px_5px_rgba(255,255,255,0.5),inset_0_-3px_5px_rgba(0,0,0,0.3)] border border-blue-500/50 hover:brightness-110')
                    )} 
                    onClick={toggleTimer}
                >
                {isActive ? <Pause className="w-10 h-10 fill-current drop-shadow-sm"/> : <Play className="w-10 h-10 fill-current translate-x-0.5 drop-shadow-sm"/>}
                </Button>
            </GlowEffect>

            <GlowEffect glowColor={mode === 'Focus' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(59, 130, 246, 0.15)'} tiltSpeed={4} glowSize={60} borderRadius="22px">
                <Button 
                   size="icon" 
                   variant="outline" 
                   className={cn("h-16 w-16 rounded-[22px] text-muted-foreground hover:text-foreground w-full h-full", card3DClass)} 
                   onClick={() => {
                       setMode(mode === 'Focus' ? 'Break' : 'Focus')
                       setTimeLeft(mode === 'Focus' ? breakDuration * 60 : focusDuration * 60)
                       setIsActive(false)
                   }}
                >
                    {mode === 'Focus' ? <Coffee className="w-7 h-7 drop-shadow-sm" /> : <Sparkles className="w-7 h-7 drop-shadow-sm hover:text-primary" />}
                </Button>
            </GlowEffect>
        </div>

        {/* Ambient Lo-Fi Background Noise Control */}
        <div className="flex flex-col items-center gap-2 mt-2">
          <button
            onClick={toggleLofi}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full border text-xs font-black tracking-wide uppercase transition-all shadow-md active:scale-95 cursor-pointer relative overflow-hidden group",
              isLofiPlaying 
                ? "bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]" 
                : "bg-slate-950/40 border-white/5 text-muted-foreground hover:bg-slate-950/60 hover:text-foreground hover:border-white/10"
            )}
          >
            <div className="flex items-center gap-1.5 z-10">
              {/* Sound wave visualizer bars */}
              {isLofiPlaying ? (
                <div className="flex items-end gap-0.5 h-3 w-3 mr-1">
                  <span className="w-0.5 bg-amber-400 rounded-full animate-bounce" style={{ height: '70%', animationDuration: '0.8s' }}></span>
                  <span className="w-0.5 bg-amber-400 rounded-full animate-bounce" style={{ height: '100%', animationDuration: '0.5s', animationDelay: '0.15s' }}></span>
                  <span className="w-0.5 bg-amber-400 rounded-full animate-bounce" style={{ height: '40%', animationDuration: '0.7s', animationDelay: '0.3s' }}></span>
                </div>
              ) : (
                <Music className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              )}
              <span>{isLofiPlaying ? 'Lo-Fi Ambient: ON' : 'Nhạc Nền Lo-Fi: OFF'}</span>
            </div>
            
            {/* Soft inner organic glow */}
            {isLofiPlaying && (
              <span className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent w-full h-full opacity-60 animate-pulse pointer-events-none"></span>
            )}
          </button>
          
          {isLofiPlaying && (
            <span className="text-[9px] text-amber-500/60 font-black tracking-widest uppercase animate-pulse">
              Đang phát âm thanh mưa rơi &amp; đĩa than sần sùi...
            </span>
          )}
        </div>

        {/* Dynamic Duration Presets - Hidden when active task is present */}
        {!activeTask && (
          <div className="flex flex-col items-center gap-3 mt-4">
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-[300px]">
              {(mode === 'Focus' ? [15, 25, 30, 45, 60] : [3, 5, 10, 15, 20]).map((mins) => (
                <button
                  key={mins}
                  disabled={isActive}
                  onClick={() => {
                    if (mode === 'Focus') {
                      setFocusDuration(mins);
                      setTimeLeft(mins * 60);
                    } else {
                      setBreakDuration(mins);
                      setTimeLeft(mins * 60);
                    }
                  }}
                  className={cn(
                    "px-3 py-1.5 text-[11px] font-bold rounded-[10px] transition-all border",
                    isActive ? "opacity-30 cursor-not-allowed" : "active:scale-95",
                    (mode === 'Focus' ? focusDuration === mins : breakDuration === mins)
                      ? (mode === 'Focus' 
                          ? "bg-primary/20 border-primary/40 text-primary shadow-[0_0_12px_rgba(52,211,153,0.15)] font-extrabold" 
                          : "bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)] font-extrabold")
                      : "bg-slate-950/20 border-white/5 text-muted-foreground hover:bg-slate-950/40 hover:text-foreground hover:border-white/10"
                  )}
                >
                  {mins} Phút
                </button>
              ))}
            </div>

            {/* Centered Tinh chỉnh Fine-Tuning */}
            <div className="flex items-center gap-2 bg-slate-950/30 px-3 py-1.5 rounded-[12px] border border-white/5">
              <button 
                disabled={isActive}
                onClick={() => {
                  if (mode === 'Focus') {
                    const newVal = Math.max(1, focusDuration - 1);
                    setFocusDuration(newVal);
                    setTimeLeft(newVal * 60);
                  } else {
                    const newVal = Math.max(1, breakDuration - 1);
                    setBreakDuration(newVal);
                    setTimeLeft(newVal * 60);
                  }
                }}
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-[8px] bg-slate-950/40 border border-white/10 transition-all text-xs font-bold active:scale-90 disabled:opacity-20 disabled:pointer-events-none text-muted-foreground hover:text-foreground hover:bg-slate-500/15"
                )}
              >
                -
              </button>
              <span className="text-[11px] font-extrabold text-foreground/80 px-2 uppercase tracking-wide">
                {mode === 'Focus' ? focusDuration : breakDuration} Phút
              </span>
              <button 
                disabled={isActive}
                onClick={() => {
                  if (mode === 'Focus') {
                    const newVal = Math.min(180, focusDuration + 1);
                    setFocusDuration(newVal);
                    setTimeLeft(newVal * 60);
                  } else {
                    const newVal = Math.min(60, breakDuration + 1);
                    setBreakDuration(newVal);
                    setTimeLeft(newVal * 60);
                  }
                }}
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-[8px] bg-slate-950/40 border border-white/10 transition-all text-xs font-bold active:scale-90 disabled:opacity-20 disabled:pointer-events-none text-muted-foreground hover:text-foreground hover:bg-slate-500/15"
                )}
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Custom YouTube Music Link Player */}
        <YouTubePlayer />
      </div>

    </div>
  );
}
