/**
 * Admin App Translations
 * Supports French (default) and English
 */

export type Language = 'fr' | 'en';

// Define the structure of translations (using string for all values)
interface CommonTranslations {
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  create: string;
  add: string;
  search: string;
  filter: string;
  all: string;
  loading: string;
  noResults: string;
  confirm: string;
  close: string;
  back: string;
  next: string;
  previous: string;
  yes: string;
  no: string;
  actions: string;
  status: string;
  details: string;
  view: string;
  export: string;
  import: string;
  refresh: string;
  reset: string;
  submit: string;
  success: string;
  error: string;
  warning: string;
  info: string;
}

interface NavigationTranslations {
  dashboard: string;
  festivals: string;
  users: string;
  staff: string;
  zones: string;
  cashless: string;
  payments: string;
  reports: string;
  notifications: string;
  settings: string;
  logout: string;
  activity: string;
  exports: string;
  realtime: string;
}

interface AuthTranslations {
  login: string;
  logout: string;
  email: string;
  password: string;
  forgotPassword: string;
  rememberMe: string;
  loginButton: string;
  invalidCredentials: string;
}

interface DashboardTranslations {
  title: string;
  welcome: string;
  overview: string;
  totalRevenue: string;
  ticketsSold: string;
  activeUsers: string;
  activeFestivals: string;
  recentActivity: string;
  quickActions: string;
  topFestivals: string;
  salesOverview: string;
}

interface FestivalsTranslations {
  title: string;
  create: string;
  edit: string;
  delete: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  address: string;
  city: string;
  country: string;
  capacity: string;
  status: string;
  draft: string;
  published: string;
  ongoing: string;
  completed: string;
  cancelled: string;
  organizer: string;
  website: string;
  contactEmail: string;
  tickets: string;
  lineup: string;
  stages: string;
  vendors: string;
  camping: string;
  stats: string;
  noFestivals: string;
  confirmDelete: string;
}

interface TicketsTranslations {
  title: string;
  categories: string;
  createCategory: string;
  editCategory: string;
  categoryName: string;
  price: string;
  quantity: string;
  available: string;
  sold: string;
  startSale: string;
  endSale: string;
  maxPerUser: string;
  description: string;
  type: string;
  standard: string;
  vip: string;
  backstage: string;
  earlyBird: string;
  soldOut: string;
  onSale: string;
  comingSoon: string;
  ended: string;
}

interface UsersTranslations {
  title: string;
  create: string;
  edit: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
  lastLogin: string;
  active: string;
  inactive: string;
  banned: string;
  verified: string;
  unverified: string;
  admin: string;
  organizer: string;
  staffRole: string;
  cashier: string;
  security: string;
  user: string;
  ban: string;
  unban: string;
  confirmBan: string;
  confirmDelete: string;
}

interface StaffTranslations {
  title: string;
  create: string;
  edit: string;
  member: string;
  role: string;
  zone: string;
  permissions: string;
  shifts: string;
  checkIn: string;
  hoursWorked: string;
  schedule: string;
  assignZone: string;
  viewBadge: string;
  downloadBadge: string;
  scanTickets: string;
  manageCashless: string;
  accessBackstage: string;
  manageVendors: string;
}

interface ZonesTranslations {
  title: string;
  create: string;
  edit: string;
  name: string;
  type: string;
  accessLevel: string;
  capacity: string;
  currentOccupancy: string;
  entries: string;
  exits: string;
  mainStage: string;
  vipArea: string;
  backstage: string;
  camping: string;
  foodCourt: string;
  entrance: string;
  medical: string;
  public: string;
  restricted: string;
  staffOnly: string;
}

interface CashlessTranslations {
  title: string;
  accounts: string;
  transactions: string;
  balance: string;
  topup: string;
  payment: string;
  transfer: string;
  refund: string;
  nfcTag: string;
  linkedNfc: string;
  accountStatus: string;
  totalTopups: string;
  totalSpent: string;
  averageTransaction: string;
}

interface PaymentsTranslations {
  title: string;
  transactions: string;
  amount: string;
  method: string;
  status: string;
  date: string;
  pending: string;
  completed: string;
  failed: string;
  refunded: string;
  card: string;
  cash: string;
  stripe: string;
  invoice: string;
  receipt: string;
}

interface ReportsTranslations {
  title: string;
  generate: string;
  export: string;
  period: string;
  today: string;
  yesterday: string;
  thisWeek: string;
  thisMonth: string;
  custom: string;
  revenue: string;
  attendance: string;
  sales: string;
  financial: string;
}

interface NotificationsTranslations {
  title: string;
  all: string;
  unread: string;
  read: string;
  markAsRead: string;
  markAllRead: string;
  noNotifications: string;
  preferences: string;
}

interface SettingsTranslations {
  title: string;
  general: string;
  security: string;
  api: string;
  notifications: string;
  language: string;
  timezone: string;
  currency: string;
  changePassword: string;
  twoFactor: string;
  apiKeys: string;
  webhooks: string;
  sessions: string;
  platformName: string;
  logo: string;
  theme: string;
}

interface ErrorsTranslations {
  required: string;
  invalidEmail: string;
  invalidPhone: string;
  passwordTooShort: string;
  passwordMismatch: string;
  networkError: string;
  unauthorized: string;
  forbidden: string;
  notFound: string;
  serverError: string;
}

interface DatesTranslations {
  today: string;
  yesterday: string;
  tomorrow: string;
  thisWeek: string;
  thisMonth: string;
  thisYear: string;
}

export interface TranslationKeys {
  common: CommonTranslations;
  navigation: NavigationTranslations;
  auth: AuthTranslations;
  dashboard: DashboardTranslations;
  festivals: FestivalsTranslations;
  tickets: TicketsTranslations;
  users: UsersTranslations;
  staff: StaffTranslations;
  zones: ZonesTranslations;
  cashless: CashlessTranslations;
  payments: PaymentsTranslations;
  reports: ReportsTranslations;
  notifications: NotificationsTranslations;
  settings: SettingsTranslations;
  errors: ErrorsTranslations;
  dates: DatesTranslations;
}

export type TranslationSection = keyof TranslationKeys;

export const translations: Record<Language, TranslationKeys> = {
  fr: {
    common: {
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      create: 'Creer',
      add: 'Ajouter',
      search: 'Rechercher',
      filter: 'Filtrer',
      all: 'Tous',
      loading: 'Chargement...',
      noResults: 'Aucun resultat',
      confirm: 'Confirmer',
      close: 'Fermer',
      back: 'Retour',
      next: 'Suivant',
      previous: 'Precedent',
      yes: 'Oui',
      no: 'Non',
      actions: 'Actions',
      status: 'Statut',
      details: 'Details',
      view: 'Voir',
      export: 'Exporter',
      import: 'Importer',
      refresh: 'Actualiser',
      reset: 'Reinitialiser',
      submit: 'Soumettre',
      success: 'Succes',
      error: 'Erreur',
      warning: 'Attention',
      info: 'Information',
    },
    navigation: {
      dashboard: 'Tableau de bord',
      festivals: 'Festivals',
      users: 'Utilisateurs',
      staff: 'Personnel',
      zones: 'Zones',
      cashless: 'Cashless',
      payments: 'Paiements',
      reports: 'Rapports',
      notifications: 'Notifications',
      settings: 'Parametres',
      logout: 'Deconnexion',
      activity: 'Activite',
      exports: 'Exports',
      realtime: 'Temps reel',
    },
    auth: {
      login: 'Connexion',
      logout: 'Deconnexion',
      email: 'Adresse email',
      password: 'Mot de passe',
      forgotPassword: 'Mot de passe oublie ?',
      rememberMe: 'Se souvenir de moi',
      loginButton: 'Se connecter',
      invalidCredentials: 'Identifiants invalides',
    },
    dashboard: {
      title: 'Tableau de bord',
      welcome: 'Bienvenue',
      overview: 'Vue d\'ensemble',
      totalRevenue: 'Revenu total',
      ticketsSold: 'Billets vendus',
      activeUsers: 'Utilisateurs actifs',
      activeFestivals: 'Festivals actifs',
      recentActivity: 'Activite recente',
      quickActions: 'Actions rapides',
      topFestivals: 'Top festivals',
      salesOverview: 'Apercu des ventes',
    },
    festivals: {
      title: 'Festivals',
      create: 'Nouveau festival',
      edit: 'Modifier le festival',
      delete: 'Supprimer le festival',
      name: 'Nom du festival',
      description: 'Description',
      startDate: 'Date de debut',
      endDate: 'Date de fin',
      location: 'Lieu',
      address: 'Adresse',
      city: 'Ville',
      country: 'Pays',
      capacity: 'Capacite',
      status: 'Statut',
      draft: 'Brouillon',
      published: 'Publie',
      ongoing: 'En cours',
      completed: 'Termine',
      cancelled: 'Annule',
      organizer: 'Organisateur',
      website: 'Site web',
      contactEmail: 'Email de contact',
      tickets: 'Billets',
      lineup: 'Programmation',
      stages: 'Scenes',
      vendors: 'Vendeurs',
      camping: 'Camping',
      stats: 'Statistiques',
      noFestivals: 'Aucun festival trouve',
      confirmDelete: 'Etes-vous sur de vouloir supprimer ce festival ?',
    },
    tickets: {
      title: 'Billets',
      categories: 'Categories',
      createCategory: 'Nouvelle categorie',
      editCategory: 'Modifier la categorie',
      categoryName: 'Nom de la categorie',
      price: 'Prix',
      quantity: 'Quantite',
      available: 'Disponibles',
      sold: 'Vendus',
      startSale: 'Debut des ventes',
      endSale: 'Fin des ventes',
      maxPerUser: 'Max par utilisateur',
      description: 'Description',
      type: 'Type',
      standard: 'Standard',
      vip: 'VIP',
      backstage: 'Backstage',
      earlyBird: 'Early Bird',
      soldOut: 'Epuise',
      onSale: 'En vente',
      comingSoon: 'Bientot disponible',
      ended: 'Ventes terminees',
    },
    users: {
      title: 'Utilisateurs',
      create: 'Nouvel utilisateur',
      edit: 'Modifier l\'utilisateur',
      firstName: 'Prenom',
      lastName: 'Nom',
      email: 'Email',
      phone: 'Telephone',
      role: 'Role',
      status: 'Statut',
      createdAt: 'Date d\'inscription',
      lastLogin: 'Derniere connexion',
      active: 'Actif',
      inactive: 'Inactif',
      banned: 'Banni',
      verified: 'Verifie',
      unverified: 'Non verifie',
      admin: 'Administrateur',
      organizer: 'Organisateur',
      staffRole: 'Personnel',
      cashier: 'Caissier',
      security: 'Securite',
      user: 'Utilisateur',
      ban: 'Bannir',
      unban: 'Debannir',
      confirmBan: 'Etes-vous sur de vouloir bannir cet utilisateur ?',
      confirmDelete: 'Etes-vous sur de vouloir supprimer cet utilisateur ?',
    },
    staff: {
      title: 'Personnel',
      create: 'Nouveau membre',
      edit: 'Modifier le membre',
      member: 'Membre',
      role: 'Role',
      zone: 'Zone assignee',
      permissions: 'Permissions',
      shifts: 'Plannings',
      checkIn: 'Pointage',
      hoursWorked: 'Heures travaillees',
      schedule: 'Planning',
      assignZone: 'Assigner une zone',
      viewBadge: 'Voir le badge',
      downloadBadge: 'Telecharger le badge',
      scanTickets: 'Scanner les billets',
      manageCashless: 'Gerer le cashless',
      accessBackstage: 'Acces backstage',
      manageVendors: 'Gerer les vendeurs',
    },
    zones: {
      title: 'Zones',
      create: 'Nouvelle zone',
      edit: 'Modifier la zone',
      name: 'Nom de la zone',
      type: 'Type',
      accessLevel: 'Niveau d\'acces',
      capacity: 'Capacite',
      currentOccupancy: 'Occupation actuelle',
      entries: 'Entrees',
      exits: 'Sorties',
      mainStage: 'Scene principale',
      vipArea: 'Zone VIP',
      backstage: 'Backstage',
      camping: 'Camping',
      foodCourt: 'Restauration',
      entrance: 'Entree',
      medical: 'Medical',
      public: 'Public',
      restricted: 'Restreint',
      staffOnly: 'Personnel uniquement',
    },
    cashless: {
      title: 'Cashless',
      accounts: 'Comptes',
      transactions: 'Transactions',
      balance: 'Solde',
      topup: 'Recharger',
      payment: 'Paiement',
      transfer: 'Transfert',
      refund: 'Remboursement',
      nfcTag: 'Tag NFC',
      linkedNfc: 'NFC associe',
      accountStatus: 'Statut du compte',
      totalTopups: 'Total recharges',
      totalSpent: 'Total depense',
      averageTransaction: 'Transaction moyenne',
    },
    payments: {
      title: 'Paiements',
      transactions: 'Transactions',
      amount: 'Montant',
      method: 'Methode',
      status: 'Statut',
      date: 'Date',
      pending: 'En attente',
      completed: 'Complete',
      failed: 'Echoue',
      refunded: 'Rembourse',
      card: 'Carte',
      cash: 'Especes',
      stripe: 'Stripe',
      invoice: 'Facture',
      receipt: 'Recu',
    },
    reports: {
      title: 'Rapports',
      generate: 'Generer',
      export: 'Exporter',
      period: 'Periode',
      today: 'Aujourd\'hui',
      yesterday: 'Hier',
      thisWeek: 'Cette semaine',
      thisMonth: 'Ce mois',
      custom: 'Personnalise',
      revenue: 'Revenus',
      attendance: 'Frequentation',
      sales: 'Ventes',
      financial: 'Financier',
    },
    notifications: {
      title: 'Notifications',
      all: 'Toutes',
      unread: 'Non lues',
      read: 'Lues',
      markAsRead: 'Marquer comme lu',
      markAllRead: 'Tout marquer comme lu',
      noNotifications: 'Aucune notification',
      preferences: 'Preferences',
    },
    settings: {
      title: 'Parametres',
      general: 'General',
      security: 'Securite',
      api: 'API',
      notifications: 'Notifications',
      language: 'Langue',
      timezone: 'Fuseau horaire',
      currency: 'Devise',
      changePassword: 'Changer le mot de passe',
      twoFactor: 'Authentification a deux facteurs',
      apiKeys: 'Cles API',
      webhooks: 'Webhooks',
      sessions: 'Sessions actives',
      platformName: 'Nom de la plateforme',
      logo: 'Logo',
      theme: 'Theme',
    },
    errors: {
      required: 'Ce champ est requis',
      invalidEmail: 'Email invalide',
      invalidPhone: 'Numero de telephone invalide',
      passwordTooShort: 'Le mot de passe doit contenir au moins 8 caracteres',
      passwordMismatch: 'Les mots de passe ne correspondent pas',
      networkError: 'Erreur de connexion',
      unauthorized: 'Non autorise',
      forbidden: 'Acces interdit',
      notFound: 'Non trouve',
      serverError: 'Erreur serveur',
    },
    dates: {
      today: 'Aujourd\'hui',
      yesterday: 'Hier',
      tomorrow: 'Demain',
      thisWeek: 'Cette semaine',
      thisMonth: 'Ce mois',
      thisYear: 'Cette annee',
    },
  },
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      add: 'Add',
      search: 'Search',
      filter: 'Filter',
      all: 'All',
      loading: 'Loading...',
      noResults: 'No results',
      confirm: 'Confirm',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      yes: 'Yes',
      no: 'No',
      actions: 'Actions',
      status: 'Status',
      details: 'Details',
      view: 'View',
      export: 'Export',
      import: 'Import',
      refresh: 'Refresh',
      reset: 'Reset',
      submit: 'Submit',
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Information',
    },
    navigation: {
      dashboard: 'Dashboard',
      festivals: 'Festivals',
      users: 'Users',
      staff: 'Staff',
      zones: 'Zones',
      cashless: 'Cashless',
      payments: 'Payments',
      reports: 'Reports',
      notifications: 'Notifications',
      settings: 'Settings',
      logout: 'Logout',
      activity: 'Activity',
      exports: 'Exports',
      realtime: 'Real-time',
    },
    auth: {
      login: 'Login',
      logout: 'Logout',
      email: 'Email address',
      password: 'Password',
      forgotPassword: 'Forgot password?',
      rememberMe: 'Remember me',
      loginButton: 'Sign in',
      invalidCredentials: 'Invalid credentials',
    },
    dashboard: {
      title: 'Dashboard',
      welcome: 'Welcome',
      overview: 'Overview',
      totalRevenue: 'Total Revenue',
      ticketsSold: 'Tickets Sold',
      activeUsers: 'Active Users',
      activeFestivals: 'Active Festivals',
      recentActivity: 'Recent Activity',
      quickActions: 'Quick Actions',
      topFestivals: 'Top Festivals',
      salesOverview: 'Sales Overview',
    },
    festivals: {
      title: 'Festivals',
      create: 'New Festival',
      edit: 'Edit Festival',
      delete: 'Delete Festival',
      name: 'Festival Name',
      description: 'Description',
      startDate: 'Start Date',
      endDate: 'End Date',
      location: 'Location',
      address: 'Address',
      city: 'City',
      country: 'Country',
      capacity: 'Capacity',
      status: 'Status',
      draft: 'Draft',
      published: 'Published',
      ongoing: 'Ongoing',
      completed: 'Completed',
      cancelled: 'Cancelled',
      organizer: 'Organizer',
      website: 'Website',
      contactEmail: 'Contact Email',
      tickets: 'Tickets',
      lineup: 'Lineup',
      stages: 'Stages',
      vendors: 'Vendors',
      camping: 'Camping',
      stats: 'Statistics',
      noFestivals: 'No festivals found',
      confirmDelete: 'Are you sure you want to delete this festival?',
    },
    tickets: {
      title: 'Tickets',
      categories: 'Categories',
      createCategory: 'New Category',
      editCategory: 'Edit Category',
      categoryName: 'Category Name',
      price: 'Price',
      quantity: 'Quantity',
      available: 'Available',
      sold: 'Sold',
      startSale: 'Sale Start',
      endSale: 'Sale End',
      maxPerUser: 'Max Per User',
      description: 'Description',
      type: 'Type',
      standard: 'Standard',
      vip: 'VIP',
      backstage: 'Backstage',
      earlyBird: 'Early Bird',
      soldOut: 'Sold Out',
      onSale: 'On Sale',
      comingSoon: 'Coming Soon',
      ended: 'Sales Ended',
    },
    users: {
      title: 'Users',
      create: 'New User',
      edit: 'Edit User',
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      role: 'Role',
      status: 'Status',
      createdAt: 'Registration Date',
      lastLogin: 'Last Login',
      active: 'Active',
      inactive: 'Inactive',
      banned: 'Banned',
      verified: 'Verified',
      unverified: 'Unverified',
      admin: 'Administrator',
      organizer: 'Organizer',
      staffRole: 'Staff',
      cashier: 'Cashier',
      security: 'Security',
      user: 'User',
      ban: 'Ban',
      unban: 'Unban',
      confirmBan: 'Are you sure you want to ban this user?',
      confirmDelete: 'Are you sure you want to delete this user?',
    },
    staff: {
      title: 'Staff',
      create: 'New Member',
      edit: 'Edit Member',
      member: 'Member',
      role: 'Role',
      zone: 'Assigned Zone',
      permissions: 'Permissions',
      shifts: 'Shifts',
      checkIn: 'Check-in',
      hoursWorked: 'Hours Worked',
      schedule: 'Schedule',
      assignZone: 'Assign Zone',
      viewBadge: 'View Badge',
      downloadBadge: 'Download Badge',
      scanTickets: 'Scan Tickets',
      manageCashless: 'Manage Cashless',
      accessBackstage: 'Backstage Access',
      manageVendors: 'Manage Vendors',
    },
    zones: {
      title: 'Zones',
      create: 'New Zone',
      edit: 'Edit Zone',
      name: 'Zone Name',
      type: 'Type',
      accessLevel: 'Access Level',
      capacity: 'Capacity',
      currentOccupancy: 'Current Occupancy',
      entries: 'Entries',
      exits: 'Exits',
      mainStage: 'Main Stage',
      vipArea: 'VIP Area',
      backstage: 'Backstage',
      camping: 'Camping',
      foodCourt: 'Food Court',
      entrance: 'Entrance',
      medical: 'Medical',
      public: 'Public',
      restricted: 'Restricted',
      staffOnly: 'Staff Only',
    },
    cashless: {
      title: 'Cashless',
      accounts: 'Accounts',
      transactions: 'Transactions',
      balance: 'Balance',
      topup: 'Top Up',
      payment: 'Payment',
      transfer: 'Transfer',
      refund: 'Refund',
      nfcTag: 'NFC Tag',
      linkedNfc: 'Linked NFC',
      accountStatus: 'Account Status',
      totalTopups: 'Total Top-ups',
      totalSpent: 'Total Spent',
      averageTransaction: 'Average Transaction',
    },
    payments: {
      title: 'Payments',
      transactions: 'Transactions',
      amount: 'Amount',
      method: 'Method',
      status: 'Status',
      date: 'Date',
      pending: 'Pending',
      completed: 'Completed',
      failed: 'Failed',
      refunded: 'Refunded',
      card: 'Card',
      cash: 'Cash',
      stripe: 'Stripe',
      invoice: 'Invoice',
      receipt: 'Receipt',
    },
    reports: {
      title: 'Reports',
      generate: 'Generate',
      export: 'Export',
      period: 'Period',
      today: 'Today',
      yesterday: 'Yesterday',
      thisWeek: 'This Week',
      thisMonth: 'This Month',
      custom: 'Custom',
      revenue: 'Revenue',
      attendance: 'Attendance',
      sales: 'Sales',
      financial: 'Financial',
    },
    notifications: {
      title: 'Notifications',
      all: 'All',
      unread: 'Unread',
      read: 'Read',
      markAsRead: 'Mark as Read',
      markAllRead: 'Mark All as Read',
      noNotifications: 'No notifications',
      preferences: 'Preferences',
    },
    settings: {
      title: 'Settings',
      general: 'General',
      security: 'Security',
      api: 'API',
      notifications: 'Notifications',
      language: 'Language',
      timezone: 'Timezone',
      currency: 'Currency',
      changePassword: 'Change Password',
      twoFactor: 'Two-Factor Authentication',
      apiKeys: 'API Keys',
      webhooks: 'Webhooks',
      sessions: 'Active Sessions',
      platformName: 'Platform Name',
      logo: 'Logo',
      theme: 'Theme',
    },
    errors: {
      required: 'This field is required',
      invalidEmail: 'Invalid email',
      invalidPhone: 'Invalid phone number',
      passwordTooShort: 'Password must be at least 8 characters',
      passwordMismatch: 'Passwords do not match',
      networkError: 'Network error',
      unauthorized: 'Unauthorized',
      forbidden: 'Access forbidden',
      notFound: 'Not found',
      serverError: 'Server error',
    },
    dates: {
      today: 'Today',
      yesterday: 'Yesterday',
      tomorrow: 'Tomorrow',
      thisWeek: 'This week',
      thisMonth: 'This month',
      thisYear: 'This year',
    },
  },
};

export default translations;
