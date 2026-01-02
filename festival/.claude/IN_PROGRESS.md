# Tâches En Cours & À Faire

## Phases Complétées (34 agents - 2026-01-02)

Toutes les tâches des phases 0-7 ont été complétées avec succès.
Voir `.claude/DONE.md` pour le détail complet.

---

## Phase Performance Backend - COMPLETED (2026-01-03)

### Objectif: Optimiser les performances de l'API pour l'admin dashboard

**Problème:** L'admin (localhost:4300) est lent lors du chargement des users, staff, festivals.

#### Tâches complétées:
- [x] Implémenter le caching Redis pour les endpoints fréquents (GET /festivals, GET /users)
  - GET /festivals (cache 60s TTL)
  - GET /festivals/:id (cache 30s TTL)
  - GET /festivals/by-slug/:slug (cache 30s TTL)
  - GET /users (cache 30s TTL)
  - Cache invalidation sur POST, PUT, DELETE, PATCH
  - Tag-based invalidation (FESTIVAL, USER tags)
  - CacheInterceptor registered in FestivalsModule and UsersModule
  - Documentation complète: apps/api/REDIS_CACHING.md

#### Infrastructure de cache existante:
- Custom Redis cache service avec fallback in-memory
- Décorateurs: @Cacheable, @CacheEvict, @CachePut, @InvalidateTags
- CacheInterceptor pour handling automatique
- Support tags, TTL, distributed locking, statistics
- Déjà 30+ index composites Prisma (Phase Performance précédente)

#### Améliorations attendues:
- Temps de réponse < 100ms pour les listes paginées
- Cache Redis pour réduire la charge DB de 40-60%
- Support de 1000+ requêtes/seconde

#### Tâches restantes (optionnelles):
- [ ] Ajouter plus d'endpoints cachés (tickets, cashless, zones, etc.)
- [ ] Optimiser les requêtes Prisma (select specific fields, éviter N+1)
- [ ] Configurer le connection pooling PostgreSQL
- [ ] Cache warming on application startup

---

# ROADMAP FONCTIONNALITES PROFESSIONNELLES

## Analyse CTO/PO - Festival Platform (2026-01-02)

### Resume Executif

**Etat actuel:**
- 23 modules backend implementes
- Schema Prisma avec 40+ modeles
- Admin utilise mock data (pas connecte a l'API)
- 3 modules critiques sans controllers REST (bloquants)

**Problemes critiques:**
1. `tickets` - Service existe, pas de controller REST
2. `cashless` - Service existe, pas de controller REST, methode `transfer()` manquante
3. `notifications` - Service existe, pas de controller REST
4. Admin app non connectee a l'API backend

**Technologies cartographie:**
- Maps: **OpenStreetMap + Leaflet.js** (open source, pas de frais API)
- Localisation indoor: **Beacons BLE** ou **WiFi fingerprinting**

---

## Phase 1 - CRITIQUE: Controllers REST Manquants (Bloquant Production)

### 1.1 Tickets Controller
**Objectif:** Exposer les endpoints REST pour la billetterie
**Priorite:** CRITIQUE
**Fichier service existant:** `apps/api/src/modules/tickets/tickets.service.ts`

#### Backend (API NestJS)
- [ ] Creer `apps/api/src/modules/tickets/tickets.controller.ts`:
  ```
  POST   /api/tickets/buy           - Acheter des billets
  GET    /api/tickets/me            - Mes billets (user connecte)
  GET    /api/tickets/:id           - Detail d'un billet
  POST   /api/tickets/:id/validate  - Valider QR code (staff)
  POST   /api/tickets/:id/scan      - Scanner entree (staff)
  DELETE /api/tickets/:id           - Annuler billet
  GET    /api/tickets/:id/qr        - Telecharger QR code PNG
  ```
- [ ] Creer DTOs dans `apps/api/src/modules/tickets/dto/`:
  - `purchase-ticket.dto.ts` (festivalId, categoryId, quantity)
  - `validate-ticket.dto.ts` (qrCode)
  - `ticket-response.dto.ts` (entity serialization)
- [ ] Ajouter Guards: `@UseGuards(JwtAuthGuard)`, `@Roles('STAFF')` pour scan/validate
- [ ] Ajouter decorateurs Swagger: `@ApiTags('tickets')`, `@ApiBearerAuth()`
- [ ] Enregistrer controller dans `tickets.module.ts`

#### Tests
- [ ] Tests unitaires `tickets.controller.spec.ts`
- [ ] Tests E2E `tickets.e2e-spec.ts`

---

### 1.2 Cashless Controller + Transfer Method
**Objectif:** Exposer endpoints REST cashless + implementer transferts
**Priorite:** CRITIQUE
**Fichier service existant:** `apps/api/src/modules/cashless/cashless.service.ts`

#### Backend (API NestJS)
- [x] **IMPLEMENTER** methode `transfer()` dans `cashless.service.ts` - COMPLETED (2026-01-03):
  - Validation festival actif
  - Verification compte source (userId) avec solde suffisant
  - Verification compte destination (dto.toUserId) existe et actif
  - Prevention self-transfer
  - Verification max balance destination
  - Transaction Prisma atomique:
    - Create TRANSFER transaction pour source (debit, montant negatif)
    - Create TRANSFER transaction pour destination (credit, montant positif)
    - Mise a jour soldes des 2 comptes
  - Retourne nouveau solde source
  - Metadata avec transferType (OUTGOING/INCOMING) et userId references
- [ ] Creer `apps/api/src/modules/cashless/cashless.controller.ts`:
  ```
  POST   /api/cashless/account      - Creer/obtenir compte
  GET    /api/cashless/account      - Mon compte
  GET    /api/cashless/balance      - Mon solde
  POST   /api/cashless/topup        - Recharger (+ paiement)
  POST   /api/cashless/pay          - Payer (vendeur)
  POST   /api/cashless/refund       - Rembourser transaction
  POST   /api/cashless/transfer     - Transferer a un ami
  GET    /api/cashless/transactions - Historique
  POST   /api/cashless/link-nfc     - Associer bracelet NFC
  GET    /api/cashless/nfc/:tagId   - Trouver compte par NFC
  POST   /api/cashless/deactivate   - Desactiver compte
  POST   /api/cashless/reactivate   - Reactiver compte
  ```
- [ ] Enregistrer controller dans `cashless.module.ts`

#### Tests
- [ ] Tests unitaires pour `transfer()` method
- [ ] Tests E2E endpoints cashless

---

### 1.3 Notifications Controller - COMPLETED (2026-01-03)
**Objectif:** Exposer endpoints REST notifications
**Priorite:** CRITIQUE
**Fichiers service existants:** `apps/api/src/modules/notifications/services/`

#### Backend (API NestJS)
- [x] Creer `apps/api/src/modules/notifications/notifications.controller.ts`:
  ```
  GET    /api/notifications           - Liste mes notifications
  GET    /api/notifications/unread    - Nombre non lues
  POST   /api/notifications/:id/read  - Marquer comme lue
  POST   /api/notifications/read-all  - Tout marquer lu
  DELETE /api/notifications/:id       - Supprimer
  GET    /api/notifications/preferences    - Mes preferences
  PUT    /api/notifications/preferences    - Modifier preferences
  POST   /api/notifications/push-token     - Enregistrer token FCM/APNs
  DELETE /api/notifications/push-token/:token - Supprimer token
  ```
- [x] Enregistrer controller dans `notifications.module.ts`
- [x] Utilise JwtAuthGuard pour tous les endpoints
- [x] Utilise CurrentUser decorator pour extraire userId
- [x] Documentation Swagger complete (@ApiTags, @ApiBearerAuth, @ApiOperation, @ApiResponse)
- [x] DTOs existants reutilises (GetNotificationsQueryDto, UpdateNotificationPreferencesDto, RegisterPushTokenDto)

---

## Phase 2 - HAUTE: Integration API dans Admin (COMPLETED 2026-01-02)

### 2.1 Client API et Hooks React Query
**Objectif:** Connecter l'admin a l'API backend
**Priorite:** HAUTE
**Impact:** Toutes les pages admin

#### Frontend Admin - Infrastructure
- [x] Creer `apps/admin/lib/api-client.ts`:
  - Axios client avec baseURL configurable (NEXT_PUBLIC_API_URL ou localhost:3333/api)
  - Interceptor requete: ajoute Authorization header (Bearer token)
  - Interceptor reponse: gestion 401 et refresh token automatique
  - Queue des requetes pendant refresh pour eviter race conditions
  - Token manager pour localStorage (access_token, refresh_token)
  - Error handling global avec messages detailles
- [x] Creer `apps/admin/lib/api/festivals.ts` - API Festivals:
  - getFestivals(params), getFestival(id), getFestivalBySlug(slug)
  - createFestival(data), updateFestival(id, data), deleteFestival(id)
  - publishFestival(id), cancelFestival(id), getFestivalStats(id)
- [x] Creer `apps/admin/lib/api/tickets.ts` - API Tickets:
  - getTicketCategories(festivalId), createCategory(festivalId, data)
  - updateCategory(id, data), deleteCategory(id)
  - getTickets(festivalId, params), validateTicket(id), cancelTicket(id)
- [x] Creer `apps/admin/lib/api/users.ts` - API Users:
  - getUsers(params), getUser(id), createUser(data)
  - updateUser(id, data), deleteUser(id)
  - banUser(id), unbanUser(id), changeUserRole(id, role)
- [x] Creer `apps/admin/lib/api/program.ts` - API Program:
  - getArtists(params), createArtist(data), updateArtist(id, data), deleteArtist(id)
  - getStages(festivalId), createStage(festivalId, data), updateStage(id, data), deleteStage(id)
  - getLineup(festivalId), createPerformance(festivalId, data)
- [x] Creer `apps/admin/lib/api/camping.ts` - API Camping Zones
- [x] Creer `apps/admin/lib/api/vendors.ts` - API Vendors
- [x] Creer `apps/admin/lib/api/pois.ts` - API Points of Interest
- [x] Creer `apps/admin/lib/api/index.ts` - Export toutes les fonctions API
- [x] Installer React Query: `npm install @tanstack/react-query` (deja installe)
- [x] Creer `apps/admin/providers/QueryProvider.tsx` - QueryClient avec staleTime: 5 min, retry: 1
- [x] Ajouter QueryProvider dans `app/layout.tsx`

#### Frontend Admin - Hooks par Module (COMPLETED 2026-01-02)
- [x] `hooks/api/useFestivals.ts`:
  - `useFestivals()` - Liste avec pagination/filtres
  - `useFestival(id)` - Detail festival
  - `useFestivalStats(id)` - Stats festival
  - `useCreateFestival()` - Mutation creation
  - `useUpdateFestival()` - Mutation modification
  - `useDeleteFestival()` - Mutation suppression
- [x] `hooks/api/useTicketCategories.ts`:
  - `useTicketCategories(festivalId)` - Categories du festival
  - `useCreateCategory()`, `useUpdateCategory()`, `useDeleteCategory()`
- [x] `hooks/api/useUsers.ts`:
  - `useUsers()` - Liste utilisateurs
  - `useUser(id)` - Detail utilisateur
  - `useCreateUser()` - Creation avec CreateUserData
  - `useUpdateUser()` - Modification avec UpdateUserData
  - `useBanUser()`, `useUnbanUser()` - Gestion statut utilisateur
  - `useDeleteUser()` - Suppression utilisateur
- [x] `hooks/api/useProgram.ts`:
  - Artists: `useArtists()`, `useArtist(id)`, `useArtistsByFestival(id)`, `useArtistGenres()`
  - Artists mutations: `useCreateArtist()`, `useUpdateArtist()`, `useDeleteArtist()`
  - Stages: `useStages(festivalId)`, `useStage(id)`
  - Stages mutations: `useCreateStage()`, `useUpdateStage()`, `useDeleteStage()`
  - Lineup: `useLineup(festivalId)`, `usePerformance(id)`
  - Lineup mutations: `useCreatePerformance(festivalId)`, `useUpdatePerformance()`, `useDeletePerformance()`, `useCancelPerformance()`
- [x] `hooks/api/useCamping.ts`:
  - `useCampingZones(festivalId)` - Zones camping du festival
  - `useCreateCampingZone()`, `useUpdateCampingZone()`, `useDeleteCampingZone()`
- [x] `hooks/api/useVendors.ts`:
  - `useVendors(festivalId)` - Vendeurs du festival
  - `useCreateVendor()`, `useUpdateVendor()`, `useDeleteVendor()`, `useToggleVendorOpen()`
- [x] `hooks/api/usePois.ts`:
  - `usePois(festivalId)` - Points d'interet du festival
  - `useCreatePoi()`, `useUpdatePoi()`, `useDeletePoi()`, `useTogglePoiActive()`
- [x] `hooks/api/index.ts` - Export centralisé de tous les hooks API

#### Frontend Admin - Refactoring Pages (COMPLETED 2026-01-02)
- [x] `app/festivals/page.tsx` - Connected to `useFestivals()`
- [x] `app/festivals/[id]/page.tsx` - Connected to `useFestival(id)`
- [x] `app/festivals/[id]/tickets/page.tsx` - Connected to `useTicketCategories()`
- [x] `app/festivals/[id]/lineup/page.tsx` - Connected to `useArtists()`, `useLineup()`
- [x] `app/festivals/[id]/stages/page.tsx` - Connected to `useStages()`
- [x] `app/festivals/[id]/vendors/page.tsx` - Connected to `useVendors()`
- [x] `app/festivals/[id]/camping/page.tsx` - Connected to `useCampingZones()`
- [x] `app/festivals/[id]/pois/page.tsx` - Connected to `usePois()`
- [x] `app/users/page.tsx` - Connected to `useUsers()`

---

## Phase 3 - HAUTE: Module Programme/Artistes

### 3.1 Program Module Backend - COMPLETED (2026-01-02)
**Objectif:** API complete pour gestion programme artistique
**Priorite:** HAUTE
**Schema Prisma existant:** `Artist`, `Stage`, `Performance`

#### Backend (API NestJS) - DONE
- [x] Creer module `apps/api/src/modules/program/`
- [x] Creer `program.service.ts`:
  ```typescript
  // Artistes
  createArtist(festivalId, dto): Artist
  getArtists(festivalId, filters): Artist[]
  getArtist(id): Artist
  updateArtist(id, dto): Artist
  deleteArtist(id): void

  // Scenes
  createStage(festivalId, dto): Stage
  getStages(festivalId): Stage[]
  updateStage(id, dto): Stage
  deleteStage(id): void

  // Performances (programmation)
  schedulePerformance(dto): Performance
  getPerformances(festivalId, filters): Performance[]
  updatePerformance(id, dto): Performance
  cancelPerformance(id, reason): Performance // + notification

  // Programme
  getProgram(festivalId): FullProgram
  getProgramByDay(festivalId, date): DayProgram
  getProgramByStage(festivalId, stageId): StageProgram
  detectConflicts(festivalId): Conflict[]

  // Favoris utilisateur
  addFavoriteArtist(userId, artistId): void
  removeFavoriteArtist(userId, artistId): void
  getFavoriteArtists(userId): Artist[]
  ```
- [x] Creer `program.controller.ts`:
  ```
  GET    /artists                        - Liste tous les artistes
  POST   /artists                        - Creer artiste (ADMIN/ORGANIZER)
  GET    /artists/genres                 - Liste genres uniques
  GET    /artists/:id                    - Detail artiste
  PUT    /artists/:id                    - Modifier artiste
  DELETE /artists/:id                    - Supprimer artiste

  GET    /festivals/:id/stages           - Scenes du festival
  POST   /festivals/:id/stages           - Ajouter scene
  GET    /stages/:id                     - Detail scene avec performances
  PUT    /stages/:id                     - Modifier scene
  DELETE /stages/:id                     - Supprimer scene

  GET    /festivals/:id/lineup           - Programme du festival (filtrable)
  GET    /festivals/:id/artists          - Artistes du festival
  POST   /festivals/:id/performances     - Programmer performance
  GET    /performances/:id               - Detail performance
  PUT    /performances/:id               - Modifier performance
  DELETE /performances/:id               - Supprimer performance
  PATCH  /performances/:id/cancel        - Annuler (soft delete)
  ```
- [x] DTOs: `create-artist.dto.ts`, `update-artist.dto.ts`, `create-stage.dto.ts`, `update-stage.dto.ts`, `create-performance.dto.ts`, `update-performance.dto.ts`, `query-program.dto.ts`
- [x] Enregistrer module dans `app.module.ts`

#### Frontend Admin
- [ ] Ameliorer `app/festivals/[id]/lineup/page.tsx`:
  - Connecter a l'API au lieu de mock
  - Ajouter gestion des scenes
  - Vue timeline drag & drop
  - Detection conflits horaires
- [ ] Creer `app/festivals/[id]/stages/page.tsx` - Gestion scenes

#### Frontend Web
- [ ] Creer `app/festivals/[slug]/program/page.tsx` - Programme public
- [ ] Creer composant `ProgramTimeline` - Vue timeline interactive
- [ ] Ajouter bouton "Ajouter aux favoris" sur artistes

#### Mobile
- [ ] Ecran `ProgramScreen` - Programme du festival
- [ ] Composant `ArtistCard` avec bouton favori
- [ ] Notifications push rappel avant artiste favori

---

## Phase 4 - MOYENNE: Nouveaux Modules Metier

### 4.1 Transport Module (NOUVEAU)
**Objectif:** Gestion navettes, parking, covoiturage
**Priorite:** MOYENNE
**Maps:** OpenStreetMap + Leaflet.js

#### Schema Prisma (ajouter dans schema.prisma)
```prisma
enum TransportType {
  SHUTTLE
  PARKING
  CARPOOL
}

model ParkingLot {
  id          String   @id @default(uuid())
  festivalId  String
  name        String
  type        String   // standard, vip, rv, disabled
  capacity    Int
  pricePerDay Decimal  @db.Decimal(10, 2)
  latitude    Float?
  longitude   Float?
  isActive    Boolean  @default(true)
  festival    Festival @relation(fields: [festivalId], references: [id])
  spots       ParkingSpot[]
}

model ParkingSpot {
  id           String   @id @default(uuid())
  lotId        String
  number       String
  status       String   @default("available")
  vehiclePlate String?
  reservedBy   String?
  validFrom    DateTime?
  validUntil   DateTime?
  lot          ParkingLot @relation(fields: [lotId], references: [id])
}

model ShuttleRoute {
  id          String   @id @default(uuid())
  festivalId  String
  name        String
  description String?
  stops       Json     // [{name, lat, lng, arrivalOffset}]
  frequency   Int      // minutes
  startTime   DateTime
  endTime     DateTime
  isActive    Boolean  @default(true)
  festival    Festival @relation(fields: [festivalId], references: [id])
  schedules   ShuttleSchedule[]
}

model ShuttleSchedule {
  id            String   @id @default(uuid())
  routeId       String
  departureTime DateTime
  status        String   @default("SCHEDULED")
  vehicleId     String?
  driverName    String?
  capacity      Int
  bookedSeats   Int      @default(0)
  route         ShuttleRoute @relation(fields: [routeId], references: [id])
  bookings      ShuttleBooking[]
}

model ShuttleBooking {
  id          String   @id @default(uuid())
  scheduleId  String
  userId      String
  seats       Int
  pickupStop  String
  dropoffStop String
  status      String   @default("CONFIRMED")
  qrCode      String   @unique
  bookedAt    DateTime @default(now())
  schedule    ShuttleSchedule @relation(fields: [scheduleId], references: [id])
  user        User @relation(fields: [userId], references: [id])
}
```

#### Backend
- [ ] Creer module `apps/api/src/modules/transport/`
- [ ] Services: `parking.service.ts`, `shuttle.service.ts`
- [ ] Controller avec endpoints CRUD + reservations
- [ ] Integration paiement pour parking

#### Frontend Admin
- [ ] Page `app/festivals/[id]/transport/page.tsx` - Dashboard transport
- [ ] Page `app/festivals/[id]/parking/page.tsx` - Gestion parking
- [ ] Page `app/festivals/[id]/shuttles/page.tsx` - Gestion navettes
- [ ] Composant carte Leaflet avec emplacements

#### Frontend Web/Mobile
- [ ] Page reservation parking
- [ ] Page reservation navette
- [ ] Carte interactive avec arrets

---

### 4.2 Security/Incidents Module (NOUVEAU)
**Objectif:** Gestion securite, incidents, alertes temps reel
**Priorite:** MOYENNE

#### Schema Prisma
```prisma
enum IncidentSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum IncidentStatus {
  REPORTED
  ASSIGNED
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum IncidentType {
  MEDICAL
  THEFT
  ASSAULT
  DISTURBANCE
  LOST_PERSON
  FIRE
  EQUIPMENT_FAILURE
  CROWD_CONTROL
  OTHER
}

model SecurityIncident {
  id             String   @id @default(uuid())
  festivalId     String
  incidentNumber String   @unique
  type           IncidentType
  severity       IncidentSeverity
  status         IncidentStatus @default(REPORTED)
  title          String
  description    String   @db.Text
  location       String?
  latitude       Float?
  longitude      Float?
  zoneId         String?
  reportedBy     String   // staffId
  assignedTo     String?  // staffId
  resolvedAt     DateTime?
  resolution     String?  @db.Text
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  festival       Festival @relation(fields: [festivalId], references: [id])
  zone           Zone?    @relation(fields: [zoneId], references: [id])
  logs           IncidentLog[]
}

model IncidentLog {
  id          String   @id @default(uuid())
  incidentId  String
  action      String
  notes       String?
  performedBy String
  createdAt   DateTime @default(now())
  incident    SecurityIncident @relation(fields: [incidentId], references: [id])
}

model SecurityAlert {
  id          String   @id @default(uuid())
  festivalId  String
  type        String   // capacity, weather, security, medical
  severity    IncidentSeverity
  title       String
  message     String
  zones       String[] // zone IDs affectees
  isActive    Boolean  @default(true)
  expiresAt   DateTime?
  createdBy   String
  createdAt   DateTime @default(now())
  festival    Festival @relation(fields: [festivalId], references: [id])
}
```

#### Backend
- [ ] Module `apps/api/src/modules/security/`
- [ ] Service avec CRUD incidents, alertes, stats
- [ ] WebSocket gateway pour alertes temps reel
- [ ] Integration push notifications

#### Frontend Admin
- [ ] Page `app/festivals/[id]/security/page.tsx` - Dashboard securite
- [ ] Page `app/festivals/[id]/incidents/page.tsx` - Liste incidents
- [ ] Carte Leaflet avec incidents geolocalisés
- [ ] Systeme d'alerte broadcast

#### Mobile (Staff Security)
- [ ] Ecran signalement incident rapide
- [ ] Notifications push alertes

---

### 4.3 Promo Codes Module (NOUVEAU)
**Objectif:** Codes promo et reductions billetterie
**Priorite:** MOYENNE

#### Schema Prisma
```prisma
enum PromoCodeType {
  PERCENTAGE
  FIXED_AMOUNT
  FREE_TICKET
}

model PromoCode {
  id                String   @id @default(uuid())
  festivalId        String
  code              String   @unique
  type              PromoCodeType
  value             Decimal  @db.Decimal(10, 2)
  maxUses           Int?     // null = illimite
  usedCount         Int      @default(0)
  maxUsesPerUser    Int      @default(1)
  minPurchaseAmount Decimal? @db.Decimal(10, 2)
  validFrom         DateTime
  validUntil        DateTime
  ticketCategoryIds String[] // categories applicables
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  festival          Festival @relation(fields: [festivalId], references: [id])
  usages            PromoCodeUsage[]
}

model PromoCodeUsage {
  id          String   @id @default(uuid())
  promoCodeId String
  userId      String
  orderId     String?
  discount    Decimal  @db.Decimal(10, 2)
  usedAt      DateTime @default(now())
  promoCode   PromoCode @relation(fields: [promoCodeId], references: [id])
}
```

#### Backend
- [ ] Module `apps/api/src/modules/promo/`
- [ ] Service: validation, application, stats
- [ ] Integration dans checkout tickets

#### Frontend Admin
- [ ] Page `app/festivals/[id]/promo/page.tsx` - Gestion codes promo

---

### 4.4 Communication/Campaigns Module (NOUVEAU)
**Objectif:** Campagnes email/SMS/push, annonces
**Priorite:** MOYENNE

#### Schema Prisma
```prisma
enum CampaignType {
  EMAIL
  SMS
  PUSH
  IN_APP
}

enum CampaignStatus {
  DRAFT
  SCHEDULED
  SENDING
  SENT
  CANCELLED
}

model Campaign {
  id           String   @id @default(uuid())
  festivalId   String?
  name         String
  type         CampaignType
  subject      String?
  content      String   @db.Text
  status       CampaignStatus @default(DRAFT)
  scheduledFor DateTime?
  sentAt       DateTime?
  targetRoles  String[]
  targetTicketTypes String[]
  sentCount    Int      @default(0)
  openedCount  Int      @default(0)
  createdBy    String
  createdAt    DateTime @default(now())
  festival     Festival? @relation(fields: [festivalId], references: [id])
}

model Announcement {
  id          String   @id @default(uuid())
  festivalId  String
  title       String
  content     String   @db.Text
  priority    String   @default("MEDIUM")
  isPinned    Boolean  @default(false)
  showUntil   DateTime?
  createdBy   String
  createdAt   DateTime @default(now())
  festival    Festival @relation(fields: [festivalId], references: [id])
}
```

#### Backend
- [ ] Module `apps/api/src/modules/communication/`
- [ ] Integration Twilio pour SMS
- [ ] Queue BullMQ pour envoi asynchrone

#### Frontend Admin
- [ ] Page `app/festivals/[id]/communication/page.tsx`
- [ ] Editeur campagne avec selection audience

---

## Phase 5 - Cartes et Localisation (OpenStreetMap)

### 5.1 Integration Leaflet.js
**Objectif:** Cartes interactives open source
**Priorite:** MOYENNE

#### Installation
```bash
npm install leaflet react-leaflet @types/leaflet
```

#### Composants a creer
- [ ] `components/maps/FestivalMap.tsx` - Carte festival avec zones
- [ ] `components/maps/IncidentMap.tsx` - Carte incidents temps reel
- [ ] `components/maps/ParkingMap.tsx` - Carte parkings
- [ ] `components/maps/ShuttleMap.tsx` - Carte navettes avec trajets
- [ ] `components/maps/LocationPicker.tsx` - Selection position

#### Pages avec cartes
- [ ] Admin: `/festivals/[id]/map` - Configuration carte festival
- [ ] Web: `/festivals/[slug]/map` - Carte publique interactive
- [ ] Mobile: Ecran carte avec position GPS

---

## Phase 6 - Corrections TypeScript/Build

### Issues documentes a resoudre
- [ ] Payments: Mettre a jour Stripe apiVersion
- [ ] Analytics: Enregistrer controller dans module
- [ ] Analytics: Fix duplicate functions
- [ ] Shared/validation: Installer `zod`
- [ ] Shared/utils: Fix types DOM dans file.utils.ts

---

## Ordre d'Implementation Recommande

1. **Semaine 1-2:** Phase 1 (Controllers REST critiques)
2. **Semaine 3-4:** Phase 2 (Integration API Admin)
3. **Semaine 5-6:** Phase 3 (Module Programme)
4. **Semaine 7-8:** Phase 4.1-4.2 (Transport, Security)
5. **Semaine 9-10:** Phase 4.3-4.4 (Promo, Communication)
6. **Semaine 11:** Phase 5 (Cartes Leaflet)
7. **Continu:** Phase 6 (Corrections)

---

## Corrections Build (2026-01-02)

### Fix Build API - COMPLETED
- [x] Migration de webpack vers SWC pour le build de l'API
- [x] Configuration .swcrc avec support decorateurs NestJS
- [x] Correction chemins imports PrismaService (users, zones)
- [x] Correction exports types dans bulk operations
- [x] Installation @swc/cli et @nx/esbuild

### Problèmes Restants (Non Critiques)
- [x] Erreurs TypeScript mineures (constantes manquantes dans ErrorCodes) - FIXED 2026-01-02
- [x] Configuration EventEmitterModule dans SupportModule - FIXED 2026-01-02
- [x] Import paths notifications services - FIXED 2026-01-02

### QA Review: Festivals Module (2026-01-02) - COMPLETED
**Path:** `apps/api/src/modules/festivals/`

- [x] **CRITICAL:** Create `festivals.service.ts` with Prisma CRUD operations - DONE
  - Service includes: create, findAll, findOne, findBySlug, update, remove, getStats, publish, cancel
  - PrismaService injected for database operations
  - Proper error handling with NotFoundException, BadRequestException, ConflictException
- [x] **FIX:** Register FestivalsService in `festivals.module.ts` providers array - DONE
- [x] **FIX:** Add FestivalsService to module exports - DONE
- [x] **FIX:** Export FestivalsService from index.ts - DONE
- [ ] **TODO:** Update controller methods to inject and use FestivalsService instead of mock data

### Fix Build Admin App - COMPLETED (2026-01-02)
Build command: `NODE_ENV=production npx nx build admin`

- [x] **Erreur #1 - FIXED:** reports/page.tsx:450 corrige avec `(percent ?? 0)`
- [x] **Erreur #2 - FIXED:** hooks/useRealTimeData.ts:245 - Corrige avec `return;` au lieu de `return undefined;`

### Fix ESLint CI - COMPLETED (2026-01-02)
- [x] Configuration ESLint projet-specifique pour admin, api, mobile, shared libs
- [x] Ignores pour .next, node_modules, fichiers generes
- [x] Fix erreurs mobile (JSX syntax, fonctions vides, case declarations)
- [x] Fix admin auth-context catch inutile
- [x] Fix API custom-reports case block declarations

---

## Tests UI/UX - Boutons et Formulaires (2026-01-02)

### Admin App CRUD Fixes - COMPLETED (2026-01-02)

**Page Festivals:** - FIXED
- [x] Bouton "Nouveau festival" - creation fonctionne (local state management)
- [x] Bouton "Modifier" sur chaque festival - edition fonctionne
- [x] Bouton "Supprimer" - suppression avec confirmation
- [x] Filtres de recherche fonctionnels

**Page Tickets:** - FIXED
- [x] Bouton "Nouvelle categorie" - creation de categorie (fixed form ID, closeModal helper)
- [x] Bouton "Modifier categorie" - edition
- [x] Bouton "Supprimer categorie" - suppression

**Page Utilisateurs:** - FIXED
- [x] Bouton "Nouvel utilisateur" - creation
- [x] Bouton "Modifier" - edition
- [x] Bouton "Supprimer" - suppression avec confirmation (deleteUser function ajoutee)
- [x] Filtres de role fonctionnels

**Page Staff:** - FIXED
- [x] Bouton "Nouveau staff" - creation (submit button moved inside form)
- [x] Bouton "Modifier permissions" - edition
- [x] Bouton "Supprimer" - suppression

**Page Zones:** - FIXED
- [x] Bouton "Nouvelle zone" - creation
- [x] Bouton "Modifier" - edition
- [x] Bouton "Supprimer" - suppression
- [x] Stats using localZones instead of mockZones

**Page Cashless:**
- [ ] Bouton "Recharger" - topup compte
- [ ] Bouton "Transferer" - transfert entre comptes
- [ ] Bouton "Historique" - affichage transactions

**Page Parametres:**
- [ ] Bouton "Copier" API keys
- [ ] Bouton "Regenerer" API keys
- [ ] Bouton "2FA" configuration
- [ ] Bouton "Deconnexion sessions"
- [ ] Bouton "Changer logo"
- [ ] Formulaire changement mot de passe

**Page Rapports:**
- [ ] Bouton "Exporter CSV"
- [ ] Bouton "Exporter Excel"
- [ ] Bouton "Exporter PDF"
- [ ] Filtres de date fonctionnels

### Web App (localhost:4200) - TO TEST

**Page Auth:**
- [ ] Formulaire connexion - validation + soumission
- [ ] Formulaire inscription - validation + soumission
- [ ] Boutons OAuth (Google, GitHub) - affiche message "coming soon"
- [ ] Lien "Mot de passe oublie"

**Page Festivals:**
- [ ] Filtres de recherche
- [ ] Bouton "Acheter billets"
- [ ] Bouton "Voir details"
- [ ] Bouton "Programme"

**Page Compte:**
- [ ] Formulaire modification profil
- [ ] Bouton "Modifier mot de passe"
- [ ] Bouton "Deconnexion"

**Page Billets:**
- [ ] Bouton "Telecharger QR code"
- [ ] Bouton "Annuler billet" (si applicable)

**Page Cashless:**
- [ ] Bouton "Recharger"
- [ ] Bouton "Historique"

---

## Prochaines Phases Disponibles

### Phase Mobile Avancée (2026-01-02) - COMPLETED
- [x] Mode offline complet avec sync (DataSyncService)
- [x] Scan NFC pour cashless (NFCCashlessService)
- [x] Géolocalisation indoor (useIndoorLocation)
- [x] Apple Wallet / Google Wallet (useWallet)

### Phase IA
- [ ] Service Python IA
- [ ] Prévision affluence
- [ ] Détection fraude
- [ ] Chatbot NLP
- [ ] Recommandations artistes

### Phase Scale (2026-01-02) - COMPLETED
- [x] Kubernetes configs (base + overlays dev/staging/prod)
- [x] Docker multi-stage builds optimises
- [x] Kustomize overlays pour environnements
- [x] Auto-scaling AWS (HPA deja configure)
- [x] CDN pour assets (CloudFront + S3, cache policies, security headers)
- [x] Database replication (PostgreSQL master/replica, HAProxy, Patroni HA)
- [x] Redis cluster configuration (6 nodes, 3 masters + 3 replicas)
- [x] Load balancer configuration (AWS ALB/NLB, NGINX Ingress optimized)

### Phase Performance (2026-01-02) - COMPLETED
- [x] Optimisation indexes Prisma (30+ nouveaux index composite)
- [x] Service Cache Redis avance (strategies, tags, invalidation)
- [x] Module Monitoring Prometheus (metriques custom business)
- [x] Utilitaires pagination avances (cursor, keyset, batch)
- [x] Scripts load testing (TypeScript + k6)

### Phase Sécurité Avancée - COMPLETED
- [x] Security middleware (CSRF, XSS, sanitization)
- [x] Password validator (OWASP compliant)
- [x] Input sanitization validators
- [x] Secrets management documentation
- [x] Pen testing documentation (docs/security/PENETRATION_TESTING.md)
- [x] WAF configuration (docs/security/WAF_CONFIGURATION.md - 2200+ lines)
- [x] DDoS protection (docs/security/DDOS_PROTECTION.md - 1500+ lines)
- [x] Secrets rotation automation (docs/security/SECRETS_ROTATION.md - 1800+ lines)

### Phase Compliance - COMPLETED
- [x] GDPR audit complet (docs/security/GDPR_AUDIT.md)
- [x] Secrets documentation (docs/security/SECRETS.md)
- [x] PCI-DSS documentation (docs/security/PCI_DSS_COMPLIANCE.md)
- [x] SOC 2 preparation (docs/security/SOC2_PREPARATION.md)
- [x] Data Processing Agreement (docs/legal/DATA_PROCESSING_AGREEMENT.md)
- [x] Subprocessor list (docs/legal/SUBPROCESSORS.md)

### Phase Tests & QA (2026-01-02) - COMPLETED
- [x] Prisma mocks (prisma.mock.ts avec jest-mock-extended)
- [x] Test fixtures (users, festivals, tickets)
- [x] Unit tests auth.service.spec.ts
- [x] Unit tests tickets.service.spec.ts (99% coverage)
- [x] Unit tests cashless.service.spec.ts
- [x] Unit tests payments.service.spec.ts
- [x] E2E tests auth.e2e-spec.ts
- [x] E2E tests tickets.e2e-spec.ts
- [x] E2E tests cashless.e2e-spec.ts
- [x] Jest configuration with ts-node and jest-environment-jsdom
- [x] Fixed Jest mocks for uuid, qrcode, and Stripe modules
- [x] Fixed ConfigService mocks to persist after clearAllMocks
- [x] All 138 API tests passing

### Phase Build Web App (2026-01-02) - COMPLETED
- [x] Restructuration web app (app directory a la racine)
- [x] Correction NODE_ENV pour build via Nx
- [x] Scripts npm build:web, build:admin avec NODE_ENV=production
- [x] Validation Docker-compose config

### QA Verification Web App (2026-01-02) - PASSED
- [x] Build verification: `npx nx build web --skip-nx-cache` - SUCCESS
  - Compiled successfully in 880ms
  - All 8 pages generated (static + dynamic)
  - TypeScript type check: PASSED (no errors)
  - Standalone output created successfully
- [x] Next.js configuration: Valid (standalone output enabled)
- [x] Project.json configuration: Correct (@nx/next:build executor)
- [x] tsconfig.json: Valid (strict mode, bundler resolution)
- Routes verified:
  - `/` (static) - Home page
  - `/auth/login`, `/auth/register` (static) - Authentication
  - `/festivals`, `/festivals/[slug]`, `/festivals/[slug]/tickets` (dynamic)
  - `/account`, `/account/orders`, `/account/tickets` (dynamic)
  - `/api/health`, `/api/hello` (API routes)

### Phase CI/CD Avancee (2026-01-02) - COMPLETED
- [x] ci.yml ameliore avec matrix builds (Node 18/20, Ubuntu/macOS)
- [x] Caching avance (node_modules, NX, Prisma, Docker layers)
- [x] deploy-staging.yml - Deploiement automatique staging
- [x] deploy-production.yml - Deploiement production avec approval gates
- [x] mobile-build.yml - Build iOS/Android complet avec EAS
- [x] database-migration.yml - Workflow migrations Prisma

---

## Stats Projet Actuel

| Métrique | Valeur |
|----------|--------|
| Fichiers créés | 825+ |
| Lignes de code | 162,000+ |
| Modules backend | 25+ |
| Composants frontend | 50+ |
| Écrans mobile | 15+ |
| Templates email | 10+ |
| Templates PDF | 8 |
| Tests | 138+ passing |
| Traductions | 1000+ |
| Workflows CI/CD | 10+ |

### Phase Frontend UX Avancee (2026-01-02) - COMPLETED
- [x] Animations et transitions CSS avancees (animations.css - 50+ keyframes)
- [x] Composants animes React (AnimatedComponents.tsx - 15+ composants)
- [x] Recherche avancee festivals (FestivalSearch.tsx - suggestions, filtres, keyboard nav)
- [x] Systeme de filtres complet (FestivalFilters.tsx - genres, prix, dates, location)
- [x] Calendrier evenements (EventCalendar.tsx - vues mois/semaine/jour/liste)
- [x] Composants accessibles (AccessibleComponents.tsx - ARIA, focus trap, screen reader)
- [x] Hooks debounce/throttle (useDebounce.ts)

---
Derniere mise a jour: 2026-01-02 - Phase Scale Infrastructure (CDN, Database replication, Redis cluster, Load balancer)

### Phase Error Handling & Logging (2026-01-02) - COMPLETED
- [x] HttpExceptionFilter - Filtre global pour HttpException
- [x] AllExceptionsFilter - Filtre global pour erreurs non-HTTP et Prisma
- [x] ValidationExceptionFilter - Filtre specialise class-validator avec i18n
- [x] Custom exceptions metier: staff, camping, program
- [x] 60+ nouveaux codes d'erreur standardises (12xxx-17xxx)
- [x] Messages d'erreur FR/EN pour tous les codes
- [x] ErrorLoggerService - Logging structure avec stats
- [x] RetryService - Retry exponential backoff avec jitter
- [x] RetryPresets - Configurations pre-faites (database, API, payment, email)

### Phase API Backend Advanced (2026-01-02) - COMPLETED
- [x] Intercepteur de compression gzip/brotli/deflate
- [x] Systeme de versioning API (v1, v2) avec decorateurs
- [x] Endpoints bulk operations avec batch processing
- [x] Module file d'attente BullMQ (12 queues specialisees)
- [x] Validateurs DTO avances (15+ validators custom)

### Phase Payments Avancee (2026-01-02) - COMPLETED
- [x] Checkout Sessions Stripe (CreateCheckoutSessionDto, CheckoutService)
- [x] Support Stripe Connect pour vendeurs (StripeConnectService)
- [x] Subscriptions pour pass saison (SubscriptionService)
- [x] Paiements recurrents (products, prices, subscriptions)
- [x] Gestion avancee des remboursements (RefundService, eligibility, bulk)
- [x] Webhooks complets (payment, checkout, subscription, refund events)
- [x] Controller REST complet (PaymentsController)
- [x] DTOs complets (checkout, connect, subscription, refund)

---
Derniere mise a jour: 2026-01-02 - Phase Payments Avancee (Stripe Checkout, Connect, Subscriptions, Refunds)

### Phase Analytics Avancee (2026-01-02) - COMPLETED
- [x] Service metriques avancees (AdvancedMetricsService - revenue, customers, performance, fraud, growth)
- [x] Metriques staff, environnement et securite
- [x] Forecasting avec regression lineaire
- [x] Service rapports personnalises (CustomReportsService - creation, execution, comparaison)
- [x] Analyse de cohortes (acquisition_date, ticket_type, first_purchase)
- [x] Analyse funnel (purchase, entry, cashless)
- [x] Detection d'anomalies avec z-score
- [x] Benchmarks industrie
- [x] Service agregations temps reel (RealtimeAggregationService)
- [x] Buffers in-memory pour metriques streaming
- [x] Multiple window sizes (1m, 5m, 15m, 1h)
- [x] Compteurs live (ventes, revenus, attendance, cashless, vendors)
- [x] Service export (ExportService - CSV, JSON, PDF, XLSX)
- [x] Export donnees: ventes, cashless, attendance, vendors
- [x] Rapport financier comptable
- [x] Rapport analytique complet
- [x] Service dashboards (DashboardConfigService)
- [x] 10 templates pre-configures (executive, operations, finance, security, marketing, realtime, vendor, staff, attendance, cashless)
- [x] 10 types de widgets (KPI, charts, tables, maps, gauges, alerts)
- [x] Controller REST complet (AnalyticsController - 50+ endpoints)

### Phase Admin Dashboard Avancee (2026-01-02) - COMPLETED
- [x] Page rapports avancee (Recharts - 10+ types de graphiques)
- [x] Systeme export CSV/Excel/JSON (ExportButton, export.ts)
- [x] Page centre d'export avec categories
- [x] Tableau de bord temps reel WebSocket (useWebSocket, useRealTimeData)
- [x] Page realtime avec alertes et transactions live
- [x] Centre de notifications admin (NotificationCenter)
- [x] Page notifications avec preferences et filtres
- [x] Systeme de logs d'activite (activity logs page)
- [x] Filtres avances et export pour audit

### Phase Monitoring Avancee (2026-01-02) - COMPLETED
- [x] Regles d'alertes Prometheus (alerts.yml - 40+ alertes)
  - Infrastructure (memory, uptime, instance health)
  - HTTP/API (error rates, latency, traffic anomalies)
  - Database (errors, slow queries, load)
  - Cache (hit rate, keys)
  - Business (tickets, payments, cashless, zones, vendors)
  - SLA (availability, response time, payment success)
- [x] Recording rules Prometheus (recording_rules.yml - metriques pre-calculees)
- [x] Configuration Prometheus (prometheus.yml - scrape configs K8s)
- [x] Dashboards Grafana JSON:
  - api-overview.json (HTTP, latency, cache, system)
  - business-metrics.json (revenue, tickets, cashless, zones)
  - alerts-overview.json (active alerts, SLA, history)
- [x] Provisioning Grafana (datasources, dashboards)
- [x] Script health-check.sh (multi-env, JSON output, services checks)
- [x] AlertsService (in-app alerting, notifications webhook/slack)
- [x] HealthIndicatorsService (DB, Redis, memory, disk, event loop)

---
Derniere mise a jour: 2026-01-02 - Phase Monitoring Avancee (Prometheus, Grafana, Health Check, Alerts)

### Phase PDF Service Enhanced (2026-01-02) - COMPLETED
- [x] Service PDF ameliore avec QR codes securises (HMAC-SHA256 hash)
- [x] Template ticket avec QR code et hash de verification
- [x] Template facture detaillee avec TVA (20%)
- [x] Template badge staff avec photo et niveaux d'acces (LOW/MEDIUM/HIGH/FULL)
- [x] Template programme festival multi-pages (couverture, TOC, pages jour)
- [x] Template rapport financier complet (revenus, TVA, remboursements)
- [x] Template recu de paiement
- [x] Template bon de camping avec QR code

### Phase Shared Libraries Enhancement (2026-01-02) - COMPLETED
- [x] Validation Zod Schemas (libs/shared/validation/src/lib/)
  - festival.schema.ts - 265 lines (festival CRUD, query, settings, stats)
  - ticket.schema.ts - 512 lines (tickets, promo codes, scans, batch ops)
  - payment.schema.ts - 488 lines (payments, refunds, invoices, disputes)
  - cashless.schema.ts - 609 lines (NFC, topup, transfers, terminals)
  - index.ts - 312 lines (central exports for all schemas)
- [x] Shared Constants (libs/shared/constants/src/lib/)
  - cashless.constants.ts - 400+ lines (NFC status, transaction types, limits)
  - index.ts - Updated to export all 9 constant files
- Previously completed:
  - Types: camping.types.ts, notification.types.ts, vendor.types.ts, support.types.ts
  - Utils: geo.utils.ts, file.utils.ts, phone.utils.ts
  - Hooks: useDebounce.ts, useLocalStorage.ts, useMediaQuery.ts

### QA Review: Payments Module (2026-01-02) - TO FIX
**Path:** `apps/api/src/modules/payments/`

**Stripe API Version Mismatch** - Installed Stripe package (v17.7.0) requires API version "2025-02-24.acacia" but all services use "2024-12-18.acacia":
- [ ] `payments.service.ts:88` - Update apiVersion to "2025-02-24.acacia"
- [ ] `services/checkout.service.ts:51` - Update apiVersion
- [ ] `services/refund.service.ts:70` - Update apiVersion
- [ ] `services/stripe-connect.service.ts:47` - Update apiVersion
- [ ] `services/subscription.service.ts:47` - Update apiVersion

**TypeScript Errors in payments.service.ts**:
- [ ] Line 214: Logic bug - comparing `status !== COMPLETED` then `status === REFUNDED` is redundant
- [ ] Line 257: Type error - `providerPaymentId` can be null but return type expects string

**TypeScript Errors in checkout.service.ts**:
- [ ] Line 454: providerData assignment type mismatch with Prisma JsonValue

**TypeScript Errors in refund.service.ts**:
- [ ] Line 99: Missing `currency` property in RefundablePayment interface
- [ ] Line 541: providerData type mismatch with Prisma JsonValue

**TypeScript Errors in stripe-connect.service.ts**:
- [ ] Line 515: account.created possibly undefined - needs null check

**TypeScript Errors in payments.controller.ts**:
- [ ] Line 463: Need to use `import type` for RawBodyRequest (isolatedModules)


### QA Review: Analytics Module (2026-01-02) - TO FIX
**Path:** `apps/api/src/modules/analytics/`

**Issue 1: AnalyticsController not registered in module**
- [ ] **CRITICAL:** Import and register AnalyticsController in `analytics.module.ts`
  - File: `apps/api/src/modules/analytics/analytics.module.ts`
  - Add: `import { AnalyticsController } from './controllers/analytics.controller';`
  - Add `controllers: [AnalyticsController]` to the @Module decorator

**Issue 2: Duplicate function implementations in controller**
- [ ] **CRITICAL:** Fix duplicate function implementation at line 66 in analytics.controller.ts
- [ ] **CRITICAL:** Fix duplicate function implementation at line 640 in analytics.controller.ts

**Issue 3: Import type issues with isolatedModules**
- [ ] Fix TS1272 errors in analytics.controller.ts at lines 429, 455, 476, 497, 518, 539, 560
  - Use `import type` for types used in decorated signatures

**Issue 4: Prisma schema mismatches in advanced-metrics.service.ts**
- [ ] Line 93, 397: `festivalId` does not exist in `PaymentWhereInput`
- [ ] Line 115: `_sum` is possibly undefined
- [ ] Line 125: Type assignment error with count
- [ ] Lines 569, 581-582: `actualStartTime` and `actualEndTime` do not exist in StaffShift
- [ ] Lines 633, 641: `deliveryMethod` does not exist in `TicketWhereInput`
- [ ] Line 697: `"DENIED"` not assignable to ZoneAccessAction
- [ ] Line 705: `category` does not exist in SupportTicketWhereInput
- [ ] Line 715: Type error with role filter
- [ ] Line 818: Type error with TicketType

**Issue 5: Prisma schema mismatch in custom-reports.service.ts**
- [ ] Line 643: `validatedAt` does not exist in TicketWhereInput

**Issue 6: Missing PDFKit namespace in export.service.ts**
- [ ] Line 599: Cannot find namespace 'PDFKit' - need to install @types/pdfkit or fix type annotation
---

## QA Verification Report - Tickets Module (2026-01-02)

### Audit Results

**tickets.service.ts** - VERIFIED OK
- [x] Compiles correctly (no module-specific errors)
- [x] All 9 required methods present:
  - `purchaseTickets()` - Purchase tickets for a festival
  - `validateTicket()` - Validate a ticket QR code
  - `scanTicket()` - Scan ticket at entry point (marks as used)
  - `getUserTickets()` - Get user's tickets
  - `getTicketById()` - Get ticket by ID
  - `cancelTicket()` - Cancel a ticket
  - `getTicketQrCodeImage()` - Get ticket QR code image
  - `generateQrCode()` (private) - Generate unique QR code
  - `mapToEntity()` (private) - Map Prisma ticket to entity
- [x] DTOs defined inline (PurchaseTicketDto, ValidateTicketDto, TicketEntity, ValidationResult)
- [x] Proper error handling (BadRequestException, NotFoundException, ConflictException, ForbiddenException)
- [x] Transaction support for atomic operations
- [x] QR code security with HMAC-SHA256 signatures

**tickets.service.spec.ts** - VERIFIED OK
- [x] All 40 unit tests passing
- [x] Coverage requirements met (85%+ branches, 90%+ functions, 85%+ lines)
- [x] Test fixtures properly imported from test/fixtures/
- [x] Mocking correctly implemented for PrismaService, QRCode, uuid

**tickets.module.ts** - VERIFIED OK
- [x] Imports PrismaModule
- [x] Provides TicketsService
- [x] Exports TicketsService

**index.ts** - VERIFIED OK
- [x] Exports TicketsModule and TicketsService

**app.module.ts** - VERIFIED OK
- [x] TicketsModule is imported and registered

### Issues Found - TO FIX

**Missing Controller (MEDIUM PRIORITY)**
- [ ] `tickets.controller.ts` - NOT FOUND
  - The tickets module has no REST controller
  - Service is complete but no HTTP endpoints exposed
  - Required endpoints per CLAUDE.md:
    - `POST /tickets/buy` - Purchase tickets
    - `GET /tickets/me` - Get user's tickets
    - `POST /tickets/:id/validate` - Validate ticket QR code
    - `POST /tickets/:id/scan` - Scan ticket at entry
    - `GET /tickets/:id` - Get ticket by ID
    - `DELETE /tickets/:id` - Cancel ticket
    - `GET /tickets/:id/qr` - Get QR code image
  - Needs: Guards (JwtAuthGuard, RolesGuard), Decorators (@ApiTags, @ApiBearerAuth)

**Missing Separate DTOs (LOW PRIORITY)**
- [ ] DTOs are defined inline in tickets.service.ts
  - Consider moving to `tickets/dto/` folder for consistency with other modules
  - Suggested files:
    - `purchase-ticket.dto.ts`
    - `validate-ticket.dto.ts`
    - `ticket-response.dto.ts`

### Recommendation

The tickets module service is fully functional with comprehensive test coverage.
However, a REST controller needs to be created to expose the API endpoints.
This is blocking for production use but the core business logic is complete.

### QA: Shared Libraries TypeScript Check (2026-01-02) - TO FIX

**libs/shared/validation - BROKEN (tsc exit 2):**
- [ ] **Dependance 'zod' manquante** - Le module zod n'est pas installe dans package.json
  - Fichiers affectes: auth.schema.ts, cashless.schema.ts, common.schema.ts, festival.schema.ts, payment.schema.ts, ticket.schema.ts, user.schema.ts
  - Erreur: `error TS2307: Cannot find module 'zod' or its corresponding type declarations`
  - Solution: `npm install zod` ou `pnpm add zod`
- [ ] **Types implicites 'any'** - 40+ erreurs TS7006 pour parametres sans type explicite
  - Cause: Les callbacks dans les schemas Zod (refine, superRefine) n'ont pas de types explicites
  - Solution: Ajouter types explicites aux parametres des callbacks ou desactiver noImplicitAny

**libs/shared/utils - BROKEN (tsc exit 2):**
- [ ] **file.utils.ts:567-574** - References DOM non disponibles en contexte Node.js
  - Erreurs: `Cannot find name 'window'`, `Cannot find name 'HTMLImageElement'`
  - Fichier: `libs/shared/utils/src/lib/file.utils.ts`
  - Fonction: `getImageDimensionsFromBase64()` - browser-only function
  - Solution: Ajouter `"dom"` aux types dans tsconfig.lib.json ou `/// <reference lib="dom" />`

**libs/shared/constants - OK (tsc exit 0)**
**libs/shared/i18n - OK (tsc exit 0)**

---

## Database Connection Pooling Optimization (2026-01-03) - COMPLETED

**Objectif:** Optimize database connection pooling for NestJS API to handle concurrent requests efficiently

**Completed:**
- [x] Updated `.env.example` with connection pool parameters
  - Added `connection_limit=10` to DATABASE_URL
  - Added `pool_timeout=20` (seconds)
  - Added `connect_timeout=5` (seconds)
  - Documented all pool parameters with descriptions
- [x] Enhanced `apps/api/src/modules/prisma/prisma.service.ts`
  - Implemented `onModuleDestroy` for graceful disconnection
  - Added `checkConnectionHealth()` method with response time tracking
  - Added `getConnectionPoolMetrics()` for pool status monitoring
  - Added `executeWithRetry()` method for automatic query retries
  - Added connection retry logic with exponential backoff (max 5 retries)
  - Added error event listening for connection tracking
  - Enhanced logging for connection lifecycle
- [x] Updated `docker-compose.yml` PostgreSQL configuration
  - Set `max_connections=100` (down from 200 for better resource management)
  - Added `superuser_reserved_connections=3`
  - Kept `shared_buffers=256MB` appropriately sized
  - Added connection logging: `log_connections`, `log_disconnections`, `log_lock_waits`
  - Added `statement_timeout=30000` (30s) to prevent blocking queries
  - Updated DATABASE_URL with pool parameters
- [x] Created connection pool monitoring endpoint in health controller
  - New endpoint: `GET /api/health/db-pool`
  - Returns pool status (ok/degraded/error)
  - Monitors connection health with response time
  - Tracks connection retries
  - Full Swagger documentation
  - Imported PrismaModule in HealthModule

**Benefits:**
- Prevents connection pool exhaustion under high load
- Automatic connection recovery on failures
- Real-time monitoring of pool health
- Better resource utilization with optimized max_connections
- Graceful shutdown prevents connection leaks
- Query retry logic handles transient failures

---

### QA Review: Cashless Module (2026-01-02) - TO FIX
**Path:** `apps/api/src/modules/cashless/`

**Status:** Module partially complete - MISSING `transfer()` method

**Implemented methods (OK):**
- [x] `topup()` - Recharge de compte cashless (lines 171-245)
- [x] `pay()` - Paiement cashless (lines 250-322)
- [x] `refund()` - Remboursement de transaction (lines 327-411)
- [x] `getOrCreateAccount()` - Creation/recuperation compte
- [x] `getAccount()` / `getBalance()` - Consultation compte
- [x] `getTransactionHistory()` - Historique transactions
- [x] `linkNfcTag()` / `findAccountByNfcTag()` - Gestion NFC
- [x] `deactivateAccount()` / `reactivateAccount()` - Gestion statut compte

**MISSING: `transfer()` method:**
- [ ] **MEDIUM PRIORITY:** Implement `transfer()` method in `cashless.service.ts`
  - `TransferDto` is defined (lines 56-61) but method is NOT implemented
  - Zod schema `cashlessTransferSchema` exists in `libs/shared/validation/src/lib/cashless.schema.ts` (lines 264-300)
  - Mobile app `NFCCashlessService.processTransfer()` calls the API expecting this endpoint
  - **Impact:** Transfers between cashless accounts will fail at runtime
  - **Solution:** Add transfer method with the following logic:
    1. Validate festival exists and is active
    2. Get source account (userId) and verify sufficient balance
    3. Get destination account (dto.toUserId)
    4. Verify both accounts are active
    5. Create TRANSFER_OUT transaction for source (debit)
    6. Create TRANSFER_IN transaction for destination (credit)
    7. Update both balances atomically in Prisma transaction

**DTOs (OK):**
- [x] `CreateAccountDto` - Valid
- [x] `TopupDto` - Valid
- [x] `CashlessPaymentDto` - Valid
- [x] `RefundDto` - Valid
- [x] `TransferDto` - Defined but unused

**NFC Integration (OK):**
- [x] Mobile: `NFCCashlessService` complete (850+ lines) with offline support
- [x] Mobile: `NFCReader`, `NFCWriter`, `NFCFormatter`, `NFCManager` implemented
- [x] Backend: `linkNfcTag()` and `findAccountByNfcTag()` implemented
- [x] Validation: `nfcIdSchema` in common.schema.ts (pattern: `/^[A-Fa-f0-9]{8,16}$/`)

**Tests:**
- [x] `cashless.service.spec.ts` - 732 lines, all existing methods covered
- [ ] Add tests for `transfer()` once implemented


---

## Phase Startup Scripts (2026-01-02) - COMPLETED

### Scripts Créés
- [x] `scripts/start.sh` - Script de démarrage complet
  - Démarre Docker (PostgreSQL, Redis)
  - Lance les migrations Prisma
  - Build l'API avec SWC
  - Démarre l'API sur le port 3333
  - Test les endpoints avec curl
  - Itère jusqu'à succès (max 10 tentatives)
- [x] `scripts/stop.sh` - Script d'arrêt des services

### Corrections API Runtime
- [x] Fix chemins import PrismaService dans NotificationsModule
- [x] Ajout option SKIP_SWAGGER pour éviter erreur dépendance circulaire
- [x] Configuration correcte DATABASE_URL pour Docker

### Règles Agent Ajoutées
- [x] Mise à jour CLAUDE.md avec règles orchestration automatique agents

---

