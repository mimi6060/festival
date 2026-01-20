import { Platform } from 'react-native';
import { useNotificationStore } from '../store';
import apiService from './api';
import type { Notification } from '../types';

// Only import PushNotification on native platforms
let PushNotification: typeof import('react-native-push-notification').default | null = null;
let Importance: typeof import('react-native-push-notification').Importance | null = null;

if (Platform.OS !== 'web') {
  // Dynamic import for native platforms only
  const pushModule = require('react-native-push-notification');
  PushNotification = pushModule.default;
  Importance = pushModule.Importance;
}

class PushNotificationService {
  private configured = false;

  configure() {
    if (this.configured) {
      return;
    }

    // Skip push notification setup on web
    if (Platform.OS === 'web' || !PushNotification) {
      this.configured = true;
      return;
    }

    PushNotification.configure({
      onRegister: async (token) => {
        console.log('Push token:', token);
        await apiService.registerPushToken(token.token);
      },

      onNotification: (notification) => {
        console.log('Notification received:', notification);

        // Add to store
        const newNotification: Notification = {
          id: notification.id?.toString() || Date.now().toString(),
          title: notification.title || 'Festival',
          message: notification.message || '',
          type: (notification.data?.type as Notification['type']) || 'info',
          read: false,
          createdAt: new Date().toISOString(),
          actionUrl: notification.data?.actionUrl,
        };

        useNotificationStore.getState().addNotification(newNotification);

        // Required on iOS only
        notification.finish('UIBackgroundFetchResultNewData');
      },

      onAction: (notification) => {
        console.log('Notification action:', notification.action);
      },

      onRegistrationError: (err) => {
        console.error('Push registration error:', err.message);
      },

      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channel for Android
    if (Platform.OS === 'android' && Importance) {
      PushNotification.createChannel(
        {
          channelId: 'festival-channel',
          channelName: 'Festival Notifications',
          channelDescription: 'Notifications for festival events and updates',
          playSound: true,
          soundName: 'default',
          importance: Importance.HIGH,
          vibrate: true,
        },
        (created) => console.log(`Channel created: ${created}`)
      );
    }

    this.configured = true;
  }

  requestPermissions() {
    if (!PushNotification) {
      return Promise.resolve({ alert: false, badge: false, sound: false });
    }
    return PushNotification.requestPermissions();
  }

  checkPermissions(
    callback: (permissions: { alert: boolean; badge: boolean; sound: boolean }) => void
  ) {
    if (!PushNotification) {
      callback({ alert: false, badge: false, sound: false });
      return;
    }
    PushNotification.checkPermissions(callback);
  }

  localNotification(title: string, message: string, data?: object) {
    if (!PushNotification) {
      return;
    }
    PushNotification.localNotification({
      channelId: 'festival-channel',
      title,
      message,
      playSound: true,
      soundName: 'default',
      userInfo: data,
    });
  }

  scheduleNotification(title: string, message: string, date: Date, data?: object) {
    if (!PushNotification) {
      return;
    }
    PushNotification.localNotificationSchedule({
      channelId: 'festival-channel',
      title,
      message,
      date,
      playSound: true,
      soundName: 'default',
      userInfo: data,
    });
  }

  cancelAllNotifications() {
    if (!PushNotification) {
      return;
    }
    PushNotification.cancelAllLocalNotifications();
  }

  cancelNotification(notificationId: string) {
    if (!PushNotification) {
      return;
    }
    PushNotification.cancelLocalNotification(notificationId);
  }

  removeAllDeliveredNotifications() {
    if (!PushNotification) {
      return;
    }
    PushNotification.removeAllDeliveredNotifications();
  }

  setBadgeCount(count: number) {
    if (!PushNotification) {
      return;
    }
    PushNotification.setApplicationIconBadgeNumber(count);
  }
}

export const pushService = new PushNotificationService();
export default pushService;
