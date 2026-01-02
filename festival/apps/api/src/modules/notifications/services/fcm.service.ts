import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { NotificationPayload } from '../interfaces';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    const projectId = this.configService.get<string>('FCM_PROJECT_ID');
    const privateKey = this.configService.get<string>('FCM_PRIVATE_KEY');
    const clientEmail = this.configService.get<string>('FCM_CLIENT_EMAIL');

    if (!projectId || !privateKey || !clientEmail) {
      this.logger.warn(
        'Firebase Cloud Messaging not configured. Push notifications will be disabled.',
      );
      return;
    }

    try {
      // Check if already initialized
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey: privateKey.replace(/\\n/g, '\n'),
            clientEmail,
          }),
        });
      }
      this.isInitialized = true;
      this.logger.log('Firebase Cloud Messaging initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize Firebase: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  isEnabled(): boolean {
    return this.isInitialized;
  }

  async sendToToken(token: string, payload: NotificationPayload): Promise<string | null> {
    if (!this.isInitialized) {
      this.logger.warn('FCM not initialized, skipping push notification');
      return null;
    }

    try {
      const message = this.buildMessage(payload, token);
      const response = await admin.messaging().send(message);
      this.logger.debug(`Push notification sent: ${response}`);
      return response;
    } catch (error) {
      this.handleFcmError(error, token);
      return null;
    }
  }

  async sendToTokens(
    tokens: string[],
    payload: NotificationPayload,
  ): Promise<{ successCount: number; failedCount: number; invalidTokens: string[] }> {
    if (!this.isInitialized) {
      this.logger.warn('FCM not initialized, skipping push notifications');
      return { successCount: 0, failedCount: tokens.length, invalidTokens: [] };
    }

    if (tokens.length === 0) {
      return { successCount: 0, failedCount: 0, invalidTokens: [] };
    }

    try {
      const message = this.buildMulticastMessage(payload, tokens);
      const response = await admin.messaging().sendEachForMulticast(message);

      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const errorCode = resp.error.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      this.logger.debug(
        `Push notifications sent: ${response.successCount} success, ${response.failureCount} failed`,
      );

      return {
        successCount: response.successCount,
        failedCount: response.failureCount,
        invalidTokens,
      };
    } catch (error) {
      this.logger.error(`Batch push notification failed: ${error instanceof Error ? error.message : String(error)}`);
      return { successCount: 0, failedCount: tokens.length, invalidTokens: [] };
    }
  }

  async sendToTopic(topic: string, payload: NotificationPayload): Promise<string | null> {
    if (!this.isInitialized) {
      this.logger.warn('FCM not initialized, skipping topic notification');
      return null;
    }

    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: this.stringifyData(payload.data),
        android: {
          priority: 'high',
          notification: {
            channelId: 'festival_notifications',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.debug(`Topic notification sent to ${topic}: ${response}`);
      return response;
    } catch (error) {
      this.logger.error(`Topic notification failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await admin.messaging().subscribeToTopic(tokens, topic);
      this.logger.debug(`Subscribed ${tokens.length} tokens to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Topic subscription failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await admin.messaging().unsubscribeFromTopic(tokens, topic);
      this.logger.debug(`Unsubscribed ${tokens.length} tokens from topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Topic unsubscription failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildMessage(
    payload: NotificationPayload,
    token: string,
  ): admin.messaging.Message {
    return {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: this.stringifyData({
        ...payload.data,
        type: payload.type,
        actionUrl: payload.actionUrl,
        festivalId: payload.festivalId,
      }),
      android: {
        priority: 'high',
        notification: {
          channelId: this.getChannelId(payload.type),
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            'content-available': 1,
          },
        },
      },
      webpush: {
        notification: {
          icon: '/icons/notification-icon.png',
          badge: '/icons/badge-icon.png',
        },
        fcmOptions: {
          link: payload.actionUrl || undefined,
        },
      },
    };
  }

  private buildMulticastMessage(
    payload: NotificationPayload,
    tokens: string[],
  ): admin.messaging.MulticastMessage {
    return {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: this.stringifyData({
        ...payload.data,
        type: payload.type,
        actionUrl: payload.actionUrl,
        festivalId: payload.festivalId,
      }),
      android: {
        priority: 'high',
        notification: {
          channelId: this.getChannelId(payload.type),
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            'content-available': 1,
          },
        },
      },
      webpush: {
        notification: {
          icon: '/icons/notification-icon.png',
          badge: '/icons/badge-icon.png',
        },
        fcmOptions: {
          link: payload.actionUrl || undefined,
        },
      },
    };
  }

  private getChannelId(type: string): string {
    const channelMap: Record<string, string> = {
      TICKET_PURCHASED: 'tickets',
      PAYMENT_SUCCESS: 'payments',
      PAYMENT_FAILED: 'payments',
      CASHLESS_TOPUP: 'cashless',
      ARTIST_REMINDER: 'program',
      FESTIVAL_UPDATE: 'updates',
      SCHEDULE_CHANGE: 'updates',
      SECURITY_ALERT: 'security',
      PROMO: 'promotions',
      VENDOR_ORDER: 'orders',
      SYSTEM: 'general',
    };
    return channelMap[type] || 'general';
  }

  private stringifyData(
    data?: Record<string, unknown>,
  ): Record<string, string> | undefined {
    if (!data) return undefined;

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        result[key] = typeof value === 'string' ? value : JSON.stringify(value);
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }

  private handleFcmError(error: any, token: string): void {
    const errorCode = error.code;

    switch (errorCode) {
      case 'messaging/invalid-registration-token':
      case 'messaging/registration-token-not-registered':
        this.logger.warn(`Invalid FCM token: ${token.substring(0, 20)}...`);
        // Emit event to deactivate the token
        break;
      case 'messaging/message-rate-exceeded':
        this.logger.warn('FCM rate limit exceeded');
        break;
      case 'messaging/server-unavailable':
        this.logger.warn('FCM server unavailable');
        break;
      default:
        this.logger.error(`FCM error: ${error.message}`);
    }
  }
}
