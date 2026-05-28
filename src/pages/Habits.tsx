import React, { useState } from 'react';
import { useAppContext } from '@/src/store/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Check, Calendar as CalIcon, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, addDays, startOfWeek } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GlowEffect } from '@/src/components/GlowEffect';

export default function Habits() {
  const { habits, addHabit, checkInHabit, removeHabitCheckIn } = useAppContext();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState<'Daily'|'Weekly'>('Daily');

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  // Last 7 days starting from Monday for the tracker (or just current week)
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(monday, i));

  // Dynamic calculations
  const totalThisWeekCheckins = habits.reduce((acc, habit) => {
    const weekDaysStrs = weekDays.map(d => format(d, 'yyyy-MM-dd'));
    const doneThisWeek = habit.completedDates.filter(d => weekDaysStrs.includes(d)).length;
    return acc + doneThisWeek;
  }, 0);
  const maxPossibleCheckins = habits.length * 7;
  const weeklyProgress = maxPossibleCheckins > 0 ? Math.round((totalThisWeekCheckins / maxPossibleCheckins) * 100) : 0;
  
  const currentMonthName = format(new Date(), 'MMMM', { locale: vi });
  const displayMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);
  const maxStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak), 0) : 0;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addHabit({ title, frequency });
    setTitle('');
    setFrequency('Daily');
    setIsAddOpen(false);
  };

  const playDopamineDing = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.type = 'triangle'; // Retro, warm tone
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // slide to D6
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn("Audio dopamine ding blocked:", e);
    }
  };

  const toggleCheckIn = (habitId: string, dateStr: string, isCompleted: boolean) => {
      if (isCompleted) {
          removeHabitCheckIn(habitId, dateStr);
      } else {
          checkInHabit(habitId, dateStr);
          playDopamineDing();
      }
  };

  // Mock data for consistency grid
  const daysInMonth = Array.from({ length: 31 }).map((_, i) => i + 1);

  const card3DClass = "bg-gradient-to-br from-card/90 to-background border-t border-l border-white/10 border-b border-r border-black/50 shadow-[10px_10px_20px_rgba(0,0,0,0.3),-5px_-5px_15px_rgba(255,255,255,0.02)]";
  const innerShadowClass = "bg-background/40 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.03)]";

  return (
    <div className="space-y-6 h-full flex flex-col pt-2 relative">
      <header className="flex justify-between items-start mb-2 px-1">
        <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-[0.15em] text-primary uppercase mb-2 drop-shadow-sm">Kiên trì là chìa khóa</span>
            <h1 className="text-4xl font-bold tracking-tight text-foreground leading-[1.1] drop-shadow-md">Thói<br/>quen</h1>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <GlowEffect glowColor="rgba(52, 211, 153, 0.45)" tiltSpeed={3} glowSize={100} borderRadius="16px" scaleOnHover={true}>
            <DialogTrigger render={<Button className="bg-gradient-to-b from-primary/90 to-primary text-emerald-950 font-bold tracking-wide rounded-2xl h-14 px-5 shadow-[0_10px_20px_rgba(52,211,153,0.3),inset_0_2px_5px_rgba(255,255,255,0.4),inset_0_-2px_5px_rgba(0,0,0,0.2)] border border-primary/50 hover:scale-105 active:scale-95 transition-all" />}>
              <Plus className="w-5 h-5 mr-1 drop-shadow-sm"/>
              Thêm mới
            </DialogTrigger>
          </GlowEffect>
          <DialogContent className="sm:max-w-md w-[90vw] rounded-[28px] border-t border-l border-white/10 border-b border-r border-black/60 bg-gradient-to-br from-[#1a1e2a] to-[#0f1118]/95 p-6 shadow-[25px_25px_50px_rgba(0,0,0,0.7),inset_0_1px_3px_rgba(255,255,255,0.08)]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground drop-shadow-md">Thêm thói quen mới</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground ml-1 text-xs font-semibold tracking-wide">Tên thói quen</Label>
                <GlowEffect glowColor="rgba(52, 211, 153, 0.15)" tiltSpeed={1} glowSize={60} borderRadius="16px" scaleOnHover={false}>
                  <Input 
                    id="title" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    required 
                    placeholder="Tên thói quen..." 
                    className="h-14 rounded-2xl bg-slate-950/40 border-t border-l border-white/5 border-b border-r border-black/40 shadow-[inset_3px_3px_10px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.01)] focus-visible:border-primary/50 focus-visible:shadow-[0_0_15px_rgba(52,211,153,0.15),inset_3px_3px_10px_rgba(0,0,0,0.6)] focus-visible:ring-2 focus-visible:ring-primary/10 text-foreground text-sm font-medium tracking-wide transition-all duration-300 placeholder:text-muted-foreground/30" 
                  />
                </GlowEffect>
              </div>
              <div className="space-y-2 pb-4">
                <Label className="text-muted-foreground ml-1 text-xs font-semibold tracking-wide">Tần suất</Label>
                <GlowEffect glowColor="rgba(52, 211, 153, 0.15)" tiltSpeed={1} glowSize={60} borderRadius="16px" scaleOnHover={false}>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-950/40 border-t border-l border-white/5 border-b border-r border-black/40 shadow-[inset_3px_3px_10px_rgba(0,0,0,0.6)] hover:bg-slate-950/50 text-foreground">
                      <SelectValue placeholder="Chọn tần suất" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#151924] border-white/10 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                      <SelectItem value="Daily" className="focus:bg-primary/10 focus:text-primary rounded-xl m-1">Hàng ngày</SelectItem>
                      <SelectItem value="Weekly" className="focus:bg-primary/10 focus:text-primary rounded-xl m-1">Hàng tuần</SelectItem>
                    </SelectContent>
                  </Select>
                </GlowEffect>
              </div>
              <GlowEffect glowColor="rgba(52, 211, 153, 0.45)" tiltSpeed={3} glowSize={120} borderRadius="16px">
                <Button 
                  type="submit" 
                  className="w-full mt-6 h-14 rounded-2xl font-black uppercase tracking-wider bg-gradient-to-b from-primary via-primary/95 to-emerald-400 text-emerald-950 shadow-[0_6px_15px_rgba(52,211,153,0.3),inset_0_2px_4px_rgba(255,255,255,0.45),inset_0_-3px_6px_rgba(0,0,0,0.3)] border-t border-l border-white/20 border-b-2 border-r-2 border-black/40 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(52,211,153,0.4),inset_0_2px_4px_rgba(255,255,255,0.45),inset_0_-3px_6px_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-[0_2px_5px_rgba(52,211,153,0.1),inset_0_-1px_2px_rgba(255,255,255,0.2),inset_0_3px_5px_rgba(0,0,0,0.4)] transition-all duration-300"
                >
                  Lưu thói quen
                </Button>
              </GlowEffect>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <ScrollArea className="flex-1 -mx-4 px-4 pb-12">
        <div className="space-y-5">
            <Card className={cn("rounded-[28px] shrink-0 border-none", card3DClass)}>
                <CardContent className="p-6">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest drop-shadow-sm">Hoàn thành hàng tuần</span>
                    <div className="flex items-end gap-2 mt-2 mb-5">
                        <span className="text-[52px] font-black tracking-tighter leading-none text-foreground" style={{ textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>{weeklyProgress}<span className="text-3xl text-muted-foreground">%</span></span>
                        <span className="text-xs font-bold text-primary mb-2 tracking-wide uppercase bg-primary/10 px-2 py-1 rounded-lg border border-primary/20">{displayMonth}</span>
                    </div>
                    <div className={cn("w-full h-3 rounded-full overflow-hidden flex", innerShadowClass)}>
                        <div className="h-full bg-gradient-to-r from-primary to-emerald-300 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)]" style={{ width: `${weeklyProgress}%` }}></div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
                <Card className={cn("rounded-[28px] border-none", card3DClass)}>
                    <CardContent className="p-5 flex flex-col">
                        <span className="text-[10px] font-bold text-muted-foreground mb-4 uppercase tracking-widest drop-shadow-sm">Chuỗi Max</span>
                        <div className="flex items-end gap-1 mb-4">
                            <span className="text-[44px] font-black tracking-tighter leading-none text-foreground drop-shadow-md">{maxStreak}</span>
                            <span className="text-xs font-bold text-muted-foreground mb-1.5 uppercase">ngày</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20">
                            <Activity className="w-4 h-4 text-primary drop-shadow-sm" />
                        </div>
                    </CardContent>
                </Card>
                <Card className={cn("rounded-[28px] border-none", card3DClass)}>
                    <CardContent className="p-5 flex flex-col">
                        <span className="text-[10px] font-bold text-muted-foreground mb-4 uppercase tracking-widest drop-shadow-sm">Mục tiêu</span>
                        <div className="flex items-end gap-1 mb-5">
                            <span className="text-[44px] font-black tracking-tighter leading-none text-foreground drop-shadow-md">{habits.length}</span>
                            <span className="text-xs font-bold text-muted-foreground mb-1.5 uppercase">đang làm</span>
                        </div>
                        <div className="flex -space-x-2">
                            {/* Dynamically render emojis based on user habits up to 3 */}
                            {habits.slice(0, 3).map((h, i) => {
                                const emojis = ['📚', '💪', '🧘', '💧', '🏃', '🥦'];
                                return (
                                    <div key={h.id} className="w-8 h-8 rounded-full bg-card border-2 border-background flex items-center justify-center text-[12px] shadow-sm" style={{ zIndex: 30 - i }}>
                                        {emojis[i % emojis.length]}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {habits.length === 0 ? (
               <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                    <CalIcon className="w-12 h-12 mb-4 opacity-20" />
                    <p>Chưa có thói quen nào.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {habits.map(habit => {
                        const isCompletedToday = habit.completedDates.includes(todayStr);
                        const glowColor = isCompletedToday ? "rgba(52, 211, 153, 0.18)" : "rgba(244, 63, 94, 0.15)";
                        return (
                            <GlowEffect key={habit.id} glowColor={glowColor} tiltSpeed={3} glowSize={120} borderRadius="24px" className="w-full">
                                <Card className={cn("relative overflow-hidden rounded-[24px] group border-none w-full", card3DClass)}>
                                    <div className={cn("absolute left-0 top-0 bottom-0 w-[5px]", isCompletedToday ? "bg-primary shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]")}></div>
                                    <CardContent className="p-5 pl-7">
                                        <div className="flex justify-between items-start mb-5">
                                            <div className="flex flex-col pr-2">
                                                <h3 className="font-bold text-[18px] text-foreground leading-tight drop-shadow-sm">{habit.title}</h3>
                                                <span className={cn("text-[11px] font-bold mt-1.5 uppercase tracking-widest", isCompletedToday ? "text-primary" : "text-rose-500")}>
                                                    {isCompletedToday ? `Chuỗi ${habit.streak} ngày` : 'Bỏ lỡ hôm nay'}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => toggleCheckIn(habit.id, todayStr, isCompletedToday)}
                                                className={cn(
                                                    "w-12 h-12 rounded-[16px] flex items-center justify-center transition-all duration-300 shrink-0 border border-white/5",
                                                    isCompletedToday 
                                                        ? "bg-gradient-to-br from-primary/80 to-primary text-emerald-950 shadow-[0_5px_15px_rgba(52,211,153,0.3),inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.2)]" 
                                                        : innerShadowClass + " text-muted-foreground hover:bg-background/40"
                                                )}
                                            >
                                                {isCompletedToday ? <Check className="w-6 h-6 stroke-[3px] drop-shadow-sm" /> : <Plus className="w-6 h-6" />}
                                            </button>
                                        </div>
                                        <div className="flex justify-between gap-2 mt-2">
                                            {weekDays.map((dateObj) => {
                                                const dayStr = format(dateObj, 'yyyy-MM-dd');
                                                const isDone = habit.completedDates.includes(dayStr);
                                                const label = format(dateObj, 'E', { locale: vi });
                                                // T2, T3...
                                                const shortLabel = label.includes('T') ? label.replace('Th ', 'T') : label.replace('CN', 'CN'); 
                                                
                                                return (
                                                    <div key={dayStr} className="flex flex-col items-center gap-2 flex-1">
                                                        <div onClick={() => toggleCheckIn(habit.id, dayStr, isDone)} className={cn(
                                                            "w-full aspect-square rounded-[10px] flex items-center justify-center transition-all duration-300 cursor-pointer border border-white/5",
                                                            isDone 
                                                              ? "bg-gradient-to-br from-primary/80 to-primary shadow-[0_2px_8px_rgba(52,211,153,0.4),inset_0_1px_2px_rgba(255,255,255,0.4)]" 
                                                              : innerShadowClass + " hover:bg-background/40"
                                                        )}>
                                                        </div>
                                                        <span className={cn("text-[9px] font-bold uppercase", isDone ? "text-primary" : "text-muted-foreground")}>{shortLabel.slice(0, 2)}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </GlowEffect>
                        )
                    })}
                </div>
            )}

            <div className="mt-10 space-y-5">
                <div className="flex justify-between items-end mb-6 px-1">
                    <h2 className="text-[24px] font-bold text-foreground leading-[1.1] tracking-tight w-[60%] drop-shadow-sm">Tính nhất quán hàng tháng</h2>
                    <div className={cn("flex items-center gap-3 rounded-[16px] p-2 px-4 shadow-sm border border-white/5", innerShadowClass)}>
                        <ChevronLeft className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                        <div className="flex flex-col items-center justify-center">
                            <span className="text-[11px] font-bold text-foreground tracking-widest uppercase">{format(new Date(), "'Th/'MM", { locale: vi })}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                    </div>
                </div>

                <Card className={cn("rounded-[32px] p-2 border-none", card3DClass)}>
                    <CardContent className="p-6">
                        <div className="flex justify-end items-center gap-2 mb-6 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                            <span>Ít</span>
                            <div className={cn("w-3.5 h-3.5 rounded-[6px] border border-white/5", innerShadowClass)}></div>
                            <div className="w-3.5 h-3.5 rounded-[6px] bg-primary/30 border border-primary/20 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.3)]"></div>
                            <div className="w-3.5 h-3.5 rounded-[6px] bg-primary/70 border border-primary/50 shadow-[0_0_5px_rgba(52,211,153,0.3)]"></div>
                            <div className="w-3.5 h-3.5 rounded-[6px] bg-primary shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
                            <span>Nhiều</span>
                        </div>
                        {/* Dynamic grid map */}
                        <div className="grid grid-cols-7 gap-2 sm:gap-3">
                            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                                <div key={d} className="text-[10px] font-bold text-center mb-2 uppercase tracking-wider text-muted-foreground">{d}</div>
                            ))}
                            {[...Array(35)].map((_, i) => {
                                const isFaded = i < 2 || i > 32; // adjusted for typical calendar starting offsets
                                const dayNum = (i % 31) + 1;
                                
                                // Check check-ins for the approximate ISO date of this month
                                const targetDate = new Date();
                                targetDate.setDate(dayNum);
                                const dateStrKey = format(targetDate, 'yyyy-MM-dd');
                                const checkInCount = habits.filter(h => h.completedDates.includes(dateStrKey)).length;
                                
                                const isGreen = checkInCount >= 2;
                                const isLightGreen = checkInCount === 1;
                                const isOutline = checkInCount === 0 && !isFaded && habits.length > 0;
                                
                                return (
                                    <div key={i} className={cn(
                                        "aspect-square rounded-[8px] sm:rounded-xl flex items-center justify-center text-[12px] font-bold transition-all border border-white/5",
                                        isGreen ? "bg-gradient-to-br from-primary/90 to-primary text-emerald-950 shadow-[0_2px_8px_rgba(52,211,153,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)]" : 
                                        isLightGreen ? "bg-primary/70 text-emerald-950 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]" :
                                        isOutline ? innerShadowClass + " text-foreground/70" :
                                        innerShadowClass + " text-muted-foreground",
                                        isFaded && "opacity-30"
                                    )}>
                                        {dayNum}
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            {/* Added some padding to make sure scroll goes all the way */}
            <div className="h-10"></div>
        </div>
      </ScrollArea>
    </div>
  );
}
