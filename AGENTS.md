# Décisions techniques

- Vue d ensemble admin (lot A13) : chaque bloc a sa propre lecture React Query, pas de squelette global, recharts en import différé, analyse IA lue en table et générée au clic ; pourquoi : moins de 16 lectures au chargement et une panne n éteint pas les autres blocs.

- Tableau de bord propriétaire (lot D1) : les blocs partagés avec le gardien changent par variante (prop `layout`/`variant`, défaut inchangé) ou par composant propriétaire dédié ; pourquoi : le rendu gardien reste intact jusqu'au lot D2.

- Pages SEO statiques Prerender : liste unique dans supabase/functions/_shared/static-seo-refresh.ts, repere "static" dans prerender_family_state pose par detect-deploy-and-mark-dirty, consomme par consume-seo-dirty ; pourquoi : le build n appelle plus aucune fonction avec la cle publique.

- Alma, classement des échanges : le modèle renvoie une ligne CLASSEMENT dans le même appel (_shared/alma-classify.ts), les motifs de _shared/alma-intent.ts servent de filet ; pourquoi : aucun appel supplémentaire, et les faux positifs des motifs seuls restent bornés.
- Normalisation des messages de contact : source unique dans supabase/functions/_shared/normalize-contact-message.ts, ré-exportée par src/lib ; pourquoi : le site et alma-chat nettoient à l identique.
- Lectures d'autrui (profil propriétaire, écussons) : vues member_owner_profiles, public_owner_profiles, public_badge_attributions, tables réservées au titulaire, à l'admin et aux personnes engagées ; pourquoi : SEC1, aucune donnée de foyer ni lien donneur exposé.
- Profil du membre connecté (lot P1) : toute lecture de profiles, sitter_profiles, owner_profiles, public_profiles pour soi passe par src/lib/myProfile.ts (clé ["my-profile", id], 5 min, `fresh` sur les écrans d'édition) ; pourquoi : 19 lectures de profiles par tableau de bord ramenées à une.
