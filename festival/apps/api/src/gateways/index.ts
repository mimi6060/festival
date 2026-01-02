/**
 * WebSocket Gateways - Barrel Export
 *
 * This module exports all WebSocket gateways for real-time communication:
 * - EventsGateway: Main gateway for notifications
 * - PresenceGateway: User online/offline tracking
 * - SupportChatGateway: Real-time chat for support tickets
 * - ZonesGateway: Zone occupancy and events
 * - BroadcastGateway: Festival announcements
 */

export * from './events.gateway';
export * from './presence.gateway';
export * from './support-chat.gateway';
export * from './zones.gateway';
export * from './broadcast.gateway';
