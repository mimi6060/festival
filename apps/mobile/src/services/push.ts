import { Platform } from 'react-native';
import PushNotification, { Importance } from 'react-native-push-notification';
import { useNotificationStore } from '../store';
import apiService from './api';
import type { Notification } from '../types';

class PushNotificationService {
  private configured = false;

  configure() {
    if (this.configured) {return;}

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
    if (Platform.OS === 'android') {
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
    return PushNotification.requestPermissions();
  }

  checkPermissions(callback: (permissions: { alert: boolean; badge: boolean; sound: boolean }) => void) {
    PushNotification.checkPermissions(callback);
  }

  localNotification(title: string, message: string, data?: object) {
    PushNotification.localNotification({
      channelId: 'festival-channel',
      title,
      message,
      playSound: true,
      soundName: 'default',
      userInfo: data,
    });
  }

  scheduleNotification(
    title: string,
    message: string,
    date: Date,
    data?: object
  ) {
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
    PushNotification.cancelAllLocalNotifications();
  }

  cancelNotification(notificationId: string) {
    PushNotification.cancelLocalNotification(notificationId);
  }

  removeAllDeliveredNotifications() {
    PushNotification.removeAllDeliveredNotifications();
  }

  setBadgeCount(count: number) {
    PushNotification.setApplicationIconBadgeNumber(count);
  }
}

export const pushService = new PushNotificationService();
export default pushService;
