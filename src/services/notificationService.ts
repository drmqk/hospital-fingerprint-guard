import { audioAlarm } from './audioAlarm';

export class NotificationService {
  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public static getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  public static async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return 'denied';
    }
    try {
      const res = await Notification.requestPermission();
      return res;
    } catch (e) {
      console.warn('Failed to request notification permission:', e);
      return 'denied';
    }
  }

  public static notify(
    title: string,
    body: string,
    options?: {
      tag?: string;
      sound?: 'hospital_pager' | 'code_urgent' | 'chime_alert' | 'radar_pulse';
      requireInteraction?: boolean;
      playSound?: boolean;
    }
  ) {
    const playSound = options?.playSound !== false;
    const soundType = options?.sound || 'chime_alert';

    if (playSound) {
      audioAlarm.playTone(soundType);
    }

    if (this.isSupported() && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          tag: options?.tag || 'hospital-fingerprint-guard',
          requireInteraction: options?.requireInteraction || false,
          icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%230284c7"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/></svg>',
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {
        console.warn('Browser notification creation failed:', e);
      }
    }
  }
}
