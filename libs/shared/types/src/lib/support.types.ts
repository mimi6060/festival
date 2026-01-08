/**
 * Support Types
 * Types for support tickets, FAQ, chat, and lost & found
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Support ticket status
 */
export enum SupportTicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_CUSTOMER = 'waiting_customer',
  WAITING_INTERNAL = 'waiting_internal',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

/**
 * Support ticket priority
 */
export enum SupportTicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical',
}

/**
 * Support ticket category
 */
export enum SupportTicketCategory {
  GENERAL = 'general',
  TICKETS = 'tickets',
  PAYMENT = 'payment',
  REFUND = 'refund',
  CASHLESS = 'cashless',
  ACCESS = 'access',
  TECHNICAL = 'technical',
  LOST_FOUND = 'lost_found',
  COMPLAINT = 'complaint',
  SUGGESTION = 'suggestion',
  EMERGENCY = 'emergency',
  OTHER = 'other',
}

/**
 * Message sender type
 */
export enum MessageSenderType {
  USER = 'user',
  AGENT = 'agent',
  SYSTEM = 'system',
  BOT = 'bot',
}

/**
 * FAQ status
 */
export enum FAQStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

/**
 * FAQ category
 */
export enum FAQCategory {
  GENERAL = 'general',
  TICKETS = 'tickets',
  PAYMENT = 'payment',
  CASHLESS = 'cashless',
  ACCESS = 'access',
  CAMPING = 'camping',
  TRANSPORT = 'transport',
  FOOD = 'food',
  SAFETY = 'safety',
  ACCESSIBILITY = 'accessibility',
  RULES = 'rules',
  OTHER = 'other',
}

/**
 * Lost item status
 */
export enum LostItemStatus {
  REPORTED = 'reported',
  SEARCHING = 'searching',
  FOUND = 'found',
  CLAIMED = 'claimed',
  RETURNED = 'returned',
  DONATED = 'donated',
  DISPOSED = 'disposed',
}

/**
 * Lost item category
 */
export enum LostItemCategory {
  WALLET = 'wallet',
  PHONE = 'phone',
  KEYS = 'keys',
  BAG = 'bag',
  CLOTHING = 'clothing',
  JEWELRY = 'jewelry',
  ELECTRONICS = 'electronics',
  DOCUMENTS = 'documents',
  GLASSES = 'glasses',
  MEDICATION = 'medication',
  OTHER = 'other',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Support ticket
 */
export interface SupportTicket {
  id: string;
  ticketNumber: string;
  festivalId?: string;
  userId: string;
  assignedToId?: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  subject: string;
  description: string;
  tags: string[];
  relatedTicketId?: string;
  relatedOrderId?: string;
  relatedTransactionId?: string;
  messages: SupportMessage[];
  attachments: Attachment[];
  internalNotes: InternalNote[];
  sla?: SLAInfo;
  satisfaction?: SatisfactionRating;
  metadata?: Record<string, unknown>;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Support message
 */
export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: MessageSenderType;
  senderName: string;
  senderAvatar?: string;
  content: string;
  contentHtml?: string;
  attachments: Attachment[];
  isInternal: boolean;
  readAt?: string;
  editedAt?: string;
  createdAt: string;
}

/**
 * Attachment
 */
export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  thumbnailUrl?: string;
  uploadedBy: string;
  createdAt: string;
}

/**
 * Internal note
 */
export interface InternalNote {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * SLA information
 */
export interface SLAInfo {
  firstResponseDue: string;
  resolutionDue: string;
  firstResponseBreached: boolean;
  resolutionBreached: boolean;
  pausedAt?: string;
  totalPausedMinutes: number;
}

/**
 * Satisfaction rating
 */
export interface SatisfactionRating {
  rating: number;
  comment?: string;
  ratedAt: string;
}

/**
 * Support agent
 */
export interface SupportAgent {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'agent' | 'supervisor' | 'manager';
  isOnline: boolean;
  isAvailable: boolean;
  skills: SupportTicketCategory[];
  maxActiveTickets: number;
  activeTicketsCount: number;
  languages: string[];
  stats: AgentStats;
  createdAt: string;
  updatedAt: string;
}

/**
 * Agent statistics
 */
export interface AgentStats {
  totalTickets: number;
  resolvedTickets: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  averageSatisfaction: number;
  todayTickets: number;
  todayResolved: number;
}

/**
 * FAQ item
 */
export interface FAQItem {
  id: string;
  festivalId?: string;
  category: FAQCategory;
  status: FAQStatus;
  question: string;
  answer: string;
  answerHtml?: string;
  keywords: string[];
  relatedFAQs?: string[];
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
  sortOrder: number;
  translations?: Record<string, FAQTranslation>;
  createdBy: string;
  updatedBy?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * FAQ translation
 */
export interface FAQTranslation {
  language: string;
  question: string;
  answer: string;
}

/**
 * Lost item
 */
export interface LostItem {
  id: string;
  reportNumber: string;
  festivalId: string;
  reportedById?: string;
  foundById?: string;
  type: 'lost' | 'found';
  status: LostItemStatus;
  category: LostItemCategory;
  name: string;
  description: string;
  color?: string;
  brand?: string;
  distinguishingFeatures?: string;
  images: string[];
  locationLost?: LostItemLocation;
  locationFound?: LostItemLocation;
  dateTimeLost?: string;
  dateTimeFound?: string;
  contactInfo?: LostItemContact;
  claimInfo?: ClaimInfo;
  storageLocation?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Lost item location
 */
export interface LostItemLocation {
  zoneId?: string;
  zoneName?: string;
  description: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Lost item contact
 */
export interface LostItemContact {
  name: string;
  email?: string;
  phone?: string;
  preferredContact: 'email' | 'phone' | 'both';
}

/**
 * Claim information
 */
export interface ClaimInfo {
  claimedById: string;
  claimedByName: string;
  claimedAt: string;
  verificationMethod: 'description' | 'id' | 'photo' | 'other';
  verificationNotes?: string;
  verifiedById: string;
  returnedAt?: string;
}

/**
 * Chat session
 */
export interface ChatSession {
  id: string;
  festivalId?: string;
  userId: string;
  agentId?: string;
  status: 'waiting' | 'active' | 'closed' | 'transferred';
  queuePosition?: number;
  messages: ChatMessage[];
  startedAt: string;
  agentJoinedAt?: string;
  endedAt?: string;
  satisfaction?: SatisfactionRating;
  tags: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Chat message
 */
export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderType: MessageSenderType;
  senderName: string;
  content: string;
  attachments?: Attachment[];
  isTyping?: boolean;
  readAt?: string;
  createdAt: string;
}

/**
 * Canned response
 */
export interface CannedResponse {
  id: string;
  festivalId?: string;
  title: string;
  shortcut: string;
  content: string;
  category: SupportTicketCategory;
  tags: string[];
  usageCount: number;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Support ticket with details
 */
export interface SupportTicketWithDetails extends SupportTicket {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string;
  };
  festival?: {
    id: string;
    name: string;
  };
}

/**
 * Support summary
 */
export interface SupportTicketSummary {
  id: string;
  ticketNumber: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  userName: string;
  assignedToName?: string;
  messagesCount: number;
  lastMessageAt?: string;
  createdAt: string;
}

/**
 * Support statistics
 */
export interface SupportStats {
  festivalId?: string;
  period: { start: string; end: string };
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  averageSatisfaction: number;
  slaBreachRate: number;
  byCategory: CategoryTicketStats[];
  byPriority: PriorityTicketStats[];
  byAgent: AgentTicketStats[];
  dailyStats: DailyTicketStats[];
}

/**
 * Category ticket statistics
 */
export interface CategoryTicketStats {
  category: SupportTicketCategory;
  count: number;
  resolved: number;
  avgResolutionTime: number;
}

/**
 * Priority ticket statistics
 */
export interface PriorityTicketStats {
  priority: SupportTicketPriority;
  count: number;
  slaBreached: number;
}

/**
 * Agent ticket statistics
 */
export interface AgentTicketStats {
  agentId: string;
  agentName: string;
  assigned: number;
  resolved: number;
  avgResponseTime: number;
  avgSatisfaction: number;
}

/**
 * Daily ticket statistics
 */
export interface DailyTicketStats {
  date: string;
  created: number;
  resolved: number;
  avgResponseTime: number;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a support ticket
 */
export interface CreateSupportTicketDto {
  festivalId?: string;
  category: SupportTicketCategory;
  priority?: SupportTicketPriority;
  subject: string;
  description: string;
  attachments?: File[];
  relatedOrderId?: string;
  relatedTransactionId?: string;
}

/**
 * DTO for updating a support ticket
 */
export interface UpdateSupportTicketDto {
  category?: SupportTicketCategory;
  priority?: SupportTicketPriority;
  status?: SupportTicketStatus;
  assignedToId?: string;
  tags?: string[];
}

/**
 * DTO for sending a message
 */
export interface SendMessageDto {
  content: string;
  isInternal?: boolean;
  attachments?: File[];
}

/**
 * DTO for adding internal note
 */
export interface AddInternalNoteDto {
  content: string;
}

/**
 * DTO for rating satisfaction
 */
export interface RateSatisfactionDto {
  rating: number;
  comment?: string;
}

/**
 * DTO for creating FAQ
 */
export interface CreateFAQDto {
  festivalId?: string;
  category: FAQCategory;
  question: string;
  answer: string;
  keywords?: string[];
  sortOrder?: number;
  translations?: Record<string, FAQTranslation>;
}

/**
 * DTO for updating FAQ
 */
export interface UpdateFAQDto {
  category?: FAQCategory;
  status?: FAQStatus;
  question?: string;
  answer?: string;
  keywords?: string[];
  sortOrder?: number;
  translations?: Record<string, FAQTranslation>;
}

/**
 * DTO for reporting lost item
 */
export interface ReportLostItemDto {
  festivalId: string;
  type: 'lost' | 'found';
  category: LostItemCategory;
  name: string;
  description: string;
  color?: string;
  brand?: string;
  distinguishingFeatures?: string;
  images?: File[];
  location?: LostItemLocation;
  dateTime?: string;
  contactInfo: LostItemContact;
}

/**
 * DTO for updating lost item
 */
export interface UpdateLostItemDto {
  status?: LostItemStatus;
  category?: LostItemCategory;
  name?: string;
  description?: string;
  color?: string;
  brand?: string;
  distinguishingFeatures?: string;
  storageLocation?: string;
  notes?: string;
}

/**
 * DTO for claiming lost item
 */
export interface ClaimLostItemDto {
  verificationMethod: 'description' | 'id' | 'photo' | 'other';
  verificationNotes: string;
  contactInfo: LostItemContact;
}

/**
 * DTO for starting chat
 */
export interface StartChatDto {
  festivalId?: string;
  initialMessage?: string;
}

/**
 * Support ticket filters
 */
export interface SupportTicketFilters {
  festivalId?: string;
  userId?: string;
  assignedToId?: string;
  category?: SupportTicketCategory | SupportTicketCategory[];
  priority?: SupportTicketPriority | SupportTicketPriority[];
  status?: SupportTicketStatus | SupportTicketStatus[];
  tags?: string[];
  hasUnreadMessages?: boolean;
  slaBreached?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

/**
 * FAQ filters
 */
export interface FAQFilters {
  festivalId?: string;
  category?: FAQCategory | FAQCategory[];
  status?: FAQStatus | FAQStatus[];
  search?: string;
}

/**
 * Lost item filters
 */
export interface LostItemFilters {
  festivalId?: string;
  type?: 'lost' | 'found';
  status?: LostItemStatus | LostItemStatus[];
  category?: LostItemCategory | LostItemCategory[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a valid SupportTicketStatus
 */
export function isSupportTicketStatus(value: unknown): value is SupportTicketStatus {
  return Object.values(SupportTicketStatus).includes(value as SupportTicketStatus);
}

/**
 * Check if value is a valid SupportTicketPriority
 */
export function isSupportTicketPriority(value: unknown): value is SupportTicketPriority {
  return Object.values(SupportTicketPriority).includes(value as SupportTicketPriority);
}

/**
 * Check if value is a valid SupportTicketCategory
 */
export function isSupportTicketCategory(value: unknown): value is SupportTicketCategory {
  return Object.values(SupportTicketCategory).includes(value as SupportTicketCategory);
}

/**
 * Check if value is a valid LostItemStatus
 */
export function isLostItemStatus(value: unknown): value is LostItemStatus {
  return Object.values(LostItemStatus).includes(value as LostItemStatus);
}

/**
 * Check if ticket is open
 */
export function isTicketOpen(ticket: SupportTicket): boolean {
  return [
    SupportTicketStatus.OPEN,
    SupportTicketStatus.IN_PROGRESS,
    SupportTicketStatus.WAITING_CUSTOMER,
    SupportTicketStatus.WAITING_INTERNAL,
  ].includes(ticket.status);
}

/**
 * Check if ticket is urgent
 */
export function isTicketUrgent(ticket: SupportTicket): boolean {
  return [SupportTicketPriority.URGENT, SupportTicketPriority.CRITICAL].includes(ticket.priority);
}

/**
 * Check if SLA is breached
 */
export function isSLABreached(ticket: SupportTicket): boolean {
  if (!ticket.sla) {
    return false;
  }
  return ticket.sla.firstResponseBreached || ticket.sla.resolutionBreached;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get support ticket status display name
 */
export function getSupportTicketStatusDisplayName(status: SupportTicketStatus): string {
  const names: Record<SupportTicketStatus, string> = {
    [SupportTicketStatus.OPEN]: 'Ouvert',
    [SupportTicketStatus.IN_PROGRESS]: 'En cours',
    [SupportTicketStatus.WAITING_CUSTOMER]: 'Attente client',
    [SupportTicketStatus.WAITING_INTERNAL]: 'Attente interne',
    [SupportTicketStatus.RESOLVED]: 'Resolu',
    [SupportTicketStatus.CLOSED]: 'Ferme',
    [SupportTicketStatus.CANCELLED]: 'Annule',
  };
  return names[status];
}

/**
 * Get support ticket priority display name
 */
export function getSupportTicketPriorityDisplayName(priority: SupportTicketPriority): string {
  const names: Record<SupportTicketPriority, string> = {
    [SupportTicketPriority.LOW]: 'Basse',
    [SupportTicketPriority.MEDIUM]: 'Moyenne',
    [SupportTicketPriority.HIGH]: 'Haute',
    [SupportTicketPriority.URGENT]: 'Urgente',
    [SupportTicketPriority.CRITICAL]: 'Critique',
  };
  return names[priority];
}

/**
 * Get support ticket category display name
 */
export function getSupportTicketCategoryDisplayName(category: SupportTicketCategory): string {
  const names: Record<SupportTicketCategory, string> = {
    [SupportTicketCategory.GENERAL]: 'General',
    [SupportTicketCategory.TICKETS]: 'Billets',
    [SupportTicketCategory.PAYMENT]: 'Paiement',
    [SupportTicketCategory.REFUND]: 'Remboursement',
    [SupportTicketCategory.CASHLESS]: 'Cashless',
    [SupportTicketCategory.ACCESS]: 'Acces',
    [SupportTicketCategory.TECHNICAL]: 'Technique',
    [SupportTicketCategory.LOST_FOUND]: 'Objets perdus',
    [SupportTicketCategory.COMPLAINT]: 'Reclamation',
    [SupportTicketCategory.SUGGESTION]: 'Suggestion',
    [SupportTicketCategory.EMERGENCY]: 'Urgence',
    [SupportTicketCategory.OTHER]: 'Autre',
  };
  return names[category];
}

/**
 * Get FAQ category display name
 */
export function getFAQCategoryDisplayName(category: FAQCategory): string {
  const names: Record<FAQCategory, string> = {
    [FAQCategory.GENERAL]: 'General',
    [FAQCategory.TICKETS]: 'Billets',
    [FAQCategory.PAYMENT]: 'Paiement',
    [FAQCategory.CASHLESS]: 'Cashless',
    [FAQCategory.ACCESS]: 'Acces',
    [FAQCategory.CAMPING]: 'Camping',
    [FAQCategory.TRANSPORT]: 'Transport',
    [FAQCategory.FOOD]: 'Restauration',
    [FAQCategory.SAFETY]: 'Securite',
    [FAQCategory.ACCESSIBILITY]: 'Accessibilite',
    [FAQCategory.RULES]: 'Reglement',
    [FAQCategory.OTHER]: 'Autre',
  };
  return names[category];
}

/**
 * Get lost item status display name
 */
export function getLostItemStatusDisplayName(status: LostItemStatus): string {
  const names: Record<LostItemStatus, string> = {
    [LostItemStatus.REPORTED]: 'Signale',
    [LostItemStatus.SEARCHING]: 'Recherche en cours',
    [LostItemStatus.FOUND]: 'Trouve',
    [LostItemStatus.CLAIMED]: 'Reclame',
    [LostItemStatus.RETURNED]: 'Rendu',
    [LostItemStatus.DONATED]: 'Donne',
    [LostItemStatus.DISPOSED]: 'Jete',
  };
  return names[status];
}

/**
 * Get lost item category display name
 */
export function getLostItemCategoryDisplayName(category: LostItemCategory): string {
  const names: Record<LostItemCategory, string> = {
    [LostItemCategory.WALLET]: 'Portefeuille',
    [LostItemCategory.PHONE]: 'Telephone',
    [LostItemCategory.KEYS]: 'Cles',
    [LostItemCategory.BAG]: 'Sac',
    [LostItemCategory.CLOTHING]: 'Vetement',
    [LostItemCategory.JEWELRY]: 'Bijou',
    [LostItemCategory.ELECTRONICS]: 'Electronique',
    [LostItemCategory.DOCUMENTS]: 'Documents',
    [LostItemCategory.GLASSES]: 'Lunettes',
    [LostItemCategory.MEDICATION]: 'Medicaments',
    [LostItemCategory.OTHER]: 'Autre',
  };
  return names[category];
}

/**
 * Get priority color
 */
export function getPriorityColor(priority: SupportTicketPriority): string {
  const colors: Record<SupportTicketPriority, string> = {
    [SupportTicketPriority.LOW]: '#9CA3AF',
    [SupportTicketPriority.MEDIUM]: '#3B82F6',
    [SupportTicketPriority.HIGH]: '#F59E0B',
    [SupportTicketPriority.URGENT]: '#EF4444',
    [SupportTicketPriority.CRITICAL]: '#DC2626',
  };
  return colors[priority];
}

/**
 * Get status color
 */
export function getStatusColor(status: SupportTicketStatus): string {
  const colors: Record<SupportTicketStatus, string> = {
    [SupportTicketStatus.OPEN]: '#3B82F6',
    [SupportTicketStatus.IN_PROGRESS]: '#8B5CF6',
    [SupportTicketStatus.WAITING_CUSTOMER]: '#F59E0B',
    [SupportTicketStatus.WAITING_INTERNAL]: '#F97316',
    [SupportTicketStatus.RESOLVED]: '#10B981',
    [SupportTicketStatus.CLOSED]: '#6B7280',
    [SupportTicketStatus.CANCELLED]: '#EF4444',
  };
  return colors[status];
}

/**
 * Generate support ticket number
 */
export function generateTicketNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const paddedSequence = sequence.toString().padStart(6, '0');
  return `SUPP-${year}-${paddedSequence}`;
}

/**
 * Generate lost item report number
 */
export function generateLostItemReportNumber(
  festivalPrefix: string,
  type: 'lost' | 'found',
  sequence: number
): string {
  const prefix = type === 'lost' ? 'LOST' : 'FOUND';
  const paddedSequence = sequence.toString().padStart(4, '0');
  return `${festivalPrefix}-${prefix}-${paddedSequence}`;
}

/**
 * Calculate SLA remaining time
 */
export function calculateSLARemainingTime(dueDate: string): {
  isOverdue: boolean;
  remainingMinutes: number;
  formatted: string;
} {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 0) {
    const overdueHours = Math.floor(Math.abs(diffMinutes) / 60);
    const overdueMins = Math.abs(diffMinutes) % 60;
    return {
      isOverdue: true,
      remainingMinutes: diffMinutes,
      formatted: `-${overdueHours}h ${overdueMins}m`,
    };
  }

  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return {
    isOverdue: false,
    remainingMinutes: diffMinutes,
    formatted: `${hours}h ${mins}m`,
  };
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get message preview
 */
export function getMessagePreview(content: string, maxLength = 100): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength).trim() + '...';
}

/**
 * Count unread messages
 */
export function countUnreadMessages(messages: SupportMessage[], userId: string): number {
  return messages.filter((m) => !m.readAt && m.senderId !== userId && !m.isInternal).length;
}

/**
 * Get last message
 */
export function getLastMessage(ticket: SupportTicket): SupportMessage | undefined {
  if (ticket.messages.length === 0) {
    return undefined;
  }
  return ticket.messages[ticket.messages.length - 1];
}

/**
 * Group FAQs by category
 */
export function groupFAQsByCategory(faqs: FAQItem[]): Map<FAQCategory, FAQItem[]> {
  const grouped = new Map<FAQCategory, FAQItem[]>();

  for (const faq of faqs) {
    if (!grouped.has(faq.category)) {
      grouped.set(faq.category, []);
    }
    grouped.get(faq.category)!.push(faq);
  }

  return grouped;
}

/**
 * Search FAQs
 */
export function searchFAQs(faqs: FAQItem[], query: string): FAQItem[] {
  const lowerQuery = query.toLowerCase();
  return faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(lowerQuery) ||
      faq.answer.toLowerCase().includes(lowerQuery) ||
      faq.keywords.some((k) => k.toLowerCase().includes(lowerQuery))
  );
}
