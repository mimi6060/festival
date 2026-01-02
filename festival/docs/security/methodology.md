# Methodologie de Test de Penetration - OWASP

## 1. Introduction

Cette methodologie est basee sur les standards suivants:
- **OWASP Testing Guide v4.2**
- **OWASP Top 10 2021**
- **PTES (Penetration Testing Execution Standard)**
- **NIST SP 800-115**

## 2. Phases de Test

### Phase 1: Reconnaissance (Information Gathering)

#### 1.1 Reconnaissance Passive

**Objectif**: Collecter des informations sans interaction directe avec la cible.

| Technique | Outils | Objectif |
|-----------|--------|----------|
| OSINT | Google Dorks, Shodan, Censys | Informations publiques |
| DNS Enumeration | dig, nslookup, dnsenum | Sous-domaines, enregistrements |
| WHOIS | whois, domaintools | Informations de registre |
| Certificate Transparency | crt.sh, certspotter | Certificats emis |
| Code Source Public | GitHub, GitLab | Fuites de code/secrets |

**Checklist Passive:**
```
[ ] Recherche Google Dorks
    site:target.com filetype:pdf
    site:target.com inurl:admin
    site:target.com ext:sql OR ext:db

[ ] Enumeration DNS
    - Enregistrements A, AAAA, MX, TXT, NS
    - Sous-domaines via wordlists

[ ] Analyse des certificats SSL
    - SANs (Subject Alternative Names)
    - Historique des certificats

[ ] Recherche de fuites
    - Paste sites (Pastebin, etc.)
    - Breached databases
    - Code repositories
```

#### 1.2 Reconnaissance Active

**Objectif**: Interaction directe pour enumerer les services.

| Technique | Outils | Objectif |
|-----------|--------|----------|
| Port Scanning | Nmap, Masscan | Ports ouverts |
| Service Detection | Nmap -sV | Versions des services |
| Web Crawling | Burp Spider, Gospider | Structure du site |
| API Discovery | Swagger, Postman | Endpoints API |

**Commandes Nmap:**
```bash
# Scan rapide des ports communs
nmap -sS -sV -O -T4 target.com

# Scan complet tous ports
nmap -sS -sV -p- -T4 target.com

# Scan des vulnerabilites
nmap --script vuln target.com

# Scan SSL/TLS
nmap --script ssl-enum-ciphers -p 443 target.com
```

### Phase 2: Analyse des Vulnerabilites

#### 2.1 Scan Automatise

| Outil | Usage | Configuration |
|-------|-------|---------------|
| Burp Suite Pro | Scan web complet | Voir burp-suite/ |
| OWASP ZAP | Scan DAST | Voir zap/ |
| Nuclei | Scan base de templates | Voir nuclei/ |
| Nikto | Scan serveur web | Configuration par defaut |

#### 2.2 Analyse OWASP Top 10 2021

##### A01:2021 - Broken Access Control

**Tests a effectuer:**
```
[ ] Bypass d'authentification
[ ] Escalade de privileges verticale (user -> admin)
[ ] Escalade de privileges horizontale (user1 -> user2)
[ ] IDOR (Insecure Direct Object Reference)
[ ] Manipulation de JWT
[ ] Bypass de controles CORS
[ ] Directory traversal
[ ] Acces aux fichiers non autorises
```

**Techniques:**
```http
# Test IDOR
GET /api/users/123 -> GET /api/users/124

# Test escalade verticale
Modifier role dans JWT ou cookie

# Test directory traversal
GET /api/files/../../../etc/passwd
```

##### A02:2021 - Cryptographic Failures

**Tests a effectuer:**
```
[ ] Donnees sensibles en clair dans la DB
[ ] Transmission HTTP vs HTTPS
[ ] Certificats SSL/TLS valides
[ ] Algorithmes de chiffrement obsoletes
[ ] Mots de passe hasches correctement
[ ] Cles API/secrets exposes
[ ] Backup non chiffres
```

**Outils:**
```bash
# Test SSL/TLS
testssl.sh target.com

# Verification des ciphers
nmap --script ssl-enum-ciphers -p 443 target.com

# Test HSTS
curl -s -D- https://target.com | grep -i strict
```

##### A03:2021 - Injection

**Types d'injection a tester:**

| Type | Payload Exemple | Cible |
|------|-----------------|-------|
| SQL Injection | `' OR '1'='1` | Formulaires, parametres URL |
| NoSQL Injection | `{"$gt": ""}` | APIs MongoDB |
| Command Injection | `; ls -la` | Champs executes cote serveur |
| LDAP Injection | `*)(uid=*))(|(uid=*` | Authentification LDAP |
| XPath Injection | `' or '1'='1` | Requetes XML |

**Voir**: [injection/](./injection/) pour les cas de test detailles.

##### A04:2021 - Insecure Design

**Tests a effectuer:**
```
[ ] Absence de rate limiting sur actions critiques
[ ] Logique metier bypassable
[ ] Absence de verification cote serveur
[ ] Secrets dans le code client
[ ] Debug mode actif
[ ] Endpoints de developpement exposes
```

##### A05:2021 - Security Misconfiguration

**Tests a effectuer:**
```
[ ] Headers de securite manquants
[ ] Pages d'erreur verboses
[ ] Directory listing actif
[ ] Fichiers de configuration exposes
[ ] Ports non necessaires ouverts
[ ] Comptes par defaut actifs
[ ] CORS mal configure
```

**Headers a verifier:**
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=()
```

##### A06:2021 - Vulnerable and Outdated Components

**Tests a effectuer:**
```
[ ] Scan des dependances (npm audit, pip-audit)
[ ] Verification des versions des frameworks
[ ] CVE connus sur les composants utilises
[ ] Libraries JavaScript obsoletes
[ ] Plugins WordPress/CMS vulnerables
```

**Outils:**
```bash
# NPM
npm audit

# Retire.js pour JS
retire --js

# Dependency-Check OWASP
dependency-check --scan .
```

##### A07:2021 - Identification and Authentication Failures

**Tests a effectuer:**
```
[ ] Brute force login
[ ] Enumeration d'utilisateurs
[ ] Politique de mots de passe faible
[ ] Session fixation
[ ] Session timeout inadequat
[ ] Tokens previsibles
[ ] MFA bypassable
[ ] Password reset flaws
```

**Voir**: [authentication/](./authentication/) pour les cas de test detailles.

##### A08:2021 - Software and Data Integrity Failures

**Tests a effectuer:**
```
[ ] Deserialisation non securisee
[ ] Integrite des mises a jour
[ ] CI/CD pipeline securise
[ ] Signature du code
[ ] Validation des entrees
```

##### A09:2021 - Security Logging and Monitoring Failures

**Tests a effectuer:**
```
[ ] Logs d'authentification
[ ] Logs des actions critiques
[ ] Alertes sur activites suspectes
[ ] Retention des logs adequate
[ ] Protection des logs contre modification
```

##### A10:2021 - Server-Side Request Forgery (SSRF)

**Tests a effectuer:**
```
[ ] Import d'URL externe
[ ] Webhooks configurables
[ ] Fonctionnalites de preview
[ ] Integration avec services internes
```

**Payloads SSRF:**
```
http://localhost:22
http://127.0.0.1:6379
http://[::1]:80
http://metadata.google.internal
http://169.254.169.254/latest/meta-data/
```

### Phase 3: Exploitation

#### 3.1 Validation des Vulnerabilites

Pour chaque vulnerabilite identifiee:

1. **Confirmer l'exploitabilite**
2. **Documenter le PoC**
3. **Evaluer l'impact reel**
4. **Calculer le score CVSS**

#### 3.2 Matrice d'Exploitation

| Vulnerabilite | Prerequis | Complexite | Impact |
|---------------|-----------|------------|--------|
| SQL Injection | Aucun | Basse | Critique |
| XSS Stored | Compte utilisateur | Basse | Haute |
| IDOR | Authentification | Basse | Haute |
| CSRF | Session active | Moyenne | Moyenne |

### Phase 4: Post-Exploitation

#### 4.1 Objectifs

- Evaluer l'etendue de la compromission
- Identifier les donnees accessibles
- Tester la persistance possible
- Evaluer la detection

#### 4.2 Tests

```
[ ] Acces aux bases de donnees
[ ] Extraction de donnees sensibles (simule)
[ ] Mouvement lateral possible
[ ] Acces aux secrets/credentials
[ ] Persistence (tokens long terme)
```

### Phase 5: Reporting

#### 5.1 Structure du Rapport

Voir [templates/pentest-report.md](./templates/pentest-report.md)

1. **Resume Executif**
2. **Methodologie**
3. **Resultats par severite**
4. **Details des vulnerabilites**
5. **Preuves et PoC**
6. **Recommandations**
7. **Annexes**

#### 5.2 Scoring CVSS 3.1

```
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H

AV (Attack Vector): N(Network), A(Adjacent), L(Local), P(Physical)
AC (Attack Complexity): L(Low), H(High)
PR (Privileges Required): N(None), L(Low), H(High)
UI (User Interaction): N(None), R(Required)
S (Scope): U(Unchanged), C(Changed)
C (Confidentiality): N(None), L(Low), H(High)
I (Integrity): N(None), L(Low), H(High)
A (Availability): N(None), L(Low), H(High)
```

### Phase 6: Remediation Verification

#### 6.1 Process de Retest

1. Obtenir confirmation des corrections
2. Re-executer les tests specifiques
3. Valider que les corrections n'introduisent pas de nouvelles vulnerabilites
4. Documenter le statut final

## 3. Outils par Phase

| Phase | Outils |
|-------|--------|
| Reconnaissance | Nmap, Amass, Subfinder, Shodan |
| Scanning | Burp Suite, ZAP, Nuclei, Nikto |
| Exploitation | SQLMap, Hydra, Metasploit |
| Post-Exploitation | LinPEAS, custom scripts |
| Reporting | Markdown, CVSS Calculator |

## 4. Templates de Commandes

### Reconnaissance
```bash
# Subdomain enumeration
subfinder -d target.com -o subdomains.txt
amass enum -d target.com -o amass_results.txt

# Port scanning
nmap -sS -sV -O -p- -T4 -oA nmap_full target.com
masscan -p1-65535 target.com --rate=1000 -oL masscan.txt
```

### Scanning Web
```bash
# Nikto
nikto -h https://target.com -o nikto.txt

# Directory fuzzing
ffuf -u https://target.com/FUZZ -w /path/to/wordlist.txt

# API fuzzing
wfuzz -z file,/path/to/api_wordlist.txt https://api.target.com/FUZZ
```

### Exploitation
```bash
# SQLMap
sqlmap -u "https://target.com/page?id=1" --dbs --batch

# Hydra brute force
hydra -l admin -P passwords.txt target.com http-post-form "/login:user=^USER^&pass=^PASS^:Invalid"
```

## 5. Checklist Methodologique

```
PHASE 1 - RECONNAISSANCE
[ ] Collecte OSINT complete
[ ] Enumeration DNS
[ ] Scan de ports
[ ] Identification des services
[ ] Mapping de l'application

PHASE 2 - ANALYSE
[ ] Scan automatise
[ ] Tests OWASP Top 10
[ ] Analyse de configuration
[ ] Review des headers
[ ] Analyse des dependances

PHASE 3 - EXPLOITATION
[ ] Validation des vulnerabilites
[ ] Creation des PoC
[ ] Documentation des impacts
[ ] Scoring CVSS

PHASE 4 - POST-EXPLOITATION
[ ] Evaluation de l'etendue
[ ] Test de mouvement lateral
[ ] Analyse des donnees accessibles

PHASE 5 - REPORTING
[ ] Rapport executif
[ ] Rapport technique
[ ] Preuves et screenshots
[ ] Recommandations

PHASE 6 - VERIFICATION
[ ] Retest des corrections
[ ] Validation finale
[ ] Rapport de cloture
```

## 6. References

- [OWASP Testing Guide v4.2](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [PTES Technical Guidelines](http://www.pentest-standard.org/index.php/Main_Page)
- [NIST SP 800-115](https://csrc.nist.gov/publications/detail/sp/800-115/final)
- [CVSS v3.1 Calculator](https://www.first.org/cvss/calculator/3.1)
