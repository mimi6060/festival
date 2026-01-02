/**
 * WebSocket Module
 *
 * This module provides real-time communication capabilities for the festival platform:
 * - Real-time notifications
 * - User presence tracking
 * - Support chat
 * - Zone occupancy monitoring
 * - Festival announcements
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { EventsGateway } from './events.gateway';
import { PresenceGateway } from './presence.gateway';
import { SupportChatGateway } from './support-chat.gateway';
import { ZonesGateway } from './zones.gateway';
import { BroadcastGateway } from './broadcast.gateway';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    EventsGateway,
    PresenceGateway,
    SupportChatGateway,
    ZonesGateway,
    BroadcastGateway,
  ],
  exports: [
    EventsGateway,
    PresenceGateway,
    SupportChatGateway,
    ZonesGateway,
    BroadcastGateway,
  ],
})
export class WebSocketModule {}
