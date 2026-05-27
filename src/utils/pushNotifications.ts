import type { Task } from '@/src/store/AppContext';

type PushPublicKeyResponse = {
  enabled: boolean;
  publicKey: string;
};

export type PushReminderSyncStatus =
  | 'unsupported'
  | 'disabled'
  | 'permission-denied'
  | 'subscribed'
  | 'synced'
  | 'error';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getPushPublicKey(): Promise<PushPublicKeyResponse> {
  const response = await fetch('/api/push/public-key');
  if (!response.ok) {
    throw new Error('Unable to load push notification settings');
  }
  return response.json();
}

export async function enableDeadlinePush(userId: string): Promise<PushReminderSyncStatus> {
  if (!isPushSupported()) return 'unsupported';

  const settings = await getPushPublicKey();
  if (!settings.enabled || !settings.publicKey) return 'disabled';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'permission-denied';

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(settings.publicKey),
    });
  }

  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId, subscription }),
  });

  if (!response.ok) {
    throw new Error('Unable to save push subscription');
  }

  localStorage.setItem(`timeflow_push_enabled_${userId}`, 'true');
  return 'subscribed';
}

export async function syncDeadlinePushReminders(userId: string, tasks: Task[]) {
  if (!isPushSupported()) return 'unsupported';
  if (localStorage.getItem(`timeflow_push_enabled_${userId}`) !== 'true') return 'disabled';

  const reminders = tasks
    .filter((task) => task.status !== 'Completed' && task.deadline && task.reminderTime && task.reminderTime > Date.now())
    .map((task) => ({
      taskId: task.id,
      title: task.title,
      body: `${task.title} đến hạn lúc ${new Date(task.deadline as number).toLocaleString('vi-VN')}`,
      deadline: task.deadline,
      reminderTime: task.reminderTime,
    }));

  const response = await fetch('/api/push/schedule', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId, reminders }),
  });

  if (!response.ok) {
    throw new Error('Unable to sync push reminders');
  }

  return 'synced';
}
