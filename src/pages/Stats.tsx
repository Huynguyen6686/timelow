import { useState } from 'react';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, Clock, Target, CalendarDays, Zap, Award, 
  TrendingUp, CheckCircle2, Star, Flame, Calendar,
  Trophy, Sparkles, CheckSquare, Dumbbell, History, MessageSquare, ListCheck
} from 'lucide-react';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function Stats() {
  const { tasks, focusTimeMinutes, habits, goals } = useAppContext();
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | 'ALL'>('7D');
  const [hoveredDay, setHoveredDay] = useState<{ dateStr: string; count: number } | null>(null);

  // Parse time boundaries
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Basic Stats Calculation
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'InProgress').length;
  const todoTasks = tasks.filter(t => t.status === 'Todo').length;
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const focusHours = (focusTimeMinutes / 60).toFixed(1);
  const totalHabitCheckins = habits.reduce((acc, habit) => acc + habit.completedDates.length, 0);

  // Calculate Streak
  const activeHabitsStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak || 0), 0) : 0;

  // Task Priorities calculation
  const criticalTasks = tasks.filter(t => t.priority === 'Critical').length;
  const highTasks = tasks.filter(t => t.priority === 'High').length;
  const mediumTasks = tasks.filter(t => t.priority === 'Medium').length;
  const lowTasks = tasks.filter(t => t.priority === 'Low').length;

  // Sparkline-style / columns trend data depending on timeRange
  const daysOfTrend = timeRange === '7D' ? 7 : timeRange === '30D' ? 14 : 7;
  
  const activityTrend = Array.from({ length: daysOfTrend }).map((_, i) => {
    const targetDate = subDays(today, daysOfTrend - 1 - i);
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    const displayLabel = format(targetDate, timeRange === '7D' ? 'E' : 'dd/MM', { locale: vi });

    // Count tasks completed on this day (approximate by matching createdAt if same day or just simulate smooth distribution)
    // Actually tasks created on this day or completed on this day:
    const tasksCreated = tasks.filter(t => {
      const taskDate = new Date(t.createdAt);
      return isSameDay(taskDate, targetDate);
    }).length;

    // Habit checkins on this day
    const checkins = habits.reduce((sum, h) => sum + (h.completedDates.includes(dateStr) ? 1 : 0), 0);

    // Dynamic aggregated metric for bar height
    const weight = (tasksCreated * 25) + (checkins * 35) + 20; // 20 standard floor
    const finalValue = Math.min(100, Math.max(15, weight));

    return {
      label: displayLabel,
      val: finalValue,
      tasksCreated,
      checkins,
      dateFormatted: format(targetDate, 'dd MMMM yyyy', { locale: vi })
    };
  });

  // Last 28 Days Calendar Grid (4 weeks x 7 columns) for contribution map
  const renderCalendarGrid = () => {
    const gridDays = Array.from({ length: 28 }).map((_, i) => {
      const targetDate = subDays(today, 27 - i);
      const dateStr = format(targetDate, 'yyyy-MM-dd');

      // Count check-ins today
      const habitCount = habits.reduce((sum, h) => sum + (h.completedDates.includes(dateStr) ? 1 : 0), 0);
      
      // Completed tasks created around that day
      const tasksToday = tasks.filter(t => {
        const tDate = new Date(t.createdAt);
        return isSameDay(tDate, targetDate) && t.status === 'Completed';
      }).length;

      const totalValue = habitCount + tasksToday;
      let level = 0;
      if (totalValue > 0 && totalValue <= 1) level = 1;      // Light
      else if (totalValue > 1 && totalValue <= 3) level = 2; // Medium
      else if (totalValue > 3) level = 3;                     // Intense

      return {
        dateStr,
        labelStr: format(targetDate, 'dd/MM'),
        level,
        totalValue,
        dayOfWeek: format(targetDate, 'E', { locale: vi })
      };
    });

    return gridDays;
  };

  const contributionDays = renderCalendarGrid();

  // Gamified achievements list
  const achievements = [
    {
      id: "ach_pomo",
      title: "Chiến Binh Tập Trung",
      desc: "Tích lũy tối thiểu 5 giờ rèn luyện",
      icon: Clock,
      unlocked: parseFloat(focusHours) >= 5.0,
      color: "from-emerald-400/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
      progress: Math.min(100, Math.round((parseFloat(focusHours) / 5) * 100)),
      requirementText: `${focusHours} / 5.0 giờ`,
    },
    {
      id: "ach_disciplined",
      title: "Kỷ Luật Thép",
      desc: "Đạt chuỗi thói quen trên 3 ngày",
      icon: Flame,
      unlocked: activeHabitsStreak >= 3,
      color: "from-amber-400/20 to-orange-500/20 text-orange-400 border-orange-500/30",
      progress: Math.min(100, Math.round((activeHabitsStreak / 3) * 100)),
      requirementText: `${activeHabitsStreak} / 3 ngày`,
    },
    {
      id: "ach_slayer",
      title: "Sát Thủ Nhiệm Vụ",
      desc: "Hoàn tất ít nhất 10 nhiệm vụ",
      icon: Target,
      unlocked: completedTasks >= 10,
      color: "from-blue-400/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30",
      progress: Math.min(100, Math.round((completedTasks / 10) * 100)),
      requirementText: `${completedTasks} / 10 nhiệm vụ`,
    },
    {
      id: "ach_architect",
      title: "Nhà Kiến Tạo Mục Tiêu",
      desc: "Khen thưởng khi sở hữu mục tiêu đầu tiên",
      icon: Trophy,
      unlocked: goals.length > 0,
      color: "from-purple-400/20 to-indigo-500/20 text-purple-400 border-purple-500/30",
      progress: goals.length > 0 ? 100 : 0,
      requirementText: goals.length > 0 ? "Đã đạt" : "Chưa lập mục tiêu",
    }
  ];

  return (
    <div className="space-y-6 h-full flex flex-col pt-1.5 relative text-foreground select-none">
      {/* Header with quick dashboard summaries */}
      <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 pb-1 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white leading-[1.1] flex items-center gap-2">
            Thống kê <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
          </h1>
          <p className="text-[11px] text-zinc-400/80 uppercase tracking-widest font-extrabold mt-1">Phân tích hiệu suất thời gian</p>
        </div>

        {/* Dynamic Period selector pills */}
        <div id="stats_timeselector" className="flex bg-slate-950/40 p-1 rounded-xl border border-white/5 self-start sm:self-auto">
          {(['7D', '30D', 'ALL'] as const).map(p => (
            <button
              key={p}
              id={`pills_time_${p}`}
              onClick={() => setTimeRange(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === p 
                ? 'bg-primary text-slate-950 shadow-[0_2px_10px_rgba(52,211,153,0.3)] font-extrabold scale-[1.03]' 
                : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {p === '7D' ? '7 Ngày' : p === '30D' ? '14 Ngày' : 'Tổng số'}
            </button>
          ))}
        </div>
      </header>

      <ScrollArea className="flex-1 -mx-4 px-4 pb-20 hide-scrollbar" id="stats_scroll_container">
        <div className="space-y-6 pt-1">
          
          {/* Bento-grid of styled performance cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats_kpi_grid">
            {/* Focus Card */}
            <Card className="bg-slate-900/60 border border-white/[0.04] rounded-2xl overflow-hidden hover:border-emerald-500/30 hover:shadow-[0_4px_25px_rgba(52,211,153,0.05)] transition-all group duration-300">
              <CardContent className="p-4 flex flex-col relative">
                <div className="absolute right-3 top-3 w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10 group-hover:scale-110 transition-transform">
                  <Clock className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">TẬP TRUNG</span>
                <span className="text-2xl sm:text-3xl font-black tracking-tight mt-3 text-white">
                  {focusHours}
                  <span className="text-sm font-semibold text-emerald-400 ml-0.5">h</span>
                </span>
                <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-2 font-semibold">
                  <span className="text-emerald-400">⚡ {focusTimeMinutes} phút</span> tổng cộng
                </div>
              </CardContent>
            </Card>

            {/* Task Card with radial indicator background */}
            <Card className="bg-slate-900/60 border border-white/[0.04] rounded-2xl overflow-hidden hover:border-blue-500/30 hover:shadow-[0_4px_25px_rgba(59,130,246,0.05)] transition-all group duration-300">
              <CardContent className="p-4 flex flex-col relative">
                <div className="absolute right-3 top-3 w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/10 group-hover:scale-110 transition-transform">
                  <Target className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">CÔNG VIỆC</span>
                <span className="text-2xl sm:text-3xl font-black tracking-tight mt-3 text-white">
                  {completedTasks}
                  <span className="text-xs text-zinc-500 ml-1">/ {totalTasks}</span>
                </span>
                <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-2 font-semibold">
                  <span className="text-blue-400">✓ {totalTasks - completedTasks}</span> còn dang dở
                </div>
              </CardContent>
            </Card>

            {/* Completion Rate with visual radial outline spark */}
            <Card className="bg-slate-900/60 border border-white/[0.04] rounded-2xl overflow-hidden hover:border-orange-500/30 hover:shadow-[0_4px_25px_rgba(249,115,22,0.05)] transition-all group duration-300">
              <CardContent className="p-4 flex flex-col relative">
                <div className="absolute right-3 top-3 w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/10 group-hover:scale-110 transition-transform">
                  <Activity className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">HIỆU QUẢ</span>
                <span className="text-2xl sm:text-3xl font-black tracking-tight mt-3 text-white">
                  {completionRate}
                  <span className="text-sm font-semibold text-orange-400 ml-0.5">%</span>
                </span>
                <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-2 font-semibold">
                  <TrendingUp className="w-3 h-3 text-orange-400" /> tỷ lệ hoàn tất
                </div>
              </CardContent>
            </Card>

            {/* Habits Check-in details */}
            <Card className="bg-slate-900/60 border border-white/[0.04] rounded-2xl overflow-hidden hover:border-purple-500/30 hover:shadow-[0_4px_25px_rgba(168,85,247,0.05)] transition-all group duration-300">
              <CardContent className="p-4 flex flex-col relative">
                <div className="absolute right-3 top-3 w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/10 group-hover:scale-110 transition-transform">
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">KỶ LUẬT THÓI QUEN</span>
                <span className="text-2xl sm:text-3xl font-black tracking-tight mt-3 text-white">
                  {totalHabitCheckins}
                  <span className="text-xs text-zinc-500 ml-1">lần</span>
                </span>
                <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-2 font-semibold">
                  <Flame className="w-3 h-3 text-purple-400 fill-purple-400/20" /> chuỗi lớn nhất: <span className="text-purple-400 font-bold">{activeHabitsStreak} ngày</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Trend Graph & Priority breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Custom Interactive Column Bar Graph */}
            <Card className="lg:col-span-2 bg-slate-900/40 border border-white/[0.04] rounded-3xl p-5 space-y-6" id="stats_trend_card">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">TIẾN TRÌNH LUỸ KẾ HÀNG NGÀY</span>
                  <h3 className="text-lg font-bold text-white mt-1">Năng suất hoạt động</h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary block shadow-[0_0_5px_rgba(52,211,153,0.3)]"></span> Thói quen / Tập trung
                  </div>
                </div>
              </div>

              {/* Minimal columns visually perfect */}
              <div className="pt-4 space-y-4">
                <div className="h-44 flex items-end justify-between gap-1 sm:gap-4 px-2" id="stats_graph_columns">
                  {activityTrend.map((day, i) => (
                    <div 
                      key={i} 
                      className="w-full flex flex-col justify-end items-center h-full group relative"
                    >
                      {/* Floating dynamic rich details tooltip */}
                      <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-all pointer-events-none scale-90 group-hover:scale-100 bg-slate-950 border border-white/10 p-2.5 rounded-xl text-[10px] w-36 shadow-2xl z-30 space-y-1.5">
                        <p className="font-bold text-white text-center border-b border-white/5 pb-1">{day.dateFormatted}</p>
                        <p className="text-emerald-400 flex justify-between">🎯 Check-ins: <strong>{day.checkins}</strong></p>
                        <p className="text-blue-400 flex justify-between">✓ Nhiệm vụ: <strong>{day.tasksCreated}</strong></p>
                      </div>

                      {/* Bar fill element */}
                      <div className="w-full bg-slate-950/40 rounded-t-xl h-full flex flex-col justify-end overflow-hidden pb-1 border border-white/[0.02]">
                        <div 
                          className={`w-full rounded-t-lg transition-all duration-500 ease-out cursor-pointer relative ${
                            i === activityTrend.length - 1 
                            ? 'bg-gradient-to-t from-primary to-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.2)]' 
                            : 'bg-gradient-to-t from-slate-800 to-emerald-400/70 group-hover:to-emerald-400'
                          }`} 
                          style={{ height: `${day.val}%` }}
                        >
                          <div className="absolute top-1 left-1 right-1 h-0.5 bg-white/20 rounded-full"></div>
                        </div>
                      </div>

                      {/* Day text */}
                      <span className={`text-[10px] mt-2 font-bold ${i === activityTrend.length - 1 ? 'text-primary font-black' : 'text-zinc-500'}`}>
                        {day.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Task Priority Distribution and Status Breakdown list */}
            <Card className="bg-slate-900/40 border border-white/[0.04] rounded-3xl p-5 flex flex-col justify-between" id="stats_breakdown_card">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">PHÂN LOẠI CÔNG VIỆC</span>
                  <h3 className="text-lg font-bold text-white mt-1">Mức độ ưu tiên</h3>
                </div>

                <div className="space-y-3.5 pt-2">
                  {[
                    { label: 'Rất khẩn cấp (Critical)', count: criticalTasks, color: 'bg-rose-500 shadow-rose-500/20 text-rose-400' },
                    { label: 'Ưu tiên cao (High)', count: highTasks, color: 'bg-amber-500 shadow-amber-500/20 text-amber-400' },
                    { label: 'Bình thường (Medium)', count: mediumTasks, color: 'bg-blue-400 shadow-blue-400/20 text-blue-400' },
                    { label: 'Thấp (Low)', count: lowTasks, color: 'bg-zinc-500 shadow-zinc-500/20 text-zinc-400' },
                  ].map((p, idx) => {
                    const ratio = totalTasks > 0 ? Math.round((p.count / totalTasks) * 100) : 0;
                    return (
                      <div key={idx} className="space-y-1.5 group">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-zinc-400 text-[11px]">{p.label}</span>
                          <span className={`font-bold ${p.color.split(' ')[2]}`}>{p.count} task ({ratio}%)</span>
                        </div>
                        <div className="h-2 bg-slate-950/80 rounded-full overflow-hidden p-0.5 border border-white/[0.02]">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${p.color.split(' ')[0]}`} 
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status metrics grid */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950/40 border border-white/[0.03] p-3 rounded-2xl mt-5">
                <div className="text-center">
                  <span className="text-[9px] font-bold text-zinc-500 block uppercase">Cần làm</span>
                  <span className="text-sm font-black text-white">{todoTasks}</span>
                </div>
                <div className="text-center border-x border-white/5">
                  <span className="text-[9px] font-bold text-zinc-500 block uppercase">Đang làm</span>
                  <span className="text-sm font-black text-blue-400">{inProgressTasks}</span>
                </div>
                <div className="text-center">
                  <span className="text-[9px] font-bold text-zinc-500 block uppercase">Đã xong</span>
                  <span className="text-sm font-black text-emerald-400">{completedTasks}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Dynamic Interactive Habits Contribution Heatmap Grid */}
          <Card className="bg-slate-900/40 border border-white/[0.04] rounded-3xl p-5 space-y-4" id="stats_heatmap_card">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">LƯỢC ĐỒ HOẠT ĐỘNG THƯỜNG QUY</span>
                <h3 className="text-lg font-bold text-white mt-0.5">Lịch sử tích lũy 28 ngày qua</h3>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 self-end sm:self-auto">
                <span>Ít</span>
                <span className="w-3.5 h-3.5 rounded bg-slate-800 border border-white/5"></span>
                <span className="w-3.5 h-3.5 rounded bg-emerald-400/20 border border-emerald-500/10"></span>
                <span className="w-3.5 h-3.5 rounded bg-emerald-400/50 border border-emerald-400/20"></span>
                <span className="w-3.5 h-3.5 rounded bg-primary shadow-[0_0_5px_rgba(52,211,153,0.3)] border border-primary/20"></span>
                <span>Nhiều</span>
              </div>
            </div>

            <div className="pt-2 relative flex flex-col items-center">
              {/* Tooltip detail widget */}
              {hoveredDay ? (
                <div className="absolute -top-10 bg-slate-950 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-200 shadow-2xl z-30 flex items-center gap-2 animate-bounce">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Ngày {hoveredDay.dateStr}: <strong>{hoveredDay.count}</strong> lần tích luỹ</span>
                </div>
              ) : null}

              {/* The grid list representation */}
              <div 
                className="grid grid-cols-7 gap-1.5 sm:gap-2.5 max-w-lg w-full"
                id="stats_heatmap_grid"
                onMouseLeave={() => setHoveredDay(null)}
              >
                {contributionDays.map((dateObj, i) => {
                  let bgClass = "bg-slate-800 hover:bg-slate-700 hover:scale-110";
                  if (dateObj.level === 1) bgClass = "bg-emerald-400/20 hover:bg-emerald-400/30 hover:scale-110";
                  if (dateObj.level === 2) bgClass = "bg-emerald-400/50 hover:bg-emerald-400/60 hover:scale-110";
                  if (dateObj.level === 3) bgClass = "bg-primary shadow-[0_0_8px_rgba(52,211,153,0.3)] hover:scale-110";

                  return (
                    <div
                      key={i}
                      onClick={() => setHoveredDay({ dateStr: dateObj.dateStr, count: dateObj.totalValue })}
                      onMouseEnter={() => setHoveredDay({ dateStr: dateObj.dateStr, count: dateObj.totalValue })}
                      className={`aspect-square w-full rounded-[6px] transition-all duration-300 cursor-help border border-white/[0.02] flex items-center justify-center text-[8px] font-bold text-slate-100 ${bgClass}`}
                      title={`Ngày ${dateObj.dateStr}: ${dateObj.totalValue} hoạt động`}
                    >
                      {/* For smaller screen reference inside column cell */}
                      <span className="opacity-10 text-[7px] pointer-events-none">{dateObj.labelStr.split('/')[0]}</span>
                    </div>
                  );
                })}
              </div>

              {/* Grid guide for days */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 max-w-lg w-full mt-2 text-center text-[10px] font-bold text-zinc-500">
                <span>CN</span>
                <span>Th 2</span>
                <span>Th 3</span>
                <span>Th 4</span>
                <span>Th 5</span>
                <span>Th 6</span>
                <span>Th 7</span>
              </div>
            </div>
          </Card>

          {/* Hero achievements shelf / Milestone milestones */}
          <div className="space-y-3" id="stats_achievements_shelf">
            <h3 className="text-sm font-extrabold text-zinc-400 tracking-widest uppercase flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} /> Danh hiệu & Cột mốc
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((ach) => {
                const Icon = ach.icon;
                return (
                  <Card 
                    key={ach.id} 
                    id={`card_${ach.id}`}
                    className={`border transition-all duration-300 rounded-3xl overflow-hidden ${
                      ach.unlocked 
                      ? 'bg-slate-900/80 border-white/[0.08] hover:border-emerald-500/20 shadow-[0_4px_15px_rgba(0,0,0,0.1)]' 
                      : 'bg-slate-950/20 border-white/5 opacity-50'
                    }`}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      {/* Badge emblem icon */}
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                        ach.unlocked 
                        ? 'bg-gradient-to-br ' + ach.color.split(' ')[0] + ' shadow-[0_0_15px_rgba(52,211,153,0.1)] scale-102' 
                        : 'bg-slate-800 text-zinc-600 border-white/5'
                      }`}>
                        <Icon className={`w-7 h-7 ${ach.unlocked ? ach.color.split(' ')[2] : 'text-zinc-600'}`} />
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[14px] font-extrabold text-white leading-tight flex items-center gap-1">
                            {ach.title}
                            {ach.unlocked && <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-slate-950" />}
                          </h4>
                          <span className="text-[10px] font-bold text-zinc-500">{ach.requirementText}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-tight font-medium">{ach.desc}</p>
                        
                        {/* Milestone progress line */}
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden p-0.5">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${ach.unlocked ? 'bg-primary' : 'bg-slate-700'}`} 
                            style={{ width: `${ach.progress}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
