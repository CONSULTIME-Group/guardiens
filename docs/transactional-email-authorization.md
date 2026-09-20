# Autorisations du point d'envoi transactionnel — 20 septembre 2026

## Deuxième lot : candidatures et confirmation

Base : `350c33969dfb49e71371dc990ede2daa8af7e998`. Ce complément remplace le
statut « autorisation métier à faire » pour les trois modèles ci-dessous au
moment de l'appel navigateur. Les six autres modèles restent à traiter.

| Modèle | Conditions lues en base |
| --- | --- |
| application-accepted | Appelant propriétaire réel, destinataire gardien de la candidature, candidature accepted ; garde published, confirmed ou in_progress |
| application-declined | Appelant propriétaire réel, destinataire gardien de la candidature, candidature rejected |
| sit-confirmed | Appelant et destinataire propriétaires de la garde, garde confirmed ou in_progress, une seule candidature accepted |

Les formats de clé existants (candidature, conversation, refus automatique et
confirmation) servent uniquement à retrouver l'événement. Aucune clé déclarée
ni donnée de présentation ne constitue une preuve d'autorisation. Un format
inconnu, une ligne absente, un autre acteur/destinataire ou un état incompatible
est refusé en403. Une lecture impossible/ambiguë est refusée en503, sans détail
privé et avant écriture ou envoi. Admin et service conservent leur chemin dédié.

Le payload des trois modèles est entièrement reconstruit depuis la base :
titre, prénoms, motif/variante du refus, ville, dates, animaux et lien de garde.
Les champs supplémentaires fournis par le navigateur sont écartés. La clé
canonique repose sur la candidature ou la garde réelle. La déduplication cherche
aussi les anciennes clés de conversation et de refus automatique ; elle échoue
sans envoi si cette lecture est indisponible. Les adresses sont normalisées et
la recherche historique tolère la casse. La vérification de destinataire exige
l'égalité réelle d'adresse ; les caractères SQL `%` et `_` restent littéraux.

Validation locale : huit régressions du handler reproduites avant intégration,
puis deux cas de confusion d'adresse reproduits avant correction.59 cas pour
le module réel et57 pour le handler réel/confidentialité, avec DB et fournisseur
inertes. Aucun appel métier réel pour tester. Le module n'offre aucune écriture.
Les contrôles voisins et le typecheck sont consignés dans l'audit central.

Lecture seule du20septembre08:15:50.432654UTC : aucune entrée différée en attente
pour ces trois modèles (deux anciennes acceptations et un refus déjà sent).
Aucune migration de file, aucune modification de schéma ou de parcours frontend.

Limites explicites :
- L'autorisation est vérifiée à l'appel ; ce lot ne crée pas une transaction
  atomique avec une décision métier concurrente ni une nouvelle vérification
  de statut dans le worker qui envoie plus tard un email différé.
- La déduplication par lecture conserve ses limites face aux appels simultanés.
  Aucun verrou/claim atomique ajouté dans ce lot.
- Les six modèles invitations, annulations (deux), avis, aide pendant la garde
  et retour de dépublication restent à sécuriser au niveau événement.
- Le helper navigateur doit encore mieux distinguer refus métier HTTP200,
  différé et envoi. Aucun envoi ou affichage réel n'est prouvé par ces tests.

## Premier lot : historique conservé

Lot borné : modèles appelables par un membre et paramètres réservés aux workers.
Base relue : `33140078493129839a6802b2557fb44fdecbda11`.

## Politique

Le handler vérifie la session auprès de Supabase Auth puis le rôle admin en base.
Une erreur de lecture du rôle ne confère aucun privilège admin. Le chemin service
requiert l'égalité avec la clé serveur configurée, jamais un simple claim JWT.

Sur les 92 modèles actuellement enregistrés, 83 exigent un admin vérifié ou le
service. La destination personnelle du membre ne constitue plus une exception.
Tout nouveau modèle enregistré est refusé aux membres par défaut.

Neuf modèles restent accessibles aux parcours membres existants :

| Modèle | Appels navigateur recensés |
| --- | --- |
| application-accepted | ApplicationsList, ConversationHeader |
| application-declined | ApplicationsList, ConversationHeader, declineOpenApplications |
| sit-confirmed | ApplicationsList |
| cancellation-by-owner | CancelSitModal, branche propriétaire |
| cancellation-by-sitter | CancelSitModal, branche gardien |
| sit-invitation | useSitInvitations |
| review-received | LeaveReview |
| help-during-sit | HelpDuringSitDialog |
| listing-unpublished-feedback | OwnerSitView |

Les références opaques de destinataires continuent à être résolues exclusivement
côté serveur. Le contrôle d'appartenance du destinataire à Guardiens demeure.

`sourceQueueId`, son alias `source_queue_id`, et les `logMetadata` non vides sont
réservés au service, y compris face à une session admin. Aucun appel navigateur
recensé n'en dépend. Le retraitement de la file et les expéditeurs internes
utilisent la clé service. Les champs optionnels vides restent acceptés.
Le refus intervient avant déduplication, écriture, rendu ou envoi.

## Compatibilité et vérification

- Inventaire des appels dans `src`, des fetch/invoke vers le sender dans les Edge
  et des quatre fonctions SQL actives qui le référencent : lecture seule.
- Aucun job cron actif ou inactif ne référence directement ce point d'envoi au
  contrôle du 20 septembre 2026.
- Tous les appels Edge recensés utilisent une clé service, directement ou via
  leur client Supabase ; les chemins admin conservent leurs modèles.
- Le test `notification-recipient-privacy.test.ts` exécute le vrai handler avec
  DB, fournisseur et rendu inertes. Aucun réseau ni email réel n'est possible.
- Avant correction : 12 échecs, 30 réussites. Après correction : 42 réussites.
  Avec les sept suites voisines (file, liens, plafonds et préférences) : 104 réussites.
  Les cas parcourent aussi les 83 modèles restreints et les 92 modèles en mode
  admin/service ; ces boucles ne sont pas 83/92 tests Vitest distincts.
- Sont couverts : refus même vers soi, modèle futur, rôle illisible, paramètres
  worker, références, destinataire fixe, neuf parcours membres, anonymes/claim
  forgé, absence d'écriture lors des refus, réponse sans adresse privée.

## Limites restant ouvertes

Ce lot ne prouve PAS l'autorisation métier des neuf modèles hérités : leur
événement, l'acteur, le destinataire et le contenu doivent encore être rapprochés
côté serveur. Les plafonds d'envoi et la présence d'un compte destinataire ne
remplacent pas cette vérification. Ne pas annoncer le sender entièrement audité.
Les références de destinataire sont résolues avant la nouvelle décision sur le
modèle ; cette lecture ne renvoie pas l'adresse au client.

Aucune tentative d'exploitation sur un membre, aucun envoi de test, aucun
retraitement manuel de file. Un succès d'envoi simulé ne prouve ni envoi réel
ni livraison. La preuve des passages naturels reste à recueillir après le
déploiement effectif. Les preuves datées de déploiement sont dans l'audit central.
