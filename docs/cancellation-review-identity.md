# Identité des avis d'annulation — 20 septembre 2026

Périmètre : public.create_avis_annulation(uuid,uuid,uuid,text,text).
La signature, le retour UUID, la modération en_attente, l'index unique existant
(sit_id, reviewer_id) pour les annulations et la mise à jour cancelled sont conservés.

## Contrat corrigé

- Un acteur authentifié est requis ; reviewer_id doit être exactement cet acteur.
- La garde et son unique candidature accepted déterminent les deux participants.
- Propriétaire : rôle proprio et destinataire égal au gardien accepté.
- Gardien accepté : rôle gardien et destinataire égal au propriétaire.
- Aucun rôle admin fourni par le client, destinataire tiers, auto-avis, valeur
  absente ou relation ambiguë. Aucune candidature accepted : refus, y compris
  le repli historique du navigateur qui désignait le propriétaire lui-même.
- Motif non nul, au moins vingt caractères après retrait des espaces de bord,
  au plus trois cents caractères bruts ; le navigateur transmet déjà un motif trim.
- Verrouillage des lignes de garde et candidature lues jusqu'à la fin de la
  transaction. Cela ne remplace pas l'atomicité du parcours navigateur complet.

Les droits restent limités à authenticated et service_role, avec acteur réel
obligatoire ; aucun accès PUBLIC/anon. SECURITY DEFINER et search_path
public, pg_temp conservés. Aucune ligne métier n'est modifiée par la migration.

## Compatibilité et tests

Le propriétaire ouvre déjà ce parcours uniquement pour une garde confirmed non
terminée ; une annonce publiée sans gardien a un parcours de dépublication distinct.
Le gardien dispose du parcours confirmed/in_progress. Les deux rôles et le
destinataire envoyés par le navigateur correspondent au nouveau contrat lorsque
les données sont cohérentes. À10:26:18UTC : aucune garde avec plusieurs candidatures
accepted et aucune candidature accepted de son propre propriétaire en production.

Script local : scripts/audit/test-cancellation-review-identity.mjs.
GUARDIENS_PGLITE_MODULE pointe vers un module PGlite installé hors du dépôt.
GUARDIENS_CANCELLATION_SQL permet de comparer une définition SQL antérieure locale.
La base est isolée et éphémère ; aucun appel Supabase, email ou compte réel.
81 assertions : parcours légitimes, rôles/destinataires incohérents, identité,
cardinalité, raisons, droits, doublons et rollback de l'avis si la garde ne peut
pas être modifiée. Les tables sont des fixtures minimales et les validations du
trigger pertinentes pour ces champs sont reproduites sous forme de contraintes.
Ce n'est pas un test complet des triggers/RLS de production ni de concurrence
multi-session. Les lectures de validation du trigger réel ont été faites à10:30UTC.

SQL de référence : supabase/sql/pending/20260920103000_cancellation_review_identity.sql.
L'audit central consigne l'application effective et la migration générée ; ne pas
rejouer ce fichier lorsqu'elle est déjà appliquée. La définition est relue et
comparée après application, sans invoquer la fonction métier.

## Hors de ce lot

Le navigateur réalise encore plusieurs mutations après la RPC : republication,
candidatures, messages et email. Certaines erreurs de ces étapes sont ignorées.
La RPC ne recopie pas encore les conditions de statut/date du navigateur ; ce lot
ne certifie pas toutes les transitions du cycle de garde. L'unicité historique
est par garde ET auteur, pas une annulation globale par garde. Les autres chemins
d'écriture des avis et la réponse à un avis nécessitent leurs propres contrôles.
Aucune correction des données historiques, aucune migration ancienne rejouée,
aucune modification frontend/Edge et aucune notification déclenchée pour tester.
