import { useEffect, useState } from 'react';
import { BellRing, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { enableDeadlinePush, syncDeadlinePushReminders, type PushReminderSyncStatus } from '@/src/utils/pushNotifications';
import { useAppContext } from '@/src/store/AppContext';

const statusLabels: Record<PushReminderSyncStatus, string> = {
  unsupported: 'Thiết bị chưa hỗ trợ thông báo nền',
  disabled: 'Cần cấu hình VAPID trên server',
  'permission-denied': 'Bạn đã chặn quyền thông báo',
  subscribed: 'Đã bật thông báo nền',
  synced: 'Đã đồng bộ lịch nhắc',
  error: 'Không đồng bộ được thông báo nền',
};

export default function DeadlinePushManager() {
  const { user, tasks } = useAppContext();
  const [status, setStatus] = useState<PushReminderSyncStatus | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!user?.uid || user.uid === 'guest-user') return;
    if (localStorage.getItem(`timeflow_push_enabled_${user.uid}`) !== 'true') return;

    syncDeadlinePushReminders(user.uid, tasks)
      .then((nextStatus) => setStatus(nextStatus))
      .catch(() => setStatus('error'));
  }, [tasks, user?.uid]);

  if (!user || user.uid === 'guest-user') return null;

  const handleEnablePush = async () => {
    setIsBusy(true);
    try {
      const nextStatus = await enableDeadlinePush(user.uid);
      setStatus(nextStatus);
      if (nextStatus === 'subscribed') {
        const syncStatus = await syncDeadlinePushReminders(user.uid, tasks);
        setStatus(syncStatus);
      }
    } catch (_error) {
      setStatus('error');
    } finally {
      setIsBusy(false);
    }
  };

  const isEnabled = status === 'subscribed' || status === 'synced';

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-950/30 p-3 text-left">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
          {isEnabled ? <BellRing className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-100">
            Thông báo khi app đang đóng
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-zinc-400">
            {status ? statusLabels[status] : 'Bật để điện thoại nhận nhắc hạn qua PWA/Web Push.'}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={handleEnablePush}
            disabled={isBusy}
            className="mt-2 h-8 rounded-lg bg-emerald-400 text-[10px] font-black uppercase tracking-wider text-emerald-950 hover:bg-emerald-300"
          >
            {isBusy ? 'Đang bật...' : isEnabled ? 'Đồng bộ lại' : 'Bật thông báo nền'}
          </Button>
        </div>
      </div>
    </div>
  );
}
