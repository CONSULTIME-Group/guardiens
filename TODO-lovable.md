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
