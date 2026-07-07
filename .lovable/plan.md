## Localisation

| Zone | Fichier |
|---|---|
| Concierge IA (edge function) | `supabase/functions/draft-sit-from-prompt/index.ts` |
| Bulle d'entrée « une phrase » | `src/components/dashboard/SitDraftFromPrompt.tsx` |
| Reprise de brouillon (carte) | `src/components/dashboard/DraftResumeCard.tsx` |
| Page création + publication | `src/pages/CreateSit.tsx` |
| Composant date natif | `DateSheet` interne, `src/pages/CreateSit.tsx` L173-202 |

Parcours à 3 étapes : `STEPS = ["essentiel", "garde", "preferences"]` (L104-108). Champs obligatoires pour publier calculés L520 : `property && title && startDate && endDate && !dateError && descriptionValid && hasPhoto && profileCompletion>=40`.

---

## Bug prioritaire, dates inventées par Alma

### Cause racine (précise)

Dans `draft-sit-from-prompt/index.ts` :

1. **L63-70** : `todayIso` EST bien injecté dans le prompt, mais l'instruction ne cadre que le cas « date mentionnée sans année ». Le cas « aucune mention temporelle » n'est pas traité, et `start_date`/`end_date` ne figurent PAS dans `required` (L112). Résultat : Gemini remplit quand même le champ avec un pattern plausible tiré de son training (souvent 2024).
2. **L131-132** : le seul filtre est le regex `^\d{4}-\d{2}-\d{2}$`. Aucune borne temporelle. `"2024-08-04"` passe.
3. **L174-193** : insert direct dans `sits` avec `status='draft'`. Aucune contrainte DB sur `start_date >= today`.
4. **`CreateSit.tsx` L380-381** : `setStartDate(d.start_date || "")` recopie sans filtre. La validation L504-509 existe mais bloque seulement la publication, pas la reprise ni l'auto-save.
5. **`DraftResumeCard.tsx` L46-53** : `countFilled` compte une date passée comme un champ « rempli ». L'utilisateur voit « 7/8 champs » sur un brouillon corrompu.

### Correctif minimal (edge function + validation en cascade)

**A. Edge function `draft-sit-from-prompt/index.ts`**

- Renforcer le system prompt (L65-83). Remplacer la ligne dates par :
  > « Dates : n'inventez JAMAIS. Si aucune indication temporelle (mois, saison, dates, durée) n'est présente, laissez `start_date` et `end_date` vides et posez `flexible_dates=true`. Toute date retournée DOIT être ≥ `${todayIso}`. Si un mois est cité sans année, choisissez l'année qui rend la date ≥ `${todayIso}`. Année interdite : toute année < ${new Date().getUTCFullYear()}. »
- Ajouter garde serveur après L132, avant l'insert :
  ```
  const isPast = (d) => d && d < todayIso;
  if (isPast(draft.start_date)) { draft.start_date = null; warnings.push("Date de début non retenue, veuillez la redéfinir."); }
  if (isPast(draft.end_date))   { draft.end_date   = null; warnings.push("Date de fin non retenue, veuillez la redéfinir."); }
  if (draft.start_date && draft.end_date && draft.end_date < draft.start_date) {
    draft.end_date = null; warnings.push("Date de fin incohérente, à redéfinir.");
  }
  if (!draft.start_date || !draft.end_date) draft.flexible_dates = true;
  ```
- Tracer `owner_draft_from_prompt_date_stripped` pour métriquer.

**B. Client `CreateSit.tsx`, défense en profondeur**

- L376-381 (chargement brouillon) : si `d.start_date < today` → `setStartDate("")` et toast « La date du brouillon était dépassée, veuillez la redéfinir ». Idem `end_date`.
- L466-467 (`saveDraft`) : ne persister `startDate`/`endDate` que si `>= today`, sinon `null`. Empêche un brouillon existant de se réenregistrer avec ses valeurs passées.

**C. `DraftResumeCard.tsx`**

- Détecter `start_date < today` : ne pas compter comme « rempli » (`countFilled` L46-53) et afficher un badge « Dates à mettre à jour » sur la carte.

Cette combinaison élimine le bug à la source (IA) et empêche toute reintroduction ultérieure (edge, client, reprise).

---

## Audit workflow owner, tableau des findings

| Zone / Élément | Problème | Sévérité | Correctif proposé |
|---|---|---|---|
| Edge `draft-sit-from-prompt` L112 | `start_date`/`end_date` non `required`, IA libre d'inventer | Bloquant | Voir correctif A ci-dessus |
| Edge L131-132 | Validation dates = regex format uniquement, aucune borne | Bloquant | Ajouter guard « >= today » |
| `CreateSit.tsx` L380 | Recopie brute d'un `start_date` passé sur reprise | Bloquant | Filtrer < today au load + toast |
| `CreateSit.tsx` L444-452 | Auto-save persiste sans filtre les dates passées de l'IA | Bloquant | Sanitize dans payload `saveDraft` |
| `CreateSit.tsx` L504-509 | Validation bloque la publication mais pas l'affichage, pas de mise à jour min du picker fin après changement début | Moyen | Le `min` du 2e picker est déjà `startDate || today` (L925), OK, mais le message ne s'affiche que sur `touched`, ajouter affichage inconditionnel si date passée pré-remplie par l'IA |
| `CreateSit.tsx` L520 | `canPublish` regroupe 7 conditions sans indication ordonnée à l'utilisateur avant l'étape 2 | Moyen | Afficher les blockers dès l'étape 0 (déjà scroll to anchor L544 mais pas visible avant last step L1329) |
| `CreateSit.tsx` L487 | Le premier auto-save d'un brouillon vierge crée un sit `draft` vide dès l'ouverture (title = "") | Moyen | Repousser l'insert au 1er champ non vide utilisateur (`hasUserEditedRef` existe L446 mais l'insert vide passe quand même si un des champs contrôlés change) |
| `CreateSit.tsx` L579 | `moderateContent` bloque la publication, pas l'auto-save ni le brouillon IA | Moyen | Ajouter modération côté edge sur le blob généré, aligner |
| `CreateSit.tsx` L621 | Publication d'un draft : `UPDATE` sans filtre `status='draft'`, risque de republier via URL sur un sit déjà publié | Moyen | Ajouter `.eq("status","draft")` sur l'UPDATE L621 |
| `CreateSit.tsx` L513 | `hasPhoto` accepte photo de profil (`ownerPhotos[0]`) : une annonce publiée sans photo dédiée du logement passe | Moyen | Exiger `coverPhotoUrl` explicite, ou marquer clairement « photo du profil utilisée » |
| `DraftResumeCard.tsx` L46-53 | `countFilled` compte date passée comme remplie, donne fausse impression de complétude | Bloquant | Voir correctif C |
| `DraftResumeCard.tsx` L94-100 | Reprise navigue vers `?resume=` : cohérent avec L212 qui accepte `draftId` ou `resume`, OK | Cosmétique | RAS |
| `DraftResumeCard.tsx` L134 | Fond `amber-50/40` codé en dur, hors design system | Cosmétique | Utiliser tokens sémantiques (`warning-subtle`) |
| `SitDraftFromPrompt.tsx` L53-95 | Aucune vérif client de la limite 3/h (feedback tardif) | Cosmétique | Optionnel, afficher un compteur ou message pré-appel |
| `SitDraftFromPrompt.tsx` L86 | Redirection systématique vers `/sits/create?draftId=` même si l'IA a mis 0 champ utile (fallback silencieux) | Moyen | Si `confidence < 0.4` ou 0 dates + 0 environments, afficher un dialog « Description trop vague, ajoutez X » avant d'ouvrir le brouillon |
| Étape 0 « Où se déroulera la garde » L779-828 | La sélection « Ailleurs » redirige en 1,2 s (setTimeout L801), sans possibilité d'annuler | Cosmétique | Confirmer avant redirection ou lien direct sans setTimeout |
| Étape 0, Photos | Aucune upload photo dans le flux : dépend de `ownerPhotos` du profil. Un owner sans photo profil bloque publier sans savoir où aller | Moyen | CTA explicite « Ajouter une photo → Profil » en bloqueur, avec deep-link |
| Étape 2 preferences | Champ Animal / logement non éditables ici, viennent de `properties`/`pets` : incohérence avec brouillon IA qui pourrait proposer 2 chats alors que profil = 1 chien | Moyen | Afficher un badge « animaux tirés de votre profil » et lien vers /owner-profile |
| Mobile ≤ 400px | `DateSheet` (Sheet bottom) OK. Stepper L136 tronque labels via `hidden sm:inline` OK. À vérifier : `publishBlockers` liste L1329 sur mobile étroit | À valider | Test manuel Playwright 360 px |
| États | `saving/publishing` gérés. Erreur `saveDraft` silent par défaut L494, aucun feedback si autosave échoue en boucle | Moyen | Toast d'échec après 2 tentatives silencieuses successives |
| Code mort | `hasUserEditedRef` set mais jamais lu | Cosmétique | Nettoyer ou brancher sur l'insert vide (cf. ligne CreateSit L487) |

---

## Top 3 correctifs prioritaires

1. **Bug dates IA** : renforcer prompt + guard `>= today` dans l'edge function, ET sanitize au chargement brouillon dans `CreateSit.tsx`, ET détection stale dans `DraftResumeCard.tsx`. Sans les 3 couches, le bug se réintroduit.
2. **Insert vide au chargement** de `/sits/create` : ne créer le brouillon qu'au premier champ non vide effectif, sinon on pollue la table `sits` de brouillons fantômes et on fausse `DraftResumeCard`.
3. **Republication accidentelle** : `UPDATE` de publication L621 sans filtre `status='draft'` — ajouter la contrainte, sinon une URL `?draftId=<sit_publié>` republierait sans garde-fou.

Aucune modification de code effectuée.