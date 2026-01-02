# Guide de Depannage - Festival Management Platform

Ce guide vous aide a diagnostiquer et resoudre les problemes courants de la plateforme Festival.

## Table des Matieres

1. [Problemes d'Installation](#problemes-dinstallation)
2. [Problemes de Base de Donnees](#problemes-de-base-de-donnees)
3. [Problemes d'Authentification](#problemes-dauthentification)
4. [Problemes de Paiement](#problemes-de-paiement)
5. [Problemes de Performance](#problemes-de-performance)
6. [Problemes Docker](#problemes-docker)
7. [Problemes Kubernetes](#problemes-kubernetes)
8. [Problemes Frontend](#problemes-frontend)
9. [Problemes Mobile](#problemes-mobile)
10. [Logs et Debugging](#logs-et-debugging)

---

## Problemes d'Installation

### npm install echoue avec des erreurs de permission

**Symptomes:**
```
EACCES: permission denied, mkdir '/usr/local/lib/node_modules'
```

**Solution:**
```bash
# Option 1: Utiliser nvm (recommande)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Option 2: Changer le repertoire npm
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Erreur "Module not found" apres installation

**Symptomes:**
```
Cannot find module '@festival/types'
```

**Solutions:**
```bash
# 1. Reinstaller les dependances
rm -rf node_modules package-lock.json
npm install

# 2. Verifier les path aliases dans tsconfig.base.json
cat tsconfig.base.json | grep "@festival"

# 3. Regenerer le client Prisma
npx prisma generate
```

### Node.js version incompatible

**Symptomes:**
```
The engine "node" is incompatible with this module
```

**Solution:**
```bash
# Verifier la version
node --version

# Installer la bonne version avec nvm
nvm install 20
nvm use 20

# Ou avec volta
volta install node@20
```

---

## Problemes de Base de Donnees

### Connexion a PostgreSQL refusee

**Symptomes:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Diagnostic:**
```bash
# Verifier si PostgreSQL est demarre
docker-compose ps postgres

# Verifier les logs
docker-compose logs postgres

# Tester la connexion
docker exec -it festival-postgres psql -U festival_user -d festival_db -c "SELECT 1"
```

**Solutions:**
```bash
# Redemarrer PostgreSQL
docker-compose restart postgres

# Si le container n'existe pas
docker-compose up -d postgres

# Verifier DATABASE_URL dans .env
echo $DATABASE_URL
```

### Migration Prisma echoue

**Symptomes:**
```
Error: P3009 migrate found failed migrations
```

**Solutions:**
```bash
# 1. Voir le status des migrations
npx prisma migrate status

# 2. Reset la base de donnees (ATTENTION: perte de donnees!)
npx prisma migrate reset

# 3. Forcer la resolution
npx prisma migrate resolve --applied "20240101000000_migration_name"

# 4. En cas de schema corrompu
npx prisma db push --force-reset
```

### "Record not found" ou donnees manquantes

**Diagnostic:**
```bash
# Ouvrir Prisma Studio
npx prisma studio

# Verifier les donnees dans la table
docker exec -it festival-postgres psql -U festival_user -d festival_db \
  -c "SELECT COUNT(*) FROM \"User\";"
```

**Solution:**
```bash
# Reexecuter le seed
npx prisma db seed
```

### Deadlock ou timeout de transaction

**Symptomes:**
```
Error: Transaction API error: Transaction already closed
```

**Solutions:**
```bash
# Augmenter le timeout dans prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

```typescript
// Dans le code, utiliser des transactions avec timeout
await prisma.$transaction(
  async (tx) => {
    // operations
  },
  {
    maxWait: 5000,
    timeout: 10000,
  }
);
```

---

## Problemes d'Authentification

### "Invalid token" ou "jwt malformed"

**Symptomes:**
```
401 Unauthorized - Invalid token
```

**Diagnostic:**
```bash
# Verifier la configuration JWT
echo $JWT_SECRET | wc -c  # Doit etre >= 64 caracteres

# Decoder le token (sans verifier la signature)
echo "eyJ..." | cut -d. -f2 | base64 -d 2>/dev/null
```

**Solutions:**
```bash
# Verifier que le secret est identique partout
grep JWT_SECRET .env .env.development .env.production

# Regenerer un nouveau secret
openssl rand -base64 64
```

### Token expire trop vite

**Symptomes:**
Les utilisateurs sont deconnectes frequemment.

**Solution:**
```bash
# Augmenter la duree dans .env
JWT_ACCESS_TOKEN_EXPIRY=1h
JWT_REFRESH_TOKEN_EXPIRY=30d
```

### Refresh token invalide

**Diagnostic:**
```bash
# Verifier si le token est en base
docker exec -it festival-postgres psql -U festival_user -d festival_db \
  -c "SELECT \"refreshToken\" FROM \"User\" WHERE id = 'user-id';"
```

**Solutions:**
```bash
# Reinitialiser le refresh token
# L'utilisateur doit se reconnecter
```

### CORS bloque les requetes

**Symptomes:**
```
Access to fetch at 'http://api:3333' from origin 'http://localhost:3000' has been blocked by CORS
```

**Solution:**
```bash
# Ajouter l'origine dans .env
CORS_ORIGINS=http://localhost:3000,http://localhost:4200,http://localhost:4300

# Ou en mode developpement
CORS_ORIGINS=*
```

---

## Problemes de Paiement

### Webhook Stripe non recu

**Diagnostic:**
```bash
# Verifier les logs de l'API
docker-compose logs api | grep webhook

# Tester avec Stripe CLI
stripe listen --forward-to localhost:3333/api/webhooks/stripe
```

**Solutions:**
```bash
# 1. Verifier le webhook secret
echo $STRIPE_WEBHOOK_SECRET

# 2. Verifier que le endpoint est public
# Dans auth.module.ts, s'assurer que /webhooks est marque @Public()

# 3. Tester manuellement
stripe trigger payment_intent.succeeded
```

### Paiement refuse sans raison claire

**Diagnostic:**
```typescript
// Verifier le statut dans Stripe Dashboard
// https://dashboard.stripe.com/test/payments

// Ou via l'API
const paymentIntent = await stripe.paymentIntents.retrieve('pi_xxx');
console.log(paymentIntent.status, paymentIntent.last_payment_error);
```

**Solutions courantes:**
- Carte de test invalide (utiliser 4242424242424242)
- CVV incorrect (utiliser 123)
- Date d'expiration passee

### Erreur "Stripe not initialized"

**Solution:**
```bash
# Verifier les cles Stripe dans .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Redemarrer l'API
docker-compose restart api
```

---

## Problemes de Performance

### API lente (latence > 500ms)

**Diagnostic:**
```bash
# Verifier les metriques
curl http://localhost:3333/monitoring/metrics

# Analyser les requetes lentes
docker exec -it festival-postgres psql -U festival_user -d festival_db \
  -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

**Solutions:**
```bash
# 1. Verifier les index manquants
npx prisma db execute --stdin < scripts/analyze-indexes.sql

# 2. Activer le cache Redis
REDIS_URL=redis://localhost:6379

# 3. Augmenter le pool de connexions
DATABASE_POOL_MAX=20
```

### Redis timeout

**Symptomes:**
```
Error: Connection timed out
```

**Solutions:**
```bash
# Verifier Redis
docker exec -it festival-redis redis-cli ping

# Augmenter le memory limit
docker-compose exec redis redis-cli CONFIG SET maxmemory 512mb

# Verifier le nombre de connexions
docker exec -it festival-redis redis-cli INFO clients
```

### Fuite memoire (Memory Leak)

**Diagnostic:**
```bash
# Verifier l'utilisation memoire
docker stats festival-api

# Profiler avec Node.js
node --inspect apps/api/dist/main.js
```

**Solutions:**
```typescript
// Limiter les resultats de requetes
const users = await prisma.user.findMany({
  take: 100, // Toujours limiter
});

// Nettoyer les listeners
onModuleDestroy() {
  this.eventEmitter.removeAllListeners();
}
```

---

## Problemes Docker

### Container ne demarre pas

**Diagnostic:**
```bash
# Voir les logs
docker-compose logs api

# Verifier le status
docker-compose ps

# Inspecter le container
docker inspect festival-api
```

**Solutions courantes:**
```bash
# Probleme de port deja utilise
lsof -i :3333
kill -9 <PID>

# Probleme de build
docker-compose build --no-cache api

# Probleme de volume
docker-compose down -v
docker-compose up -d
```

### Image Docker trop volumineuse

**Diagnostic:**
```bash
docker images | grep festival
```

**Solutions:**
```dockerfile
# Utiliser multi-stage build (deja fait)
# Nettoyer apres build
RUN npm cache clean --force
RUN rm -rf /tmp/*
```

### "no space left on device"

**Solutions:**
```bash
# Nettoyer Docker
docker system prune -a

# Supprimer les images non utilisees
docker image prune -a

# Supprimer les volumes orphelins
docker volume prune
```

---

## Problemes Kubernetes

### Pod en CrashLoopBackOff

**Diagnostic:**
```bash
# Voir les logs
kubectl logs -n festival deployment/festival-api --previous

# Decrire le pod
kubectl describe pod -n festival -l app=festival-api
```

**Solutions courantes:**
```bash
# Probleme de secrets manquants
kubectl get secrets -n festival

# Probleme de configmap
kubectl get configmap -n festival

# Probleme de ressources
kubectl top pods -n festival
```

### Service non accessible

**Diagnostic:**
```bash
# Verifier le service
kubectl get svc -n festival

# Verifier l'ingress
kubectl get ingress -n festival

# Tester depuis un pod
kubectl exec -it -n festival deploy/festival-api -- curl http://festival-api:3000/health
```

### HPA ne scale pas

**Diagnostic:**
```bash
# Verifier le HPA
kubectl get hpa -n festival

# Verifier les metriques
kubectl top pods -n festival
```

**Solution:**
```bash
# S'assurer que metrics-server est installe
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

---

## Problemes Frontend

### Page blanche apres build

**Diagnostic:**
```bash
# Verifier les erreurs de build
npm run build 2>&1 | tee build.log

# Verifier la console du navigateur
# F12 -> Console
```

**Solutions:**
```bash
# Nettoyer le cache Next.js
rm -rf .next
npm run build

# Verifier les variables d'environnement
echo $NEXT_PUBLIC_API_URL
```

### Hydration mismatch

**Symptomes:**
```
Text content does not match server-rendered HTML
```

**Solutions:**
```tsx
// Utiliser suppressHydrationWarning pour les donnees dynamiques
<time suppressHydrationWarning>{new Date().toISOString()}</time>

// Ou utiliser useEffect pour le rendu client-only
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;
```

### i18n ne fonctionne pas

**Diagnostic:**
```bash
# Verifier les fichiers de traduction
ls -la messages/
cat messages/fr.json | jq .
```

**Solution:**
```typescript
// Verifier la configuration next-intl
// i18n/config.ts
export const locales = ['en', 'fr'] as const;
export const defaultLocale = 'fr';
```

---

## Problemes Mobile

### App crash au demarrage

**Diagnostic:**
```bash
# Android
adb logcat | grep -i "ReactNative"

# iOS
xcrun simctl spawn booted log stream --predicate 'subsystem == "com.apple.UIKit"'
```

**Solutions:**
```bash
# Nettoyer le cache Metro
npx react-native start --reset-cache

# Reinstaller les pods (iOS)
cd ios && pod install --repo-update

# Rebuilder
npx react-native run-android --clean
npx react-native run-ios --clean
```

### Push notifications non recues

**Diagnostic:**
```bash
# Verifier le token FCM
adb shell dumpsys notification | grep -A5 "festival"

# Tester avec Firebase Console
```

**Solutions:**
```bash
# Verifier la configuration Firebase
# Fichiers: google-services.json (Android), GoogleService-Info.plist (iOS)

# Verifier les permissions
# Android: android/app/src/main/AndroidManifest.xml
# iOS: ios/YourApp/Info.plist
```

### AsyncStorage corrompu

**Symptomes:**
Donnees offline inconsistantes ou perdues.

**Solution:**
```typescript
// Nettoyer le storage
import AsyncStorage from '@react-native-async-storage/async-storage';

const clearAll = async () => {
  try {
    await AsyncStorage.clear();
  } catch(e) {
    console.error(e);
  }
};
```

---

## Logs et Debugging

### Activer les logs detailles

```bash
# API (developpement)
LOG_LEVEL=debug npm run start:dev

# Production (attention aux performances)
LOG_LEVEL=verbose
```

### Trouver les erreurs dans les logs

```bash
# Docker Compose
docker-compose logs -f api 2>&1 | grep -i error

# Kubernetes
kubectl logs -n festival -l app=festival-api --since=1h | grep -i error

# Fichiers locaux
tail -f logs/error.log | grep -E "(ERROR|FATAL)"
```

### Debugger avec VS Code

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to API",
      "port": 9229,
      "restart": true
    }
  ]
}
```

```bash
# Demarrer en mode debug
node --inspect apps/api/dist/main.js
```

### Analyser les requetes SQL

```typescript
// Dans le code
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### Profiler les performances

```bash
# Utiliser autocannon pour les tests de charge
npx autocannon -c 100 -d 30 http://localhost:3333/api/health

# Analyser avec k6
k6 run scripts/k6-load-test.js
```

---

## Ressources Additionnelles

- **Documentation API**: [docs/api/API_GUIDE.md](./api/API_GUIDE.md)
- **Guide de Deploiement**: [docs/DEPLOYMENT.md](./DEPLOYMENT.md)
- **Architecture**: [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- **Sentry Dashboard**: https://sentry.io/organizations/festival/
- **Grafana**: http://localhost:3001 (en mode monitoring)

---

## Contacter le Support

Si le probleme persiste apres avoir suivi ce guide:

1. **Ouvrir une issue GitHub** avec:
   - Description du probleme
   - Logs pertinents
   - Etapes pour reproduire
   - Environnement (OS, versions)

2. **Email**: support@festival.example.com

3. **Urgences production**: Contacter l'equipe DevOps

---

*Document mis a jour: Janvier 2026*
