# Lot 8, rendre l'espace Entraide explicite

## Résultat attendu

Clarifier immédiatement le fonctionnement de l'Entraide, harmoniser son nom, améliorer la contrepartie du formulaire et compléter le sitemap, sans refonte visuelle, sans modifier les articles et sans publication.

## Modifications prévues

1. **Accueil Entraide**
   - Retirer le badge d'abonnement hors sujet.
   - Remplacer le sous-titre par le texte validé.
   - Conserver « Publier » pour les membres.
   - Afficher « Demander ou proposer un coup de main » pour les visiteurs, vers l'inscription avec retour au formulaire.
   - Ajouter le bloc « Concrètement » avec six chips utilisant les styles du fil et appliquant les catégories existantes.
   - Afficher `ExchangeHowItWorks` uniquement sans session, après les exemples.
   - Déplacer l'encart Associations après le fil pour les visiteurs.
   - Ajouter en bas une FAQ de quatre questions, pour tous, avec l'accordéon existant et un balisage `FAQPage`, sans offre ni prix structuré.

2. **Nom unique visible**
   - Renommer en « Entraide » les intitulés qui désignent cet espace dans les pages visiteur, la page Lyon, les fils d'Ariane, les titres d'onglet et le back-office.
   - Mettre le H1 et les métadonnées de Lyon sous la forme « L'entraide à domicile à Lyon ».
   - Conserver l'URL `/petites-missions` et tous les identifiants techniques.
   - Ne pas modifier les textes éditoriaux des articles ni les occurrences descriptives qui ne nomment pas l'espace.

3. **Formulaire**
   - Remplacer les deux exemples de contrepartie par les formulations validées.
   - Ajouter sous le champ la phrase permanente sur le service, l'attention et l'absence d'argent.
   - Conserver strictement le garde-fou anti-argent existant.

4. **Sitemap**
   - Confirmer dans le code et par test que la fiche est publique sans compte et porte `noindex` lorsqu'elle est fermée ou expirée.
   - Ajouter `/petites-missions/lyon` avec fréquence hebdomadaire et priorité 0.7.
   - Ajouter les fiches ouvertes ayant un slug et une description d'au moins 200 caractères, avec fréquence hebdomadaire et priorité 0.5.
   - N'ajouter aucune fiche si le contrôle public ou `noindex` échoue.

## Tests et preuves

- Ajouter un test Vitest du hub pour les états visiteur et membre, incluant textes, sections, boutons et absence du badge retiré.
- Ajouter un test du sitemap avec une mission ouverte admissible et une mission fermée exclue.
- Exécuter les tests ciblés, la suite Vitest complète et `tsc -b`, puis distinguer clairement toute erreur préexistante.
- Vérifier la preview en desktop et mobile, puis capturer le hub anonyme dans les deux formats et l'étape 2 du formulaire.
- Contrôler le dernier état de compilation automatique.

## Portée volontairement inchangée

- Aucun article éditorial modifié.
- Aucun comportement partagé hors Entraide modifié.
- Aucune migration ni écriture en base.
- Aucune publication ni aucun déploiement de fonction.