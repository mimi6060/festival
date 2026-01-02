// Error codes and messages

export const ERROR_CODES = {
  // Authentication errors (1xxx)
  AUTH_INVALID_CREDENTIALS: 'AUTH_1001',
  AUTH_TOKEN_EXPIRED: 'AUTH_1002',
  AUTH_TOKEN_INVALID: 'AUTH_1003',
  AUTH_UNAUTHORIZED: 'AUTH_1004',
  AUTH_FORBIDDEN: 'AUTH_1005',
  AUTH_ACCOUNT_LOCKED: 'AUTH_1006',
  AUTH_ACCOUNT_NOT_VERIFIED: 'AUTH_1007',

  // User errors (2xxx)
  USER_NOT_FOUND: 'USER_2001',
  USER_ALREADY_EXISTS: 'USER_2002',
  USER_INVALID_PASSWORD: 'USER_2003',
  USER_INVALID_EMAIL: 'USER_2004',

  // Event errors (3xxx)
  EVENT_NOT_FOUND: 'EVENT_3001',
  EVENT_ALREADY_EXISTS: 'EVENT_3002',
  EVENT_CANCELLED: 'EVENT_3003',
  EVENT_SOLD_OUT: 'EVENT_3004',
  EVENT_NOT_PUBLISHED: 'EVENT_3005',

  // Ticket errors (4xxx)
  TICKET_NOT_FOUND: 'TICKET_4001',
  TICKET_ALREADY_USED: 'TICKET_4002',
  TICKET_EXPIRED: 'TICKET_4003',
  TICKET_INVALID: 'TICKET_4004',
  TICKET_LIMIT_EXCEEDED: 'TICKET_4005',
  TICKET_NOT_AVAILABLE: 'TICKET_4006',

  // Order errors (5xxx)
  ORDER_NOT_FOUND: 'ORDER_5001',
  ORDER_PAYMENT_FAILED: 'ORDER_5002',
  ORDER_ALREADY_PAID: 'ORDER_5003',
  ORDER_EXPIRED: 'ORDER_5004',
  ORDER_CANNOT_CANCEL: 'ORDER_5005',

  // Venue errors (6xxx)
  VENUE_NOT_FOUND: 'VENUE_6001',
  VENUE_NOT_AVAILABLE: 'VENUE_6002',
  VENUE_CAPACITY_EXCEEDED: 'VENUE_6003',

  // Artist errors (7xxx)
  ARTIST_NOT_FOUND: 'ARTIST_7001',
  ARTIST_ALREADY_EXISTS: 'ARTIST_7002',

  // Validation errors (8xxx)
  VALIDATION_FAILED: 'VALIDATION_8001',
  INVALID_INPUT: 'VALIDATION_8002',
  MISSING_REQUIRED_FIELD: 'VALIDATION_8003',

  // System errors (9xxx)
  INTERNAL_ERROR: 'SYSTEM_9001',
  SERVICE_UNAVAILABLE: 'SYSTEM_9002',
  DATABASE_ERROR: 'SYSTEM_9003',
  EXTERNAL_SERVICE_ERROR: 'SYSTEM_9004',
  RATE_LIMIT_EXCEEDED: 'SYSTEM_9005',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 'Email ou mot de passe incorrect',
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]: 'Votre session a expiré',
  [ERROR_CODES.AUTH_TOKEN_INVALID]: 'Token d\'authentification invalide',
  [ERROR_CODES.AUTH_UNAUTHORIZED]: 'Authentification requise',
  [ERROR_CODES.AUTH_FORBIDDEN]: 'Accès non autorisé',
  [ERROR_CODES.AUTH_ACCOUNT_LOCKED]: 'Compte temporairement verrouillé',
  [ERROR_CODES.AUTH_ACCOUNT_NOT_VERIFIED]: 'Veuillez vérifier votre email',

  [ERROR_CODES.USER_NOT_FOUND]: 'Utilisateur introuvable',
  [ERROR_CODES.USER_ALREADY_EXISTS]: 'Un compte existe déjà avec cet email',
  [ERROR_CODES.USER_INVALID_PASSWORD]: 'Mot de passe invalide',
  [ERROR_CODES.USER_INVALID_EMAIL]: 'Adresse email invalide',

  [ERROR_CODES.EVENT_NOT_FOUND]: 'Événement introuvable',
  [ERROR_CODES.EVENT_ALREADY_EXISTS]: 'Cet événement existe déjà',
  [ERROR_CODES.EVENT_CANCELLED]: 'Cet événement a été annulé',
  [ERROR_CODES.EVENT_SOLD_OUT]: 'Cet événement est complet',
  [ERROR_CODES.EVENT_NOT_PUBLISHED]: 'Cet événement n\'est pas encore publié',

  [ERROR_CODES.TICKET_NOT_FOUND]: 'Billet introuvable',
  [ERROR_CODES.TICKET_ALREADY_USED]: 'Ce billet a déjà été utilisé',
  [ERROR_CODES.TICKET_EXPIRED]: 'Ce billet a expiré',
  [ERROR_CODES.TICKET_INVALID]: 'Billet invalide',
  [ERROR_CODES.TICKET_LIMIT_EXCEEDED]: 'Limite de billets dépassée',
  [ERROR_CODES.TICKET_NOT_AVAILABLE]: 'Billet non disponible',

  [ERROR_CODES.ORDER_NOT_FOUND]: 'Commande introuvable',
  [ERROR_CODES.ORDER_PAYMENT_FAILED]: 'Échec du paiement',
  [ERROR_CODES.ORDER_ALREADY_PAID]: 'Cette commande a déjà été payée',
  [ERROR_CODES.ORDER_EXPIRED]: 'Cette commande a expiré',
  [ERROR_CODES.ORDER_CANNOT_CANCEL]: 'Cette commande ne peut pas être annulée',

  [ERROR_CODES.VENUE_NOT_FOUND]: 'Lieu introuvable',
  [ERROR_CODES.VENUE_NOT_AVAILABLE]: 'Ce lieu n\'est pas disponible',
  [ERROR_CODES.VENUE_CAPACITY_EXCEEDED]: 'Capacité du lieu dépassée',

  [ERROR_CODES.ARTIST_NOT_FOUND]: 'Artiste introuvable',
  [ERROR_CODES.ARTIST_ALREADY_EXISTS]: 'Cet artiste existe déjà',

  [ERROR_CODES.VALIDATION_FAILED]: 'Erreur de validation',
  [ERROR_CODES.INVALID_INPUT]: 'Données invalides',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Champ obligatoire manquant',

  [ERROR_CODES.INTERNAL_ERROR]: 'Erreur interne du serveur',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service temporairement indisponible',
  [ERROR_CODES.DATABASE_ERROR]: 'Erreur de base de données',
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'Erreur de service externe',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Trop de requêtes, veuillez réessayer plus tard',
};
