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

## Lot visibilité 40 % et mobilité (état au 10/10/2026, non publié)

- [x] Visibilité sans seuil de complétion : Canada = 2 gardiens (85 % et 35 %), fiches consultables
- [x] Garde-fou candidature 40 % côté base (trigger + application_completion_allowed) et message UI
- [ ] QA finale en production après GO de publication (Canada 2, refus 39 %, accord 40 %)
- [x] Fiche propriétaire : « prépare sa première annonce » affiché alors qu'une garde est terminée (statut completed ignoré), corrigé
- [ ] Fiche propriétaire Cécile : aucun animal déclaré alors que l'annonce Rouans en compte 4. Donnée de saisie, ne pas recopier les animaux de l'annonce sur la fiche (info privée), inviter la propriétaire à compléter
- [x] Fiche gardien hors France : « Montréal, Canada » dans l'en-tête et la description
- [ ] Bloc PracticalGrid présent dans le code de la fiche gardien mais jamais affiché : décider affichage ou suppression
- [ ] Libellé de région à valider : « Rhône, Alpes et Massif central »
- [ ] Audit connecté non fait par l'agent (pas de session) : propre page d'édition mobilité, vue membre connecté
- [ ] Mémoire affinité : mentionne encore le seuil 60 %, le site applique 40 %
- [ ] Connexion GitHub perdue côté Lovable : les modifications restent dans Lovable
