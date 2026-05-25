import { NavLink } from 'react-router-dom';
import { CheckSquare, Timer, LayoutGrid, Activity, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/src/store/AppContext';

export function BottomNav() {
  const { language } = useAppContext();

  const labels = {
    en: { home: 'Overview', tasks: 'Tasks', focus: 'Focus', habits: 'Habits', stats: 'Stats' },
    vi: { home: 'Tổng quan', tasks: 'Nhiệm vụ', focus: 'Tập trung', habits: 'Thói quen', stats: 'Thống kê' }
  };

  const currentLabels = labels[language] || labels.en;

  const navItems = [
    { to: '/', icon: LayoutGrid, label: currentLabels.home },
    { to: '/tasks', icon: CheckSquare, label: currentLabels.tasks },
    { to: '/pomodoro', icon: Timer, label: currentLabels.focus },
    { to: '/habits', icon: Activity, label: currentLabels.habits },
    { to: '/more', icon: BarChart2, label: currentLabels.stats },
  ];

  return (
    <nav className="absolute z-50 bottom-6 left-4 right-4 bg-card/90 backdrop-blur-2xl border-t border-l border-white/10 border-b border-r border-black/30 rounded-[32px] shadow-[0_20px_40px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.1)] flex justify-around p-2 items-center">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center w-[60px] h-14 rounded-[20px] transition-all duration-300 relative overflow-hidden",
              isActive 
                ? "text-primary shadow-[inset_3px_3px_8px_rgba(0,0,0,0.4),inset_-2px_-2px_5px_rgba(255,255,255,0.03)] bg-background/80 scale-[0.98]" 
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-primary/10 to-transparent"></div>}
              <item.icon className={cn("w-5 h-5 mb-1 relative z-10 transition-transform", isActive ? "scale-110 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "")} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[9px] font-bold tracking-wide relative z-10 px-0.5 w-full text-center whitespace-nowrap">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
