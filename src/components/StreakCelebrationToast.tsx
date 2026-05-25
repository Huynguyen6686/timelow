import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext, Habit } from '../store/AppContext';
import { Award, Flame, Sparkles, X, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CelebrationItem {
  id: string;
  habitTitle: string;
  streak: number;
}

export default function StreakCelebrationToast() {
  const { habits, loading, language } = useAppContext();
  const [activeCelebrations, setActiveCelebrations] = useState<CelebrationItem[]>([]);
  
  const prevHabitsRef = useRef<Habit[]>([]);
  const isFirstLoadRef = useRef(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play a beautiful ascending major pentatonic triumph chord
  const playTriumphChime = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // Friendly, inspiring notes: C4, E4, G4, C5, G5
      const notes = [261.63, 329.63, 392.00, 523.25, 783.99];
      
      notes.forEach((freq, idx) => {
        const toneTime = now + idx * 0.08;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        // Use a clean triangle wave for a warm woodwind-like high value feel
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, toneTime);
        
        gain.gain.setValueAtTime(0, toneTime);
        gain.gain.linearRampToValueAtTime(0.06, toneTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, toneTime + 0.45);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(toneTime);
        osc.stop(toneTime + 0.5);
      });

    } catch (e) {
      console.log('Striumph synthesizer played with restrictions', e);
    }
  };

  // Monitor habits check-off
  useEffect(() => {
    if (loading || !habits) return;

    if (isFirstLoadRef.current) {
      prevHabitsRef.current = habits;
      isFirstLoadRef.current = false;
      return;
    }

    const freshCelebrations: CelebrationItem[] = [];

    habits.forEach((currentHabit) => {
      const prevHabit = prevHabitsRef.current.find((h) => h.id === currentHabit.id);
      
      // We look for any completed dates addition (check-off)
      if (prevHabit) {
        const wasCompletedCount = prevHabit.completedDates.length;
        const isCompletedCount = currentHabit.completedDates.length;

        if (isCompletedCount > wasCompletedCount) {
          // User just checked off a day!
          freshCelebrations.push({
            id: `${currentHabit.id}_${Date.now()}`,
            habitTitle: currentHabit.title,
            streak: currentHabit.streak
          });
        }
      }
    });

    if (freshCelebrations.length > 0) {
      setActiveCelebrations((prev) => {
        // Limit maximum simultaneous toast stack size to 2 to keep layout neat and tidy
        const merged = [...prev, ...freshCelebrations];
        if (merged.length > 2) {
          return merged.slice(-2);
        }
        return merged;
      });
      playTriumphChime();
    }

    prevHabitsRef.current = habits;
  }, [habits, loading]);

  const removeCelebration = (id: string) => {
    setActiveCelebrations((prev) => prev.filter((item) => item.id !== id));
  };

  // Auto-expire toasts after 7 seconds
  useEffect(() => {
    if (activeCelebrations.length === 0) return;
    const oldest = activeCelebrations[0];
    const timer = setTimeout(() => {
      removeCelebration(oldest.id);
    }, 7000);
    return () => clearTimeout(timer);
  }, [activeCelebrations]);

  return (
    <div className="absolute bottom-[110px] left-4 right-4 z-[99] flex flex-col gap-2.5 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {activeCelebrations.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 40, scale: 0.85, rotate: -2 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.9, filter: 'blur(5px)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="w-full bg-gradient-to-br from-[#121624]/95 via-[#182136]/95 to-[#0b0e1a]/95 border border-emerald-500/35 shadow-[0_20px_40px_rgba(16,185,129,0.2),0_0_15px_rgba(52,211,153,0.12)] rounded-3xl p-4 pointer-events-auto flex flex-col gap-1.5 backdrop-blur-lg relative overflow-hidden"
          >
            {/* Sparkle details floating behind */}
            <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none overflow-hidden opacity-25">
              <div className="absolute top-2 left-1/4 w-12 h-12 rounded-full bg-emerald-500/20 blur-xl animate-pulse"></div>
              <div className="absolute bottom-2 right-1/4 w-16 h-16 rounded-full bg-amber-500/20 blur-xl animate-pulse delay-75"></div>
            </div>

            {/* Accent colored border strip */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500"></div>

            <div className="flex items-start gap-3">
              {/* Flame/Trophy Badge */}
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-emerald-400 to-teal-500 p-[1px] shadow-[0_4px_12px_rgba(52,211,153,0.3)] shrink-0 mt-0.5 relative">
                <div className="w-full h-full rounded-[15px] bg-[#0c101d] flex items-center justify-center text-emerald-400">
                  {toast.streak > 1 ? (
                    <>
                      <Flame className="w-5 h-5 text-amber-500 fill-amber-500 animate-bounce" />
                      <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-[10px] font-black text-slate-950 px-1.5 py-0.5 rounded-full border border-slate-950 shadow-sm">
                        {toast.streak}
                      </span>
                    </>
                  ) : (
                    <Trophy className="w-5 h-5 text-emerald-400 animate-pulse" />
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    {language === 'vi' ? 'BẬT DANH CAO THỦ' : 'HABIT CHECKED OFF'}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                  <span className="text-[10px] font-black tracking-widest text-amber-400">
                    {toast.streak > 1 
                      ? (language === 'vi' ? `CHUỖI ${toast.streak} NGÀY` : `${toast.streak}D STREAK`)
                      : (language === 'vi' ? 'KHỞI ĐẦU MỚI' : 'NEW START')
                    }
                  </span>
                </div>
                
                <h4 className="text-xs font-black text-slate-100 mt-1 leading-snug">
                  {language === 'vi' ? `Đã hoàn thành: ${toast.habitTitle}` : `Checked off: ${toast.habitTitle}`}
                </h4>
                
                <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                  {toast.streak > 1 ? (
                    language === 'vi' 
                      ? `Tuyệt vời! Bạn đã duy trì liên tục trong ${toast.streak} ngày. Giữ vững phong độ nhé!` 
                      : `Incredible job! You've sustained this habit for ${toast.streak} straight days!`
                  ) : (
                    language === 'vi'
                      ? 'Nền tảng của vĩ đại bắt đầu từ hôm nay. Chúc mừng bạn đã bắt đầu thành công!'
                      : 'The foundation of greatness starts today. Good first step!'
                  )}
                </p>
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeCelebration(toast.id)}
                className="w-7 h-7 hover:bg-white/5 text-zinc-500 hover:text-white rounded-lg shrink-0 -mt-1 -mr-1"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
