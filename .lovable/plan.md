# Contrôle avant publication

## Modifications
- Remplacer les quatre textes publics demandés, sans modifier le comportement.
- Mettre à jour l’attente du test du hub afin qu’elle corresponde à la nouvelle réponse FAQ.
- Vérifier l’absence du libellé visible « 0 €, toujours » dans le hub et le remplacer seulement s’il existe.

## Contrôles
- Exécuter toute la suite Vitest.
- Exécuter la vérification TypeScript avec `tsc --noEmit`.
- Produire le build de production.
- Contrôler la dernière entrée du journal de build.
- Ne corriger aucun autre échec éventuel et ne rien publier.

## Livraison
- Rapporter les résultats complets, les fichiers modifiés et le hash du commit final.
