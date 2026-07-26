# TODO Lovable — Prompts différés

Fichier de suivi des tâches reportées. Mis à jour manuellement après chaque session Lovable.

## Analytics (V1.1)

- [ ] Webhook Supabase INSERT profiles → Edge Function `track-signup-completed` (remplacer le retry 500ms côté client par source de vérité serveur)

- [ ] Event `signup_email_verified` sur callback de vérification email

- [ ] Events `application_started`, `application_completed`, `application_abandoned` sur le formulaire de candidature

## Partage social

- [ ] Ajouter paramètres UTM sur URLs partagées dans ShareButtons (format : `?utm_source=share&utm_medium={channel}&utm_campaign=sit_{sit_id}`)

## Favoris

- [ ] Décider : intégrer bouton FavoriteButton sur PublicSitDetail OU supprimer le composant mort

- [ ] Si intégration : events `sit_favorite_added` / `sit_favorite_removed`

## Contact / Messagerie fiche annonce

- [ ] Statu quo : `sit_apply_clicked` couvre l'intent. Réévaluer si ajout d'un bouton "Poser une question" en V2.

## SEO / Search Console

- [ ] **Relancer connexion Google Search Console** (bloqué actuellement par OAuth « Invalid session »)
  - Pré-requis utilisateur : autoriser popups + cookies tiers sur `lovable.dev` et `accounts.google.com`, garder l'onglet Lovable ouvert pendant tout le flow.
  - Commande de reprise : dire « relance GSC » dans le chat → l'agent rappelle `standard_connectors--connect connector_id=google_search_console`.
  - Une fois connecté, flow META verification sur `https://guardiens.lovable.app/` puis soumettre `https://guardiens.lovable.app/sitemap.xml` (ou idéalement `https://guardiens.fr/sitemap.xml` si on déclare la propriété sur le domaine custom).
  - **Échéance impérative** : à définir (pas de date fixée, pivot pricing "gratuit sans deadline" du 5 juillet 2026).
  - Finding tracker associé : `gsc:gsc` (catégorie indexing, impact mid). Marqué « ignored » manuellement dans Lovable → SEO & AI search.

## Preuve d'activité locale dans seo_city_pages (reporté)

- [ ] Injecter les gardes archivées comme preuve d'activité sur les pages ville (« 12 gardes réalisées à Lyon depuis mai 2026 »).
  - Reporté volontairement : avec 18 annonces au total (dont 8 archivées), les chiffres affichés seraient trop faibles pour rassurer, et parfois nuls sur la majorité des villes. Un compteur à 1 ou 2 dessert la page.
  - Reprendre quand le stock d'annonces archivées le justifie (ordre de grandeur : au moins 10 gardes réalisées sur une même ville).
  - Contrainte de sécurité à respecter à ce moment : agrégats uniquement, jamais de dates précises ni de lien vers l'annonce archivée.
