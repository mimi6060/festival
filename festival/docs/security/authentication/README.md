# Tests d'Authentification

## Vue d'Ensemble

Ce dossier contient les cas de test pour toutes les fonctionnalites d'authentification de la plateforme Festival Management.

## Fichiers

| Fichier | Description |
|---------|-------------|
| [brute-force.md](./brute-force.md) | Tests de brute force |
| [session-management.md](./session-management.md) | Tests de gestion de session |
| [password-reset.md](./password-reset.md) | Tests de reset de mot de passe |
| [mfa-bypass.md](./mfa-bypass.md) | Tests de bypass MFA |
| [jwt-attacks.md](./jwt-attacks.md) | Attaques sur les tokens JWT |

## Reference OWASP

- [OWASP Testing Guide - Authentication](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/04-Authentication_Testing/)
- [OWASP ASVS - Authentication](https://github.com/OWASP/ASVS/blob/master/4.0/en/0x11-V2-Authentication.md)

## Endpoints Cibles

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
POST /api/v1/auth/verify-mfa
GET  /api/v1/auth/me
```
