// Notification system for player turn alerts

export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
}

/**
 * Request notification permission from the browser
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

/**
 * Send a notification to the current device
 */
export function sendNotification(data: NotificationData): void {
  if (!areNotificationsEnabled()) {
    console.warn('Notifications not enabled');
    return;
  }

  const notification = new Notification(data.title, {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'tbc-notification',
    requireInteraction: true,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

/**
 * Store device ID in localStorage
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  let deviceId = localStorage.getItem('tbc_device_id');
  if (!deviceId) {
    deviceId = Math.random().toString(36).substr(2, 9);
    localStorage.setItem('tbc_device_id', deviceId);
  }
  return deviceId;
}

/**
 * Check if current device matches a device ID
 */
export function isCurrentDevice(deviceId: string): boolean {
  return getOrCreateDeviceId() === deviceId;
}

/**
 * Store notification preference
 */
export function setNotificationPreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('tbc_notifications_enabled', JSON.stringify(enabled));
}

/**
 * Get notification preference
 */
export function getNotificationPreference(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('tbc_notifications_enabled');
  return stored ? JSON.parse(stored) : false;
}
