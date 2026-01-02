# Politique de Retention des Donnees

**Festival Management Platform**

**Date:** 2026-01-02
**Version:** 1.0
**Reference RGPD:** Article 5.1.e - Limitation de la conservation

---

## 1. Principes generaux

### 1.1 Principe de minimisation temporelle

Les donnees personnelles sont conservees sous une forme permettant l'identification des personnes concernees **pendant une duree n'excedant pas celle necessaire** au regard des finalites pour lesquelles elles sont traitees.

### 1.2 Categories de durees

| Categorie | Description | Declencheur suppression |
|-----------|-------------|------------------------|
| **Active** | Donnees en cours d'utilisation | Fin de la relation/finalite |
| **Archive** | Donnees archivees (acces restreint) | Fin obligation legale |
| **Suppression** | Donnees effacees ou anonymisees | Automatique |

---

## 2. Durees de retention par type de donnees

### 2.1 Donnees utilisateurs

| Donnee | Duree active | Duree archive | Total | Justification |
|--------|--------------|---------------|-------|---------------|
| Compte utilisateur | Vie du compte | 3 ans | Variable | Prescription civile |
| Email | Vie du compte | 3 ans | Variable | Communication |
| Mot de passe (hash) | Vie du compte | 0 | - | Suppression immediate |
| Telephone | Vie du compte | 0 | - | Non necessaire archive |
| Photo profil | Vie du compte | 0 | - | Suppression immediate |
| Preferences | Vie du compte | 0 | - | Suppression immediate |

**Action a la suppression du compte:**
- Anonymisation des donnees liees aux transactions (obligation comptable)
- Suppression des donnees personnelles
- Conservation de l'ID anonymise pour coherence

### 2.2 Donnees de billetterie

| Donnee | Duree active | Duree archive | Total | Justification |
|--------|--------------|---------------|-------|---------------|
| Ticket | Festival + 1 an | 9 ans | 10 ans | Art. L.123-22 C.com |
| QR Code | Festival | 0 | - | Plus necessaire |
| Prix achat | Festival + 1 an | 9 ans | 10 ans | Comptabilite |
| Date utilisation | Festival + 1 an | 0 | - | Plus necessaire |

### 2.3 Donnees de paiement

| Donnee | Duree active | Duree archive | Total | Justification |
|--------|--------------|---------------|-------|---------------|
| Transaction | 3 ans | 7 ans | 10 ans | Obligation fiscale |
| Montant | 3 ans | 7 ans | 10 ans | Comptabilite |
| Reference Stripe | 3 ans | 7 ans | 10 ans | Tracabilite |
| Carte bancaire | 0 | 0 | 0 | Non stockee (Stripe) |

### 2.4 Donnees cashless

| Donnee | Duree active | Duree archive | Total | Justification |
|--------|--------------|---------------|-------|---------------|
| Compte cashless | Festival + 90j | 9 ans | ~10 ans | Remboursement + comptabilite |
| Transactions | Festival + 1 an | 9 ans | 10 ans | Tracabilite financiere |
| Solde | Festival + 90j | 0 | - | Remboursement |
| Tag NFC | Festival | 0 | - | Plus necessaire |

### 2.5 Donnees d'acces zones

| Donnee | Duree active | Duree archive | Total | Justification |
|--------|--------------|---------------|-------|---------------|
| Log entree/sortie | Festival + 30j | 11 mois | 1 an | Securite |
| Zone accedee | Festival + 30j | 11 mois | 1 an | Securite |
| Horodatage | Festival + 30j | 11 mois | 1 an | Securite |

**Note:** Anonymisation apres 1 an - conservation des statistiques agregees uniquement.

### 2.6 Donnees staff

| Donnee | Duree active | Duree archive | Total | Justification |
|--------|--------------|---------------|-------|---------------|
| Profil staff | Duree mission | 5 ans | Variable | Code du travail |
| Planning | Duree mission | 5 ans | Variable | Obligations sociales |
| Pointages | Duree mission | 5 ans | Variable | Code du travail |
| Contact urgence | Duree mission | 0 | - | Plus necessaire |
| Badge | Duree mission | 0 | - | Desactive |

### 2.7 Donnees camping

| Donnee | Duree active | Duree archive | Total | Justification |
|--------|--------------|---------------|-------|---------------|
| Reservation | Festival + 30j | 11 mois | 1 an | Litiges potentiels |
| Plaque vehicule | Festival | 0 | - | Plus necessaire |
| QR camping | Festival | 0 | - | Plus necessaire |

### 2.8 Donnees support

| Donnee | Duree active | Duree archive | Total | Justification |
|--------|--------------|---------------|-------|---------------|
| Ticket support | Resolution + 1 an | 2 ans | 3 ans | Reclamations |
| Messages | Resolution + 1 an | 2 ans | 3 ans | Historique |
| Pieces jointes | Resolution + 1 an | 0 | - | Suppression |

### 2.9 Donnees notifications

| Donnee | Duree active | Duree archive | Total | Justification |
|--------|--------------|---------------|-------|---------------|
| Notifications | 90 jours | 0 | 90j | Experience utilisateur |
| Push tokens | Session active | 0 | - | Suppression si inactif 90j |
| Preferences | Vie du compte | 0 | - | Lie au compte |

### 2.10 Donnees techniques

| Donnee | Duree active | Duree archive | Total | Justification |
|--------|--------------|---------------|-------|---------------|
| Logs d'audit | 1 an | 1 an | 2 ans | Securite, investigation |
| Logs applicatifs | 30 jours | 0 | 30j | Debug |
| Logs acces | 1 an | 1 an | 2 ans | Securite |
| Sessions | Vie session | 0 | - | Suppression immediate |

---

## 3. Processus de suppression

### 3.1 Suppression automatique

Les jobs automatiques suivants sont executes:

```
┌─────────────────────────────────────────────────────────────────┐
│                    JOBS DE RETENTION                             │
├─────────────────────────────────────────────────────────────────┤
│  Job                    │ Frequence │ Action                     │
├─────────────────────────┼───────────┼───────────────────────────┤
│  cleanup-notifications  │ Quotidien │ Supprimer notifs > 90j    │
│  cleanup-sessions       │ Quotidien │ Supprimer sessions exp.   │
│  cleanup-push-tokens    │ Hebdo     │ Supprimer tokens inactifs │
│  cleanup-zone-logs      │ Mensuel   │ Anonymiser logs > 1 an    │
│  cleanup-support        │ Mensuel   │ Archiver tickets > 3 ans  │
│  archive-transactions   │ Annuel    │ Archiver transactions     │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Suppression sur demande

Voir `/docs/compliance/gdpr/procedures/deletion-procedure.md`

### 3.3 Anonymisation

Quand la suppression complete n'est pas possible (obligations legales):

| Donnee originale | Donnee anonymisee |
|------------------|-------------------|
| Jean Dupont | [ANONYMISE] |
| jean@email.com | deleted_[hash]@anonymized.local |
| 0612345678 | NULL |
| User ID | Conserve pour coherence |

---

## 4. Tableau recapitulatif par entite

| Entite | Declencheur | Duree | Action |
|--------|-------------|-------|--------|
| User | Suppression compte | Immediate + 3 ans archive | Anonymisation |
| Ticket | Fin festival | 10 ans | Archive puis suppression |
| Payment | Transaction | 10 ans | Archive puis suppression |
| CashlessAccount | Fin festival | 10 ans | Archive puis suppression |
| CashlessTransaction | Transaction | 10 ans | Archive puis suppression |
| ZoneAccessLog | Log | 1 an | Anonymisation |
| StaffMember | Fin mission | 5 ans | Archive puis suppression |
| StaffShift | Shift | 5 ans | Archive puis suppression |
| CampingBooking | Check-out | 1 an | Suppression |
| SupportTicket | Resolution | 3 ans | Suppression |
| Notification | Creation | 90 jours | Suppression |
| PushToken | Derniere utilisation | 90 jours inactivite | Suppression |
| AuditLog | Log | 2 ans | Suppression |

---

## 5. Exceptions a la retention standard

### 5.1 Contentieux en cours

En cas de litige:
- Conservation prolongee jusqu'a resolution definitive
- Documentation de l'exception
- Revue periodique du statut

### 5.2 Demande autorite

Sur demande d'une autorite competente:
- Conservation selon duree requise
- Documentation de la demande
- Suppression des que possible

### 5.3 Interets vitaux

En cas de besoin pour interets vitaux:
- Conservation le temps necessaire
- Documentation de la justification

---

## 6. Stockage et acces archives

### 6.1 Separation des donnees

| Categorie | Stockage | Acces |
|-----------|----------|-------|
| Donnees actives | Base production | Normal |
| Archives recentes (< 3 ans) | Base archive | Restreint |
| Archives anciennes (> 3 ans) | Cold storage | DPO + Legal |

### 6.2 Securite des archives

- Chiffrement AES-256
- Acces authentifie et autorise
- Audit des acces
- Backup separe

---

## 7. Implementation technique

### 7.1 Champs de tracking

```typescript
// Champs presents sur les entites
interface RetentionTracking {
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;      // Soft delete
  archivedAt?: Date;     // Archive date
  retentionExpiresAt?: Date; // Auto-calculated
}
```

### 7.2 Job de nettoyage (exemple)

```typescript
// Pseudo-code job de nettoyage
async function cleanupExpiredData() {
  // Notifications > 90 jours
  await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: subDays(new Date(), 90) }
    }
  });

  // Zone logs > 1 an -> anonymisation
  await prisma.zoneAccessLog.updateMany({
    where: {
      timestamp: { lt: subYears(new Date(), 1) }
    },
    data: {
      ticketId: 'ANONYMIZED',
      performedById: null
    }
  });

  // Push tokens inactifs > 90 jours
  await prisma.pushToken.deleteMany({
    where: {
      lastUsedAt: { lt: subDays(new Date(), 90) }
    }
  });
}
```

---

## 8. Revue et mise a jour

### 8.1 Revue periodique

- **Frequence:** Annuelle
- **Responsable:** DPO
- **Objectif:** Verifier adequation des durees

### 8.2 Modifications

Toute modification de cette politique doit etre:
1. Documentee avec justification
2. Validee par le DPO
3. Communiquee si impact significatif
4. Mise en oeuvre techniquement

---

## 9. Contact

Pour toute question sur la retention des donnees:
- **DPO:** dpo@festival-platform.com
- **Support:** privacy@festival-platform.com

---

*Document mis a jour le 2026-01-02 - Version 1.0*
