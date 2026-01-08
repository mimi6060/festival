/**
 * Standardized Error Codes for the Festival Platform
 *
 * Format: DOMAIN_ACTION_REASON
 * - DOMAIN: auth, user, festival, ticket, payment, cashless, etc.
 * - ACTION: create, read, update, delete, validate, etc.
 * - REASON: specific error reason
 */

export const ErrorCodes = {
  // ============================================
  // GENERAL ERRORS (1xxx)
  // ============================================
  INTERNAL_ERROR: 'ERR_1000',
  VALIDATION_FAILED: 'ERR_1001',
  RATE_LIMIT_EXCEEDED: 'ERR_1002',
  SERVICE_UNAVAILABLE: 'ERR_1003',
  MAINTENANCE_MODE: 'ERR_1004',

  // ============================================
  // AUTHENTICATION ERRORS (2xxx)
  // ============================================
  AUTH_INVALID_CREDENTIALS: 'ERR_2000',
  AUTH_TOKEN_EXPIRED: 'ERR_2001',
  AUTH_TOKEN_INVALID: 'ERR_2002',
  AUTH_TOKEN_MISSING: 'ERR_2003',
  AUTH_REFRESH_TOKEN_EXPIRED: 'ERR_2004',
  AUTH_REFRESH_TOKEN_INVALID: 'ERR_2005',
  AUTH_EMAIL_NOT_VERIFIED: 'ERR_2006',
  AUTH_ACCOUNT_DISABLED: 'ERR_2007',
  AUTH_ACCOUNT_LOCKED: 'ERR_2008',
  AUTH_PASSWORD_WEAK: 'ERR_2009',
  AUTH_PASSWORD_MISMATCH: 'ERR_2010',

  // ============================================
  // AUTHORIZATION ERRORS (3xxx)
  // ============================================
  FORBIDDEN_ACCESS: 'ERR_3000',
  FORBIDDEN_ROLE: 'ERR_3001',
  FORBIDDEN_RESOURCE: 'ERR_3002',
  FORBIDDEN_TENANT: 'ERR_3003',
  FORBIDDEN_ACTION: 'ERR_3004',

  // ============================================
  // USER ERRORS (4xxx)
  // ============================================
  USER_NOT_FOUND: 'ERR_4000',
  USER_EMAIL_EXISTS: 'ERR_4001',
  USER_PHONE_EXISTS: 'ERR_4002',
  USER_PROFILE_INCOMPLETE: 'ERR_4003',
  USER_UPDATE_FAILED: 'ERR_4004',

  // ============================================
  // FESTIVAL ERRORS (5xxx)
  // ============================================
  FESTIVAL_NOT_FOUND: 'ERR_5000',
  FESTIVAL_SLUG_EXISTS: 'ERR_5001',
  FESTIVAL_NOT_PUBLISHED: 'ERR_5002',
  FESTIVAL_ENDED: 'ERR_5003',
  FESTIVAL_CANCELLED: 'ERR_5004',
  FESTIVAL_CAPACITY_REACHED: 'ERR_5005',

  // ============================================
  // TICKET ERRORS (6xxx)
  // ============================================
  TICKET_NOT_FOUND: 'ERR_6000',
  TICKET_CATEGORY_NOT_FOUND: 'ERR_6001',
  TICKET_SOLD_OUT: 'ERR_6002',
  TICKET_QUOTA_EXCEEDED: 'ERR_6003',
  TICKET_SALE_NOT_STARTED: 'ERR_6004',
  TICKET_SALE_ENDED: 'ERR_6005',
  TICKET_ALREADY_USED: 'ERR_6006',
  TICKET_EXPIRED: 'ERR_6007',
  TICKET_INVALID_QR: 'ERR_6008',
  TICKET_CANCELLED: 'ERR_6009',
  TICKET_TRANSFER_FAILED: 'ERR_6010',

  // ============================================
  // PAYMENT ERRORS (7xxx)
  // ============================================
  PAYMENT_NOT_FOUND: 'ERR_7000',
  PAYMENT_FAILED: 'ERR_7001',
  PAYMENT_DECLINED: 'ERR_7002',
  PAYMENT_INSUFFICIENT_FUNDS: 'ERR_7003',
  PAYMENT_CARD_EXPIRED: 'ERR_7004',
  PAYMENT_INVALID_CARD: 'ERR_7005',
  PAYMENT_DUPLICATE: 'ERR_7006',
  PAYMENT_REFUND_FAILED: 'ERR_7007',
  PAYMENT_REFUND_PERIOD_EXPIRED: 'ERR_7008',
  PAYMENT_ALREADY_REFUNDED: 'ERR_7009',
  PAYMENT_WEBHOOK_INVALID: 'ERR_7010',
  PAYMENT_CURRENCY_MISMATCH: 'ERR_7011',

  // ============================================
  // CASHLESS ERRORS (8xxx)
  // ============================================
  CASHLESS_NOT_FOUND: 'ERR_8000',
  CASHLESS_INSUFFICIENT_BALANCE: 'ERR_8001',
  CASHLESS_ACCOUNT_DISABLED: 'ERR_8002',
  CASHLESS_TOPUP_FAILED: 'ERR_8003',
  CASHLESS_TRANSFER_FAILED: 'ERR_8004',
  CASHLESS_NFC_TAG_EXISTS: 'ERR_8005',
  CASHLESS_NFC_TAG_INVALID: 'ERR_8006',
  CASHLESS_LIMIT_EXCEEDED: 'ERR_8007',
  CASHLESS_DAILY_LIMIT_EXCEEDED: 'ERR_8008',
  CASHLESS_MAX_BALANCE_EXCEEDED: 'ERR_8009',

  // ============================================
  // VENDOR ERRORS (9xxx)
  // ============================================
  VENDOR_NOT_FOUND: 'ERR_9000',
  VENDOR_PRODUCT_NOT_FOUND: 'ERR_9001',
  VENDOR_PRODUCT_UNAVAILABLE: 'ERR_9002',
  VENDOR_ORDER_FAILED: 'ERR_9003',
  VENDOR_CLOSED: 'ERR_9004',
  VENDOR_INSUFFICIENT_STOCK: 'ERR_9005',
  VENDOR_OUT_OF_STOCK: 'ERR_9006',
  VENDOR_LOW_STOCK_ALERT: 'ERR_9007',

  // ============================================
  // ZONE/ACCESS ERRORS (10xxx)
  // ============================================
  ZONE_NOT_FOUND: 'ERR_10000',
  ZONE_ACCESS_DENIED: 'ERR_10001',
  ZONE_CAPACITY_REACHED: 'ERR_10002',
  ZONE_ENTRY_NOT_ALLOWED: 'ERR_10003',
  ZONE_EXIT_NOT_ALLOWED: 'ERR_10004',

  // ============================================
  // FILE/UPLOAD ERRORS (11xxx)
  // ============================================
  FILE_NOT_FOUND: 'ERR_11000',
  FILE_TOO_LARGE: 'ERR_11001',
  FILE_TYPE_NOT_ALLOWED: 'ERR_11002',
  FILE_UPLOAD_FAILED: 'ERR_11003',

  // ============================================
  // PROGRAM/SCHEDULE ERRORS (12xxx)
  // ============================================
  ARTIST_NOT_FOUND: 'ERR_12000',
  ARTIST_ALREADY_BOOKED: 'ERR_12001',
  ARTIST_CONTRACT_NOT_SIGNED: 'ERR_12002',
  ARTIST_CANCELLED: 'ERR_12003',
  STAGE_NOT_FOUND: 'ERR_12100',
  STAGE_CLOSED: 'ERR_12101',
  STAGE_TECHNICAL_ISSUE: 'ERR_12102',
  STAGE_CAPACITY_EXCEEDED: 'ERR_12103',
  PERFORMANCE_NOT_FOUND: 'ERR_12200',
  PERFORMANCE_TIME_CONFLICT: 'ERR_12201',
  PERFORMANCE_CANCELLED: 'ERR_12202',
  PERFORMANCE_DELAYED: 'ERR_12203',
  PERFORMANCE_NOT_STARTED: 'ERR_12204',
  PERFORMANCE_ALREADY_ENDED: 'ERR_12205',
  SCHEDULE_CONFLICT: 'ERR_12300',
  SCHEDULE_LOCKED: 'ERR_12301',
  SETLIST_NOT_FOUND: 'ERR_12400',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * User-friendly error messages in multiple languages
 */
export const ErrorMessages: Record<ErrorCode, { fr: string; en: string }> = {
  // General
  [ErrorCodes.INTERNAL_ERROR]: {
    fr: 'Une erreur interne est survenue. Veuillez reessayer plus tard.',
    en: 'An internal error occurred. Please try again later.',
  },
  [ErrorCodes.VALIDATION_FAILED]: {
    fr: 'Les donnees fournies sont invalides.',
    en: 'The provided data is invalid.',
  },
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: {
    fr: 'Trop de requetes. Veuillez patienter avant de reessayer.',
    en: 'Too many requests. Please wait before trying again.',
  },
  [ErrorCodes.SERVICE_UNAVAILABLE]: {
    fr: 'Le service est temporairement indisponible.',
    en: 'The service is temporarily unavailable.',
  },
  [ErrorCodes.MAINTENANCE_MODE]: {
    fr: 'Le systeme est en maintenance. Veuillez reessayer plus tard.',
    en: 'The system is under maintenance. Please try again later.',
  },

  // Authentication
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: {
    fr: 'Email ou mot de passe incorrect.',
    en: 'Invalid email or password.',
  },
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: {
    fr: 'Votre session a expire. Veuillez vous reconnecter.',
    en: 'Your session has expired. Please log in again.',
  },
  [ErrorCodes.AUTH_TOKEN_INVALID]: {
    fr: 'Session invalide. Veuillez vous reconnecter.',
    en: 'Invalid session. Please log in again.',
  },
  [ErrorCodes.AUTH_TOKEN_MISSING]: {
    fr: 'Authentification requise.',
    en: 'Authentication required.',
  },
  [ErrorCodes.AUTH_REFRESH_TOKEN_EXPIRED]: {
    fr: 'Votre session a expire. Veuillez vous reconnecter.',
    en: 'Your session has expired. Please log in again.',
  },
  [ErrorCodes.AUTH_REFRESH_TOKEN_INVALID]: {
    fr: 'Session invalide. Veuillez vous reconnecter.',
    en: 'Invalid session. Please log in again.',
  },
  [ErrorCodes.AUTH_EMAIL_NOT_VERIFIED]: {
    fr: 'Veuillez verifier votre adresse email avant de continuer.',
    en: 'Please verify your email address before continuing.',
  },
  [ErrorCodes.AUTH_ACCOUNT_DISABLED]: {
    fr: 'Votre compte a ete desactive. Contactez le support.',
    en: 'Your account has been disabled. Contact support.',
  },
  [ErrorCodes.AUTH_ACCOUNT_LOCKED]: {
    fr: 'Votre compte est temporairement verrouille. Reessayez plus tard.',
    en: 'Your account is temporarily locked. Try again later.',
  },
  [ErrorCodes.AUTH_PASSWORD_WEAK]: {
    fr: 'Le mot de passe ne respecte pas les criteres de securite.',
    en: 'Password does not meet security requirements.',
  },
  [ErrorCodes.AUTH_PASSWORD_MISMATCH]: {
    fr: 'Les mots de passe ne correspondent pas.',
    en: 'Passwords do not match.',
  },

  // Authorization
  [ErrorCodes.FORBIDDEN_ACCESS]: {
    fr: "Vous n'avez pas acces a cette ressource.",
    en: 'You do not have access to this resource.',
  },
  [ErrorCodes.FORBIDDEN_ROLE]: {
    fr: "Votre role ne vous permet pas d'effectuer cette action.",
    en: 'Your role does not allow this action.',
  },
  [ErrorCodes.FORBIDDEN_RESOURCE]: {
    fr: 'Acces a cette ressource refuse.',
    en: 'Access to this resource denied.',
  },
  [ErrorCodes.FORBIDDEN_TENANT]: {
    fr: "Vous n'appartenez pas a cette organisation.",
    en: 'You do not belong to this organization.',
  },
  [ErrorCodes.FORBIDDEN_ACTION]: {
    fr: "Cette action n'est pas autorisee.",
    en: 'This action is not allowed.',
  },

  // User
  [ErrorCodes.USER_NOT_FOUND]: {
    fr: 'Utilisateur non trouve.',
    en: 'User not found.',
  },
  [ErrorCodes.USER_EMAIL_EXISTS]: {
    fr: 'Cette adresse email est deja utilisee.',
    en: 'This email address is already in use.',
  },
  [ErrorCodes.USER_PHONE_EXISTS]: {
    fr: 'Ce numero de telephone est deja utilise.',
    en: 'This phone number is already in use.',
  },
  [ErrorCodes.USER_PROFILE_INCOMPLETE]: {
    fr: 'Veuillez completer votre profil.',
    en: 'Please complete your profile.',
  },
  [ErrorCodes.USER_UPDATE_FAILED]: {
    fr: 'Mise a jour du profil impossible.',
    en: 'Unable to update profile.',
  },

  // Festival
  [ErrorCodes.FESTIVAL_NOT_FOUND]: {
    fr: 'Festival non trouve.',
    en: 'Festival not found.',
  },
  [ErrorCodes.FESTIVAL_SLUG_EXISTS]: {
    fr: 'Un festival avec cet identifiant existe deja.',
    en: 'A festival with this identifier already exists.',
  },
  [ErrorCodes.FESTIVAL_NOT_PUBLISHED]: {
    fr: "Ce festival n'est pas encore publie.",
    en: 'This festival is not yet published.',
  },
  [ErrorCodes.FESTIVAL_ENDED]: {
    fr: 'Ce festival est termine.',
    en: 'This festival has ended.',
  },
  [ErrorCodes.FESTIVAL_CANCELLED]: {
    fr: 'Ce festival a ete annule.',
    en: 'This festival has been cancelled.',
  },
  [ErrorCodes.FESTIVAL_CAPACITY_REACHED]: {
    fr: 'Le festival a atteint sa capacite maximale.',
    en: 'The festival has reached its maximum capacity.',
  },

  // Ticket
  [ErrorCodes.TICKET_NOT_FOUND]: {
    fr: 'Billet non trouve.',
    en: 'Ticket not found.',
  },
  [ErrorCodes.TICKET_CATEGORY_NOT_FOUND]: {
    fr: 'Categorie de billet non trouvee.',
    en: 'Ticket category not found.',
  },
  [ErrorCodes.TICKET_SOLD_OUT]: {
    fr: 'Billets epuises pour cette categorie.',
    en: 'Tickets sold out for this category.',
  },
  [ErrorCodes.TICKET_QUOTA_EXCEEDED]: {
    fr: 'Le nombre maximum de billets par personne a ete atteint.',
    en: 'The maximum number of tickets per person has been reached.',
  },
  [ErrorCodes.TICKET_SALE_NOT_STARTED]: {
    fr: "La vente de billets n'a pas encore commence.",
    en: 'Ticket sales have not started yet.',
  },
  [ErrorCodes.TICKET_SALE_ENDED]: {
    fr: 'La vente de billets est terminee.',
    en: 'Ticket sales have ended.',
  },
  [ErrorCodes.TICKET_ALREADY_USED]: {
    fr: 'Ce billet a deja ete utilise.',
    en: 'This ticket has already been used.',
  },
  [ErrorCodes.TICKET_EXPIRED]: {
    fr: 'Ce billet a expire.',
    en: 'This ticket has expired.',
  },
  [ErrorCodes.TICKET_INVALID_QR]: {
    fr: 'QR code invalide ou falsifie.',
    en: 'Invalid or forged QR code.',
  },
  [ErrorCodes.TICKET_CANCELLED]: {
    fr: 'Ce billet a ete annule.',
    en: 'This ticket has been cancelled.',
  },
  [ErrorCodes.TICKET_TRANSFER_FAILED]: {
    fr: 'Le transfert du billet a echoue.',
    en: 'Ticket transfer failed.',
  },

  // Payment
  [ErrorCodes.PAYMENT_NOT_FOUND]: {
    fr: 'Paiement non trouve.',
    en: 'Payment not found.',
  },
  [ErrorCodes.PAYMENT_FAILED]: {
    fr: 'Le paiement a echoue. Veuillez reessayer.',
    en: 'Payment failed. Please try again.',
  },
  [ErrorCodes.PAYMENT_DECLINED]: {
    fr: 'Paiement refuse par votre banque.',
    en: 'Payment declined by your bank.',
  },
  [ErrorCodes.PAYMENT_INSUFFICIENT_FUNDS]: {
    fr: 'Fonds insuffisants.',
    en: 'Insufficient funds.',
  },
  [ErrorCodes.PAYMENT_CARD_EXPIRED]: {
    fr: 'Votre carte a expire.',
    en: 'Your card has expired.',
  },
  [ErrorCodes.PAYMENT_INVALID_CARD]: {
    fr: 'Carte invalide.',
    en: 'Invalid card.',
  },
  [ErrorCodes.PAYMENT_DUPLICATE]: {
    fr: 'Ce paiement a deja ete effectue.',
    en: 'This payment has already been made.',
  },
  [ErrorCodes.PAYMENT_REFUND_FAILED]: {
    fr: 'Le remboursement a echoue.',
    en: 'Refund failed.',
  },
  [ErrorCodes.PAYMENT_REFUND_PERIOD_EXPIRED]: {
    fr: 'La periode de remboursement est expiree.',
    en: 'The refund period has expired.',
  },
  [ErrorCodes.PAYMENT_ALREADY_REFUNDED]: {
    fr: 'Ce paiement a deja ete rembourse.',
    en: 'This payment has already been refunded.',
  },
  [ErrorCodes.PAYMENT_WEBHOOK_INVALID]: {
    fr: 'Notification de paiement invalide.',
    en: 'Invalid payment notification.',
  },
  [ErrorCodes.PAYMENT_CURRENCY_MISMATCH]: {
    fr: 'Devise non supportee.',
    en: 'Currency not supported.',
  },

  // Cashless
  [ErrorCodes.CASHLESS_NOT_FOUND]: {
    fr: 'Compte cashless non trouve.',
    en: 'Cashless account not found.',
  },
  [ErrorCodes.CASHLESS_INSUFFICIENT_BALANCE]: {
    fr: 'Solde insuffisant.',
    en: 'Insufficient balance.',
  },
  [ErrorCodes.CASHLESS_ACCOUNT_DISABLED]: {
    fr: 'Votre compte cashless est desactive.',
    en: 'Your cashless account is disabled.',
  },
  [ErrorCodes.CASHLESS_TOPUP_FAILED]: {
    fr: 'La recharge a echoue.',
    en: 'Top-up failed.',
  },
  [ErrorCodes.CASHLESS_TRANSFER_FAILED]: {
    fr: 'Le transfert a echoue.',
    en: 'Transfer failed.',
  },
  [ErrorCodes.CASHLESS_NFC_TAG_EXISTS]: {
    fr: 'Ce bracelet est deja associe a un compte.',
    en: 'This wristband is already linked to an account.',
  },
  [ErrorCodes.CASHLESS_NFC_TAG_INVALID]: {
    fr: 'Bracelet non reconnu.',
    en: 'Wristband not recognized.',
  },
  [ErrorCodes.CASHLESS_LIMIT_EXCEEDED]: {
    fr: 'Limite de transaction atteinte.',
    en: 'Transaction limit exceeded.',
  },
  [ErrorCodes.CASHLESS_DAILY_LIMIT_EXCEEDED]: {
    fr: 'Limite quotidienne de transactions atteinte.',
    en: 'Daily transaction limit exceeded.',
  },
  [ErrorCodes.CASHLESS_MAX_BALANCE_EXCEEDED]: {
    fr: 'Solde maximum du compte atteint.',
    en: 'Maximum account balance exceeded.',
  },

  // Vendor
  [ErrorCodes.VENDOR_NOT_FOUND]: {
    fr: 'Vendeur non trouve.',
    en: 'Vendor not found.',
  },
  [ErrorCodes.VENDOR_PRODUCT_NOT_FOUND]: {
    fr: 'Produit non trouve.',
    en: 'Product not found.',
  },
  [ErrorCodes.VENDOR_PRODUCT_UNAVAILABLE]: {
    fr: 'Produit temporairement indisponible.',
    en: 'Product temporarily unavailable.',
  },
  [ErrorCodes.VENDOR_ORDER_FAILED]: {
    fr: 'La commande a echoue.',
    en: 'Order failed.',
  },
  [ErrorCodes.VENDOR_CLOSED]: {
    fr: 'Ce stand est actuellement ferme.',
    en: 'This stand is currently closed.',
  },
  [ErrorCodes.VENDOR_INSUFFICIENT_STOCK]: {
    fr: 'Stock insuffisant pour ce produit.',
    en: 'Insufficient stock for this product.',
  },
  [ErrorCodes.VENDOR_OUT_OF_STOCK]: {
    fr: 'Ce produit est en rupture de stock.',
    en: 'This product is out of stock.',
  },
  [ErrorCodes.VENDOR_LOW_STOCK_ALERT]: {
    fr: 'Stock faible pour ce produit.',
    en: 'Low stock alert for this product.',
  },

  // Zone
  [ErrorCodes.ZONE_NOT_FOUND]: {
    fr: 'Zone non trouvee.',
    en: 'Zone not found.',
  },
  [ErrorCodes.ZONE_ACCESS_DENIED]: {
    fr: 'Acces a cette zone refuse.',
    en: 'Access to this zone denied.',
  },
  [ErrorCodes.ZONE_CAPACITY_REACHED]: {
    fr: 'Cette zone a atteint sa capacite maximale.',
    en: 'This zone has reached its maximum capacity.',
  },
  [ErrorCodes.ZONE_ENTRY_NOT_ALLOWED]: {
    fr: 'Entree non autorisee a cette heure.',
    en: 'Entry not allowed at this time.',
  },
  [ErrorCodes.ZONE_EXIT_NOT_ALLOWED]: {
    fr: 'Sortie non autorisee.',
    en: 'Exit not allowed.',
  },

  // File
  [ErrorCodes.FILE_NOT_FOUND]: {
    fr: 'Fichier non trouve.',
    en: 'File not found.',
  },
  [ErrorCodes.FILE_TOO_LARGE]: {
    fr: 'Le fichier est trop volumineux.',
    en: 'File is too large.',
  },
  [ErrorCodes.FILE_TYPE_NOT_ALLOWED]: {
    fr: 'Type de fichier non autorise.',
    en: 'File type not allowed.',
  },
  [ErrorCodes.FILE_UPLOAD_FAILED]: {
    fr: "Echec de l'envoi du fichier.",
    en: 'File upload failed.',
  },

  // Program/Schedule
  [ErrorCodes.ARTIST_NOT_FOUND]: {
    fr: 'Artiste non trouve.',
    en: 'Artist not found.',
  },
  [ErrorCodes.ARTIST_ALREADY_BOOKED]: {
    fr: "L'artiste a deja une performance a cette heure.",
    en: 'Artist already has a performance at this time.',
  },
  [ErrorCodes.ARTIST_CONTRACT_NOT_SIGNED]: {
    fr: "Le contrat de l'artiste n'est pas signe.",
    en: 'Artist contract not signed.',
  },
  [ErrorCodes.ARTIST_CANCELLED]: {
    fr: "L'artiste a annule sa participation.",
    en: 'Artist has cancelled.',
  },
  [ErrorCodes.STAGE_NOT_FOUND]: {
    fr: 'Scene non trouvee.',
    en: 'Stage not found.',
  },
  [ErrorCodes.STAGE_CLOSED]: {
    fr: 'La scene est fermee.',
    en: 'Stage is closed.',
  },
  [ErrorCodes.STAGE_TECHNICAL_ISSUE]: {
    fr: 'Probleme technique sur la scene.',
    en: 'Technical issue on stage.',
  },
  [ErrorCodes.STAGE_CAPACITY_EXCEEDED]: {
    fr: 'Capacite de la scene atteinte.',
    en: 'Stage capacity exceeded.',
  },
  [ErrorCodes.PERFORMANCE_NOT_FOUND]: {
    fr: 'Performance non trouvee.',
    en: 'Performance not found.',
  },
  [ErrorCodes.PERFORMANCE_TIME_CONFLICT]: {
    fr: "Conflit d'horaire avec une autre performance.",
    en: 'Time conflict with another performance.',
  },
  [ErrorCodes.PERFORMANCE_CANCELLED]: {
    fr: 'La performance a ete annulee.',
    en: 'Performance has been cancelled.',
  },
  [ErrorCodes.PERFORMANCE_DELAYED]: {
    fr: 'La performance a ete retardee.',
    en: 'Performance has been delayed.',
  },
  [ErrorCodes.PERFORMANCE_NOT_STARTED]: {
    fr: "La performance n'a pas encore commence.",
    en: 'Performance has not started yet.',
  },
  [ErrorCodes.PERFORMANCE_ALREADY_ENDED]: {
    fr: 'La performance est deja terminee.',
    en: 'Performance has already ended.',
  },
  [ErrorCodes.SCHEDULE_CONFLICT]: {
    fr: 'Conflits detectes dans le programme.',
    en: 'Schedule conflicts detected.',
  },
  [ErrorCodes.SCHEDULE_LOCKED]: {
    fr: 'Le programme est verrouille et ne peut pas etre modifie.',
    en: 'Schedule is locked and cannot be modified.',
  },
  [ErrorCodes.SETLIST_NOT_FOUND]: {
    fr: 'Setlist non trouvee.',
    en: 'Setlist not found.',
  },
};

/**
 * Get user-friendly message for an error code
 */
export function getErrorMessage(code: ErrorCode, lang: 'fr' | 'en' = 'fr'): string {
  return ErrorMessages[code]?.[lang] || ErrorMessages[ErrorCodes.INTERNAL_ERROR][lang];
}
