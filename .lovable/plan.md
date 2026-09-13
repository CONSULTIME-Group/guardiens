# Lot X, panneau de conversation Alma

## Portée

Refondre uniquement le panneau ouvert et son contenu visuel. La pastille du dock, le stockage du fil, les appels à Alma, le prompt, la recherche de connaissances et le plafond quotidien restent inchangés.

## Mise en œuvre

1. Remplacer les deux variantes actuelles du panneau ouvert par un tiroir unique fondé sur la feuille accessible déjà utilisée dans le projet.
   - Desktop : tiroir droit fixe, hauteur de fenêtre, largeur 420 pixels.
   - Mobile : feuille plein écran montant du bas, poignée visible, champ fixé en bas.
   - Conserver le focus entrant du lot W, le piège de focus, la fermeture par Échap, le verrouillage de la page et le retour au déclencheur.

2. Réorganiser le panneau en trois zones stables.
   - En tête avec Alma animée, nom, ligne terracotta, humeur et filet doré unique.
   - Conversation occupant tout l'espace restant avec un seul défilement interne.
   - Composeur et amorces en bas, les amorces restant sur une ligne défilante sur mobile.
   - Compacter l'en tête après le défilement mobile, avatar de 46 à 32 pixels et humeur masquée.

3. Refaire le rendu des tours sans bulles.
   - Alma : texte direct en Outfit 15 pixels, label ALMA et filet horizontal.
   - Personne : note alignée à droite, largeur maximale 78 pour cent, filet vertical vert et retrait.
   - Séparateur doux entre les tours.
   - Supprimer les anciennes classes et tout style de conteneur de message.

4. Remplacer l'attente robotique.
   - Avatar en humeur `thinking`.
   - Une phrase Playfair italique choisie parmi les six textes fournis.
   - Ne jamais répéter immédiatement la phrase précédente.
   - Supprimer les trois points et leur animation.

5. Présenter les enrichissements déjà présents dans le texte de réponse, sans modifier leur génération.
   - Transformer les liens Guardiens reconnus en cartes source à bord déchiré, sans URL nue.
   - Transformer les liens internes d'action en libellés de navigation français, avec flèche et soulignement.
   - Ne jamais afficher un chemin commençant par une barre oblique.
   - Si une réponse ne contient aucun lien exploitable, ne rien inventer.

6. Adapter le composeur.
   - Garder la pilule blanche sur desktop.
   - Sur mobile, micro de 46 pixels sur fond terracotta doux et envoi visible seulement après saisie.
   - Utiliser le sujet transmis pour le placeholder. Pour `raconter la maison`, afficher `Répondre à Alma`.

## Technique

- Installer et composer les primitives AI Elements `conversation`, `message`, `prompt-input` et `shimmer`, sans écraser les composants partagés existants.
- Utiliser les tokens existants `hero-paper`, `pine`, `pine-foreground`, `terra`, `line-soft`, `pine-soft`, ainsi que les polices de la charte.
- Conserver `AlmaAvatarAnimated` et les animations uniquement sous `prefers-reduced-motion`.
- Aucun changement de base de données, fonction distante ou génération de message.

## Vérification

- Compléter les tests statiques et de comportement : anciennes bulles absentes, trois points absents, six phrases présentes, dialogue modal, Échap, retour du focus, placeholder contextualisé et libellés d'action sans chemin technique.
- Vérifier le rendu desktop et mobile, le défilement unique, le verrouillage arrière, le champ fixe et la compaction mobile.
- Lancer les tests ciblés, la suite complète, le contrôle des types et le build.
- Ne rien publier.
