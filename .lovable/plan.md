# Unification des largeurs de la page d'accueil

## Mise en œuvre

1. Définir deux conteneurs réutilisables dans le système global : lecture à 768 px et large à 1152 px, avec une gouttière mobile commune de 24 px.
2. Appliquer le conteneur de lecture à « Qu'est-ce que Guardiens ? », au récit fondateur, au rappel d'action, à la FAQ, au contenu du bloc sombre et au CTA final.
3. Appliquer le conteneur large à la bande des compteurs, aux annonces, aux cartes de besoins, à « Comment ça marche ? », aux témoignages, au comparatif, aux contenus construits pour les membres et aux guides.
4. Conserver le hero et le fond du bloc sombre en pleine largeur, avec leur contenu intérieur aligné sur le conteneur adapté.
5. Uniformiser la respiration verticale entre sections sur 52 px, sans modifier les contenus, l'ordre, les données ni les interactions.

## Détails techniques

- Les largeurs correspondent à la zone de contenu hors gouttières : 768 px et 1152 px maximum.
- Les classes partagées remplacent les variantes locales `max-w-*` sur les sections de la page d'accueil.
- Les tableaux gardent leur défilement interne sur petit écran, sans provoquer de débordement de page.
- Les états chargement et vide des annonces utilisent les mêmes conteneurs que l'état rempli.

## Vérification

- Mesurer dans le rendu réel chaque section et confirmer uniquement trois catégories : 768 px, 1152 px et pleine largeur.
- Contrôler les vues desktop large, 1280 px et mobile 390 px.
- Vérifier l'absence de défilement horizontal, de clé de traduction brute et d'erreur de rendu.
- Exécuter les tests ciblés de la page d'accueil et contrôler le build automatique.

## Périmètre

Aucun changement de copie, de données, de logique métier, d'ordre des sections ou de publication.
