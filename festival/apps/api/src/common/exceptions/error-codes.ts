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

  // ============================================
  // VENDOR ERRORS (9xxx)
  // ============================================
  VENDOR_NOT_FOUND: 'ERR_9000',
  VENDOR_PRODUCT_NOT_FOUND: 'ERR_9001',
  VENDOR_PRODUCT_UNAVAILABLE: 'ERR_9002',
  VENDOR_ORDER_FAILED: 'ERR_9003',
  VENDOR_CLOSED: 'ERR_9004',

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
  // STAFF ERRORS (12xxx)
  // ============================================
  STAFF_SHIFT_NOT_FOUND: 'ERR_12000',
  STAFF_SHIFT_OVERLAP: 'ERR_12001',
  STAFF_SHIFT_ALREADY_STARTED: 'ERR_12002',
  STAFF_SHIFT_NOT_STARTED: 'ERR_12003',
  STAFF_SHIFT_ALREADY_ENDED: 'ERR_12004',
  STAFF_MAX_HOURS_EXCEEDED: 'ERR_12005',
  STAFF_NOT_FOUND: 'ERR_12006',
  STAFF_ALREADY_EXISTS: 'ERR_12007',
  STAFF_NOT_ASSIGNED_TO_ZONE: 'ERR_12008',
  STAFF_ACCOUNT_INACTIVE: 'ERR_12009',
  STAFF_BADGE_EXPIRED: 'ERR_12010',
  STAFF_INSUFFICIENT_PERMISSION: 'ERR_12011',
  STAFF_ROLE_NOT_ALLOWED: 'ERR_12012',

  // ============================================
  // CAMPING ERRORS (13xxx)
  // ============================================
  CAMPING_SPOT_NOT_FOUND: 'ERR_13000',
  CAMPING_SPOT_UNAVAILABLE: 'ERR_13001',
  CAMPING_SPOT_ALREADY_BOOKED: 'ERR_13002',
  CAMPING_ZONE_NOT_FOUND: 'ERR_13003',
  CAMPING_ZONE_FULL: 'ERR_13004',
  CAMPING_ZONE_CLOSED: 'ERR_13005',
  CAMPING_BOOKING_NOT_FOUND: 'ERR_13006',
  CAMPING_BOOKING_ALREADY_CANCELLED: 'ERR_13007',
  CAMPING_BOOKING_INVALID_DATES: 'ERR_13008',
  CAMPING_BOOKING_MAX_NIGHTS_EXCEEDED: 'ERR_13009',
  CAMPING_CHECKIN_TOO_EARLY: 'ERR_13010',
  CAMPING_CHECKOUT_LATE: 'ERR_13011',
  CAMPING_ALREADY_CHECKED_IN: 'ERR_13012',
  CAMPING_NOT_CHECKED_IN: 'ERR_13013',
  CAMPING_VEHICLE_NOT_ALLOWED: 'ERR_13014',
  CAMPING_VEHICLE_SIZE_EXCEEDED: 'ERR_13015',

  // ============================================
  // ARTIST ERRORS (14xxx)
  // ============================================
  ARTIST_NOT_FOUND: 'ERR_14000',
  ARTIST_ALREADY_BOOKED: 'ERR_14001',
  ARTIST_CONTRACT_NOT_SIGNED: 'ERR_14002',
  ARTIST_CANCELLED: 'ERR_14003',

  // ============================================
  // STAGE ERRORS (15xxx)
  // ============================================
  STAGE_NOT_FOUND: 'ERR_15000',
  STAGE_CLOSED: 'ERR_15001',
  STAGE_TECHNICAL_ISSUE: 'ERR_15002',
  STAGE_CAPACITY_EXCEEDED: 'ERR_15003',

  // ============================================
  // PERFORMANCE ERRORS (16xxx)
  // ============================================
  PERFORMANCE_NOT_FOUND: 'ERR_16000',
  PERFORMANCE_TIME_CONFLICT: 'ERR_16001',
  PERFORMANCE_CANCELLED: 'ERR_16002',
  PERFORMANCE_DELAYED: 'ERR_16003',
  PERFORMANCE_NOT_STARTED: 'ERR_16004',
  PERFORMANCE_ALREADY_ENDED: 'ERR_16005',

  // ============================================
  // SCHEDULE ERRORS (17xxx)
  // ============================================
  SCHEDULE_CONFLICT: 'ERR_17000',
  SCHEDULE_LOCKED: 'ERR_17001',
  SETLIST_NOT_FOUND: 'ERR_17002',
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
    fr: 'Vous n\'avez pas acces a cette ressource.',
    en: 'You do not have access to this resource.',
  },
  [ErrorCodes.FORBIDDEN_ROLE]: {
    fr: 'Votre role ne vous permet pas d\'effectuer cette action.',
    en: 'Your role does not allow this action.',
  },
  [ErrorCodes.FORBIDDEN_RESOURCE]: {
    fr: 'Acces a cette ressource refuse.',
    en: 'Access to this resource denied.',
  },
  [ErrorCodes.FORBIDDEN_TENANT]: {
    fr: 'Vous n\'appartenez pas a cette organisation.',
    en: 'You do not belong to this organization.',
  },
  [ErrorCodes.FORBIDDEN_ACTION]: {
    fr: 'Cette action n\'est pas autorisee.',
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
    fr: 'Ce festival n\'est pas encore publie.',
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
    fr: 'La vente de billets n\'a pas encore commence.',
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
    fr: 'Echec de l\'envoi du fichier.',
    en: 'File upload failed.',
  },

  // Staff
  [ErrorCodes.STAFF_SHIFT_NOT_FOUND]: {
    fr: 'Shift non trouve.',
    en: 'Shift not found.',
  },
  [ErrorCodes.STAFF_SHIFT_OVERLAP]: {
    fr: 'Ce shift chevauche un shift existant.',
    en: 'This shift overlaps with an existing shift.',
  },
  [ErrorCodes.STAFF_SHIFT_ALREADY_STARTED]: {
    fr: 'Ce shift a deja commence.',
    en: 'This shift has already started.',
  },
  [ErrorCodes.STAFF_SHIFT_NOT_STARTED]: {
    fr: 'Ce shift n\'a pas encore commence.',
    en: 'This shift has not started yet.',
  },
  [ErrorCodes.STAFF_SHIFT_ALREADY_ENDED]: {
    fr: 'Ce shift est deja termine.',
    en: 'This shift has already ended.',
  },
  [ErrorCodes.STAFF_MAX_HOURS_EXCEEDED]: {
    fr: 'Nombre maximum d\'heures depasse.',
    en: 'Maximum hours exceeded.',
  },
  [ErrorCodes.STAFF_NOT_FOUND]: {
    fr: 'Membre du staff non trouve.',
    en: 'Staff member not found.',
  },
  [ErrorCodes.STAFF_ALREADY_EXISTS]: {
    fr: 'Ce membre du staff existe deja pour ce festival.',
    en: 'This staff member already exists for this festival.',
  },
  [ErrorCodes.STAFF_NOT_ASSIGNED_TO_ZONE]: {
    fr: 'Membre du staff non assigne a cette zone.',
    en: 'Staff member not assigned to this zone.',
  },
  [ErrorCodes.STAFF_ACCOUNT_INACTIVE]: {
    fr: 'Compte staff inactif.',
    en: 'Staff account is inactive.',
  },
  [ErrorCodes.STAFF_BADGE_EXPIRED]: {
    fr: 'Badge staff expire.',
    en: 'Staff badge has expired.',
  },
  [ErrorCodes.STAFF_INSUFFICIENT_PERMISSION]: {
    fr: 'Permissions insuffisantes.',
    en: 'Insufficient permissions.',
  },
  [ErrorCodes.STAFF_ROLE_NOT_ALLOWED]: {
    fr: 'Role non autorise pour cette action.',
    en: 'Role not allowed for this action.',
  },

  // Camping
  [ErrorCodes.CAMPING_SPOT_NOT_FOUND]: {
    fr: 'Emplacement camping non trouve.',
    en: 'Camping spot not found.',
  },
  [ErrorCodes.CAMPING_SPOT_UNAVAILABLE]: {
    fr: 'Emplacement camping indisponible.',
    en: 'Camping spot unavailable.',
  },
  [ErrorCodes.CAMPING_SPOT_ALREADY_BOOKED]: {
    fr: 'Emplacement deja reserve pour ces dates.',
    en: 'Spot already booked for these dates.',
  },
  [ErrorCodes.CAMPING_ZONE_NOT_FOUND]: {
    fr: 'Zone camping non trouvee.',
    en: 'Camping zone not found.',
  },
  [ErrorCodes.CAMPING_ZONE_FULL]: {
    fr: 'Zone camping complete.',
    en: 'Camping zone is full.',
  },
  [ErrorCodes.CAMPING_ZONE_CLOSED]: {
    fr: 'Zone camping fermee.',
    en: 'Camping zone is closed.',
  },
  [ErrorCodes.CAMPING_BOOKING_NOT_FOUND]: {
    fr: 'Reservation camping non trouvee.',
    en: 'Camping booking not found.',
  },
  [ErrorCodes.CAMPING_BOOKING_ALREADY_CANCELLED]: {
    fr: 'Cette reservation a deja ete annulee.',
    en: 'This booking has already been cancelled.',
  },
  [ErrorCodes.CAMPING_BOOKING_INVALID_DATES]: {
    fr: 'Dates de reservation invalides.',
    en: 'Invalid booking dates.',
  },
  [ErrorCodes.CAMPING_BOOKING_MAX_NIGHTS_EXCEEDED]: {
    fr: 'Nombre maximum de nuits depasse.',
    en: 'Maximum number of nights exceeded.',
  },
  [ErrorCodes.CAMPING_CHECKIN_TOO_EARLY]: {
    fr: 'Check-in trop tot.',
    en: 'Check-in too early.',
  },
  [ErrorCodes.CAMPING_CHECKOUT_LATE]: {
    fr: 'Check-out en retard.',
    en: 'Late check-out.',
  },
  [ErrorCodes.CAMPING_ALREADY_CHECKED_IN]: {
    fr: 'Deja enregistre.',
    en: 'Already checked in.',
  },
  [ErrorCodes.CAMPING_NOT_CHECKED_IN]: {
    fr: 'Non enregistre, impossible de faire le check-out.',
    en: 'Not checked in, cannot check out.',
  },
  [ErrorCodes.CAMPING_VEHICLE_NOT_ALLOWED]: {
    fr: 'Type de vehicule non autorise dans cette zone.',
    en: 'Vehicle type not allowed in this zone.',
  },
  [ErrorCodes.CAMPING_VEHICLE_SIZE_EXCEEDED]: {
    fr: 'Taille du vehicule depasse les limites de l\'emplacement.',
    en: 'Vehicle size exceeds spot limits.',
  },

  // Artist
  [ErrorCodes.ARTIST_NOT_FOUND]: {
    fr: 'Artiste non trouve.',
    en: 'Artist not found.',
  },
  [ErrorCodes.ARTIST_ALREADY_BOOKED]: {
    fr: 'Artiste deja reserve pour cette date.',
    en: 'Artist already booked for this date.',
  },
  [ErrorCodes.ARTIST_CONTRACT_NOT_SIGNED]: {
    fr: 'Contrat non signe pour cet artiste.',
    en: 'Contract not signed for this artist.',
  },
  [ErrorCodes.ARTIST_CANCELLED]: {
    fr: 'Artiste annule.',
    en: 'Artist cancelled.',
  },

  // Stage
  [ErrorCodes.STAGE_NOT_FOUND]: {
    fr: 'Scene non trouvee.',
    en: 'Stage not found.',
  },
  [ErrorCodes.STAGE_CLOSED]: {
    fr: 'Scene fermee.',
    en: 'Stage is closed.',
  },
  [ErrorCodes.STAGE_TECHNICAL_ISSUE]: {
    fr: 'Probleme technique sur la scene.',
    en: 'Technical issue at stage.',
  },
  [ErrorCodes.STAGE_CAPACITY_EXCEEDED]: {
    fr: 'Capacite de la scene depassee.',
    en: 'Stage capacity exceeded.',
  },

  // Performance
  [ErrorCodes.PERFORMANCE_NOT_FOUND]: {
    fr: 'Performance non trouvee.',
    en: 'Performance not found.',
  },
  [ErrorCodes.PERFORMANCE_TIME_CONFLICT]: {
    fr: 'Conflit d\'horaire avec une autre performance.',
    en: 'Time conflict with another performance.',
  },
  [ErrorCodes.PERFORMANCE_CANCELLED]: {
    fr: 'Performance annulee.',
    en: 'Performance cancelled.',
  },
  [ErrorCodes.PERFORMANCE_DELAYED]: {
    fr: 'Performance retardee.',
    en: 'Performance delayed.',
  },
  [ErrorCodes.PERFORMANCE_NOT_STARTED]: {
    fr: 'Performance pas encore commencee.',
    en: 'Performance has not started yet.',
  },
  [ErrorCodes.PERFORMANCE_ALREADY_ENDED]: {
    fr: 'Performance deja terminee.',
    en: 'Performance has already ended.',
  },

  // Schedule
  [ErrorCodes.SCHEDULE_CONFLICT]: {
    fr: 'Conflit dans le planning.',
    en: 'Schedule conflict.',
  },
  [ErrorCodes.SCHEDULE_LOCKED]: {
    fr: 'Planning verrouille, modifications impossibles.',
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
