## Refonte AdminNurturing — Contrôle complet de l'engagement

Aujourd'hui le dashboard agrège tout au niveau séquence. On va descendre jusqu'à **l'étape**, **l'utilisateur** et **le CTA cliqué** pour pouvoir répondre à : *quel contenu fonctionne, qui agit, sur quoi ?*

---

### Nouveaux blocs ajoutés à `/admin/nurturing`

**1. Classement des étapes par taux d'action (Top / Flop)**
Tableau triable agrégé par `(sequence_key, step_order, template_name)` :
- Envoyés · Ouvertures (%) · Clics CTA (%) · **Taux d'action (%)** · Sorties objectif
- Tri par défaut : taux d'action décroissant
- Surligne les étapes avec ≥ 10 envois (signal statistique minimal) en vert si ≥ 30% d'action, rouge si < 10%
- Permet de voir d'un coup d'œil quels emails *créent vraiment de l'action*

**2. Classement des CTA cliqués (par URL)**
Tableau agrégé sur `email_engagement_events.target_url` (event_type = click) :
- URL · Template d'origine · Nombre de clics · Cliqueurs uniques
- Trié par clics décroissants
- Répond à : « quel bouton/lien fait bouger les gens ? »

**3. Drill-down par séquence : « Voir les destinataires »**
Bouton sur chaque carte séquence → ouvre une modale avec la liste des utilisateurs du parcours :
- Nom + email · Étape actuelle · Statut (active / exited / dropped)
- Timeline mini : pour chaque step, indicateurs Envoyé / Ouvert / Cliqué (3 pastilles colorées)
- Date de sortie + raison (`exit_condition_met` / `dropped` / `failed`)
- Lien vers le profil utilisateur
- Pagination (50 par page)

**4. Filtre temporel global**
Sélecteur déjà présent (24h / 7j / 30j) appliqué partout : KPI globaux, KPI par séquence, classements, drill-down.

---

### Détails techniques

**Pas de migration DB** : tout est calculable depuis les tables existantes (`journey_step_log`, `email_engagement_events`, `journey_enrollments`, `profiles`).

**Agrégations** :
- Top étapes : group by `(sequence_key, step_order)` sur `journey_step_log` joint à `email_engagement_events` via `message_id`
- Top URLs : group by `target_url` sur `email_engagement_events` filtré `event_type='click'` joint au log pour récupérer le template
- Drill-down : query lazy au clic sur le bouton, pas chargé d'office (perf)

**Définition « action »** : conservée — clic CTA OU `exit_condition_met` dans les 7 jours suivant l'envoi.

**Composants nouveaux** :
- `<TopStepsTable>` : rangée Top/Flop dans une `Card` après les KPI globaux engagement
- `<TopCtaTable>` : à côté ou en dessous
- `<SequenceRecipientsDialog>` : modale shadcn, déclenchée par bouton « Voir destinataires »

**Aucun changement** côté edge functions ou tracking — les données sont déjà collectées depuis l'implémentation précédente.

---

### Ordre d'exécution

1. Hook `useTopSteps` + composant `<TopStepsTable>`
2. Hook `useTopCtas` + composant `<TopCtaTable>`
3. Bouton + dialog `<SequenceRecipientsDialog>` avec query lazy
4. Insertion dans `AdminNurturing.tsx` après le bloc Engagement global
5. Vérif build + visuel

Estimation : ~300-400 lignes ajoutées, réparties en 3 nouveaux fichiers + insertion dans la page existante.
