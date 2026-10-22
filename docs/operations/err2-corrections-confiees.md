# Corrections confiées à Claude (lot ERR2)

Le bouton « Confier à Claude » de /admin/errors pose `fix_requested_at` sur le dossier (table `error_logs`, migration drizzle 0096). Une tâche Claude planifiée, « Corrections confiées Guardiens », passe chaque matin vers 7 h (heure de Paris) et reprend les demandes en attente.

## Ce que fait la tâche
1. Lit les demandes en attente : `fix_requested_at` renseigné, `resolved_at` vide, et `fix_attempted_at` vide ou antérieur à la demande. Aucune demande : fin immédiate, rien n'est écrit.
2. Clone CONSULTIME-Group/guardiens, lit AGENTS.md, diagnostique chaque dossier (code, base en lecture seule).
3. Regroupe les correctifs sur une branche `lot-errfix-AAAAMMJJ`, avec tests de verrou dans `src/__tests__/errfix/`, `tsc -b` vert, entrée AGENTS.md, puis ouvre une PR vers `main`.
4. Écrit pour chaque dossier traité `fix_attempted_at`, `fix_pr_url` (ou rien si aucun correctif) et la cause dans `admin_notes`.

## Ce qu'elle ne fait jamais
Fusionner, déployer une fonction, publier le site, marquer un dossier résolu, écrire une autre colonne ou une autre table, recopier un email de membre.

## Après la PR
Jérémie relit et fusionne, redéploie les fonctions touchées si la PR le demande, publie, puis marque les dossiers résolus. Un dossier qui revient après résolution s'affiche « Récidive ».

## États affichés dans l'admin
- « Confiée à Claude » : en attente du prochain passage (« Retirer la demande » possible).
- « PR à fusionner » : correctif proposé, lien vers la PR dans le détail.
- « Examinée par Claude » : passage sans PR, la note de correction dit pourquoi (hors du code, non reproductible, décision produit).
