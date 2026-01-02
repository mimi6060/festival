// Web mock for react-native-push-notification
// Push notifications are not supported in web browsers the same way

export const Importance = {
  DEFAULT: 3,
  HIGH: 4,
  LOW: 2,
  MIN: 1,
  MAX: 5,
  NONE: 0,
  UNSPECIFIED: -1,
};

const PushNotification = {
  configure: (options: unknown) => {
    console.log('[Web] Push notifications not supported in web mode');
  },

  createChannel: (channel: unknown, callback?: (created: boolean) => void) => {
    callback?.(false);
  },

  requestPermissions: () => {
    // Try to use Web Notifications API if available
    if ('Notification' in window) {
      return Notification.requestPermission();
    }
    return Promise.resolve('denied');
  },

  checkPermissions: (callback: (permissions: { alert: boolean; badge: boolean; sound: boolean }) => void) => {
    const granted = 'Notification' in window && Notification.permission === 'granted';
    callback({ alert: granted, badge: granted, sound: granted });
  },

  localNotification: (details: { title?: string; message?: string }) => {
    // Use Web Notifications API if available
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(details.title || 'Notification', {
        body: details.message,
      });
    }
  },

  localNotificationSchedule: (details: unknown) => {
    console.log('[Web] Scheduled notifications not supported');
  },

  cancelAllLocalNotifications: () => {},
  cancelLocalNotification: (id: string) => {},
  removeAllDeliveredNotifications: () => {},
  setApplicationIconBadgeNumber: (count: number) => {},
};

export default PushNotification;
