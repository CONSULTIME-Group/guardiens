# Audit et refonte du guide Nouvelle-Calédonie

Décision de Jérémie du 17 octobre 2026 : appliquer l’audit éditorial, SEO, GEO, UX et conversion à un autre article. Périmètre : le guide existant et un paragraphe de lien entrant dans le guide des gardes longues. Pas de modification des pages locales ni des règles générales du site.

URL conservée : https://guardiens.fr/actualites/garde-maison-animaux-nouvelle-caledonie

## Diagnostic et corrections

| Aspect | Constat avant refonte | Correction retenue |
| --- | --- | --- |
| Intention principale | Le titre promet une aide pour faire garder sa maison ; le début décrit surtout des vols, des cyclones et des maladies. | Répondre immédiatement : fonctionnement de la garde, choix de la solution, organisation et dépenses. |
| Fiabilité des prix | Une consultation vétérinaire à 4 600 F CFP sert à calculer le budget de visites de garde pendant un mois. | Retirer ce calcul trompeur. Tarifs de pension publiés par le Gîte animalier du Caillou, unité nuitée explicite, date et source directe. |
| Neutralité | Pension présentée comme rare, voyage avec un animal quasi impossible, absences toujours longues ; comparaisons de territoires non étayées. | Solutions décrites par leurs conditions, sans généraliser aux habitants ni hiérarchiser les territoires. |
| Métadonnées | Extrait et description centrés sur cécité, maladies et durée de vol. | Titre, extrait et description alignés sur garde de maison, prix en F CFP, gardien et préparation. |
| Recherches complémentaires | Questions fréquentes dominées par vol, symptômes et statistiques anciennes. | Questions de choix et d’usage : voiture, présence, logement sans animaux, couple, disponibilité, assurance et relais. |
| Spécificité locale | Long catalogue de vocabulaire et de risques ; certaines recommandations sont absolues. | Besoins de transport, accès au logement, arrivée sur une île, contact local et décalage horaire ; exemples présentés comme tels. |
| Santé et sécurité | Répétitions et détails médicaux, chiffres de 2002-2009, diagnostic suggéré selon les symptômes. | Consignes individualisées avec le vétérinaire ; rubrique météo courte reliée à la Sécurité civile et Météo-France. |
| Expertise et confiance | Première personne d’un rédacteur sans expérience locale démontrée ; sources finales parfois sans lien. | Voix des fondateurs limitée à leurs cinq années de garde, aucune expérience calédonienne inventée ; sources primaires cliquables et datées. |
| Originalité / GEO | Informations longues difficiles à distinguer d’une compilation ; réponses partiellement hors sujet. | Définitions claires, réponses autonomes, tableau de solutions, exemple d’annonce fictif et liste d’organisation. Pas de fichier ni balisage « spécial IA » ajouté. |
| Maillage entrant | Aucun autre article publié ne contient l’URL cible dans son contenu ou ses liens éditoriaux lors du contrôle. Cela ne signifie pas absence de liens depuis les pages locales. | Paragraphe contextuel ajouté au guide des gardes de deux semaines ou plus, sans réécriture de cet article. |
| Maillage sortant | Trois ressources finales seulement, liens de discussion éloignés de l’action. | Liens contextuels vers définition, critères de choix, annonce, checklist, garde sans animaux et page locale Nouméa ; destinations publiées vérifiées en base. |
| Architecture / concurrence interne | Guide national, page locale Nouméa et guide local ont des rôles voisins. | Cet article aide le propriétaire à décider et préparer ; la page locale présente le réseau ; le guide local reste une ressource. Aucune cannibalisation mesurée n’est affirmée sans GSC. |
| Conversion | Blocs génériques avec deux rôles ; résumé utile et action propriétaire absents en début. | Résumé visible, un bouton propriétaire en haut et un en fin, rôle et destination de création d’annonce conservés. Aucun bloc générique intermédiaire sur ce slug. |
| Promesses du service | « Sans frais des deux côtés » sans temporalité ; nombre d’inscrits présenté comme couverture locale. | Gratuité actuelle des deux rôles, évolution possible au plus tôt au second semestre 2027 et préavis de 30 jours ; pas de promesse de candidat, de remplacement ou de présence permanente. |
| Lisibilité / design | Article long, sections de risques en doublon, pas de sommaire d’action. | Hiérarchie H2/H3, sept ancres, deux tableaux courts, consignes numérotées, mise en page guide existante. |
| Accessibilité | Tables à faire défiler ; repérage de sections à vérifier. | Réutiliser les conteneurs de tableau focalisables et nommés, ancres portées par les titres et liens éditoriaux soulignés. Contrôler le DOM et l’affichage sur ordinateur ; pas de certification mobile supposée. |
| SEO technique | URL et date de publication existantes à préserver. | Conserver slug, auteur, image, publication, canonique et indexabilité ; vérifier H1 unique, titre, description et Article JSON-LD après publication. |
| Performance | Une refonte d’article ne justifie pas d’ajouter un outil, une dépendance ou du JavaScript d’animation. | Réutilisation des composants et styles, sans dépendance supplémentaire. Build et garde de non-régression ; pas de score Core Web Vitals inventé sans données terrain. |
| Confidentialité | Une annonce peut inciter à communiquer des codes et coordonnées privées. | Préciser que les codes et contacts personnels se transmettent à la personne retenue dans les consignes, sans ajouter de formulaire public. |
| Maintenance | Montants et consignes susceptibles d’évoluer. | Prix datés et périmètre d’un seul prestataire explicite ; liens vers vigilance et consignes en vigueur plutôt que reproduction exhaustive. |

## Mesure et limites

- Search Console reste indisponible : impressions, positions, CTR, requêtes gagnantes et cannibalisation ne sont pas vérifiables dans ce lot. Le volume des vues du site ne remplace pas ces données.
- Hypothèse testée par la refonte : mieux répondre à la recherche de garde de maison et donner à la page des liens internes pertinents. Aucun gain de classement n’est annoncé.
- Le recentrage peut réduire la présence sur des recherches médicales périphériques ; c’est un arbitrage éditorial explicite. Une comparaison GSC avant/après par requête devra en mesurer les effets, en tenant compte de la saisonnalité et du faible volume.
- Suivre ensuite les clics des CTA haut/fin, les arrivées sur la création d’annonce et les annonces réellement publiées ; les clics seuls ne démontrent pas une conversion finale. Les attributs d’instrumentation du site sont conservés.
- Vérifier la publication sur le domaine public séparément de la prévisualisation et de la mise à jour en base. Ne pas confondre contenu publié et reprise par Google.

## Sources contrôlées le 17 octobre 2026

- https://giteanimalierducaillou.nc/tarifs/
- https://securite-civile.gouv.nc/prevention-des-risques/risques-naturels/cyclones
- https://meteo.nc/fr/vigilance

## Validation attendue

TypeScript, tests du rendu des quatre guides et des quatre rôles, build et garde différentielle du dépôt. Simulation PostgreSQL de l’atomicité des deux modifications, des gardes de version, de la sauvegarde privée et de l’idempotence. Après application, comparer les champs réellement modifiés et contrôler contenu, liens, balises SEO et parcours propriétaire dans le navigateur.
