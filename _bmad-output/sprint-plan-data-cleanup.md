# Sprint Plan - Data Cleanup & Real Data Implementation

**Date:** 2026-01-21
**Objectif:** Remplacer toutes les donnees hardcodees par des vraies donnees DB

---

## Sprint 1: Fix Broken Routes (Priority: CRITICAL)

### Stories:
1. **S1-1**: Creer page /help (Centre d'aide)
2. **S1-2**: Creer page /refunds (Politique de remboursement)
3. **S1-3**: Creer page /account/settings (Parametres utilisateur)
4. **S1-4**: Creer page /account/saved (Favoris/Wishlist)

---

## Sprint 2: Real Statistics API (Priority: HIGH)

### Stories:
1. **S2-1**: Creer endpoint GET /api/platform-stats
   - Total festivals (count from DB)
   - Total users (count from DB)
   - Total artists (count from DB)
   - Total tickets sold (sum from DB)
2. **S2-2**: Mettre a jour la homepage pour utiliser les vraies stats
3. **S2-3**: Supprimer mock-data.ts de l'admin et utiliser l'API

---

## Sprint 3: Seed Data - Artists & Festivals (Priority: HIGH)

### Stories:
1. **S3-1**: Creer seed script avec artistes celebres:
   - David Guetta, DJ Snake, Martin Garrix, Tiesto, Calvin Harris
   - Charlotte de Witte, Amelie Lens, Nina Kraviz
   - Angele, Stromae, Orelsan, PNL, Jul
   - Daft Punk, Justice, Kavinsky
   - The Weeknd, Dua Lipa, Beyonce

2. **S3-2**: Creer seed script avec festivals celebres:
   - Tomorrowland (Boom, Belgique)
   - Ultra Music Festival (Miami, USA)
   - Coachella (Indio, USA)
   - Rock en Seine (Paris, France)
   - Les Vieilles Charrues (Carhaix, France)
   - Hellfest (Clisson, France)
   - Lollapalooza Paris
   - Main Square Festival

3. **S3-3**: Creer seed script avec stages/scenes:
   - Main Stage, Second Stage, Techno Stage, Chill Stage

---

## Sprint 4: Seed Data - Drinks, Food & Menu Items (Priority: HIGH)

### Stories:
1. **S4-1**: Creer seed avec boissons standard:
   - Bieres: Heineken 6€, Corona 7€, Leffe 7.5€, 1664 6€
   - Softs: Coca-Cola 4€, Sprite 4€, Red Bull 6€, Eau 3€
   - Alcools: Vodka 8€, Rhum 8€, Whisky 9€, Gin 8€
   - Cocktails: Mojito 12€, Spritz 10€, Margarita 12€
   - Vins: Rouge 7€, Blanc 7€, Rose 7€, Champagne 15€

2. **S4-2**: Creer seed avec food items:
   - Burger 12€, Hot-dog 8€, Pizza 10€, Frites 5€
   - Wrap 9€, Salade 8€, Tacos 10€, Kebab 10€

3. **S4-3**: Creer seed avec types de tickets standard:
   - Pass 1 Jour: 65€
   - Pass 3 Jours: 150€
   - Pass VIP 1 Jour: 150€
   - Pass VIP 3 Jours: 350€
   - Camping Standard: 50€
   - Camping Premium: 100€
   - Parking: 30€

---

## Sprint 5: Admin - Partners & Sponsors (Priority: MEDIUM)

### Stories:
1. **S5-1**: Creer modele Prisma `Partner`
2. **S5-2**: Creer modele Prisma `Sponsor`
3. **S5-3**: Creer API CRUD partners
4. **S5-4**: Creer API CRUD sponsors
5. **S5-5**: Creer page admin /partners
6. **S5-6**: Creer page admin /sponsors
7. **S5-7**: Seed avec sponsors connus (Heineken, Red Bull, Coca-Cola, etc.)

---

## Sprint 6: Replace Hardcoded Frontend Data (Priority: HIGH)

### Stories:
1. **S6-1**: artists/page.tsx - Fetch depuis /api/artists au lieu de hardcode
2. **S6-2**: festivals/page.tsx - Fetch genres depuis API
3. **S6-3**: tickets/page.tsx - Fetch features depuis ticket categories DB
4. **S6-4**: faq/page.tsx - Creer modele FAQ et fetch depuis API
5. **S6-5**: Supprimer FALLBACK_FESTIVALS de festivals/[slug]/page.tsx

---

## Ordre d'execution:
1. Sprint 1 (routes) - 1 agent
2. Sprint 3 (seed artists/festivals) - 1 agent
3. Sprint 4 (seed drinks/food) - 1 agent
4. Sprint 2 (stats API) - 1 agent
5. Sprint 5 (partners/sponsors) - 1 agent
6. Sprint 6 (frontend cleanup) - 1 agent

**AGENTS PARALLELES: 4 agents simultanes**
