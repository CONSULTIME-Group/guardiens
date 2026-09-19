# Test push cible reserve au serveur

`send-web-push-test` est separe du dispatcher et ne cree aucun message,
candidature, email ou job de production. Il exige la vraie cle service_role,
avec verification JWT a la passerelle. Aucun acces membre ou public.

POST : trois UUID techniques `request_id`, `user_id`, `subscription_id`.
Une demande d'envoi doit etre explicitement autorisee pour ce destinataire.
Le serveur verifie le proprietaire, l'abonnement actif et la preference messages.
Une reservation SQL atomique precede l'envoi : une seule tentative par demande,
un test par compte toutes les cinq minutes. Les demandes consommees ne sont
jamais rejouees, y compris apres expiration reseau ou arret du processus.

Le payload est generique : le service worker affiche « Vous avez un nouveau
message. ». Ce test ne cree aucun message reel. TTL 60 secondes, timeout 8
secondes, aucune repetition automatique. Ne pas retenter une reponse incertaine.

L'audit `push_test_attempts` est sous RLS forcee, reserve au service. Il contient
uniquement les references techniques, dates, resultat et statut fournisseur.
Les endpoints, cles et contenus prives ne sont jamais journalises ou renvoyes.
Une reponse HTTP 200 du handler doit etre lue : `accepted` indique uniquement
l'acceptation par le fournisseur, pas la reception sur le telephone.

Appliquer le SQL `20260919_web_push_test.sql` une seule fois, puis deployer
uniquement cette nouvelle fonction. Aucun changement de cron ni de frontend.
Conserver la meme request_id en cas de verification apres timeout ; ne pas
rejouer la commande d'envoi. Lire la reponse HTTP et l'audit existants.
