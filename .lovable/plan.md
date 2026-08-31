# Lot 12, digest hebdomadaire entraide

## Mise en œuvre

1. Remplacer toute la construction JavaScript du plan d'envoi par un unique appel à `mutual_aid_weekly_digest_plan` avec les paramètres 30 km, 7 jours et 5 missions.
2. Conserver le mode manuel, le dry run, le filtre `recipient_id`, la déduplication à 6 jours et le journal cron.
3. Charger une seule fois les questions et membres à l'honneur, sans jamais les utiliser comme condition d'envoi.
4. Traiter les destinataires planifiés par lots de 20 en parallèle, avec comptage séparé des destinataires planifiés, envoyés, ignorés et en erreur.
5. Terminer le journal en statut `partial` lorsque le déficit réel d'envoi dépasse 20 pour cent, et enregistrer les métriques détaillées.
6. Adapter le template au contenu local : sujet et titre selon `nb_nouvelles`, distance, repère Nouveau, slug, distinction demande ou offre, rappel du service contre service sans argent.

## Vérification

- Ajouter ou ajuster uniquement les tests ciblant cette fonction et ce template si des tests existants les couvrent déjà.
- Déployer uniquement `send-mutual-aid-weekly-digest`.
- Exécuter la fonction en `dry_run`, sans email, puis relever le nombre de destinataires et la moyenne d'annonces par mail.

## Périmètre

Aucune modification du cron, des fonctions SQL ou d'un fichier extérieur à la fonction et à son template.
