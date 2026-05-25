import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Send, Bot, MessageSquare, Plus, Check, Loader2, 
  X, Calendar, Clock, AlertCircle, ChevronRight, HelpCircle, Flame, Dumbbell, 
  BrainCircuit, ArrowRight, CheckCircle2, ChevronDown, ListPlus, Volume2
} from 'lucide-react';
import { useAppContext } from '@/src/store/AppContext';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface ParsedTask {
  title: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  estimatedTime?: number;
  deadlineHoursFromNow?: number | null;
  selected?: boolean;
}

export default function AIAssistant() {
  const { tasks, habits, goals, focusTimeMinutes, language, addTask } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'quickadd' | 'breakdown'>('chat');
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Quickadd NLP state
  const [nlpInput, setNlpInput] = useState('');
  const [isNlpLoading, setIsNlpLoading] = useState(false);
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [nlpSuccessCount, setNlpSuccessCount] = useState<number | null>(null);

  // Breakdown state
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [customTaskToBreak, setCustomTaskToBreak] = useState('');
  const [isBreakdownLoading, setIsBreakdownLoading] = useState(false);
  const [brokenSteps, setBrokenSteps] = useState<string[]>([]);
  const [selectedSteps, setSelectedSteps] = useState<Record<number, boolean>>({});

  // General state
  const [coachFeedback, setCoachFeedback] = useState<string>('');
  const [isCoachLoading, setIsCoachLoading] = useState(false);

  // Localizations
  const isVi = language === 'vi';
  
  const strings = {
    vi: {
      fabTitle: "Trợ lý AI",
      title: "Trung tâm Năng suất AI",
      coachFeedbackTitle: "Phê duyệt của Huấn luyện viên",
      chatTab: "Tư vấn AI",
      quickaddTab: "Tạo nhanh việc",
      breakdownTab: "Chia nhỏ việc",
      chatPlaceholder: "Hỏi AI về năng suất, sự trì hoãn...",
      nlpPlaceholder: "Ví dụ: Sáng mai lúc 9h thảo luận nhóm, chiều 17h tập yoga, tối 21h đọc sách 30 phút...",
      nlpLabel: "Mô tả lịch trình hoặc các đầu việc tự do của bạn:",
      nlpBtn: "Phân tích bằng AI",
      addTasksBtn: "Thêm các việc đã chọn",
      breakdownSelectPlaceholder: "Chọn một việc sẵn có để chia nhỏ...",
      breakdownOr: "Hoặc tự nhập một việc phức tạp:",
      breakdownOrPlaceholder: "Ví dụ: Viết tiểu luận nghiên cứu thị trường...",
      breakdownBtn: "Phân rã bằng AI",
      breakdownImportBtn: "Nhập các bước thành công việc con",
      welcomeMsg: "Xin chào! Tôi là Timeflow Coach, cố vấn năng suất của bạn. Hãy chia sẻ bất kỳ khó khăn nào về quản lý thời gian, đẩy lùi trì hoãn hay xây dựng thói quen nhé! 🚀",
      presetAntiProcrastination: "Làm sao ngừng trì hoãn?",
      presetPomo: "Phương pháp Pomodoro dùng sao?",
      presetPlan: "Lên chiến lược ngày hôm nay",
      presetHabitCode: "Cách rèn kỷ luật thép?",
      noActiveTasks: "Không có nhiệm vụ khả dụng",
      importSuccess: "Nhập thành công {count} việc!",
      loadingCoach: "AI Coach đang phân tích số liệu...",
      reviewMotivation: "Đánh Giá Chiến Lược"
    },
    en: {
      fabTitle: "AI Assistant",
      title: "AI Productivity Hub",
      coachFeedbackTitle: "Coach Feedback",
      chatTab: "AI Mentor",
      quickaddTab: "AI Parser",
      breakdownTab: "Deconstruct",
      chatPlaceholder: "Ask AI Coach for performance advice...",
      nlpPlaceholder: "e.g., Tomorrow meeting at 9am, exercise at 5pm, read for 30 mins at night...",
      nlpLabel: "Describe your upcoming plans naturally:",
      nlpBtn: "Parse with AI & Schedule",
      addTasksBtn: "Add Selected Tasks",
      breakdownSelectPlaceholder: "Choose an active task to break down...",
      breakdownOr: "Or enter a complex task manually:",
      breakdownOrPlaceholder: "e.g., Write a market research outline...",
      breakdownBtn: "Deconstruct Core Task",
      breakdownImportBtn: "Import Steps as Sub-tasks",
      welcomeMsg: "Hello! I am Timeflow Coach, your personal productivity mentor. Ask me anything about mastering time, beating procrastination, or designing habits! 🚀",
      presetAntiProcrastination: "How to stop procrastinating?",
      presetPomo: "How to master Pomodoro?",
      presetPlan: "Analyze my daily strategy",
      presetHabitCode: "Steps to build solid discipline?",
      noActiveTasks: "No active tasks available",
      importSuccess: "Successfully imported {count} tasks!",
      loadingCoach: "AI Coach is calculating strategies...",
      reviewMotivation: "Daily Strategy Review"
    }
  };

  const activeStrings = strings[isVi ? 'vi' : 'en'];

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        text: activeStrings.welcomeMsg,
        timestamp: Date.now()
      }]);
    }
  }, [language]);

  // Scroll to bottom on new chat messages
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatLoading]);

  // Sound feedback on success
  const playPing = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5 note
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // Slide upward to A5
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.log("Audio not allowed yet or failed", e);
    }
  };

  // Generate Daily Coach Strategy feedback
  const handleGetCoachStrategy = async () => {
    setIsCoachLoading(true);
    setCoachFeedback('');
    try {
      const response = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasks.slice(0, 15), // keep body compact
          habits: habits.slice(0, 10),
          goals: goals.slice(0, 5),
          focusTimeMinutes,
          language
        })
      });
      const data = await response.json();
      if (data.feedback) {
        setCoachFeedback(data.feedback);
      } else {
        setCoachFeedback("Oops! Could not assemble the review. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setCoachFeedback("Failed to reach Gemini server. Ensure server is active.");
    } finally {
      setIsCoachLoading(false);
    }
  };

  // Send a message to the chatbot
  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend || chatInput;
    if (!rawText.trim() || isChatLoading) return;

    if (!textToSend) setChatInput('');

    const newMsg: Message = {
      role: 'user',
      text: rawText,
      timestamp: Date.now()
    };
    
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setIsChatLoading(true);

    try {
      // Map historical messages into prompt roles
      const formattedHistory = updatedMessages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: formattedHistory,
          language
        })
      });

      const data = await res.json();
      if (data.text) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: data.text,
          timestamp: Date.now()
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: isVi ? "Tôi gặp lỗi phản hồi từ hệ thống. Bạn có thể thử lại không?" : "I encountered a system error response. Could you try again?",
          timestamp: Date.now()
        }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: isVi ? "Không thể kết nối đến máy chủ AI. Hãy kiểm tra kết nối mạng." : "Could not connect to the AI server. Please check your network.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Natural Language Processing layout tasks importer
  const handleNlpParse = async () => {
    if (!nlpInput.trim() || isNlpLoading) return;
    setIsNlpLoading(true);
    setParsedTasks([]);
    setNlpSuccessCount(null);

    try {
      const res = await fetch('/api/ai/quickadd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: nlpInput })
      });
      const data = await res.json();
      if (data.tasks && Array.isArray(data.tasks)) {
        const mapped = data.tasks.map((t: any) => ({
          ...t,
          selected: true // checked by default
        }));
        setParsedTasks(mapped);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsNlpLoading(false);
    }
  };

  // Save selected structured tasks from the AI NLP preview list
  const handleImportNlpTasks = async () => {
    const activeToImport = parsedTasks.filter(t => t.selected);
    if (activeToImport.length === 0) return;

    for (const t of activeToImport) {
      // Calculate absolute dynamic timestamp deadline from relative hours from now
      let computedDeadline: number | null = null;
      if (t.deadlineHoursFromNow !== undefined && t.deadlineHoursFromNow !== null) {
        computedDeadline = Date.now() + Math.round(t.deadlineHoursFromNow * 60 * 60 * 1000);
      }

      await addTask({
        title: t.title,
        description: t.description || (isVi ? "Tạo nhanh bởi Trợ lý AI Timeflow" : "AI Quick Add task"),
        priority: t.priority || "Medium",
        status: "Todo",
        estimatedTime: t.estimatedTime || 30,
        deadline: computedDeadline
      });
    }

    setNlpSuccessCount(activeToImport.length);
    setParsedTasks([]);
    setNlpInput('');
    playPing();

    setTimeout(() => {
      setNlpSuccessCount(null);
    }, 3000);
  };

  // Trigger task decomposition
  const handleBreakdown = async () => {
    const chosenActiveTask = tasks.find(t => t.id === selectedTaskId);
    const targetTitle = chosenActiveTask ? chosenActiveTask.title : customTaskToBreak;

    if (!targetTitle.trim() || isBreakdownLoading) return;

    setIsBreakdownLoading(true);
    setBrokenSteps([]);
    setSelectedSteps({});

    try {
      const res = await fetch('/api/ai/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: targetTitle,
          taskDescription: chosenActiveTask?.description || ''
        })
      });
      const data = await res.json();
      if (data.steps && Array.isArray(data.steps)) {
        setBrokenSteps(data.steps);
        // selects all steps by default
        const initialChecks: Record<number, boolean> = {};
        data.steps.forEach((_, idx) => {
          initialChecks[idx] = true;
        });
        setSelectedSteps(initialChecks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsBreakdownLoading(false);
    }
  };

  // Import broken down steps as direct standalone checklist tasks
  const handleImportBrokenSteps = async () => {
    const importTitles = brokenSteps.filter((_, idx) => selectedSteps[idx]);
    if (importTitles.length === 0) return;

    const chosenActiveTask = tasks.find(t => t.id === selectedTaskId);
    const prefix = isVi ? "[Nhánh]" : "[Sub]";

    for (const step of importTitles) {
      await addTask({
        title: `${prefix} ${step}`,
        description: isVi 
          ? `Bước con của nhiệm vụ lớn: ${chosenActiveTask?.title || customTaskToBreak}` 
          : `Subtask generated for: ${chosenActiveTask?.title || customTaskToBreak}`,
        priority: chosenActiveTask?.priority || "Medium",
        status: "Todo",
        estimatedTime: 15, // standard block
        deadline: chosenActiveTask?.deadline || null
      });
    }

    setBrokenSteps([]);
    setSelectedTaskId('');
    setCustomTaskToBreak('');
    playPing();
  };

  // Quick formatted Markdown text parser for simple displays
  const renderMessageText = (txt: string) => {
    const lines = txt.split('\n');
    return lines.map((line, idx) => {
      let content = line;
      let isHeader = false;
      let listType = false;

      // Handle bold blocks
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parsedWithBold = line.replace(boldRegex, '<strong class="text-primary font-black">$1</strong>');

      if (line.startsWith('### ')) {
        content = line.replace('### ', '');
        isHeader = true;
      } else if (line.startsWith('## ')) {
        content = line.replace('## ', '');
        isHeader = true;
      } else if (line.startsWith('# ')) {
        content = line.replace('# ', '');
        isHeader = true;
      } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        content = line.replace(/^[\s]*[-*]\s+/, '');
        listType = true;
      }

      if (isHeader) {
        return <h4 key={idx} className="text-sm font-black text-white mt-3 mb-1.5 flex items-center gap-1.5" dangerouslySetInnerHTML={{ __html: parsedWithBold }} />;
      }
      if (listType) {
        return (
          <div key={idx} className="flex gap-2 pl-1 py-0.5 items-start">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
            <p className="text-[11.5px] leading-relaxed text-zinc-300" dangerouslySetInnerHTML={{ __html: parsedWithBold }} />
          </div>
        );
      }
      return (
        <p key={idx} className="text-[11.5px] leading-relaxed text-zinc-300 mb-1" dangerouslySetInnerHTML={{ __html: parsedWithBold }} />
      );
    });
  };

  return (
    <>
      {/* 🚀 Floating AI Brain Aura Button */}
      <div className="absolute bottom-[186px] right-6 z-[45]">
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="relative"
        >
          {/* External pulsating magical neon ring */}
          <span className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-500 opacity-60 blur-md animate-pulse"></span>
          
          <Button 
            onClick={() => setIsOpen(true)}
            size="icon" 
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-slate-900 to-slate-950 text-emerald-400 shadow-[0_4px_25px_rgba(52,211,153,0.35)] border border-primary/40 relative z-10 hover:border-emerald-400 hover:text-white transition-all duration-300"
            title={activeStrings.fabTitle}
          >
            <Bot className="w-5.5 h-5.5 animate-bounce drop-shadow" style={{ animationDuration: '3s' }} />
          </Button>
        </motion.div>
      </div>

      {/* 🔮 Full Screen Bottom sliding Glass Panel Sheet */}
      <AnimatePresence>
        {isOpen && (
          <div className="absolute inset-0 z-[100] flex flex-col bg-slate-950/90 backdrop-blur-2xl">
            {/* Ambient cyber decorations */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-20 right-0 w-44 h-44 bg-indigo-500/5 rounded-full blur-[90px] pointer-events-none"></div>

            {/* Hub Header */}
            <header className="p-4 border-b border-white/5 flex items-center justify-between relative z-10 shrink-0 bg-slate-950/40">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary/20 via-teal-500/10 to-indigo-500/20 flex items-center justify-center border border-primary/30">
                  <Bot className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white tracking-wide">{activeStrings.title}</h2>
                  <p className="text-[10px] text-zinc-400/80 font-bold uppercase tracking-wider">Powered by Gemini 3.5</p>
                </div>
              </div>

              <div id="ai_header_actions" className="flex items-center gap-2">
                {/* Motivation Feed check button */}
                <Button
                  onClick={handleGetCoachStrategy}
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg text-[10px] font-extrabold border-white/10 shrink-0 uppercase tracking-wider bg-slate-900 text-emerald-400 hover:bg-slate-800"
                  disabled={isCoachLoading}
                >
                  {isCoachLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Flame className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline ml-1">{activeStrings.reviewMotivation}</span>
                </Button>

                <Button 
                  onClick={() => setIsOpen(false)}
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 rounded-lg bg-white/5 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </header>

            {/* Quick Coach Strategy Feedback Alert block (if present) */}
            <AnimatePresence>
              {coachFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mx-4 mt-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 relative overflow-hidden shrink-0 max-h-[160px] overflow-y-auto scrollbar-thin"
                >
                  <Button 
                    onClick={() => setCoachFeedback('')}
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-2 top-2 w-5 h-5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <div className="flex gap-2 items-start mb-2">
                    <Flame className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5 animate-pulse" />
                    <h3 className="text-[11px] font-black text-white uppercase tracking-widest">{activeStrings.coachFeedbackTitle}</h3>
                  </div>
                  <div className="space-y-1 text-zinc-300">
                    {renderMessageText(coachFeedback)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dynamic Interactive tab selections */}
            <section className="px-4 py-2 mt-1.5 flex gap-1.5 bg-slate-950/60 shrink-0 relative z-10 border-b border-white/5">
              {[
                { id: 'chat', label: activeStrings.chatTab, icon: MessageSquare, color: 'text-emerald-400' },
                { id: 'quickadd', label: activeStrings.quickaddTab, icon: Plus, color: 'text-indigo-400' },
                { id: 'breakdown', label: activeStrings.breakdownTab, icon: BrainCircuit, color: 'text-rose-400' }
              ].map(tab => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-2 flex.2 flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl text-[10.5px] font-extrabold transition-all duration-300 ${
                      isSelected 
                      ? 'bg-slate-900 border border-white/10 text-white shadow-xl scale-[1.02]' 
                      : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? tab.color : 'text-zinc-500'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </section>

            {/* Active module display container */}
            <main className="flex-1 overflow-y-auto px-4 py-4 min-h-0 relative z-10">
              
              {/* Tab 1: AI Chat Personal coach */}
              {activeTab === 'chat' && (
                <div className="h-full flex flex-col justify-between" id="ai_chat_pane">
                  {/* Chat messages stream */}
                  <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 md:pr-2" id="ai_chat_scroller">
                    {messages.map((m, idx) => {
                      const isModel = m.role === 'assistant';
                      return (
                        <div 
                          key={idx} 
                          className={`flex gap-2.5 max-w-[85%] ${isModel ? 'mr-auto items-start' : 'ml-auto flex-row-reverse items-end'}`}
                        >
                          {isModel ? (
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20 shrink-0 mt-0.5">
                              <Bot className="w-3.5 h-3.5 text-primary" />
                            </div>
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mb-2 shrink-0"></div>
                          )}

                          <div className={`p-3 rounded-2xl text-[11.5px] leading-relaxed border ${
                            isModel 
                            ? 'bg-slate-900/40 border-white/[0.03] rounded-tl-sm text-zinc-100' 
                            : 'bg-primary/95 text-slate-950 font-semibold border-transparent rounded-tr-sm shadow-md shadow-primary/5'
                          }`}>
                            {isModel ? (
                              <div className="space-y-1">{renderMessageText(m.text)}</div>
                            ) : (
                              <p className="whitespace-pre-wrap">{m.text}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {isChatLoading && (
                      <div className="flex gap-2.5 max-w-[80%] mr-auto items-center">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20 shrink-0 animate-spin">
                          <Loader2 className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="px-3 py-2 border border-white/[0.02] bg-slate-900/40 rounded-2xl rounded-tl-sm flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Pre-made quick assistance helpers */}
                  {messages.length <= 1 && !isChatLoading && (
                    <div className="py-2 flex flex-wrap gap-1.5 shrink-0">
                      {[
                        { text: activeStrings.presetAntiProcrastination, label: "Trì hoãn" },
                        { text: activeStrings.presetPomo, label: "Pomodoro" },
                        { text: activeStrings.presetHabitCode, label: "Kỷ luật thép" }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(preset.text)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/5 hover:border-white/10 text-zinc-400 hover:text-white transition-all text-[10px] font-bold"
                        >
                          ❓ {preset.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message Input zone */}
                  <div className="mt-3 bg-slate-900/40 p-1.5 rounded-2xl border border-white/5 flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                      placeholder={activeStrings.chatPlaceholder}
                      className="flex-1 bg-transparent px-3 py-1.5 border-none outline-none text-xs text-white placeholder-zinc-500"
                    />
                    <Button
                      onClick={() => handleSendMessage()}
                      size="icon"
                      className="w-8 h-8 rounded-xl bg-primary text-slate-950 hover:bg-emerald-400 shadow-md"
                      disabled={isChatLoading || !chatInput.trim()}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Tab 2: NLP Natural Language schedule parser */}
              {activeTab === 'quickadd' && (
                <div className="space-y-4" id="ai_quickadd_pane">
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-extrabold uppercase text-zinc-400 tracking-wider flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                      {activeStrings.nlpLabel}
                    </label>
                    <textarea
                      value={nlpInput}
                      onChange={e => setNlpInput(e.target.value)}
                      placeholder={activeStrings.nlpPlaceholder}
                      className="w-full h-24 p-3 bg-slate-950 border border-white/5 rounded-2xl text-xs text-white placeholder-zinc-600 focus:border-indigo-500/50 outline-none resize-none leading-relaxed transition-all"
                    />
                  </div>

                  <Button
                    onClick={handleNlpParse}
                    className="w-full h-11 rounded-xl bg-indigo-500/95 hover:bg-indigo-400 text-white font-extrabold text-xs uppercase tracking-wider relative overflow-hidden"
                    disabled={isNlpLoading || !nlpInput.trim()}
                  >
                    {isNlpLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing via Gemini AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        {activeStrings.nlpBtn}
                      </>
                    )}
                  </Button>

                  {/* Temporary feedback banner */}
                  <AnimatePresence>
                    {nlpSuccessCount !== null && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center gap-2 text-xs font-bold"
                      >
                        <Check className="w-4 h-4" />
                        <span>{activeStrings.importSuccess.replace('{count}', String(nlpSuccessCount))}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Generated Tasks preview panel */}
                  {parsedTasks.length > 0 && (
                    <div className="space-y-3.5 border-t border-white/5 pt-4">
                      <h4 className="text-[10.5px] font-extrabold text-zinc-400 uppercase tracking-widest">
                        Xem trước nhiệm vụ được tạo ({parsedTasks.length})
                      </h4>

                      <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                        {parsedTasks.map((t, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => {
                              setParsedTasks(prev => prev.map((item, idy) => idy === idx ? { ...item, selected: !item.selected } : item));
                            }}
                            className={`p-3 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                              t.selected 
                              ? 'bg-indigo-500/5 border-indigo-400/30 shadow-md' 
                              : 'bg-slate-900/30 border-white/[0.02] opacity-60'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-all ${
                              t.selected 
                              ? 'bg-indigo-500 border-indigo-400 text-white' 
                              : 'border-zinc-700 bg-slate-950'
                            }`}>
                              {t.selected && <Check className="w-3 h-3" />}
                            </div>

                            <div className="flex-1 space-y-1">
                              <h5 className="text-xs font-extrabold text-white leading-tight">{t.title}</h5>
                              {t.description && (
                                <p className="text-[10px] text-zinc-500 line-clamp-1">{t.description}</p>
                              )}
                              
                              <div className="flex items-center gap-2 pt-1 text-[9px] font-bold">
                                <span className={`px-1.5 py-0.5 rounded ${
                                  t.priority === 'Critical' || t.priority === 'High' 
                                  ? 'bg-rose-500/10 text-rose-400' 
                                  : 'bg-zinc-800 text-zinc-400'
                                }`}>
                                  {t.priority}
                                </span>
                                
                                {t.estimatedTime && (
                                  <span className="text-zinc-500 flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" />
                                    {t.estimatedTime}m
                                  </span>
                                )}

                                {t.deadlineHoursFromNow ? (
                                  <span className="text-indigo-400/80 flex items-center gap-0.5">
                                    <Calendar className="w-2.5 h-2.5" />
                                    +{t.deadlineHoursFromNow.toFixed(1)}h
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        onClick={handleImportNlpTasks}
                        className="w-full h-11 bg-primary text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:bg-emerald-400"
                      >
                        <ListPlus className="w-4 h-4 mr-2" />
                        {activeStrings.addTasksBtn}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: AI Task breakdown and eisenhower structure */}
              {activeTab === 'breakdown' && (
                <div className="space-y-4" id="ai_breakdown_pane">
                  {/* Select task from current local database */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                      {activeStrings.breakdownSelectPlaceholder}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedTaskId}
                        onChange={e => {
                          setSelectedTaskId(e.target.value);
                          if (e.target.value) setCustomTaskToBreak('');
                        }}
                        className="w-full p-3 bg-slate-950 border border-white/5 rounded-2xl text-xs text-white focus:border-rose-500/50 outline-none appearance-none cursor-pointer"
                      >
                        <option value="">-- {activeStrings.breakdownSelectPlaceholder} --</option>
                        {tasks.filter(t => t.status !== 'Completed').map(t => (
                          <option key={t.id} value={t.id}>{t.title} ({t.priority})</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Manual input for generic decomposition */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[9px] font-extrabold text-zinc-600 uppercase tracking-widest block text-center">
                      {activeStrings.breakdownOr}
                    </span>
                    <input
                      type="text"
                      value={customTaskToBreak}
                      onChange={e => {
                        setCustomTaskToBreak(e.target.value);
                        if (e.target.value) setSelectedTaskId('');
                      }}
                      placeholder={activeStrings.breakdownOrPlaceholder}
                      className="w-full p-3 bg-slate-950 border border-white/5 rounded-2xl text-xs text-white placeholder-zinc-600 focus:border-rose-500/50 outline-none transition-all"
                    />
                  </div>

                  <Button
                    onClick={handleBreakdown}
                    className="w-full h-11 rounded-xl bg-rose-500 text-white font-extrabold text-xs uppercase tracking-wider"
                    disabled={isBreakdownLoading || (!selectedTaskId && !customTaskToBreak.trim())}
                  >
                    {isBreakdownLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating subtasks...
                      </>
                    ) : (
                      <>
                        <BrainCircuit className="w-4 h-4 mr-2" />
                        {activeStrings.breakdownBtn}
                      </>
                    )}
                  </Button>

                  {/* Breakdown steps preview list */}
                  {brokenSteps.length > 0 && (
                    <div className="space-y-3.5 border-t border-white/5 pt-4">
                      <h4 className="text-[10.5px] font-extrabold text-rose-400 uppercase tracking-widest flex items-center gap-1">
                        <CheckSquareIcon className="w-4 h-4" />
                        Danh sách bước con đề xuất
                      </h4>

                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                        {brokenSteps.map((step, idx) => (
                          <div 
                            key={idx}
                            onClick={() => {
                              setSelectedSteps(prev => ({
                                ...prev,
                                [idx]: !prev[idx]
                              }));
                            }}
                            className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                              selectedSteps[idx] 
                              ? 'bg-rose-500/5 border-rose-500/30' 
                              : 'bg-slate-900/10 border-white/[0.01] opacity-50'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                              selectedSteps[idx] 
                              ? 'bg-rose-500 border-rose-500 text-white' 
                              : 'border-zinc-700'
                            }`}>
                              {selectedSteps[idx] && <Check className="w-2.5 h-2.5" />}
                            </div>
                            <span className="text-xs text-zinc-200 leading-normal font-medium">{step}</span>
                          </div>
                        ))}
                      </div>

                      <Button
                        onClick={handleImportBrokenSteps}
                        className="w-full h-11 bg-gradient-to-r from-rose-500 to-pink-600 hover:scale-[1.01] transition-transform text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg"
                      >
                        <ListPlus className="w-4 h-4 mr-2" />
                        {activeStrings.breakdownImportBtn}
                      </Button>
                    </div>
                  )}

                </div>
              )}

            </main>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// Inline fallback checksquare icon representation
function CheckSquareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
