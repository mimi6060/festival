-- Performance Indexes Migration
-- Add composite and additional indexes for improved query performance

-- TicketCategory indexes
CREATE INDEX IF NOT EXISTS "TicketCategory_isActive_idx" ON "TicketCategory"("isActive");
CREATE INDEX IF NOT EXISTS "TicketCategory_festivalId_isActive_idx" ON "TicketCategory"("festivalId", "isActive");
CREATE INDEX IF NOT EXISTS "TicketCategory_festivalId_type_isActive_idx" ON "TicketCategory"("festivalId", "type", "isActive");
CREATE INDEX IF NOT EXISTS "TicketCategory_saleStartDate_saleEndDate_idx" ON "TicketCategory"("saleStartDate", "saleEndDate");

-- CashlessAccount indexes
CREATE INDEX IF NOT EXISTS "CashlessAccount_isActive_idx" ON "CashlessAccount"("isActive");
CREATE INDEX IF NOT EXISTS "CashlessAccount_balance_idx" ON "CashlessAccount"("balance");

-- Zone indexes
CREATE INDEX IF NOT EXISTS "Zone_isActive_idx" ON "Zone"("isActive");
CREATE INDEX IF NOT EXISTS "Zone_festivalId_isActive_idx" ON "Zone"("festivalId", "isActive");

-- ZoneAccessLog indexes
CREATE INDEX IF NOT EXISTS "ZoneAccessLog_action_idx" ON "ZoneAccessLog"("action");
CREATE INDEX IF NOT EXISTS "ZoneAccessLog_zoneId_action_timestamp_idx" ON "ZoneAccessLog"("zoneId", "action", "timestamp");
CREATE INDEX IF NOT EXISTS "ZoneAccessLog_performedById_idx" ON "ZoneAccessLog"("performedById");

-- StaffAssignment indexes
CREATE INDEX IF NOT EXISTS "StaffAssignment_isActive_idx" ON "StaffAssignment"("isActive");
CREATE INDEX IF NOT EXISTS "StaffAssignment_festivalId_isActive_idx" ON "StaffAssignment"("festivalId", "isActive");
CREATE INDEX IF NOT EXISTS "StaffAssignment_festivalId_zoneId_isActive_idx" ON "StaffAssignment"("festivalId", "zoneId", "isActive");
CREATE INDEX IF NOT EXISTS "StaffAssignment_startTime_endTime_idx" ON "StaffAssignment"("startTime", "endTime");
CREATE INDEX IF NOT EXISTS "StaffAssignment_role_idx" ON "StaffAssignment"("role");

-- Performance (model) indexes
CREATE INDEX IF NOT EXISTS "Performance_isCancelled_idx" ON "Performance"("isCancelled");
CREATE INDEX IF NOT EXISTS "Performance_stageId_isCancelled_startTime_idx" ON "Performance"("stageId", "isCancelled", "startTime");
CREATE INDEX IF NOT EXISTS "Performance_startTime_endTime_idx" ON "Performance"("startTime", "endTime");

-- AuditLog indexes
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_createdAt_idx" ON "AuditLog"("entityType", "createdAt");

-- Notification indexes
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_type_isRead_idx" ON "Notification"("userId", "type", "isRead");
CREATE INDEX IF NOT EXISTS "Notification_festivalId_createdAt_idx" ON "Notification"("festivalId", "createdAt");

-- PushToken indexes
CREATE INDEX IF NOT EXISTS "PushToken_userId_isActive_idx" ON "PushToken"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "PushToken_platform_isActive_idx" ON "PushToken"("platform", "isActive");

-- ScheduledNotification indexes
CREATE INDEX IF NOT EXISTS "ScheduledNotification_status_scheduledFor_idx" ON "ScheduledNotification"("status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "ScheduledNotification_festivalId_status_idx" ON "ScheduledNotification"("festivalId", "status");

-- SupportTicket indexes
CREATE INDEX IF NOT EXISTS "SupportTicket_assignedTo_idx" ON "SupportTicket"("assignedTo");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_priority_idx" ON "SupportTicket"("status", "priority");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportTicket_assignedTo_status_idx" ON "SupportTicket"("assignedTo", "status");
CREATE INDEX IF NOT EXISTS "SupportTicket_festivalId_status_idx" ON "SupportTicket"("festivalId", "status");

-- CampingBooking indexes
CREATE INDEX IF NOT EXISTS "CampingBooking_spotId_status_idx" ON "CampingBooking"("spotId", "status");
CREATE INDEX IF NOT EXISTS "CampingBooking_spotId_checkIn_checkOut_idx" ON "CampingBooking"("spotId", "checkIn", "checkOut");
CREATE INDEX IF NOT EXISTS "CampingBooking_userId_status_idx" ON "CampingBooking"("userId", "status");
CREATE INDEX IF NOT EXISTS "CampingBooking_createdAt_idx" ON "CampingBooking"("createdAt");

-- VendorPayout indexes
CREATE INDEX IF NOT EXISTS "VendorPayout_vendorId_status_idx" ON "VendorPayout"("vendorId", "status");
CREATE INDEX IF NOT EXISTS "VendorPayout_processedById_idx" ON "VendorPayout"("processedById");
CREATE INDEX IF NOT EXISTS "VendorPayout_status_createdAt_idx" ON "VendorPayout"("status", "createdAt");

-- Session indexes
CREATE INDEX IF NOT EXISTS "Session_userId_isActive_idx" ON "Session"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "Session_isActive_expiresAt_idx" ON "Session"("isActive", "expiresAt");
CREATE INDEX IF NOT EXISTS "Session_lastActiveAt_idx" ON "Session"("lastActiveAt");
