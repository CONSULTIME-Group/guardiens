# Audit et refonte : annonce de garde et préparation de la maison

Audit du 17 octobre 2026, dans la suite des refontes autorisées par Jérémie. Deux intentions complémentaires : présenter un besoin pour que le lecteur puisse publier une annonce claire, puis transmettre les informations nécessaires à une garde déjà organisée. Le choix de ces pages repose sur cette utilité et leur maillage existant, pas sur un volume de recherche ou un classement supposé.

## Diagnostic et décisions

| Critère | Rédiger une annonce | Préparer la maison |
| --- | --- | --- |
| Intention principale | Savoir quoi écrire, avec un exemple à adapter. | Préparer les accès, les consignes et le relais. |
| Réponse immédiate | Lieu, dates, tâches et présence attendue. | Accès testés, espace de séjour, fiche courte et relais accepté. |
| Défauts observés | Comparaison inventée de 8 candidatures en 48 h contre 2 en une semaine ; effet attribué à l’annonce seule. | Bonne base pratique, mais pas de fiche réutilisable et consignes de rencontre encore ambiguës. |
| Promesses | Aucun nombre de candidatures, délai ou effet de titre garanti. | Aucun gardien de remplacement, disponibilité permanente ou sécurité assurée. |
| Fonctionnement réel | Suppression de la promesse d’alerte prioritaire d’urgence ; règles de publication vérifiées dans le code. | Garde avec hébergement ; avec ou sans animaux. |
| Photos | Suppression de « photos des animaux obligatoires », incompatible avec les gardes sans animaux. | Photos de couverture conservées et texte alternatif fidèle. |
| Exemples | Titres et annonce explicitement fictifs, sans faux témoignage ni résultat attribué. | Fiche à remplir avec champs entre crochets, à transmettre en privé. |
| Présence | Nuits et absences discutées concrètement, sans déduire les horaires du métier. | Conditions convenues reprises à la transmission. |
| Frictions souvent oubliées | Transport, accompagnants, soins, couchage, dates et frais. | Retard du retour, perte de connexion, approvisionnement, tiers qui interviennent. |
| Vie privée | Adresse précise, codes, double des clés et coordonnées gardés hors de l’annonce publique. | Caméras déclarées, intimité du séjour, accès temporaires et documents personnels. |
| Animaux | Contraintes réelles annoncées avant le choix, sans exiger un animal. | Routine, matériel et consignes vétérinaires ; aucune improvisation médicale. |
| Assurance et cadre | Lien vers le guide de préparation pour la suite. | Vérification avec les assureurs, accord distinct de la fiche pratique ; périmètre français explicite. |
| Rencontre | Possible si les deux le souhaitent. | Même règle ; transmission organisée sur place par un relais ou à distance selon les besoins. |
| Gratuité | Plateforme actuellement 100 % gratuite pour les deux rôles ; dépenses de garde distinctes. | Même distinction dans la présentation et les questions fréquentes. |
| Évolution tarifaire | Contribution éventuelle au plus tôt au second semestre 2027, préavis de 30 jours. | Même engagement, conformément à la décision du fondateur et aux refontes précédentes ; exception ciblée aux anciennes consignes X3c/Y3. |
| SEO et titre | Ajout d’un modèle à adapter dans le titre SEO et d’un exemple dans le H1. | H1 et titre SEO déjà pertinents conservés ; description précise le modèle de consignes. |
| Structure | Sommaire, sept H2 ancrés, tableau à trois colonnes, modèle et cinq FAQ en H3. | Même structure ; ancres existantes checklist, guide-maison, animaux, remise-cles et imprevus conservées. |
| Réponses générées | Informations compréhensibles par elles-mêmes, exemples identifiés et limites explicites. | Checklist et fiche séparées des engagements contractuels, sources primaires visibles. |
| Cannibalisation | Rédaction et publication, sans refaire le guide du choix d’un gardien. | Préparation matérielle, sans refaire la définition du house sitting ou l’accueil du gardien. |
| Maillage | Renvois au choix, à la préparation, aux gardes sans animaux et aux tarifs. | Liens vers l’annonce, les gardes sans animaux, le cadre français et les gardes longues. |
| Liens entrants | Le guide du choix et le formulaire de création pointent déjà vers cet article. | Les guides du choix et sans animaux pointent déjà vers cette page. Pas de troisième article modifié. |
| Conversion | Deux CTA propriétaires, en haut et à la fin, vers l’annonce. | Même parcours, avec un texte final destiné à ceux qui cherchent encore un gardien. |
| Après le clic | Visiteur vers inscription propriétaire avec retour sur /sits/create ; membre directement vers la création. | Même chemin ; aucun compte ou besoin fictif créé pour la recette. |
| Rendu | Mise en page guide réservée au slug ; suppression du mélange propriétaire/gardien. | Mise en page guide existante, désormais avec le parcours propriétaire. |
| Identité éditoriale | Auteur Elisa, date de publication, URL, canonique et indexabilité conservés. | Mêmes champs conservés ; pas de publication antidatée ni de nouvelle URL. |

## Sources et contrôles

- [Service Public : assurance et home sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509), page vérifiée le 21 mars 2025, consultée le 17 octobre 2026 : garanties, information de l’assureur, responsabilité civile et écrit. Aucune assurance automatique de la plateforme n’est affirmée.
- [CNIL : vidéosurveillance chez soi](https://www.cnil.fr/fr/la-videosurveillance-videoprotection-chez-soi), 23 juillet 2018, consultée le 17 octobre 2026 : vie privée et information des personnes. Les règles des salariés ne sont pas attribuées indistinctement aux gardiens bénévoles.
- [RSPCA : confier son animal pendant une absence](https://www.rspca.org.uk/adviceandwelfare/pets/general/holiday/leavingyourpet), consultée le 17 octobre 2026 : routine, instructions, contacts et matériel. Les règles britanniques de licence ou de recrutement ne sont pas présentées comme françaises.
- Règles produit dans src/lib/sitPublishRules.ts et formulaire CreateSit : dates requises, logement et photo, animaux facultatifs. Aucun changement des validations.
- Contrôle visuel initial des deux pages publiques et de leurs couvertures : appareil photo dans une pièce lumineuse ; salon avec canapé, cheminée et cuisine ouverte. Les images restent identiques.

## Validation et mesure

Application atomique des deux contenus, avec garde de version, sauvegarde privée et réexécution sans effet. La simulation vérifie un échec sur chacune des versions, l’annulation complète si le second article échoue, la correspondance au Markdown, les champs conservés, les liens réciproques et l’absence de modification d’un autre article. Le test existant de parcours s’étend aux deux guides et contrôle les quatre situations de rôle ainsi que les destinations des ancres du sommaire.

Contrôles publics à effectuer après publication : contenu, titre, description, canonique, robots, date de publication, sommaire, tableaux, alternatives des couvertures et les deux CTA. Les vérifications d’inscription s’arrêtent avant toute création de compte ou acceptation des conditions.

Les données Search Console ne sont pas disponibles pour ce lot : aucun volume, CTR, position ou gain n’est inventé. Après exploration des nouvelles versions, comparer des périodes de même durée en tenant compte de la saison : impressions, clics, CTR et position par URL, requête, appareil et pays. Distinguer les requêtes de rédaction/modèle des requêtes de checklist/consignes. Conserver les URL permet cette comparaison.

Pour la conversion, distinguer clic sur un CTA, début d’annonce et publication réussie. Les CTA portent déjà le slug et l’emplacement. Sans attribution de la publication à l’article d’origine, ne pas présenter le nombre global d’annonces comme le résultat de cette refonte. L’attribution complète n’est pas créée artificiellement par ce lot. Les contrôles pilotés ne doivent pas être comptés comme des visites réelles.
