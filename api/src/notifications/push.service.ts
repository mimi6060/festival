import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as admin from 'firebase-admin';

export interface PushNotificationPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface MulticastPushPayload {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface PushResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface MulticastResult {
  successCount: number;
  failureCount: number;
  responses: PushResult[];
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private isInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private async initializeFirebase(): Promise<void> {
    try {
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
      const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn(
          'Firebase credentials not configured. Push notifications will be disabled.',
        );
        return;
      }

      // Check if Firebase is already initialized
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
      }

      this.isInitialized = true;
      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize Firebase: ${error.message}`);
    }
  }

  /**
   * Check if Firebase is initialized
   */
  isAvailable(): boolean {
    return this.isInitialized;
  }

  /**
   * Send push notification to a single device
   */
  async sendPushNotification(payload: PushNotificationPayload): Promise<PushResult> {
    if (!this.isInitialized) {
      this.logger.warn('Firebase not initialized. Skipping push notification.');
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const message: admin.messaging.Message = {
        token: payload.token,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: {
            channelId: 'festival_notifications',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: '/icons/notification-icon.png',
          },
        },
      };

      const response = await admin.messaging().send(message);

      this.logger.debug(`Push notification sent: ${response}`);

      return { success: true, messageId: response };
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`);

      // Handle invalid token
      if (
        error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token'
      ) {
        await this.removeInvalidToken(payload.token);
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to multiple devices
   */
  async sendMulticastPush(payload: MulticastPushPayload): Promise<MulticastResult> {
    if (!this.isInitialized) {
      this.logger.warn('Firebase not initialized. Skipping multicast push.');
      return {
        successCount: 0,
        failureCount: payload.tokens.length,
        responses: payload.tokens.map(() => ({
          success: false,
          error: 'Firebase not initialized',
        })),
      };
    }

    if (payload.tokens.length === 0) {
      return { successCount: 0, failureCount: 0, responses: [] };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: payload.tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        android: {
          priority: 'high',
          notification: {
            channelId: 'festival_notifications',
            priority: 'high',
            defaultSound: true,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: 'default',
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      // Process failed tokens
      const failedTokens: string[] = [];
      const results: PushResult[] = response.responses.map((resp, idx) => {
        if (!resp.success && resp.error) {
          if (
            resp.error.code === 'messaging/registration-token-not-registered' ||
            resp.error.code === 'messaging/invalid-registration-token'
          ) {
            failedTokens.push(payload.tokens[idx]);
          }
          return { success: false, error: resp.error.message };
        }
        return { success: true, messageId: resp.messageId };
      });

      // Remove invalid tokens
      if (failedTokens.length > 0) {
        await this.removeInvalidTokens(failedTokens);
      }

      this.logger.log(
        `Multicast push: ${response.successCount} success, ${response.failureCount} failed`,
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: results,
      };
    } catch (error) {
      this.logger.error(`Failed to send multicast push: ${error.message}`);
      return {
        successCount: 0,
        failureCount: payload.tokens.length,
        responses: payload.tokens.map(() => ({
          success: false,
          error: error.message,
        })),
      };
    }
  }

  /**
   * Send push notification to a user by userId
   */
  async sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<PushResult> {
    const pushToken = await this.prisma.pushToken.findUnique({
      where: { userId },
    });

    if (!pushToken) {
      this.logger.debug(`No push token found for user ${userId}`);
      return { success: false, error: 'No push token registered' };
    }

    // Convert data values to strings (FCM requirement)
    const stringData = data
      ? Object.fromEntries(
          Object.entries(data).map(([key, value]) => [
            key,
            typeof value === 'string' ? value : JSON.stringify(value),
          ]),
        )
      : undefined;

    return this.sendPushNotification({
      token: pushToken.token,
      title,
      body,
      data: stringData,
    });
  }

  /**
   * Send push notification to multiple users
   */
  async sendPushToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<MulticastResult> {
    const pushTokens = await this.prisma.pushToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true },
    });

    if (pushTokens.length === 0) {
      return { successCount: 0, failureCount: 0, responses: [] };
    }

    const tokens = pushTokens.map((pt) => pt.token);

    // Convert data values to strings
    const stringData = data
      ? Object.fromEntries(
          Object.entries(data).map(([key, value]) => [
            key,
            typeof value === 'string' ? value : JSON.stringify(value),
          ]),
        )
      : undefined;

    return this.sendMulticastPush({
      tokens,
      title,
      body,
      data: stringData,
    });
  }

  /**
   * Remove invalid token from database
   */
  private async removeInvalidToken(token: string): Promise<void> {
    try {
      await this.prisma.pushToken.deleteMany({
        where: { token },
      });
      this.logger.debug(`Removed invalid push token: ${token.substring(0, 20)}...`);
    } catch (error) {
      this.logger.error(`Failed to remove invalid token: ${error.message}`);
    }
  }

  /**
   * Remove multiple invalid tokens from database
   */
  private async removeInvalidTokens(tokens: string[]): Promise<void> {
    try {
      await this.prisma.pushToken.deleteMany({
        where: { token: { in: tokens } },
      });
      this.logger.debug(`Removed ${tokens.length} invalid push tokens`);
    } catch (error) {
      this.logger.error(`Failed to remove invalid tokens: ${error.message}`);
    }
  }

  /**
   * Send a topic-based push notification (for subscribed users)
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<PushResult> {
    if (!this.isInitialized) {
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title,
          body,
        },
        data,
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      const response = await admin.messaging().send(message);

      this.logger.log(`Topic push sent to ${topic}: ${response}`);

      return { success: true, messageId: response };
    } catch (error) {
      this.logger.error(`Failed to send topic push: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe a token to a topic
   */
  async subscribeToTopic(token: string, topic: string): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      await admin.messaging().subscribeToTopic(token, topic);
      this.logger.debug(`Token subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to subscribe to topic: ${error.message}`);
      return false;
    }
  }

  /**
   * Unsubscribe a token from a topic
   */
  async unsubscribeFromTopic(token: string, topic: string): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      await admin.messaging().unsubscribeFromTopic(token, topic);
      this.logger.debug(`Token unsubscribed from topic: ${topic}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from topic: ${error.message}`);
      return false;
    }
  }
}
