# Fermer la fonction generate-longtail-article

## Résultat des tests (sans Authorization ni apikey, production)

| Appel | Statut | Ce que cela prouve |
|---|---|---|
| OPTIONS generate-longtail-article | 200 | Préflight ouvert, normal |
| POST generate-longtail-article, charge invalide | 400 avec le détail de validation zod | **Aucune authentification.** La requête a traversé la passerelle et atteint le code métier : seule la validation du contenu l'a arrêtée. Une charge valide aurait inséré un article en base sous la clé de service. |
| OPTIONS generate-article | 200 | Préflight ouvert, normal |
| POST generate-article, charge invalide | 401 Unauthorized | Authentification effective, la vérification du jeton précède le code métier |

Aucune écriture n'a été faite : les charges envoyées ne peuvent pas insérer.

## Gravité

Critique. `generate-longtail-article` est un endpoint d'écriture anonyme : n'importe qui peut créer autant de brouillons d'articles qu'il veut dans la table `articles`, avec titre, contenu et slug de son choix par le biais des paramètres ville et race. Les brouillons ne sont pas publiés, mais la table peut être noyée, et tout automatisme de publication ou de relecture derrière devient un vecteur.

## Cause

`supabase/functions/generate-longtail-article/index.ts` n'a aucune vérification d'identité, contrairement à `generate-article` (l. 13-29) qui refuse sans jeton. La fonction n'est pas déclarée dans `supabase/config.toml`, son `verify_jwt` est donc réglé hors fichier, et il est à faux.

## Correction proposée

1. Ajouter en tête de `generate-longtail-article/index.ts` le contrôle admin partagé déjà utilisé ailleurs, `requireAdminOrServiceRole` de `supabase/functions/_shared/require-admin.ts` : la fonction est un outil de rédaction interne, elle n'a aucune raison d'être ouverte.
2. Déclarer la fonction dans `supabase/config.toml` avec `verify_jwt = true`, pour que la configuration versionnée corresponde à la réalité.
3. Vérifier, après déploiement, qu'un appel anonyme répond 401 et qu'un appel admin fonctionne toujours.

## Contrôle complémentaire recommandé

Le même test mérite d'être passé sur les autres fonctions d'écriture absentes de `config.toml`, en particulier `generate-breed-profile`, `generate-city-page`, `generate-department-page`, `generate-location-profile`, `auto-internal-links`, `copy-association-photos`, `backfill-profile-coordinates` et `normalize-skill`. Je peux le faire en lecture seule, avec des charges invalides, et vous donner la liste de celles qui sont ouvertes.

Rien n'est modifié tant que vous n'avez pas validé.
