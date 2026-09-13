# Lot W, ouverture d’Alma

## Mise en œuvre

1. Centraliser les demandes d’ouverture d’Alma avec un sujet optionnel, le déclencheur et, si fourni, une phrase locale instantanée accompagnée de deux réponses prêtes.
2. À chaque ouverture volontaire, placer le focus dans le champ après son rendu. À la fermeture, rendre le focus au déclencheur encore présent dans la page.
3. Pour la carte du rail propriétaire liée à la maison, transmettre le sujet « raconter la maison », afficher la phrase et les deux réponses fournies mot pour mot.
4. Conserver le comportement actuel pour les entrées sans contenu éditorial fourni, avec un sujet par défaut. Ne pas inventer de nouvelles phrases pour les autres entrées.
5. Corriger tout l’accord de la carte de veille selon le nombre, puis remplacer la phrase sur le « vivier grandissant » par une formulation affirmative sans volumétrie.
6. Recenser séparément les autres formulations comparables dans les cartes de veille, sans les modifier.

## Détails techniques

- Étendre l’événement `alma:open-dock` avec un détail typé et rétrocompatible.
- Le panneau local utilise sa phrase instantanée comme ligne d’Alma et ses réponses comme amorces, sans appel au modèle.
- Le focus est piloté après montage du champ. Les transitions restent limitées aux classes respectant la préférence de mouvement réduit.
- Ajouter des tests sur le focus entrant et sortant, le contexte propriétaire, le repli par défaut et les accords singulier et pluriel.

## Vérification

- Exécuter les tests ciblés puis la suite complète.
- Contrôler le résultat du build automatique et l’absence d’erreurs au rendu.
- Rapporter les fichiers modifiés, les points d’entrée recensés avec leur sujet, les formulations signalées et les résultats des tests.

## Périmètre

Aucune modification du scheduler de whispers, du plafond quotidien, de la dictée, du modèle, de la recherche de connaissances ou de la future refonte visuelle. Aucune publication.
