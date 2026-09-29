# Décisions techniques

- Tableau de bord propriétaire (lot D1) : les blocs partagés avec le gardien changent par variante (prop `layout`/`variant`, défaut inchangé) ou par composant propriétaire dédié ; pourquoi : le rendu gardien reste intact jusqu'au lot D2.

- Pages SEO statiques Prerender : liste unique dans supabase/functions/_shared/static-seo-refresh.ts, repere "static" dans prerender_family_state pose par detect-deploy-and-mark-dirty, consomme par consume-seo-dirty ; pourquoi : le build n appelle plus aucune fonction avec la cle publique.

- Alma, classement des échanges : le modèle renvoie une ligne CLASSEMENT dans le même appel (_shared/alma-classify.ts), les motifs de _shared/alma-intent.ts servent de filet ; pourquoi : aucun appel supplémentaire, et les faux positifs des motifs seuls restent bornés.
- Normalisation des messages de contact : source unique dans supabase/functions/_shared/normalize-contact-message.ts, ré-exportée par src/lib ; pourquoi : le site et alma-chat nettoient à l identique.
