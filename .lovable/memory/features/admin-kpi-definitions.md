---
name: Admin KPI Definitions
description: Définitions des KPIs admin, règles de la file À traiter (échelle unifiée, seuil 2, dédup par sujet), bloc Liquidité et hiérarchie métier de l'analyse IA
type: feature
---

# Définitions KPI admin

- Rôles stricts + polyvalents (role = both) comptés une seule fois dans les totaux.
- Gardes en cours = sits au statut confirmed.
- Santé des crons : trois états ok / degraded / critical, fenêtres de surveillance DÉRIVÉES de la planification réelle dans cron.job, jamais ajustées pour éteindre une alerte (mémoire cron-monitoring-truth).
- Regroupement des signaux : dès 2 signaux non résolus du même signal_type, une seule carte groupée (GROUP_THRESHOLD = 2 dans signalGrouping.ts).

# File "À traiter" (SignalsSection + actionQueue.ts)

- Une seule échelle de priorité à trois niveaux pour les signaux ET les suggestions IA : haute / moyenne / basse (type QueuePriority). severityToPriority projette critical sur haute, warning sur moyenne.
- L'origine reste visible via une icône discrète (Activity = signal, Sparkles = suggestion IA), jamais via une seconde échelle de gravité.
- Déduplication des suggestions IA par lien ET par sujet (champ topic, valeurs dans SIGNAL_TOPIC de signalGrouping.ts). Si un signal porte déjà le sujet, la suggestion IA est écartée.
- Logique pure dans src/components/admin/signals/actionQueue.ts (buildActionQueue), testée par src/__tests__/admin-action-queue.test.ts.

# Bloc Liquidité (en tête de /admin, avant À traiter)

- Source : RPC admin_liquidity_snapshot(), fenêtre glissante 90 jours.
- Quatre indicateurs : annonces actives + gardiens éligibles (identité vérifiée, profil >= 60 %, 100 km), candidatures en attente + âge de la plus ancienne, délai médian de première réponse, conversion candidature vers garde confirmée.
- Règle absolue : jamais de taux ni de médiane sans dénominateur. Sous 5 d'effectif (MIN_DENOMINATOR), compte brut + mention "effectif trop faible".

# Analyse IA (edge function admin-activity-analysis)

- Hiérarchie métier imposée dans le prompt : 1 liquidité, 2 rétention, 3 incidents techniques, 4 acquisition. Un problème de liquidité ne peut jamais être classé sous un incident technique.
- Narratif limité à 3 phrases : état général, point de vigilance principal, rien d'autre. Pas d'énumération de chiffres déjà visibles dans les blocs.
- Chaque action porte un topic parmi les valeurs SIGNAL_TOPIC (repli "autre") pour la déduplication par sujet.
- Sémantique des champs du snapshot : affinity.concerned_signups = inscrits depuis l'activation du flag (population éligible, JAMAIS des abandons). affinity.onboarding_stale_count = abandons réels (commencé, non terminé > 24 h), seul chiffre valide pour l'onboarding inachevé. Verdict du 16/08/2026 : 437 éligibles contre 16 abandons réels, l'IA affichait 435 à tort.
