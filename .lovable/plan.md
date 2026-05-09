
## 1. Pourquoi « plein de msgs envoyés » alors que la page vient d'être mise en ligne

La page `/admin/nurturing` est **un nouveau tableau de bord**, mais **le moteur de nurturing tourne depuis avril 2026**. Le cron `evaluate-journeys` parcourt les utilisateurs toutes les heures et envoie les bons emails au bon moment, sans dashboard.

Ce que disent les données aujourd'hui (9 mai) :

- **124 emails de nurturing envoyés ce jour** (rien d'anormal — rattrapage de tous les profils éligibles depuis l'activation des nouvelles séquences) :
  - 45 « Bienvenue J+1 »
  - 37 « Encouragement à candidater » (gardiens sans candidature)
  - 24 « Relance profil incomplet »
  - 18 « Conseils pour publier l'annonce »
- Les **533 « signup » et 460 « welcome »** visibles dans `email_send_log` ne sont **PAS du nurturing** : ce sont des emails **transactionnels / auth** envoyés par Supabase à chaque inscription. Ils n'apparaissent pas dans cette page.

Concrètement : la page ne « génère » aucun envoi, elle ne fait que **révéler** ce que le système faisait déjà en silence.

---

## 2. Audit UX de la page actuelle

La page fait **1 151 lignes** et empile une dizaine de blocs sans hiérarchie claire. Problèmes :

| Constat | Impact |
|---|---|
| Plage par défaut = **30 jours** | Difficile de voir ce qui se passe « en ce moment » |
| Titre « Suivi des envois » | Ne dit pas à quoi sert la page |
| Pas d'indicateur unique de **santé du système** (cron + queue + taux d'envoi) | L'admin doit lire 5 cartes pour savoir si tout va bien |
| Glossaire + Séquences + Top steps + Top CTA + Erreurs + Queue + Timeline + Reason breakdown sur **une seule page scrollable** | Surcharge cognitive |
| Pas de bouton « **Lancer evaluate-journeys maintenant** » | Pour tester ou rattraper, il faut attendre l'heure pile |
| Pas de vue « **prochains envois prévus** » | On voit ce qui est parti, jamais ce qui va partir |
| Carte « Top contenus » et « Top CTA » noyées en bas | Le levier d'optimisation est invisible |

---

## 3. Refonte proposée

### a. En-tête « Pilotage du nurturing »

Renommer + ajouter un **bandeau de santé** unique avec 3 pastilles :
- **Cron** (vert si dernier passage < 70 min)
- **Queue** (vert si pas de pending qui s'accumule)
- **Délivrabilité** (vert si taux d'envoi ≥ 95 % sur 7 j)

Bouton **« Lancer une évaluation maintenant »** (invoke `evaluate-journeys`).

### b. Plage par défaut = **7 jours** (au lieu de 30 j)

### c. Réorganisation en 3 onglets (`Tabs` shadcn)

```text
┌─────────────────────────────────────────────────┐
│  Vue d'ensemble │ Performance │ Diagnostic     │
└─────────────────────────────────────────────────┘
```

**Onglet 1 — Vue d'ensemble** *(ce que je dois savoir en 10 secondes)*
- KPI globaux : envoyés / ouverts / cliqués / actions
- Carte « Top 3 contenus qui marchent » (top action rate)
- Carte « Top 3 contenus à retravailler » (action rate < 10 %, ≥ 10 envois)
- Bloc « Séquences actives » (compact, sans les étapes — un lien « Détail »)

**Onglet 2 — Performance** *(comprendre quoi optimiser)*
- Tableau complet `topSteps` (déjà existant) — triable
- Tableau complet `topCtas` (déjà existant) — quels liens cliqués
- Détail par séquence avec étapes + bouton « Voir destinataires »

**Onglet 3 — Diagnostic** *(quand quelque chose cloche)*
- Time series sent/failed/exited
- Reason breakdown
- 30 derniers échecs avec error_detail
- Queue stats (pending / sent / failed / suppressed)

### d. Glossaire → repositionné en `Popover` discret « Comment lire cette page ? » dans l'en-tête, plus en pavé qui prend 200 px de haut.

### e. Petit picto contextuel sur chaque KPI : au survol, le calcul exact (ex. « action = clic CTA OU sortie via objectif atteint dans les 7 j »).

---

## 4. Détails techniques

- Aucune modification de `evaluate-journeys`, des templates, ni des tables — uniquement réorganisation du fichier `src/pages/admin/AdminNurturing.tsx`.
- Extraire 3 composants : `NurturingHealthBar`, `NurturingOverviewTab`, `NurturingPerformanceTab`, `NurturingDiagnosticTab` sous `src/components/admin/nurturing/` pour ramener le fichier page à ~200 lignes.
- Réutiliser `SequenceRecipientsDialog` tel quel.
- Bouton « Lancer évaluation » : `supabase.functions.invoke('evaluate-journeys', { body: { manual: true } })` + toast + refresh.
- Default `range` passe de `"30d"` à `"7d"`.

---

## 5. Hors scope (à valider plus tard si vous le souhaitez)

- Vue « Prochains envois prévus dans les 24 h » (nécessite un nouveau endpoint dans `evaluate-journeys` en mode dry-run).
- Édition des séquences/étapes depuis l'admin (actuellement read-only).
- Export CSV des destinataires.

---

**Validez-vous cette refonte ?** Si oui, je l'applique d'un seul coup. Si vous voulez ajuster (ex. garder la plage 30 j par défaut, ne pas faire les onglets, supprimer un bloc), dites-le et j'adapte avant de coder.
