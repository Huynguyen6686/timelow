import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Timer, MoreVertical, Plus, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils'; // Make sure to add this import if it's missing but usually we have it
import { FloatingAction } from '@/src/components/FloatingAction';
import { GlowEffect } from '@/src/components/GlowEffect';

export default function Dashboard() {
  const { tasks, focusTimeMinutes, habits, user, setActiveTask } = useAppContext();
  const navigate = useNavigate();
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  const tasksToday = tasks.filter(t => t.deadline && new Date(t.deadline).getTime() >= today.getTime() && new Date(t.deadline).getTime() < today.getTime() + 86400000);
  const completedTasksToday = tasksToday.filter(t => t.status === 'Completed');
  const highPriorityTasks = tasksToday.filter(t => (t.priority === 'Critical' || t.priority === 'High') && t.status !== 'Completed');

  const focusHours = (focusTimeMinutes / 60).toFixed(1);
  const userName = user?.displayName ? user.displayName.split(' ')[0] : 'bạn';

  const taskProgress = tasksToday.length > 0 ? (completedTasksToday.length / tasksToday.length) * 100 : 0;
  
  const nextTask = tasksToday.find(t => t.status !== 'Completed') || tasks.find(t => t.status !== 'Completed');

  // Shared 3D card class
  const card3DClass = "bg-gradient-to-br from-card/90 to-background border-t border-l border-white/10 border-b border-r border-black/50 shadow-[10px_10px_20px_rgba(0,0,0,0.3),-5px_-5px_15px_rgba(255,255,255,0.02)] rounded-[28px]";
  const innerShadowClass = "bg-background/40 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.02)]";

  return (
    <div className="space-y-6 relative pt-2">
      <header className="mb-4 px-1 flex justify-between items-center gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-black text-foreground leading-[1.15] tracking-tight mb-2 drop-shadow-md">
            Sẵn sàng,<br/>{userName}?
          </h1>
          <p className="text-xs font-semibold text-muted-foreground leading-relaxed pr-2">
            Hãy đạt hiệu suất tối đa hôm nay nhé!
          </p>
        </div>
        
        <GlowEffect glowColor="rgba(52, 211, 153, 0.25)" tiltSpeed={3} glowSize={80} borderRadius="9999px" className="shrink-0">
          <div className={cn("relative w-[88px] h-[88px] flex items-center justify-center rounded-full bg-slate-900/30 border border-white/5", innerShadowClass)}>
              <svg className="absolute inset-0 w-full h-full transform -rotate-90 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="8" className="text-secondary opacity-30" />
                  <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="257.6" strokeDashoffset={257.6 - (257.6 * taskProgress) / 100} className="text-primary rounded-full transition-all duration-1000" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center drop-shadow-md">
                  <span className="text-lg font-black tracking-tighter text-foreground" style={{ textShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>{Math.round(taskProgress)}%</span>
                  <span className="text-[7.5px] font-bold tracking-[0.1em] text-muted-foreground uppercase">Tiến trình</span>
              </div>
          </div>
        </GlowEffect>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-bold text-foreground drop-shadow-sm">Ưu tiên cao</h2>
          <button className="text-primary text-xs font-semibold hover:underline" onClick={() => navigate('/tasks')}>Xem tất cả</button>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory hide-scrollbar -mx-4 px-4">
            {highPriorityTasks.length > 0 ? highPriorityTasks.map(task => (
                <GlowEffect key={task.id} className="min-w-[280px] snap-center shrink-0" glowColor="rgba(244, 63, 94, 0.18)" tiltSpeed={4} glowSize={110} borderRadius="28px">
                    <Card className={cn("w-full relative overflow-hidden border-none", card3DClass)}>
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
                        <CardContent className="p-5 pl-7">
                            <div className="flex justify-between items-start mb-3">
                                <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-bold uppercase rounded-[6px] tracking-wider shadow-sm">Khẩn cấp</span>
                                <button className="text-muted-foreground hover:text-foreground">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>
                            <h3 className="text-[16px] font-bold text-foreground mb-4 pr-4 truncate drop-shadow-sm">{task.title}</h3>
                            <div className="flex items-center text-xs font-semibold text-muted-foreground bg-background/50 px-3 py-1.5 rounded-lg border border-white/5 inline-flex shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2)]">
                                <Timer className="w-3.5 h-3.5 mr-1.5 text-primary" />
                                {task.deadline ? format(new Date(task.deadline), 'HH:mm - dd/MM', { locale: vi }) : 'Hôm nay'}
                            </div>
                        </CardContent>
                    </Card>
                </GlowEffect>
            )) : (
                <Card className={cn("min-w-[280px] snap-center shrink-0 border-none", card3DClass)}>
                    <CardContent className="p-6 flex items-center justify-center h-28">
                        <p className="text-sm text-muted-foreground font-medium">Không có ưu tiên cao</p>
                    </CardContent>
                </Card>
            )}
        </div>
      </section>

      <section className={cn("p-6 space-y-6 border-none", card3DClass)}>
         <h2 className="text-xl font-bold text-foreground drop-shadow-sm">Thói quen hôm nay</h2>
         {habits.length > 0 ? (
           <div className="flex justify-between items-start overflow-x-auto hide-scrollbar gap-4 pb-2">
               {habits.map(habit => {
                   const isCompleted = habit.completedDates.includes(todayStr);
                   return (
                       <div key={habit.id} className="flex flex-col items-center gap-2 min-w-[56px] group">
                           <div className={cn(
                               "w-14 h-14 rounded-[20px] flex items-center justify-center relative overlow-hidden transition-all duration-300",
                               isCompleted 
                                 ? "bg-gradient-to-br from-primary/80 to-primary text-emerald-950 shadow-[0_10px_20px_rgba(52,211,153,0.3),inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.2)]" 
                                 : "bg-background/40 text-foreground border-t border-l border-white/10 border-b border-r border-black/50 shadow-[8px_8px_16px_rgba(0,0,0,0.3),-4px_-4px_10px_rgba(255,255,255,0.02)] hover:scale-105"
                           )}>
                               {isCompleted ? <Check className="w-6 h-6 drop-shadow-md" /> : <div className="text-[13px] font-black tracking-wider opacity-80">{habit.title.charAt(0)}</div>}
                           </div>
                           <span className={cn("text-[10px] font-bold line-clamp-1 text-center w-full mt-1", isCompleted ? "text-primary" : "text-muted-foreground")}>{habit.title}</span>
                       </div>
                   )
               })}
           </div>
         ) : (
             <p className="text-sm text-muted-foreground">Chưa có thói quen. Hãy thêm bên tab Thói quen nhé.</p>
         )}
      </section>

      <section className="relative">
          <GlowEffect glowColor="rgba(52, 211, 153, 0.22)" tiltSpeed={3} glowSize={180} borderRadius="28px">
               <Card className={cn("overflow-hidden border-none w-full", card3DClass)}>
                  <CardContent className="p-6 relative">
                      <Timer className="absolute right-[-20px] top-4 w-44 h-44 text-secondary/35 pointer-events-none drop-shadow-2xl" />
                      <div className="flex items-center gap-2 mb-4 bg-background/50 inline-flex px-3 py-1.5 rounded-[12px] border border-white/5 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2)]">
                          <div className="w-2 h-2 rounded-[4px] bg-primary animate-pulse shadow-[0_0_8px_currentColor]"></div>
                          <span className="text-[10px] font-bold tracking-[0.15em] text-primary uppercase pt-0.5">Sự tập trung tiếp theo</span>
                      </div>
                      <h2 className="text-2xl font-bold text-foreground mb-2 relative z-10 w-[85%] line-clamp-2 drop-shadow-md leading-tight">
                          {nextTask ? nextTask.title : 'Thư giãn & Nghỉ ngơi'}
                      </h2>
                      <p className="text-xs font-semibold text-muted-foreground mb-6 relative z-10">{nextTask ? 'Nhiệm vụ chưa hoàn thành' : 'Không có nhiệm vụ nào chờ'}</p>
                      <Button onClick={() => {
                          if (nextTask) {
                            setActiveTask(nextTask);
                          }
                          navigate('/pomodoro');
                      }} className="w-full h-14 rounded-2xl bg-gradient-to-b from-primary/90 to-primary text-emerald-950 font-bold text-sm tracking-widest uppercase shadow-[0_10px_20px_rgba(52,211,153,0.3),inset_0_2px_5px_rgba(255,255,255,0.4),inset_0_-3px_5px_rgba(0,0,0,0.2)] border border-primary/50 hover:brightness-110 active:scale-[0.98] transition-all">
                          Bắt đầu hẹn giờ
                      </Button>
                  </CardContent>
               </Card>
          </GlowEffect>
      </section>

      <section className="grid grid-cols-2 gap-4 pb-20">
         <GlowEffect glowColor="rgba(52, 211, 153, 0.15)" tiltSpeed={4} glowSize={100} borderRadius="28px">
             <Card className={cn("border-none w-full h-full", card3DClass)}>
                 <CardContent className="p-5 flex flex-col items-center justify-center gap-1">
                     <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase text-center w-full drop-shadow-sm">Thời gian tập trung</span>
                     <span className="text-3xl font-black text-foreground drop-shadow-md" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>{focusHours}<span className="text-base text-muted-foreground font-bold ml-1">h</span></span>
                 </CardContent>
             </Card>
         </GlowEffect>
         <GlowEffect glowColor="rgba(52, 211, 153, 0.15)" tiltSpeed={4} glowSize={100} borderRadius="28px">
             <Card className={cn("border-none w-full h-full", card3DClass)}>
                 <CardContent className="p-5 flex flex-col items-center justify-center gap-1">
                     <span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase text-center w-full drop-shadow-sm">Nhiệm vụ xong</span>
                     <span className="text-3xl font-black text-foreground drop-shadow-md" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>{completedTasksToday.length}/{tasksToday.length}</span>
                 </CardContent>
             </Card>
         </GlowEffect>
      </section>

      {/* Spacer to avoid cutting off scroll behind nav */}
      <div className="h-4"></div>

      <FloatingAction>
        <GlowEffect glowColor="rgba(52, 211, 153, 0.55)" tiltSpeed={5} glowSize={70} borderRadius="24px" scaleOnHover={true}>
          <Button onClick={() => navigate('/tasks')} size="icon" className="w-16 h-16 rounded-[24px] bg-gradient-to-b from-primary/90 to-primary text-emerald-950 shadow-[0_12px_24px_rgba(52,211,153,0.4),inset_0_2px_5px_rgba(255,255,255,0.5),inset_0_-3px_5px_rgba(0,0,0,0.3)] border border-primary/50 transition-all duration-300">
              <Plus className="w-8 h-8 drop-shadow-sm" strokeWidth={2.5}/>
          </Button>
        </GlowEffect>
      </FloatingAction>

    </div>
  );
}
