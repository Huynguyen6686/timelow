import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext, Task } from '../store/AppContext';
import { Clock, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ToastItem {
  id: string; // taskId + deadline hash to avoid duplicate triggering
  taskId: string;
  taskTitle: string;
  minutesRemaining: number;
  task: Task;
}

export default function DeadlineToastNotifier() {
  const { tasks, updateTask, language } = useAppContext();
  const [activeToasts, setActiveToasts] = useState<ToastItem[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play a beautiful synthetic chime when a crucial notification fires
  const playPingChime = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      
      // Node 1 (Soft warm high chime)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.04, now + 0.1);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Node 2 (Even higher pure bell tone, staggered)
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.frequency.setValueAtTime(880.00, ctx.currentTime); // A5
        gain2.gain.setValueAtTime(0, ctx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.6);
      }, 100);

    } catch (e) {
      console.log('Synth chime play restriction', e);
    }
  };

  // Check deadlines dynamically
  useEffect(() => {
    const checkDeadlines = () => {
      const now = Date.now();
      const MISSED_REMINDER_GRACE = 10 * 60 * 1000;
      
      // Keys representing already notified tasks
      const notifiedStorageKey = 'timeflow_notified_deadlines_v1';
      let notifiedMap: Record<string, boolean> = {};
      try {
        const cached = localStorage.getItem(notifiedStorageKey);
        if (cached) notifiedMap = JSON.parse(cached);
      } catch (e) {
        notifiedMap = {};
      }

      const freshToasts: ToastItem[] = [];
      let updatedNotifyMap = { ...notifiedMap };
      let mapChanged = false;

      (tasks || []).forEach((task) => {
        if (!task.deadline || task.status === 'Completed') return;
        const reminderAt = task.reminderTime || task.deadline;
        if (reminderAt > task.deadline) return;

        const timeUntilDeadline = task.deadline - now;
        const timeSinceReminder = now - reminderAt;
        
        // Trigger at the exact reminder time, with a short grace window for browser throttling.
        if (timeUntilDeadline >= 0 && timeSinceReminder >= 0 && timeSinceReminder <= MISSED_REMINDER_GRACE) {
          const minutesRemaining = Math.max(0, Math.round(timeUntilDeadline / (60 * 1000)));
          const uniqueNotifyKey = `${task.id}_${reminderAt}_${task.deadline}`;

          // If not notified yet, trigger alert!
          if (!notifiedMap[uniqueNotifyKey]) {
            freshToasts.push({
              id: uniqueNotifyKey,
              taskId: task.id,
              taskTitle: task.title,
              minutesRemaining,
              task,
            });
            updatedNotifyMap[uniqueNotifyKey] = true;
            mapChanged = true;
          }
        }
      });

      if (freshToasts.length > 0) {
        setActiveToasts((prev) => {
          // Merge unique toasts without duplicating
          const prevIds = new Set(prev.map(t => t.id));
          const filteredFresh = freshToasts.filter(t => !prevIds.has(t.id));
          if (filteredFresh.length > 0) {
            playPingChime();
          }
          return [...prev, ...filteredFresh];
        });
      }

      if (mapChanged) {
        localStorage.setItem(notifiedStorageKey, JSON.stringify(updatedNotifyMap));
      }
    };

    // Run custom assessment immediately on tasks updates or component mount
    checkDeadlines();

    // Check every 10 seconds for real-time proactive notification
    const interval = setInterval(checkDeadlines, 10000);
    return () => clearInterval(interval);
  }, [tasks]);

  const removeToast = (toastId: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== toastId));
  };

  const handleCompleteTask = async (toastId: string, taskId: string) => {
    try {
      await updateTask(taskId, { status: 'Completed' });
      // Clean delete toast from screen beautifully
      removeToast(toastId);
    } catch (err) {
      console.error('Failed to complete task from notification', err);
    }
  };

  return (
    <div className="absolute top-18 left-4 right-4 z-[99] flex flex-col gap-2.5 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {activeToasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="w-full bg-[#0d121f]/95 border border-amber-500/30 shadow-[0_15px_30px_rgba(245,158,11,0.15),0_0_12px_rgba(245,158,11,0.1)] rounded-2xl p-3.5 pointer-events-auto flex flex-col gap-2.5 backdrop-blur-md relative overflow-hidden"
          >
            {/* Ambient gold left slide accent */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600"></div>

            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 animate-pulse">
                <Clock className="w-4 h-4" />
              </div>
              
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">
                    {language === 'vi' ? 'SẮP ĐẾN HẠN CẬN KỀ' : 'URGENT DEADLINE'}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-amber-400"></span>
                  <span className="text-[10px] font-bold text-zinc-400">
                    {language === 'vi' ? `${toast.minutesRemaining} phút nữa` : `${toast.minutesRemaining}m left`}
                  </span>
                </div>
                <h4 className="text-xs font-black text-slate-100 mt-1 leading-snug truncate">
                  {toast.taskTitle}
                </h4>
                {toast.task.description && (
                  <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                    {toast.task.description}
                  </p>
                )}
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeToast(toast.id)}
                className="w-6 h-6 hover:bg-white/5 text-zinc-500 hover:text-white rounded-lg shrink-0 -mt-1 -mr-1"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Proactive Quick Interaction Action buttons */}
            <div className="flex gap-2 justify-end pt-0.5 mt-0.5 border-t border-white/5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeToast(toast.id)}
                className="h-7 px-2.5 text-[10px] text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg font-bold"
              >
                {language === 'vi' ? 'Nhắc tôi sau' : 'Snooze'}
              </Button>
              <Button
                size="sm"
                onClick={() => handleCompleteTask(toast.id, toast.taskId)}
                className="h-7 px-2.5 text-[10px] bg-gradient-to-r from-emerald-500 to-teal-500 text-emerald-950 font-black shadow-sm rounded-lg flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5 stroke-[3px]" />
                {language === 'vi' ? 'Xong ngay' : 'Mark Done'}
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
