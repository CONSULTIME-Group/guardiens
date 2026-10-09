# Publication du lot push : constat et suite

## Constat (vérifié le 09/10 à 07:19 UTC, lecture seule)

- guardiens.fr et guardiens.lovable.app servent tous les deux `index-DOHSwqUT.js`, avec l'identifiant de déploiement `81193e2a-bee6-4424-8b90-2f5ba4096cbc`. C'est l'ancienne version, celle d'avant les lots 1, 2, 2b, P5 et push.
- La publication demandée (`5c7e8141-6c50-4dc0-9f11-d9a62484a126`) n'est donc pas en ligne : aucune des deux adresses ne la sert.
- Le domaine guardiens.fr est connecté et actif. Le projet est publié. Le domaine ne bloque rien.
- Le dernier enregistrement du projet est bien `4a8aa57b` (07:11 UTC, « Corrigé PushResubscribeCard »).
- La dernière build locale de ce code passait (entrée 219 480 octets, sous le plafond). Rien n'indique un échec de build, mais je n'ai aucun moyen de lire le statut du déploiement `5c7e8141` lui-même.

## Conclusion

Le site n'est pas publié avec le lot push. La réponse « pending » indiquait seulement une demande en file. Plusieurs minutes plus tard, l'ancienne version est toujours servie : la demande a échoué ou n'a jamais été lancée. Une attente plus longue n'est pas la cause probable, un déploiement prend en général environ une minute.

## Étape proposée (après votre approbation)

1. Relancer la publication avec l'outil de publication du projet, pour `4a8aa57b`, après lecture des alertes de sécurité. Vous pouvez aussi cliquer sur Publier puis Mettre à jour dans l'éditeur.
2. Une seule vérification, environ deux minutes plus tard, sur guardiens.fr et guardiens.lovable.app. Elle confirme que l'identifiant de déploiement et le nom du fichier d'entrée ont changé, et que la carte des notifications servie est la nouvelle (bouton « Recevoir mes candidatures sur mon téléphone » présent dans le fichier).
3. Si l'ancienne version est toujours servie, je ne dis pas que c'est publié. Je vous indique de publier depuis l'éditeur et de lire le message d'erreur affiché.

Aucune modification de code ni de base.
