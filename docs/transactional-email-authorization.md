# Autorisations du point d'envoi transactionnel — 20 septembre 2026

## Sixième lot : supervision des réservations membres

Le watchdog existant (job122, toutes les cinq minutes, relu le20septembre à
10:05:35UTC) contrôle deux agrégats : toutes les réservations uncertain et les
sending dont updated_at est strictement antérieur à dix minutes. Les états sent
et retryable, ainsi que les sending récents, ne constituent pas une anomalie.
Deux requêtes exact/head ne rapportent aucune ligne, empreinte ni jeton.

Les diagnostics sont visibles dans Administration → Erreurs, source
email-pipeline-watchdog, empreintes email_pipeline:member_email_claims_uncertain,
stale_sending ou unavailable. Le message reste stable ; les compteurs courants
et la date du contrôle figurent dans le contexte (le logger existant actualise
le contexte, mais conserve son message initial).

Aucun email d'alerte supplémentaire. La réponse du watchdog ajoute member_claims
avec checked_at, uncertain et stale_sending. Le champ anomalies reste celui du
pipeline historique ; il ne faut pas l'utiliser seul pour les réservations.
Le contrôle est indépendant de la présence d'une ligne de santé du pipeline auth.
Lecture échouée ou compteur absent/invalide : diagnostic unavailable et HTTP500,
sans clôture des alertes existantes. Le contrôle historique du pipeline et ses
alertes continuent même si cette supervision est indisponible ; ok reste false
et member_claims vaut null. Écriture/clôture du diagnostic échouée :
HTTP500, jamais un faux succès. Les erreurs de cette supervision sont génériques.

Après une lecture complète, seul un compteur redevenu zéro clôture son propre
diagnostic. Source, empreinte exacte, état non résolu et last_seen_at antérieur
au début du contrôle limitent la clôture ; une occurrence plus récente est
préservée. Les deux lectures ne constituent pas un snapshot transactionnel :
une transition concurrente peut apparaître au passage suivant. Aucune clôture
n'agit sur la réservation elle-même. Aucun cron ajouté, aucun schéma modifié.

### Procédure opérateur avant une éventuelle reprise

1. Lire les compteurs et l'heure dans Administration → Erreurs. Une indisponibilité
   signifie « état inconnu », jamais « aucune réservation bloquée ».
2. Pour une intention identifiée via les journaux métier autorisés, recalculer en
   environnement privilégié la clé canonique et son empreinte selon le sender ;
   rapprocher chronologie, journal pending/sent et identifiant fournisseur.
   Le registre agrégé seul ne permet pas de retrouver une adresse ou un événement.
3. Vérifier le résultat auprès du fournisseur par ses accès habituels, sans renvoyer
   le message. sent/accepté ne prouve pas une livraison. L'absence de journal sent
   ne prouve pas que le fournisseur a refusé la requête.
4. Si l'acceptation ou la non-acceptation ne peut pas être établie, conserver la
   réservation. Ne jamais remplacer uncertain par retryable sur la seule ancienneté.
5. Toute correction manuelle éventuelle doit être préparée séparément, justifiée
   par les preuves, limitée à l'intention et au propriétaire encore observés, puis
   autorisée explicitement avant application. Aucun outil de reprise n'est ajouté ici.

Validation :36 tests de supervision et27 du module de réservation, sans réseau ni
email. Les cas couvrent seuil exact, états exclus, compteurs supérieurs à1000,
lectures incomplètes, indisponibilité, écritures refusées, diagnostic sans santé auth,
confidentialité, clôture ciblée et conservation des contrôles d'accès.
Le détail final du déploiement et des contrôles naturels est dans l'audit central.
Restent : interface de rapprochement opérateur, protection des modèles serveur,
doublons de file, annulations SQL et interprétation des résultats côté navigateur.


## Cinquième lot : réservation atomique des envois initiés par un membre

Base : `01ef5d5c8533e134bf66668a9ed633cac0f91cb2`. Périmètre : les neuf modèles
initiés par un membre, appels directs et reprises différées dont l'origine
membre est vérifiée. Les appels initialement admin/service restent hors de
cette réservation ; ne pas annoncer une protection globale de tous les emails.

Une table dédiée porte une clé SHA-256 du tuple version/modèle/adresse normalisée/
clé canonique. Elle ne contient ni adresse, ni membre, ni contenu d'email.
Deux RPC réservées au service acquièrent puis terminent la réservation. La clé
primaire et l'INSERT ON CONFLICT conditionnel garantissent un seul propriétaire.
Seul le propriétaire actif peut terminer ; un ancien propriétaire ne peut pas
libérer la réservation d'une tentative suivante. RLS activée, aucun accès public
ou membre, aucun changement des tables ou données métier existantes.

Le sender réserve juste avant le journal pending et l'appel fournisseur. Une
réservation déjà sent retourne duplicate_idempotency_key sans renvoi ; busy,
uncertain ou erreur de lecture retournent503 sans appel fournisseur. Un ancien
pending ne suffit plus à annoncer un succès de déduplication. Si le journal
pending ne peut pas être créé, le fournisseur n'est pas appelé et la réservation
est rendue réessayable. Un succès fournisseur n'est accepté qu'avec son identifiant.

Les refus explicites4xx hors408/409 rendent la réservation retryable (le429 suit
d'abord ses reprises internes existantes). Une exception réseau, un5xx ou une
réponse illisible/incomplète laisse uncertain ; aucune reprise automatique ne
vole une réservation après expiration. Un échec de finalisation laisse également
la réservation tenue. Le résultat inconnu nécessite une vérification opérateur.
Un crash avant même l'appel fournisseur peut donc nécessiter cette vérification :
c'est la limite volontaire de disponibilité de ce lot, pas une livraison garantie.

La documentation Resend confirme une idempotence fournisseur de24heures et exige
une même requête. Elle ne remplace pas ici la réservation durable en base ; le
rendu actuel varie notamment par ses identifiants de suivi. Aucun header Resend
ni contrat fournisseur n'est modifié dans ce lot.
Source : https://resend.com/docs/dashboard/emails/idempotency-keys (relu20septembre2026).

Validation locale :27 contrôles de la migration sur PGlite, dont droits anon/
authenticated/service, unicité, reprise après refus et protection contre un
ancien propriétaire ; les32 demandes SQL sont sérialisées sur une connexion,
pas un test de charge multi-session PostgreSQL. Le vrai handler est testé avec
deux appels concurrents, lectures anti-doublon vides et réservation partagée :
un seul appel au faux fournisseur. Dix cas de régression échouaient avant
branchement. Au total426 tests ciblés (120 handler,27 helper,279 voisins), plus
les27 contrôles SQL. Tests sans réseau ni envoi ; détails et déploiement dans
l'audit central. Script SQL local : scripts/audit/test-member-email-claims.mjs,
variable GUARDIENS_PGLITE_MODULE vers le module PGlite installé hors du projet.

Restent : supervision/réconciliation des réservations incertaines ou bloquées,
protection des modèles initialement serveur, éventuels doublons de lignes de file
(la réservation empêche leur double soumission membre), annulations SQL et gestion
des résultats navigateur. Aucun « exactement une livraison » n'est garanti.

Migration appliquée le20septembre à09:48UTC :
`drizzle/migrations/0001_member_email_send_claims.sql`, générée par l'outil.
Le fichier sous `supabase/sql/pending` est conservé comme fixture locale,
**déjà appliqué : ne pas le rejouer**. À09:50:08UTC : sources des deux RPC
identiques au SQL testé, droits anon/authenticated refusés, service autorisé,
RLS et clé primaire vérifiées, zéro ligne. Les types Supabase et métadonnées
de migration ont été générés automatiquement, sans changement métier.

## Historique du quatrième lot

## Quatrième lot : revalidation des notifications membres différées

Base : `71848b1ae77fd339c20e4d5100e97dc7c12e0a28`. Ce complément ferme la
revalidation des neuf notifications **initiées par un membre** lorsqu'elles
repassent par le sender avec une ligne source de la file différée. Les privilèges
des appels initialement admin/service restent ceux des lots précédents.

À la première mise en file, le sender conserve une origine versionnée dans
`template_data.__guardiens_email_origin` : acteur et destinataire vérifiés,
localisateur de l'événement avant canonicalisation, ou origine trusted pour
un admin/service déjà vérifié. Une origine reçue dans le corps de requête est
supprimée ; elle n'est jamais une preuve ni une propriété de rendu.

À la reprise, le sender lit la ligne réelle (état processing, modèle, adresse et
clé exacts), puis son origine persistée. Pour un membre, il contrôle l'existence
des deux profils, l'adresse actuelle du destinataire, les relations et l'état
réel de l'événement en réutilisant les deux modules d'autorisation. Le contenu
est reconstruit. Un nouveau report conserve cette origine et le contenu actualisé.
La clé canonique doit rester celle de l'événement initial ; une dépublication
datée d'un autre jour ne remplace pas l'intention antérieure. Une urgence reste liée à
l'identifiant du message initial, même si un autre message identique arrive.

Un état invalidé ou une provenance manquante rend HTTP200 avec success:false,
cancelled:true, reason:event_no_longer_authorized. Le worker existant ferme
la ligne et annule son miroir sans compter un email. Une erreur de lecture
rend HTTP503 et utilise les tentatives bornées et le délai de reprise existants.
Le sender ne fait aucune écriture avant ces décisions d'autorisation.

Compatibilité historique : à09:10:57 UTC le20septembre, aucune ligne pending
ou processing pour ces neuf modèles (deux acceptations et un refus historiques
sont déjà sent). Les autres modèles de file ne changent pas. Une ancienne
ligne de ces neuf modèles sans origine prouvée serait annulée, sans déduire
son acteur du contenu. Aucun rattrapage, aucune migration ni réécriture de file.
RLS active, écriture de la file réservée au service, lecture admin seulement.

Validation :67 tests du module différé,106 du vrai handler,88 des événements
de garde,59 des candidatures,3 du worker inchangé ; avec sept suites voisines,
385 réussites. Les33 nouveaux échecs observés avant branchement sont corrigés.
Toutes les DB, rendus et fonctions d'envoi sont inertes dans ces tests.
Les preuves TypeScript et de déploiement sont dans l'audit central.

Limites restantes : aucune transaction commune entre lecture d'autorisation et
mutation métier ; identité historique de dépublication limitée au jour UTC
(deux événements du même jour ne sont pas distingués) ; déduplication par
lecture non atomique ; revalidation métier
des modèles initialement serveur hors de ce lot ; gestion des résultats côté
navigateur et validation SQL du couple rôle/destinataire à l'annulation.
Le worker possède déjà une transition conditionnelle pending vers processing,
mais sa branche générique success/skipped et son ancienne lecture de claim
JWT méritent un lot distinct. La configuration garde verify_jwt=true ; aucun
contournement public n'est déduit du seul décodage présent dans son code.

## Historique du troisième lot

## Troisième lot : les six autres modèles membres

Base : `f6ac88d6c4d60f47ade9592fe37b2699f0896b5a`. Les neuf modèles membres ont
désormais une vérification d'événement à l'entrée du sender. Les sections
précédentes ci-dessous sont conservées comme historique et ne doivent pas être
lues comme le statut actuel des six modèles.

| Modèle | Événement et participants vérifiés |
| --- | --- |
| sit-invitation | Garde publiée du propriétaire appelant, invitation persistée sent/viewed vers le gardien destinataire |
| review-received | Garde completed, candidature accepted du participant, avis garde de l'appelant vers l'autre partie ; avis masqué/rejeté refusé |
| cancellation-by-owner | Propriétaire appelant, candidature cancelled du destinataire, garde cancelled par l'appelant, avis d'annulation avec rôle proprio |
| cancellation-by-sitter | Gardien appelant et propriétaire destinataire, candidature cancelled, annulation enregistrée par l'appelant, avis avec rôle gardien ; garde cancelled ou déjà republished/published |
| help-during-sit | Garde in_progress, participant accepté, conversation de cette garde entre les deux parties, message d'urgence réel écrit par l'appelant |
| listing-unpublished-feedback | Propriétaire appelant et destinataire, garde draft avec événement de dépublication daté |

Les payloads sont reconstruits depuis les lignes vérifiées. Un avis non encore
publié reste un événement valide ; son texte et sa note ne sont jamais lus ni
injectés dans la notification. Le motif libre de dépublication produit la
variante neutre other ; plans_changed conserve sa variante de changement de
projet. Les liens renvoient uniquement vers les routes canoniques reconstruites.

L'urgence conserve l'ancien appel navigateur (clé datée, extrait et URL du fil).
L'URL et l'extrait servent de localisateurs : le serveur exige une conversation
réelle autorisée et un message non système de l'appelant commençant par
[URGENCE]. Les caractères SQL de l'extrait sont traités littéralement. Parmi
les messages correspondant à l'extrait, le plus récent est retenu ; sa clé
canonique repose sur l'ID du message, jamais sur l'horloge du client. Deux textes
identiques postés rapidement peuvent donc se rattacher au même événement récent.
Une évolution vers un ID de message explicite évitera cette ambiguïté du client
historique. Aucune modification frontend ni deuxième écriture de message ici.

Le jour de la dépublication est dérivé du timestamp enregistré : changer la
date de la clé cliente ne crée pas une nouvelle intention d'envoi. Les autres
clés historiques sont préservées, et la déduplication conserve leur alias.
Les défauts de relation/état rendent403 ; les lectures indisponibles/ambiguës
rendent503, sans détail privé et avant toute écriture/envoi. Les chemins admin
et service gardent leurs permissions existantes.

Tests :14 nouveaux cas du vrai handler échouaient avant branchement ; les57
anciens passaient. Après correction :88 cas du nouveau module +71 du handler
+59 du module candidatures =218 réussites. Les suites utilisent exclusivement
des doubles DB/rendu/fournisseur sans réseau. Les résultats avec les suites
voisines, le typecheck et la preuve de déploiement sont dans l'audit central.

Lecture du20septembre : aucune entrée différée pour ces six modèles. L'historique
email contient huit invitations, cinq notifications d'avis, deux retours de
dépublication marqués sent ; aucune urgence ni notification d'annulation. Ces
comptages ne prouvent ni la livraison ni un envoi métier après ce correctif.

Restent transversaux : revalidation à l'envoi différé, verrou atomique de
déduplication, gestion des résultats métier par le client. Le helper SQL
create_avis_annulation vérifie l'acteur participant mais ne valide pas lui-même
le couple rôle/reviewee : ce point DB reste à auditer séparément ; le sender
ajoute ses propres vérifications du couple réel avant tout email.

## Historique du deuxième lot

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
