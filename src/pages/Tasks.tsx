import React, { useState, useEffect } from 'react';
import { useAppContext, Task, Priority, TaskStatus } from '@/src/store/AppContext';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, SlidersHorizontal, MoreHorizontal, Clock, Calendar, Pause, Timer, Tag, AlignLeft, Check, Edit, Trash2, Play, Bell, Download, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FloatingAction } from '@/src/components/FloatingAction';
import { GlowEffect } from '@/src/components/GlowEffect';
import { motion, AnimatePresence } from 'motion/react';

function TaskSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div 
          key={i} 
          className="w-full h-[120px] rounded-[20px] bg-card/40 animate-pulse border border-white/5 relative overflow-hidden flex flex-col justify-between p-4 pl-5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.02)]"
        >
          {/* Accent strip */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-800"></div>
          
          <div className="flex justify-between items-center bg-transparent">
            {/* Badge skeleton */}
            <div className="w-20 h-5 rounded-md bg-slate-800/80"></div>
            {/* Clock skeleton */}
            <div className="w-24 h-4 rounded bg-slate-800/40"></div>
          </div>
          
          {/* Title skeleton */}
          <div className="space-y-2 mt-2 flex-grow bg-transparent">
            <div className="w-2/3 h-5 rounded bg-slate-800/70"></div>
            <div className="w-1/3 h-3.5 rounded bg-slate-800/30"></div>
          </div>
          
          {/* Footer skeleton */}
          <div className="flex gap-2 bg-transparent">
            <div className="w-16 h-5 rounded bg-slate-800/50"></div>
            <div className="w-12 h-5 rounded bg-slate-800/50"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Tasks() {
  const { tasks, addTask, updateTask, deleteTask, loading, setActiveTask } = useAppContext();
  const navigate = useNavigate();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filter, setFilter] = useState<'Today'|'Upcoming'|'Completed'>('Today');

  const handleExportCSV = () => {
    const completedTasks = tasks.filter(t => t.status === 'Completed');
    if (completedTasks.length === 0) return;
    
    // Header
    const headers = [
      'ID',
      'Tiêu đề (Title)',
      'Mô tả (Description)',
      'Trạng thái (Status)',
      'Độ ưu tiên (Priority)',
      'Thời gian ước lượng (Estimated Minutes)',
      'Thẻ/Nhãn (Tags)',
      'Hạn chót (Deadline)',
      'Thông báo nhắc nhở (Reminder Time)',
      'Ngày tạo (Created At)'
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      // Escape double quotes
      str = str.replace(/"/g, '""');
      // Wrap in double quotes if it contains commas, quotes, or newlines
      if (/[",\n\r]/.test(str)) {
        str = `"${str}"`;
      }
      return str;
    };

    const rows = completedTasks.map(t => {
      const deadlineStr = t.deadline ? format(new Date(t.deadline), 'dd/MM/yyyy HH:mm', { locale: vi }) : '';
      const reminderStr = t.reminderTime ? format(new Date(t.reminderTime), 'dd/MM/yyyy HH:mm', { locale: vi }) : '';
      const createdAtStr = format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi });
      const tagsStr = t.tags ? t.tags.join(', ') : '';

      return [
        t.id,
        t.title,
        t.description || '',
        t.status,
        t.priority,
        t.estimatedTime || '',
        tagsStr,
        deadlineStr,
        reminderStr,
        createdAtStr
      ].map(escapeCSV).join(',');
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `timeflow_completed_tasks_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import/Export States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importLogs, setImportLogs] = useState<string>('');
  const [importStatus, setImportStatus] = useState<{ success: number; failed: number } | null>(null);
  const [importErrorMsg, setImportErrorMsg] = useState<string>('');

  const handleDownloadTemplate = () => {
    const headers = [
      'Tiêu đề',
      'Mô tả',
      'Trạng thái',
      'Độ ưu tiên',
      'Thời gian ước lượng (phút)',
      'Thẻ (cách nhau bởi dấu phẩy)',
      'Hạn chót (ngày/tháng/năm giờ:phút)',
      'Thông báo nhắc nhở (ngày/tháng/năm giờ:phút)'
    ];
    const sampleRows = [
      ['Nhiệm vụ 1 mẫu cực quan trọng', 'Mô tả chi tiết của nhiệm vụ 1 tại đây', 'In progress', 'High', '45', 'Công việc, Quan trọng', '28/05/2026 18:00', '28/05/2026 17:15'],
      ['Nhiệm vụ 2 mẫu học tập', 'Nhiệm vụ tự động lập lịch biểu', 'Todo', 'Medium', '30', 'Học tập', '', ''],
      ['Nhiệm vụ 3 mẫu cá nhân', 'Yêu cầu kiểm tra sức khỏe hàng quý', 'Todo', 'Low', '60', 'Sức khỏe, Cá nhân', '30/05/2026 09:00', '30/05/2026 08:30']
    ];

    const escapeCSV = (val: string) => {
      let str = String(val);
      str = str.replace(/"/g, '""');
      if (/[",\n\r]/.test(str)) {
        str = `"${str}"`;
      }
      return str;
    };

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...sampleRows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'timeflow_template_nhiem_vu.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportErrorMsg('');
    setImportStatus(null);
    setImportLogs('Bắt đầu đọc tệp CSV...\n');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setImportErrorMsg('Không thể đọc nội dung của tệp tin hoặc tệp trống.');
          return;
        }

        setImportLogs(prev => prev + `Đã nạp tệp CSV thành công (${text.length} kí tự).\n`);

        const lines: string[][] = [];
        let row: string[] = [];
        let inQuotes = false;
        let currentVal = '';

        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const nextChar = text[i + 1];

          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              currentVal += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            row.push(currentVal.trim());
            currentVal = '';
          } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
              i++;
            }
            row.push(currentVal.trim());
            if (row.length > 0 || row.some(cell => cell.length > 0)) {
              lines.push(row);
            }
            row = [];
            currentVal = '';
          } else {
            currentVal += char;
          }
        }
        if (currentVal || row.length > 0) {
          row.push(currentVal.trim());
          if (row.some(cell => cell.length > 0)) {
            lines.push(row);
          }
        }

        if (lines.length === 0) {
          setImportErrorMsg('Tệp CSV trống hoặc không đúng định dạng phân dòng.');
          return;
        }

        const rawHeaders = lines[0];
        setImportLogs(prev => prev + `Tiêu đề phát hiện được: ${rawHeaders.join(' | ')}\n`);

        const headerMap: { [key: string]: string } = {
          'title': 'title',
          'tiêu đề': 'title',
          'tiêu đề (title)': 'title',
          'tên': 'title',
          'tên nhiệm vụ': 'title',
          'description': 'description',
          'mô tả': 'description',
          'mô tả (description)': 'description',
          'nội dung': 'description',
          'status': 'status',
          'trạng thái': 'status',
          'trạng thái (status)': 'status',
          'priority': 'priority',
          'độ ưu tiên': 'priority',
          'độ ưu tiên (priority)': 'priority',
          'ưu tiên': 'priority',
          'estimated minutes': 'estimatedTime',
          'estimatedtime': 'estimatedTime',
          'thời gian ước lượng (estimated minutes)': 'estimatedTime',
          'thời gian ước lượng (phút)': 'estimatedTime',
          'thời gian ước lượng': 'estimatedTime',
          'thời gian': 'estimatedTime',
          'tags': 'tags',
          'thẻ/nhãn (tags)': 'tags',
          'thẻ': 'tags',
          'nhãn': 'tags',
          'thẻ (cách nhau bởi dấu phẩy)': 'tags',
          'deadline': 'deadline',
          'hạn chót (deadline)': 'deadline',
          'hạn chót': 'deadline',
          'hạn chót (ngày/tháng/năm giờ:phút)': 'deadline',
          'hạn': 'deadline',
          'reminder time': 'reminderTime',
          'remindertime': 'reminderTime',
          'thông báo nhắc nhở (reminder time)': 'reminderTime',
          'thông báo nhắc nhở': 'reminderTime',
          'thông báo nhắc nhở (ngày/tháng/năm giờ:phút)': 'reminderTime',
          'nhắc nhở': 'reminderTime'
        };

        const fieldIndexes: { [key: string]: number } = {};
        rawHeaders.forEach((h, idx) => {
          const cleanH = h.toLowerCase().trim().replace(/['"“”]/g, '');
          const mappedField = headerMap[cleanH];
          if (mappedField) {
            fieldIndexes[mappedField] = idx;
          }
        });

        if (fieldIndexes['title'] === undefined) {
          fieldIndexes['title'] = 0;
          setImportLogs(prev => prev + '⚠️ Không tìm thấy cột tiêu đề thích hợp. Hệ thống mặc định dùng cột đầu tiên làm tên nhiệm vụ.\n');
        }

        setImportLogs(prev => prev + `Bắt đầu xử lý nhập ${lines.length - 1} dòng dữ liệu...\n`);

        let successCount = 0;
        let failCount = 0;

        const parseDateString = (dateStr: string): number | null => {
          if (!dateStr || dateStr.trim() === '') return null;
          let d = new Date(dateStr);
          if (!isNaN(d.getTime())) return d.getTime();

          const parts = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
          if (parts) {
            const day = parseInt(parts[1], 10);
            const month = parseInt(parts[2], 10) - 1;
            const year = parseInt(parts[3], 10);
            const hour = parts[4] ? parseInt(parts[4], 10) : 0;
            const minute = parts[5] ? parseInt(parts[5], 10) : 0;
            const second = parts[6] ? parseInt(parts[6], 10) : 0;
            d = new Date(year, month, day, hour, minute, second);
            if (!isNaN(d.getTime())) return d.getTime();
          }
          return null;
        };

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          if (row.length === 0 || (row.length === 1 && !row[0])) continue;

          try {
            const rowTitle = row[fieldIndexes['title']]?.trim() || '';
            if (!rowTitle) {
              setImportLogs(prev => prev + `❌ Dòng ${i + 1}: Bỏ qua vì tiêu đề trống.\n`);
              failCount++;
              continue;
            }

            const rawDescription = fieldIndexes['description'] !== undefined ? row[fieldIndexes['description']] || '' : '';
            const rawStatus = fieldIndexes['status'] !== undefined ? row[fieldIndexes['status']] || 'Todo' : 'Todo';
            const rawPriority = fieldIndexes['priority'] !== undefined ? row[fieldIndexes['priority']] || 'Medium' : 'Medium';
            const rawEstStr = fieldIndexes['estimatedTime'] !== undefined ? row[fieldIndexes['estimatedTime']] || '' : '';
            const rawTagsStr = fieldIndexes['tags'] !== undefined ? row[fieldIndexes['tags']] || '' : '';
            const rawDeadlineStr = fieldIndexes['deadline'] !== undefined ? row[fieldIndexes['deadline']] || '' : '';
            const rawReminderTimeStr = fieldIndexes['reminderTime'] !== undefined ? row[fieldIndexes['reminderTime']] || '' : '';

            // Map Priority
            let cleanPriority: Priority = 'Medium';
            const pLower = rawPriority.toLowerCase();
            if (pLower.includes('high') || pLower.includes('cao')) {
              cleanPriority = 'High';
            } else if (pLower.includes('low') || pLower.includes('thấp')) {
              cleanPriority = 'Low';
            }

            // Map Status
            let cleanStatus: TaskStatus = 'Todo';
            const sLower = rawStatus.toLowerCase();
            if (sLower.includes('progress') || sLower.includes('diễn') || sLower.includes('tiến') || sLower.includes('đang')) {
              cleanStatus = 'InProgress';
            } else if (sLower.includes('complete') || sLower.includes('thành') || sLower.includes('xong')) {
              cleanStatus = 'Completed';
            }

            const cleanEstTime = rawEstStr ? Math.max(0, parseInt(rawEstStr.trim(), 10)) : null;
            const parsedDeadline = parseDateString(rawDeadlineStr);
            const parsedReminderTime = parseDateString(rawReminderTimeStr);

            const parsedTags = rawTagsStr
              ? rawTagsStr.split(/[,;|]/).map(t => t.trim()).filter(t => t.length > 0)
              : [];

            await addTask({
              title: rowTitle,
              description: rawDescription,
              status: cleanStatus,
              priority: cleanPriority,
              estimatedTime: isNaN(Number(cleanEstTime)) ? null : cleanEstTime,
              tags: parsedTags,
              deadline: parsedDeadline,
              reminderTime: parsedReminderTime,
            });

            successCount++;
          } catch (err: any) {
            setImportLogs(prev => prev + `❌ Lỗi dòng ${i + 1}: ${err.message || String(err)}\n`);
            failCount++;
          }
        }

        setImportStatus({ success: successCount, failed: failCount });
        setImportLogs(prev => prev + `\n🎉 Nhập dữ liệu hoàn tất! Thành công: ${successCount} | Thất bại: ${failCount}\n`);

      } catch (err: any) {
        setImportErrorMsg(`Lỗi xử lý file: ${err.message || String(err)}`);
        setImportLogs(prev => prev + `\n❌ Thất bại hệ thống: ${err.message || String(err)}\n`);
      }
    };

    reader.onerror = () => {
      setImportErrorMsg('Không thể đọc tệp tin CSV vật lý.');
    };

    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  // Selected Detail Task for Modal View
  const [selectedDetailTask, setSelectedDetailTask] = useState<Task | null>(null);

  // New task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [deadline, setDeadline] = useState('');
  const [isRemindEnabled, setIsRemindEnabled] = useState(false);
  const [reminderBuffer, setReminderBuffer] = useState('15');
  const [searchQuery, setSearchQuery] = useState('');
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    setLocalLoading(true);
    const timer = setTimeout(() => {
      setLocalLoading(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [filter, searchQuery, loading]);

  // Edit task form state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editEstimatedTime, setEditEstimatedTime] = useState('');
  const [editTagsInput, setEditTagsInput] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('Medium');
  const [editDeadline, setEditDeadline] = useState('');
  const [editIsRemindEnabled, setEditIsRemindEnabled] = useState(false);
  const [editReminderBuffer, setEditReminderBuffer] = useState('15');
  const [editStatus, setEditStatus] = useState<TaskStatus>('Todo');

  const handleStartEdit = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setEditDescription(task.description || '');
    setEditEstimatedTime(task.estimatedTime ? String(task.estimatedTime) : '');
    setEditTagsInput(task.tags ? task.tags.join(', ') : '');
    if (task.deadline) {
      const date = new Date(task.deadline);
      const localISO = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setEditDeadline(localISO);
    } else {
      setEditDeadline('');
    }
    if (task.reminderTime && task.deadline) {
      setEditIsRemindEnabled(true);
      const diffMins = Math.round((task.deadline - task.reminderTime) / (60 * 1000));
      setEditReminderBuffer(String(diffMins));
    } else {
      setEditIsRemindEnabled(false);
      setEditReminderBuffer('15');
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;

    const parsedTags = editTagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const parsedDeadline = editDeadline ? new Date(editDeadline).getTime() : null;
    let editReminderTime: number | null = null;
    if (editIsRemindEnabled && parsedDeadline) {
      editReminderTime = parsedDeadline - parseInt(editReminderBuffer, 10) * 60 * 1000;
    }

    updateTask(editingTask.id, {
      title: editTitle,
      priority: editPriority,
      deadline: parsedDeadline,
      status: editStatus,
      description: editDescription,
      estimatedTime: editEstimatedTime ? Math.max(0, parseInt(editEstimatedTime, 10)) : null,
      tags: parsedTags,
      reminderTime: editReminderTime,
    });

    setEditingTask(null);

    // If the edited task is currently viewed in detail model, update the local view too
    if (selectedDetailTask && selectedDetailTask.id === editingTask.id) {
      setSelectedDetailTask({
        ...selectedDetailTask,
        title: editTitle,
        priority: editPriority,
        deadline: parsedDeadline,
        status: editStatus,
        description: editDescription,
        estimatedTime: editEstimatedTime ? Math.max(0, parseInt(editEstimatedTime, 10)) : null,
        tags: parsedTags,
        reminderTime: editReminderTime,
      });
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const parsedTags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const parsedDeadline = deadline ? new Date(deadline).getTime() : null;
    let computedReminderTime: number | null = null;
    if (isRemindEnabled && parsedDeadline) {
      computedReminderTime = parsedDeadline - parseInt(reminderBuffer, 10) * 60 * 1000;
    }

    addTask({
      title,
      description,
      priority,
      status: 'Todo',
      deadline: parsedDeadline,
      estimatedTime: estimatedTime ? Math.max(0, parseInt(estimatedTime, 10)) : null,
      tags: parsedTags,
      reminderTime: computedReminderTime,
    });

    setTitle('');
    setDescription('');
    setEstimatedTime('');
    setTagsInput('');
    setPriority('Medium');
    setDeadline('');
    setIsRemindEnabled(false);
    setReminderBuffer('15');
    setIsAddOpen(false);
  };

  const priorityMeta: Record<Priority, { label: string, color: string, bg: string, ring: string }> = {
    Low: { label: 'THẤP', color: 'text-muted-foreground', bg: 'bg-secondary', ring: 'ring-muted' },
    Medium: { label: 'TRUNG BÌNH', color: 'text-yellow-500', bg: 'bg-yellow-500/10', ring: 'ring-yellow-500' },
    High: { label: 'CAO', color: 'text-primary', bg: 'bg-primary/10', ring: 'ring-primary' },
    Critical: { label: 'RẤT QUAN TRỌNG', color: 'text-rose-500', bg: 'bg-rose-500/10', ring: 'ring-rose-500' },
  };

  const priorityGlowMap: Record<Priority, string> = {
    Low: 'rgba(148, 163, 184, 0.12)',
    Medium: 'rgba(234, 179, 8, 0.15)',
    High: 'rgba(52, 211, 153, 0.18)',
    Critical: 'rgba(244, 63, 94, 0.24)',
  };

  const filteredTasks = tasks.filter(t => {
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      if (filter === 'Today') return t.status !== 'Completed' && (!t.deadline || t.deadline <= todayEnd.getTime());
      if (filter === 'Upcoming') return t.status !== 'Completed' && (t.deadline && t.deadline > todayEnd.getTime());
      if (filter === 'Completed') return t.status === 'Completed';
      return true;
  }).sort((a, b) => {
      return (a.deadline || Infinity) - (b.deadline || Infinity);
  });

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      <header className="flex justify-between items-center bg-background z-10">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Nhiệm vụ</h1>
        <div className="flex items-center gap-2">
          {/* Nhập CSV Button & Dialog */}
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger
              render={
                <Button
                  variant="ghost"
                  className="h-9 w-9 sm:w-auto rounded-xl text-xs font-black bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary px-0 sm:px-3 flex items-center justify-center gap-1 shadow-[inset_0_1px_3px_rgba(255,255,255,0.05)] active:scale-95 transition-all uppercase tracking-wide"
                  title="Nhập danh sách nhiệm vụ từ tệp CSV"
                />
              }
            >
              <Upload className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Nhập CSV</span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-slate-900 border-white/5 text-foreground rounded-2xl shadow-2xl p-6 overflow-hidden">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Nhập Nhiệm vụ từ CSV
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-1.5 text-left">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Nhập nhanh nhiều nhiệm vụ thông qua một tệp tin CSV có định dạng phù hợp. Tải về file mẫu để chuẩn bị dữ liệu chính xác nhất.
                </p>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleDownloadTemplate}
                    variant="outline"
                    className="flex-1 h-11 border-white/10 hover:bg-white/5 text-xs text-foreground font-semibold rounded-xl"
                  >
                    Tải File Mẫu (.CSV)
                  </Button>
                </div>

                {/* File input box styled elegantly */}
                <div className="border border-dashed border-white/10 rounded-xl p-6 bg-slate-950/20 text-center hover:border-primary/40 transition-colors relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportFile}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Upload className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-xs">
                      <span className="font-extrabold text-primary">Nhấp để chọn tệp</span> hoặc kéo thả tại đây
                    </div>
                    <p className="text-[10px] text-muted-foreground">Chấp nhận định dạng .csv chuẩn (UTF-8)</p>
                  </div>
                </div>

                {/* Success or Error states */}
                {importErrorMsg && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-bold">
                    ⚠️ {importErrorMsg}
                  </div>
                )}

                {importStatus && (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 font-bold space-y-1">
                    <p>🎉 Nhập danh sách hoàn tất!</p>
                    <ul className="list-disc list-inside mt-1 font-medium space-y-0.5 text-muted-foreground">
                      <li>Thành công: <span className="text-emerald-400 font-extrabold">{importStatus.success}</span> nhiệm vụ</li>
                      <li>Bỏ qua/Thất bại: <span className="text-rose-400 font-extrabold">{importStatus.failed}</span> dòng</li>
                    </ul>
                  </div>
                )}

                {/* Logging window */}
                {importLogs && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground font-bold tracking-wide uppercase">Nhật ký tiến trình</Label>
                    <div className="h-28 overflow-y-auto bg-slate-950/50 border border-white/5 rounded-xl p-3 font-mono text-[10px] text-zinc-400 whitespace-pre-wrap leading-relaxed select-text scrollbar-thin">
                      {importLogs}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {tasks.some(t => t.status === 'Completed') && (
            <Button
              onClick={handleExportCSV}
              variant={"ghost"}
              className="h-9 w-9 sm:w-auto rounded-xl text-xs font-black bg-emerald-400/10 border border-emerald-400/20 hover:bg-emerald-400/20 text-emerald-400 px-0 sm:px-3 flex items-center justify-center gap-1 shadow-[inset_0_1px_3px_rgba(255,255,255,0.05)] active:scale-95 transition-all uppercase tracking-wide"
              title="Xuất các nhiệm vụ đã hoàn thành ra file CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Xuất CSV</span>
            </Button>
          )}
          <Button variant={"ghost"} size={"icon"} className="bg-secondary/40 rounded-xl text-muted-foreground w-9 h-9">
              <SlidersHorizontal className="w-4 h-4"/>
          </Button>
        </div>
      </header>

      <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
             placeholder="Tìm kiếm nhiệm vụ, thẻ hoặc dự án..." 
             className="pl-12 bg-background border-border/50 h-14 rounded-2xl text-sm placeholder:text-muted-foreground/70"
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
          />
      </div>

      <div className="flex border-b border-border/50">
          {[
              { id: 'Today', label: 'Hôm nay' }, 
              { id: 'Upcoming', label: 'Sắp tới' }, 
              { id: 'Completed', label: 'Đã hoàn thành' }
          ].map(f => (
              <button 
                key={f.id} 
                className={cn(
                    "flex-1 pb-3 text-[13px] font-semibold transition-all relative",
                    filter === f.id ? "text-foreground" : "text-muted-foreground"
                )}
                onClick={() => setFilter(f.id as any)}
              >
                  {f.label}
                  {filter === f.id && (
                      <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-primary rounded-t-full"></div>
                  )}
              </button>
          ))}
      </div>

      <ScrollArea className="flex-1 -mx-4 px-4 pb-12">
        <div className="space-y-4 pb-8">
          {loading || localLoading ? (
            <TaskSkeleton />
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
              <p className="text-sm">Không có nhiệm vụ nào.</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredTasks.map(task => {
                const meta = priorityMeta[task.priority];
                const glowColor = priorityGlowMap[task.priority];
                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 30, scale: 0.92, rotate: -1 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, x: 120, scale: 0.95, filter: "blur(3px)" }}
                    transition={{ 
                      type: "spring",
                      stiffness: 380,
                      damping: 22,
                      mass: 0.9
                    }}
                    className="w-full relative"
                  >
                    <GlowEffect glowColor={glowColor} tiltSpeed={3} glowSize={110} borderRadius="20px" className="w-full">
                      <Card 
                        className="transition-all duration-200 border-none rounded-[20px] bg-card relative overflow-hidden group w-full cursor-pointer hover:bg-slate-900/60"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button')) return;
                          setSelectedDetailTask(task);
                        }}
                      >
                        <div className={cn("absolute left-0 top-0 bottom-0 w-1 bg-current", meta.color)}></div>
                        <CardContent className="p-4 pl-5">
                          <div className="flex justify-between items-start mb-2">
                            <span className={cn("px-2 py-0.5 text-[10px] font-bold uppercase rounded-[4px] tracking-wider", meta.bg, meta.color)}>
                              {meta.label}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="truncate">{task.deadline ? format(new Date(task.deadline), 'HH:mm - dd/MM/yyyy', { locale: vi }) : 'Không có hạn'}</span>
                              {task.reminderTime ? (
                                <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 font-extrabold bg-emerald-400/10 border border-emerald-400/20 px-1 py-0.5 rounded-md leading-none shadow-sm" title={`Nhắc nhở lúc: ${format(new Date(task.reminderTime), 'HH:mm dd/MM')}`}>
                                  <Bell className="w-2.5 h-2.5 fill-current text-emerald-400" />
                                  Báo trước
                                </span>
                              ) : null}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(task);
                                }}
                                className="ml-2 hover:text-foreground transition-all duration-200 active:scale-95 p-1"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <h3 className="text-[15px] font-bold text-foreground mb-3 pr-4">
                            {task.title}
                          </h3>
                          
                          <div className="flex flex-wrap gap-1.5">
                            {task.tags && task.tags.length > 0 ? (
                              task.tags.map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="bg-primary/10 border border-primary/20 text-primary text-[10px] rounded-md font-medium px-2 py-0.5 h-6">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="secondary" className="bg-secondary/50 text-muted-foreground text-[10px] rounded-md font-medium border-none px-2 py-0.5 h-6">
                                Nhiệm vụ chung
                              </Badge>
                            )}
                            {task.estimatedTime ? (
                              <Badge variant="secondary" className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] rounded-md font-medium px-2 py-0.5 h-6 flex items-center gap-1">
                                <Timer className="w-3 h-3" />
                                {task.estimatedTime > 60 ? `${Math.floor(task.estimatedTime / 60)}h ${task.estimatedTime % 60}m` : `${task.estimatedTime}m`}
                              </Badge>
                            ) : null}
                          </div>
                        </CardContent>
                        
                        {/* Action buttons revealed on hover */}
                        <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-all duration-200 flex gap-1.5 z-10">
                          {task.status !== 'Completed' && (
                            <Button 
                              size="sm" 
                              className="h-8 rounded-lg bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 px-2.5 flex items-center gap-1 font-bold text-xs" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTask(task);
                                navigate('/pomodoro');
                              }}
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Tập trung
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="h-8 rounded-lg border border-white/5 hover:bg-slate-800 text-foreground px-2.5" 
                            onClick={(e) => {
                              e.stopPropagation();
                              updateTask(task.id, { status: task.status === 'Completed' ? 'Todo' : 'Completed' });
                            }}
                          >
                            {task.status === 'Completed' ? 'Hoàn tác' : 'Hoàn thành'}
                          </Button>
                        </div>
                      </Card>
                    </GlowEffect>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>

      <FloatingAction>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <GlowEffect glowColor="rgba(52, 211, 153, 0.55)" tiltSpeed={5} glowSize={70} borderRadius="24px" scaleOnHover={true}>
            <DialogTrigger render={
              <Button size="icon" className="w-16 h-16 rounded-[24px] bg-gradient-to-b from-primary/90 to-primary text-emerald-950 shadow-[0_12px_24px_rgba(52,211,153,0.4),inset_0_2px_5px_rgba(255,255,255,0.5),inset_0_-3px_5px_rgba(0,0,0,0.3)] border border-primary/50 transition-all duration-300" />
            }>
                  <Plus className="w-8 h-8 drop-shadow-sm" strokeWidth={2.5}/>
            </DialogTrigger>
          </GlowEffect>
          <DialogContent className="sm:max-w-md w-[90vw] max-h-[90vh] overflow-y-auto rounded-[28px] border-t border-l border-white/10 border-b border-r border-black/60 bg-gradient-to-br from-[#1a1e2a] to-[#0f1118]/95 p-6 shadow-[25px_25px_50px_rgba(0,0,0,0.7),inset_0_1px_3px_rgba(255,255,255,0.08)]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground drop-shadow-md">Tạo nhiệm vụ mới</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground ml-1 text-xs font-semibold tracking-wide">Tên nhiệm vụ</Label>
                <GlowEffect glowColor="rgba(52, 211, 153, 0.15)" tiltSpeed={1} glowSize={60} borderRadius="16px" scaleOnHover={false}>
                  <Input 
                    id="title" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    required 
                    placeholder="Tên nhiệm vụ..." 
                    className="h-14 rounded-2xl bg-slate-950/40 border-t border-l border-white/5 border-b border-r border-black/40 shadow-[inset_3px_3px_10px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.01)] focus-visible:border-primary/50 focus-visible:shadow-[0_0_15px_rgba(52,211,153,0.15),inset_3px_3px_10px_rgba(0,0,0,0.6)] focus-visible:ring-2 focus-visible:ring-primary/10 text-foreground text-sm font-medium tracking-wide transition-all duration-300 placeholder:text-muted-foreground/30" 
                  />
                </GlowEffect>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground ml-1 text-xs font-semibold tracking-wide">Mô tả chi tiết</Label>
                <textarea 
                  id="description" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Mô tả chi tiết về công việc cần thực hiện..." 
                  className="w-full min-h-[100px] p-4 rounded-2xl bg-slate-950/40 border-t border-l border-white/5 border-b border-r border-black/40 shadow-[inset_3px_3px_10px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.01)] focus:border-primary/50 text-foreground text-sm font-medium tracking-wide transition-all duration-300 placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/10" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground ml-1 text-xs font-semibold tracking-wide">Ước lượng (phút)</Label>
                  <GlowEffect glowColor="rgba(52, 211, 153, 0.15)" tiltSpeed={1} glowSize={60} borderRadius="16px" scaleOnHover={false}>
                    <Input 
                      id="estimatedTime" 
                      type="number"
                      min="0"
                      value={estimatedTime} 
                      onChange={e => setEstimatedTime(e.target.value)} 
                      placeholder="VD: 60" 
                      className="h-14 rounded-2xl bg-slate-950/40 border-t border-l border-white/5 border-b border-r border-black/40 shadow-[inset_3px_3px_10px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.01)] focus-visible:border-primary/50 focus-visible:shadow-[0_0_15px_rgba(52,211,153,0.15),inset_3px_3px_10px_rgba(0,0,0,0.6)] focus-visible:ring-2 focus-visible:ring-primary/10 text-foreground text-sm font-medium tracking-wide transition-all duration-300 placeholder:text-muted-foreground/30" 
                    />
                  </GlowEffect>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground ml-1 text-xs font-semibold tracking-wide">Hạn chót</Label>
                  <GlowEffect glowColor="rgba(52, 211, 153, 0.15)" tiltSpeed={1} glowSize={60} borderRadius="16px" scaleOnHover={false}>
                    <Input 
                      id="deadline" 
                      type="datetime-local" 
                      value={deadline} 
                      onChange={e => setDeadline(e.target.value)} 
                      className="h-14 rounded-2xl bg-slate-950/40 border-t border-l border-white/5 border-b border-r border-black/40 shadow-[inset_3px_3px_10px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.01)] focus-visible:border-primary/50 focus-visible:shadow-[0_0_15px_rgba(52,211,153,0.15),inset_3px_3px_10px_rgba(0,0,0,0.6)] focus-visible:ring-2 focus-visible:ring-primary/10 text-foreground text-sm font-medium tracking-wide transition-all duration-300 color-scheme-dark placeholder:text-muted-foreground/30" 
                    />
                  </GlowEffect>
                </div>
              </div>

              {/* Remind Me Toggle Block */}
              <div className="space-y-3 bg-slate-950/20 border border-white/5 rounded-2xl p-4 shadow-[inset_1px_1px_3px_rgba(255,255,255,0.02)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className={cn("w-4 h-4 transition-colors", isRemindEnabled ? "text-primary fill-current" : "text-muted-foreground")} />
                    <Label htmlFor="remind-me-checkbox" className="text-sm font-semibold text-foreground cursor-pointer select-none">Nhắc nhở hạn chót</Label>
                  </div>
                  <input
                    id="remind-me-checkbox"
                    type="checkbox"
                    checked={isRemindEnabled}
                    onChange={(e) => setIsRemindEnabled(e.target.checked)}
                    className="accent-primary w-4 h-4 rounded border-slate-700 bg-slate-900 cursor-pointer"
                  />
                </div>
                
                {isRemindEnabled && (
                  <div className="space-y-3 pt-3 border-t border-white/5 animate-in slide-in-from-top-2 duration-200 text-left">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground font-bold tracking-wide uppercase">Thời gian báo trước</Label>
                      <div className="grid grid-cols-4 gap-1.5 font-sans">
                        {[
                          { value: "5", label: "5 phút" },
                          { value: "15", label: "15 phút" },
                          { value: "30", label: "30 phút" },
                          { value: "60", label: "1 giờ" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setReminderBuffer(opt.value)}
                            className={cn(
                              "py-2 px-1 text-[10px] font-black rounded-lg border transition-all text-center whitespace-nowrap",
                              reminderBuffer === opt.value
                                ? "bg-primary/20 border-primary/40 text-primary shadow-sm"
                                : "bg-slate-950/40 border-white/5 text-muted-foreground hover:bg-slate-900 hover:text-foreground"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {deadline ? (
                      <p className="text-[10px] font-semibold text-emerald-400">
                        * Có thông báo nhắc nhở vào:{" "}
                        <span className="font-extrabold text-xs text-emerald-400 block mt-0.5">
                          {format(new Date(new Date(deadline).getTime() - parseInt(reminderBuffer, 10) * 60 * 1000), 'HH:mm - dd/MM/yyyy')}
                        </span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-rose-400 italic font-medium">
                        * Vui lòng điền hạn chót để tính giờ nhắc nhở.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground ml-1 text-xs font-semibold tracking-wide block leading-normal">Thẻ/nhãn (phân cách bằng dấu phẩy)</Label>
                <GlowEffect glowColor="rgba(52, 211, 153, 0.15)" tiltSpeed={1} glowSize={60} borderRadius="16px" scaleOnHover={false}>
                  <Input 
                    id="tags" 
                    value={tagsInput} 
                    onChange={e => setTagsInput(e.target.value)} 
                    placeholder="VD: học tập, quan trọng, rèn luyện" 
                    className="h-14 rounded-2xl bg-slate-950/40 border-t border-l border-white/5 border-b border-r border-black/40 shadow-[inset_3px_3px_10px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.01)] focus-visible:border-primary/50 focus-visible:shadow-[0_0_15px_rgba(52,211,153,0.15),inset_3px_3px_10px_rgba(0,0,0,0.6)] focus-visible:ring-2 focus-visible:ring-primary/10 text-foreground text-sm font-medium tracking-wide transition-all duration-300 placeholder:text-muted-foreground/30" 
                  />
                </GlowEffect>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground ml-1 text-xs font-semibold tracking-wide">Mức độ ưu tiên</Label>
                <GlowEffect glowColor="rgba(52, 211, 153, 0.15)" tiltSpeed={1} glowSize={60} borderRadius="16px" scaleOnHover={false}>
                  <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-950/40 border-t border-l border-white/5 border-b border-r border-black/40 shadow-[inset_3px_3px_10px_rgba(0,0,0,0.6)] hover:bg-slate-950/50 text-foreground">
                      <SelectValue placeholder="Chọn mức ưu tiên" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#151924] border-white/10 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                      <SelectItem value="Low" className="focus:bg-primary/10 focus:text-primary rounded-xl m-1">Thấp</SelectItem>
                      <SelectItem value="Medium" className="focus:bg-primary/10 focus:text-primary rounded-xl m-1">Trung bình</SelectItem>
                      <SelectItem value="High" className="focus:bg-primary/10 focus:text-primary rounded-xl m-1">Cao</SelectItem>
                      <SelectItem value="Critical" className="focus:bg-primary/10 focus:text-primary rounded-xl m-1">Khẩn cấp</SelectItem>
                    </SelectContent>
                  </Select>
                </GlowEffect>
              </div>
              <GlowEffect glowColor="rgba(52, 211, 153, 0.45)" tiltSpeed={3} glowSize={120} borderRadius="16px">
                <Button 
                  type="submit" 
                  className="w-full mt-6 h-14 rounded-2xl font-black uppercase tracking-wider bg-gradient-to-b from-primary via-primary/95 to-emerald-400 text-emerald-950 shadow-[0_6px_15px_rgba(52,211,153,0.3),inset_0_2px_4px_rgba(255,255,255,0.45),inset_0_-3px_6px_rgba(0,0,0,0.3)] border-t border-l border-white/20 border-b-2 border-r-2 border-black/40 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(52,211,153,0.4),inset_0_2px_4px_rgba(255,255,255,0.45),inset_0_-3px_6px_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-[0_2px_5px_rgba(52,211,153,0.1),inset_0_-1px_2px_rgba(255,255,255,0.2),inset_0_3px_5px_rgba(0,0,0,0.4)] transition-all duration-300"
                >
                  Lưu nhiệm vụ
                </Button>
              </GlowEffect>
            </form>
          </DialogContent>
        </Dialog>
      </FloatingAction>

      {/* Detailed Task View Dialog */}
      <Dialog open={!!selectedDetailTask} onOpenChange={(open) => !open && setSelectedDetailTask(null)}>
        <DialogContent className="sm:max-w-md w-[90vw] max-h-[90vh] overflow-y-auto rounded-[28px] border-t border-l border-white/10 border-b border-r border-black/60 bg-gradient-to-br from-[#1a1e2a] to-[#0f1118]/95 p-6 shadow-[25px_25px_50px_rgba(0,0,0,0.7),inset_0_1px_3px_rgba(255,255,255,0.08)] text-left">
          {selectedDetailTask && (
            <div className="space-y-6">
              <DialogHeader className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn(
                    "px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-[6px] tracking-wider border",
                    selectedDetailTask.priority === 'Low' ? "bg-slate-500/10 border-slate-500/20 text-muted-foreground" :
                    selectedDetailTask.priority === 'Medium' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                    selectedDetailTask.priority === 'High' ? "bg-primary/10 border-primary/20 text-primary" :
                    "bg-rose-500/10 border-rose-500/20 text-rose-500"
                  )}>
                    {priorityMeta[selectedDetailTask.priority].label}
                  </span>
                  <span className={cn(
                    "px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-[6px] tracking-wider border",
                    selectedDetailTask.status === 'Completed' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                    selectedDetailTask.status === 'InProgress' ? "bg-sky-500/10 border-sky-500/20 text-sky-400" :
                    "bg-slate-500/10 border-slate-500/20 text-muted-foreground"
                  )}>
                    {selectedDetailTask.status === 'Completed' ? 'ĐÃ HOÀN THÀNH' :
                     selectedDetailTask.status === 'InProgress' ? 'ĐANG THỰC HIỆN' : 'CHƯA THỰC HIỆN'}
                  </span>
                </div>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground leading-[1.3] drop-shadow-md pr-6">
                  {selectedDetailTask.title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Description */}
                <div className="space-y-1.5 p-4 rounded-2xl bg-slate-950/20 border border-white/5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground tracking-wide">
                    <AlignLeft className="w-3.5 h-3.5 text-primary" />
                    <span>Mô tả chi tiết</span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap min-h-[60px]">
                    {selectedDetailTask.description || "Không có mô tả chi tiết cho nhiệm vụ này."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Estimated Time */}
                  <div className="space-y-1.5 p-4 rounded-2xl bg-slate-950/20 border border-white/5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground tracking-wide">
                      <Timer className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Ước lượng</span>
                    </div>
                    <p className="text-sm font-bold text-cyan-400">
                      {selectedDetailTask.estimatedTime 
                        ? `${selectedDetailTask.estimatedTime} phút` 
                        : "Không xác định"}
                    </p>
                  </div>

                  {/* Deadline */}
                  <div className="space-y-1.5 p-4 rounded-2xl bg-slate-950/20 border border-white/5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground tracking-wide">
                      <Calendar className="w-3.5 h-3.5 text-yellow-500" />
                      <span>Hạn chót</span>
                    </div>
                    <p className="text-sm font-bold text-yellow-500">
                      {selectedDetailTask.deadline 
                        ? format(new Date(selectedDetailTask.deadline), 'HH:mm - dd/MM/yyyy', { locale: vi }) 
                        : "Không có"}
                    </p>
                  </div>
                </div>

                {/* Reminder notification details */}
                {selectedDetailTask.reminderTime ? (
                  <div className="space-y-1.5 p-4 rounded-2xl bg-slate-950/20 border border-white/5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground tracking-wide">
                      <Bell className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                      <span>Có thông báo nhắc nhở</span>
                    </div>
                    <p className="text-sm font-bold text-emerald-400">
                      {format(new Date(selectedDetailTask.reminderTime), 'HH:mm - dd/MM/yyyy', { locale: vi })}
                    </p>
                  </div>
                ) : null}

                {/* Tags */}
                <div className="space-y-1.5 p-4 rounded-2xl bg-slate-950/20 border border-white/5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground tracking-wide mb-1">
                    <Tag className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Thẻ / Nhãn</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDetailTask.tags && selectedDetailTask.tags.length > 0 ? (
                      selectedDetailTask.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-primary/10 border border-primary/20 text-primary text-[11px] rounded-md font-medium px-2 py-0.5 h-6">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Chưa gắn thẻ</span>
                    )}
                  </div>
                </div>
              </div>

              {selectedDetailTask.status !== 'Completed' && (
                <div className="pt-2">
                  <GlowEffect glowColor="rgba(52, 211, 153, 0.4)" tiltSpeed={3} glowSize={110} borderRadius="16px" className="w-full">
                    <Button
                      type="button"
                      onClick={() => {
                        setActiveTask(selectedDetailTask);
                        setSelectedDetailTask(null);
                        navigate('/pomodoro');
                      }}
                      className="w-full h-14 rounded-2xl font-black bg-gradient-to-b from-primary via-primary/95 to-emerald-400 text-emerald-950 shadow-[0_8px_16px_rgba(52,211,153,0.2),inset_0_2px_4px_rgba(255,255,255,0.4)] border-t border-l border-white/20 border-b-2 border-r-2 border-black/40 flex items-center justify-center gap-2 uppercase tracking-wide transition-all active:scale-[0.98]"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      Tập trung ngay ({selectedDetailTask.estimatedTime || 25} Phút)
                    </Button>
                  </GlowEffect>
                </div>
              )}

              {/* Detail view footer actions */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <Button 
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    handleStartEdit(selectedDetailTask);
                    setSelectedDetailTask(null);
                  }}
                  className="w-full h-12 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-foreground border border-white/5 shadow-md flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4 text-primary" />
                  Sửa đổi
                </Button>

                <GlowEffect glowColor="rgba(52, 211, 153, 0.35)" tiltSpeed={3} glowSize={100} borderRadius="12px" className="w-full">
                  <Button 
                    type="button" 
                    onClick={() => {
                      const newStatus = selectedDetailTask.status === 'Completed' ? 'Todo' : 'Completed';
                      updateTask(selectedDetailTask.id, { 
                        status: newStatus 
                      });
                      setSelectedDetailTask(prev => prev ? {
                        ...prev,
                        status: newStatus
                      } : null);
                    }}
                    className={cn(
                      "w-full h-12 rounded-xl font-bold border-t border-l border-white/10 border-b-2 border-r-2 border-black/40 flex items-center justify-center gap-2",
                      selectedDetailTask.status === 'Completed'
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20 border-b border-r"
                        : "bg-gradient-to-b from-primary via-primary/95 to-emerald-400 text-emerald-950 shadow-[0_4px_12px_rgba(52,211,153,0.2)]"
                    )}
                  >
                    {selectedDetailTask.status === 'Completed' 
                      ? <Clock className="w-4 h-4" /> 
                      : <Check className="w-4 h-4" />}
                    {selectedDetailTask.status === 'Completed' ? 'Hoàn tác' : 'Hoàn thành'}
                  </Button>
                </GlowEffect>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="sm:max-w-md w-[90vw] max-h-[90vh] overflow-y-auto rounded-[28px] border-t border-l border-white/10 border-b border-r border-black/60 bg-gradient-to-br from-[#1a1e2a] to-[#0f1118]/95 p-6 shadow-[25px_25px_50px_rgba(0,0,0,0.7),inset_0_1px_3px_rgba(255,255,255,0.08)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground drop-shadow-md">Chỉnh sửa nhiệm vụ</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground ml-1 text-xs font-semibold tracking-wide">Tên nhiệm vụ</Label>
              <GlowEffect glowColor="rgba(52, 211, 153, 0.15)" tiltSpeed={1} glowSize={60} borderRadius="16px" scaleOnHover={false}>
                <Input 
                  id="edit-title" 
                  value={editTitle} 
                  onChange={e => setEditTitle(e.target.value)} 
                  required 
                  placeholder="Tên nhiệm vụ..." 
                  className="h-14 rounded-2xl bg-slate-950/40 border-t border-l border-white/5 border-b border-r border-black/40 shadow-[inset_3px_3px_10px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.01)] focus-visible:border-primary/50 focus-visible:shadow-[0_0_15px_rgba(52,211,153,0.15),inset_3px_3px_10px_rgba(0,0,0,0.6)] focus-visible:ring-2 focus-visible:ring-primary/10 text-foreground text-sm font-medium tracking-wide transition-all duration-300 placeholder:text-muted-foreground/30" 
                />
              </GlowEffect>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground ml-1 text-xs font-semibold tracking-wide">Mô tả chi tiết</Label>
              <textarea 
                id="edit-description" 
                value={editDescription} 
                onChange={e => setEditDescription(e.target.value)} 
                placeholder="Mô tả chi tiết về công việc cần thực hiện..." 
                className="w-full min-h-[100px] p-4 rounded-2xl bg-slate-950/40 border-t border-l border-white/5 border-b border-r border-black/40 shadow-[inset_3px_3px_10px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.01)] focus:border-primary/50 text-foreground text-sm font-medium tracking-wide transition-all duration-300 placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/10" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground ml-1 text-xs font-semibold tracking-wide">Ước lượng (phút)</Label>
                <GlowEffect glowColor="rgba(52, 211, 153, 0.15)" tiltSpeed={1} glowSize={60} borderRadius="16px" scaleOnHover={false}>
                  <Input 
                    id="edit-estimatedTime" 
                    type="number"
                    min="0"
                    value={editEstimatedTime} 
                    onChange={e => setEditEstimatedTime(e.target.value)} 
                    placeholder="VD: 60" 
                    className="h-14 rounded-2xl bg-slate-950/40 border-t border-l border-white/5 border-b border-r border-black/40 shadow-[inset_3px_3px_10px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.01)] focus-visible:border-primary/50 focus-visible:shadow-[0_0_15px_rgba(52,211,153,0.15),inset_3px_3px_10px_rgba(0,0,0,0.6)] focus-visible:ring-2 focus-visible:ring-primary/10 text-foreground text-sm font-medium tracking-wide transition-all duration-300 placeholder:text-muted-foreground/30" 
                  />
                </GlowEffect>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground ml-1 text-xs font-semibold tracking-wide">Hạn chót</Label>
                <GlowEffect glowColor="rgba(52, 211, 153, 0.15)" tiltSpeed={1} glowSize={60} borderRadius="16px" scaleOnHover={false}>
                  <Input 
                    id="edit-deadline" 
                    type="datetime-local" 
                    value={editDeadline} 
                    onChange={e => setEditDeadline(e.target.value)} 
                    className="h-14 rounded-2xl bg-slate-950/40 border-t border-l border-white/5 border-b border-r border-black/40 shadow-[inset_3px_3px_10px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.01)] focus-visible:border-primary/50 focus-visible:shadow-[0_0_15px_rgba(52,211,153,0.15),inset_3px_3px_10px_rgba(0,0,0,0.6)] focus-visible:ring-2 focus-visible:ring-primary/10 text-foreground text-sm font-medium tracking-wide transition-all duration-300 color-scheme-dark placeholder:text-muted-foreground/30" 
                  />
                </GlowEffect>
              </div>
            </div>

            {/* Edit Form - Remind Me Toggle Block */}
            <div className="space-y-3 bg-slate-950/20 border border-white/5 rounded-2xl p-4 shadow-[inset_1px_1px_3px_rgba(255,255,255,0.02)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className={cn("w-4 h-4 transition-colors", editIsRemindEnabled ? "text-primary fill-current" : "text-muted-foreground")} />
                  <Label htmlFor="edit-remind-me-checkbox" className="text-sm font-semibold text-foreground cursor-pointer select-none">Nhắc nhở hạn chót</Label>
                </div>
                <input
                  id="edit-remind-me-checkbox"
                  type="checkbox"
                  checked={editIsRemindEnabled}
                  onChange={(e) => setEditIsRemindEnabled(e.target.checked)}
                  className="accent-primary w-4 h-4 rounded border-slate-700 bg-slate-900 cursor-pointer"
                />
              </div>
              
              {editIsRemindEnabled && (
                <div className="space-y-3 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground font-bold tracking-wide uppercase">Thời gian báo trước</Label>
                    <div className="grid grid-cols-4 gap-1.5 font-sans">
                      {[
                        { value: "5", label: "5 phút" },
                        { value: "15", label: "15 phút" },
                        { value: "30", label: "30 phút" },
                        { value: "60", label: "1 giờ" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setEditReminderBuffer(opt.value)}
                          className={cn(
                            "py-2 px-1 text-[10px] font-black rounded-lg border transition-all text-center whitespace-nowrap",
                            editReminderBuffer === opt.value
                              ? "bg-primary/20 border-primary/40 text-primary shadow-sm"
                              : "bg-slate-950/40 border-white/5 text-muted-foreground hover:bg-slate-900 hover:text-foreground"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {editDeadline ? (
                    <p className="text-[10px] font-semibold text-emerald-400">
                      * Có thông báo nhắc nhở vào:{" "}
                      <span className="font-extrabold text-xs text-emerald-400 block mt-0.5">
                        {format(new Date(new Date(editDeadline).getTime() - parseInt(editReminderBuffer, 10) * 60 * 1000), 'HH:mm - dd/MM/yyyy')}
                      </span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-rose-400 italic font-medium">
                      * Vui lòng điền hạn chót để tính giờ nhắc nhở.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground ml-1 text-xs font-semibold tracking-wide block leading-normal">Thẻ/nhãn (phân cách bằng dấu phẩy)</Label>
              <GlowEffect glowColor="rgba(52, 211, 153, 0.15)" tiltSpeed={1} glowSize={60} borderRadius="16px" scaleOnHover={false}>
                <Input 
                  id="edit-tags" 
                  value={editTagsInput} 
                  onChange={e => setEditTagsInput(e.target.value)} 
                  placeholder="VD: học tập, quan trọng, rèn luyện" 
                  className="h-14 rounded-2xl bg-slate-950/40 border-t border-l border-white/5 border-b border-r border-black/40 shadow-[inset_3px_3px_10px_rgba(0,0,0,0.6),inset_-1px_-1px_3px_rgba(255,255,255,0.01)] focus-visible:border-primary/50 focus-visible:shadow-[0_0_15px_rgba(52,211,153,0.15),inset_3px_3px_10px_rgba(0,0,0,0.6)] focus-visible:ring-2 focus-visible:ring-primary/10 text-foreground text-sm font-medium tracking-wide transition-all duration-300 placeholder:text-muted-foreground/30" 
                />
              </GlowEffect>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground ml-1 text-xs font-semibold tracking-wide">Mức độ ưu tiên</Label>
                <GlowEffect glowColor="rgba(52, 211, 153, 0.15)" tiltSpeed={1} glowSize={60} borderRadius="16px" scaleOnHover={false}>
                  <Select value={editPriority} onValueChange={(v) => setEditPriority(v as Priority)}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-950/40 border-t border-l border-white/5 border-b border-r border-black/40 shadow-[inset_3px_3px_10px_rgba(0,0,0,0.6)] hover:bg-slate-950/50 text-foreground font-semibold">
                      <SelectValue placeholder="Chọn mức ưu tiên" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#151924] border-white/10 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                      <SelectItem value="Low" className="focus:bg-primary/10 focus:text-primary rounded-xl m-1">Thấp</SelectItem>
                      <SelectItem value="Medium" className="focus:bg-primary/10 focus:text-primary rounded-xl m-1">Trung bình</SelectItem>
                      <SelectItem value="High" className="focus:bg-primary/10 focus:text-primary rounded-xl m-1">Cao</SelectItem>
                      <SelectItem value="Critical" className="focus:bg-primary/10 focus:text-primary rounded-xl m-1">Khẩn cấp</SelectItem>
                    </SelectContent>
                  </Select>
                </GlowEffect>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground ml-1 text-xs font-semibold tracking-wide">Trạng thái</Label>
                <GlowEffect glowColor="rgba(52, 211, 153, 0.15)" tiltSpeed={1} glowSize={60} borderRadius="16px" scaleOnHover={false}>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as TaskStatus)}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-950/40 border-t border-l border-white/5 border-b border-r border-black/40 shadow-[inset_3px_3px_10px_rgba(0,0,0,0.6)] hover:bg-slate-950/50 text-foreground font-semibold">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#151924] border-white/10 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                      <SelectItem value="Todo" className="focus:bg-primary/10 focus:text-primary rounded-xl m-1">Việc cần làm</SelectItem>
                      <SelectItem value="InProgress" className="focus:bg-primary/10 focus:text-primary rounded-xl m-1">Đang làm</SelectItem>
                      <SelectItem value="Completed" className="focus:bg-primary/10 focus:text-primary rounded-xl m-1">Đã xong</SelectItem>
                    </SelectContent>
                  </Select>
                </GlowEffect>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-2">
              <Button 
                type="button"
                variant="destructive"
                onClick={() => {
                  if (editingTask) {
                    deleteTask(editingTask.id);
                    setEditingTask(null);
                    // Close details view as well if this was deleted
                    if (selectedDetailTask?.id === editingTask.id) {
                      setSelectedDetailTask(null);
                    }
                  }
                }}
                className="w-full h-14 rounded-2xl font-black uppercase tracking-wider bg-[#bd1e3c] hover:bg-[#a11630] text-rose-50 border-t border-l border-white/10 border-b-2 border-r-2 border-black/40 shadow-[0_4px_10px_rgba(244,63,94,0.2)]"
              >
                Xóa
              </Button>

              <GlowEffect glowColor="rgba(52, 211, 153, 0.45)" tiltSpeed={3} glowSize={120} borderRadius="16px">
                <Button 
                  type="submit" 
                  className="w-full h-14 rounded-2xl font-black uppercase tracking-wider bg-gradient-to-b from-primary via-primary/95 to-emerald-400 text-emerald-950 shadow-[0_6px_15px_rgba(52,211,153,0.3),inset_0_2px_4px_rgba(255,255,255,0.45),inset_0_-3px_6px_rgba(0,0,0,0.3)] border-t border-l border-white/20 border-b-2 border-r-2 border-black/40"
                >
                  Cập nhật
                </Button>
              </GlowEffect>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
