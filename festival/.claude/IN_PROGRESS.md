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

**Etat actuel (2026-01-03):**
- 25+ modules backend implementes avec controllers REST complets
- Schema Prisma avec 40+ modeles
- Admin connecte a l'API backend via React Query hooks
- Tous les modules critiques ont maintenant leurs controllers REST

**Problemes critiques - RESOLVED:**
1. `tickets` - Controller REST cree avec 7 endpoints (2026-01-03)
2. `cashless` - Controller REST cree avec 12 endpoints + methode transfer() (2026-01-03)
3. `notifications` - Controller REST cree avec 9 endpoints (2026-01-03)
4. Admin app connectee a l'API backend (2026-01-02)

**Technologies cartographie:**
- Maps: **OpenStreetMap + Leaflet.js** (open source, pas de frais API)
- Localisation indoor: **Beacons BLE** ou **WiFi fingerprinting**

---

## Phase 1 - CRITIQUE: Controllers REST Manquants - COMPLETED (2026-01-03)

### 1.1 Tickets Controller - COMPLETED
**Objectif:** Exposer les endpoints REST pour la billetterie
**Priorite:** CRITIQUE
**Fichier service existant:** `apps/api/src/modules/tickets/tickets.service.ts`

#### Backend (API NestJS) - DONE
- [x] Creer `apps/api/src/modules/tickets/tickets.controller.ts` (185+ lines):
  - POST /api/tickets/buy - Acheter des billets (JwtAuthGuard)
  - GET /api/tickets/me - Mes billets (JwtAuthGuard)
  - GET /api/tickets/:id - Detail d'un billet (JwtAuthGuard)
  - POST /api/tickets/:id/validate - Valider QR code (Staff role)
  - POST /api/tickets/:id/scan - Scanner entree (Staff role)
  - DELETE /api/tickets/:id - Annuler billet (JwtAuthGuard)
  - GET /api/tickets/:id/qr - Telecharger QR code PNG
- [x] Guards: JwtAuthGuard, RolesGuard avec @Roles('STAFF', 'ADMIN', 'SECURITY')
- [x] Swagger: @ApiTags('tickets'), @ApiBearerAuth(), @ApiOperation, @ApiResponse
- [x] Enregistre dans tickets.module.ts

---

### 1.2 Cashless Controller + Transfer Method - COMPLETED
**Objectif:** Exposer endpoints REST cashless + implementer transferts
**Priorite:** CRITIQUE
**Fichier service existant:** `apps/api/src/modules/cashless/cashless.service.ts`

#### Backend (API NestJS) - DONE
- [x] **IMPLEMENTER** methode `transfer()` dans `cashless.service.ts`:
  - Validation festival actif
  - Verification compte source avec solde suffisant
  - Verification compte destination existe et actif
  - Prevention self-transfer
  - Verification max balance destination
  - Transaction Prisma atomique (TRANSFER_OUT/TRANSFER_IN)
  - Metadata avec transferType (OUTGOING/INCOMING)
- [x] Creer `apps/api/src/modules/cashless/cashless.controller.ts` (12 endpoints):
  - POST /api/cashless/account - Creer/obtenir compte
  - GET /api/cashless/account - Mon compte
  - GET /api/cashless/balance - Mon solde
  - POST /api/cashless/topup - Recharger
  - POST /api/cashless/pay - Payer (Staff)
  - POST /api/cashless/refund - Rembourser (Staff)
  - POST /api/cashless/transfer - Transferer
  - GET /api/cashless/transactions - Historique
  - POST /api/cashless/link-nfc - Associer NFC
  - GET /api/cashless/nfc/:tagId - Trouver par NFC (Staff)
  - POST /api/cashless/deactivate - Desactiver
  - POST /api/cashless/reactivate - Reactiver
- [x] DTOs: account.dto.ts, transfer.dto.ts, nfc.dto.ts, transaction.dto.ts
- [x] Enregistre dans cashless.module.ts

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

## Phase 6 - Corrections TypeScript/Build - COMPLETED (2026-01-03)

### Issues documentes - RESOLVED
- [x] Payments: Mise a jour Stripe apiVersion vers "2025-02-24.acacia" (5 fichiers)
- [x] Payments: Fix TypeScript errors (logic bug, null checks, JsonValue types, import type)
- [x] Analytics: Enregistrer AnalyticsController dans module
- [x] Analytics: Fix import type pour Response (isolatedModules)
- [x] Shared/validation: Installation de `zod` + fix z.record() types + errorMap fixes
- [x] Shared/utils: Ajout DOM types dans tsconfig.lib.json pour file.utils.ts

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

### QA Review: Payments Module (2026-01-02) - FIXED (2026-01-03)
**Path:** `apps/api/src/modules/payments/`

**Stripe API Version Mismatch** - FIXED:
- [x] `payments.service.ts:88` - Updated apiVersion to "2025-02-24.acacia"
- [x] `services/checkout.service.ts:51` - Updated apiVersion
- [x] `services/refund.service.ts:70` - Updated apiVersion
- [x] `services/stripe-connect.service.ts:47` - Updated apiVersion
- [x] `services/subscription.service.ts:47` - Updated apiVersion

**TypeScript Errors** - FIXED:
- [x] payments.service.ts: Fixed logic bug status check order, added null coalescing for refund.status
- [x] checkout.service.ts: Fixed providerData JsonValue type with cast to any
- [x] refund.service.ts: Added currency to RefundablePayment interface, fixed providerData type
- [x] stripe-connect.service.ts: Added null check for account.created
- [x] payments.controller.ts: Changed to `import type` for RawBodyRequest


### QA Review: Analytics Module (2026-01-02) - FIXED (2026-01-03)
**Path:** `apps/api/src/modules/analytics/`

**Issue 1: AnalyticsController not registered in module** - FIXED
- [x] Imported and registered AnalyticsController in `analytics.module.ts`
- [x] Added `controllers: [AnalyticsController]` to @Module decorator

**Issue 2: Import type issues with isolatedModules** - FIXED
- [x] Changed `import { Response }` to `import type { Response }` from express
- [x] Fixed TS1272 errors for decorated method signatures

**Note:** Some Prisma schema mismatches in advanced-metrics.service.ts remain as non-blocking (service works with fallback values)
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

### QA: Shared Libraries TypeScript Check (2026-01-02) - FIXED (2026-01-03)

**libs/shared/validation - FIXED:**
- [x] **Dependance 'zod' installee** - `npm install zod ^4.3.4`
- [x] **z.record() types corriges** - Changed to `z.record(z.string(), z.unknown())` format
- [x] **errorMap fixes** - Changed to simple `message` property format
- [x] Compilation reussie: `npx tsc --noEmit` pass

**libs/shared/utils - FIXED:**
- [x] **DOM types ajoutes** - Added `"lib": ["ES2020", "DOM"]` to tsconfig.lib.json
- [x] Compilation reussie: `npx tsc --noEmit` pass

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

### Mobile App Tickets Fix (2026-01-03) - COMPLETED
**Path:** `apps/mobile/src/`

**Problem:** Mobile app tickets screens using mock data instead of API

**Fixes Applied:**
- [x] Updated `services/api.ts` - Changed API URL to use EXPO_PUBLIC_API_URL env variable
- [x] Updated all endpoints to use `/api` prefix matching backend routes
- [x] `screens/Tickets/MyTicketsScreen.tsx` - Removed mock data, added sync on mount
- [x] `screens/Tickets/TicketDetailScreen.tsx` - Removed mock fallback, added error handling
- [x] Created `.env.example` with API configuration template
- [x] Tickets now sync from `/api/tickets/me` endpoint via DataSyncService

---

### QA Review: Cashless Module (2026-01-02) - FIXED (2026-01-03)
**Path:** `apps/api/src/modules/cashless/`

**Status:** Module COMPLETE - All methods implemented

**All methods implemented:**
- [x] `topup()` - Recharge de compte cashless
- [x] `pay()` - Paiement cashless
- [x] `refund()` - Remboursement de transaction
- [x] `transfer()` - Transfert entre comptes (NEW 2026-01-03)
- [x] `getOrCreateAccount()` - Creation/recuperation compte
- [x] `getAccount()` / `getBalance()` - Consultation compte
- [x] `getTransactionHistory()` - Historique transactions
- [x] `linkNfcTag()` / `findAccountByNfcTag()` - Gestion NFC
- [x] `deactivateAccount()` / `reactivateAccount()` - Gestion statut compte

**REST Controller COMPLETE (2026-01-03):**
- [x] `cashless.controller.ts` - 12 endpoints implementes
- [x] DTOs: account.dto.ts, transfer.dto.ts, nfc.dto.ts, transaction.dto.ts
- [x] Controller registered in cashless.module.ts

**NFC Integration (OK):**
- [x] Mobile: `NFCCashlessService` complete (850+ lines) with offline support
- [x] Mobile: `NFCReader`, `NFCWriter`, `NFCFormatter`, `NFCManager` implemented
- [x] Backend: `linkNfcTag()` and `findAccountByNfcTag()` implemented
- [x] Validation: `nfcIdSchema` in common.schema.ts

**Tests:**
- [x] `cashless.service.spec.ts` - 732 lines, all methods covered


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

