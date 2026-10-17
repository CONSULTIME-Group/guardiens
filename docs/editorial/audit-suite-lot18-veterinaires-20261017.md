# Audit et refonte : urgences vétérinaires à Annecy et Grenoble

Lot 18 prioritaire de la poursuite sur toutes les publications : les versions précédentes donnaient des délais d’attente pour des convulsions ou une suspicion de coup de chaleur, un délai de déplacement annoncé comme acquis et des appels commerciaux avant la réponse utile.

## Intentions et décisions

| Critère | Décision |
| --- | --- |
| Besoin immédiat | Trouver qui appeler maintenant et savoir où se rendre sur instruction du professionnel. Les coordonnées passent avant l’image et les inscriptions. |
| Conversion principale | Appel vers le service adapté ; pas de compte à créer pour lire ou utiliser les coordonnées. Les numéros sont des liens `tel:`. Aucun appel de test n’est effectué. |
| Titres | Titres SEO et URL conservés. H1 descriptifs avec contacts et horaires ; retrait du label général « numéros vérifiés », remplacé par une date et une méthode de consultation des sources. |
| Horaires | Distinction entre régulation, intervention à domicile et accueil en clinique. Grenoble : aucune ouverture 24 h/24 en semaine attribuée à tort à la Maison des Urgences. Annecy : relais après 21 h vers VetoAdom Alpin ou CHV. |
| Coordonnées | Correction du service à domicile Annecy vers VetoAdom Alpin et son numéro publié ; adresses exactes des lieux d’accueil. |
| Disponibilité | Aucun délai d’arrivée, accueil de toute espèce ou intervention à toute adresse garanti. Appeler avant de partir. |
| Santé | Retrait des seuils d’attente et des protocoles de soins rédigés par la plateforme. Les signes inquiétants conduisent à appeler immédiatement ; le vétérinaire donne la conduite adaptée. Pas d’attente de réponse du propriétaire avant de demander cet avis. |
| 3115 | Option d’orientation privée du réseau Emergence et partenaires, pas passage obligatoire ni service public exhaustif. |
| Frais | Conseil ou appel gratuit distinct des consultations et déplacements. Aucun prix médical moyen inventé. |
| Confiance | Pas d’expertise vétérinaire attribuée aux fondateurs ou à tous les gardiens. Pas de chiffres d’identification ou de témoignages non établis. |
| Garde future | Dossier, transport, relais, contacts, décisions et paiement à préparer. Pas d’autorisation de chirurgie présentée comme formalité universelle obligatoire. |
| Produit | Guardiens ne fournit ni soin ni remplacement immédiat. Gratuité actuelle pour les deux rôles, hébergement sans rémunération, dépenses distinctes, lien vers les tarifs. Pas de nouvelle promesse tarifaire. |
| Lecture mobile | Listes de contacts courtes plutôt qu’un tableau à quatre colonnes, sommaire après les numéros, six FAQ par page, aucun doublon de titre FAQ. |
| Parcours secondaire | Un seul bouton propriétaire en fin de page, explicitement pour une prochaine absence. Aucun bouton commercial en tête ou au milieu. |
| Maillage | Imprévus, préparation, garde locale et autre destination. Aucun parcours de recherche invalide ou détour par l’inscription pour obtenir un téléphone. |
| Intégrité | Auteurs, dates réelles, couvertures pour partage, canoniques, URL et indexabilité conservés. Le retrait du grand visuel dans la page est limité à ces deux guides. Alt littéral, aucune photo présentée comme preuve d’un établissement réel. |

## Sources primaires consultées le 17 octobre 2026

- [SOS VETO 74](https://sosveto74.com/) : numéro, garde jusqu’à 21 h, cabinets plutôt que domicile et relais après 21 h. Le site contient aussi des informations anciennes hors du sujet retenu ; elles ne sont pas reprises.
- [CHV Saint-Martin, contact](https://chvsm.com/contact/) : téléphone, adresse et accueil urgent 24 h/24, distinct des rendez-vous habituels.
- [Maison des Urgences Vétérinaires de Grenoble](https://www.maisondesurgences-grenoble.com/) : téléphone, adresse, horaires, régulation et espèces. Pas de classement commercial repris comme évaluation de qualité.
- [VetoAdom Alpin Grenoble](https://www.vetoadom-alpin.com/urgence-veterinaire-grenoble.php) : intervention à domicile et régulation ; le délai commercial annoncé n’est pas transformé en garantie.
- [VetoAdom Alpin, que faire en cas d’urgence](https://www.vetoadom-alpin.com/urgence-veterinaire.php) : évaluation par téléphone et orientation, sans reprendre un protocole clinique dans l’article.
- [3115 Annecy](https://www.urgences-veterinaires.fr/veterinaire-de-garde-ANNECY-74000) et [3115 Grenoble](https://www.urgences-veterinaires.fr/veterinaire-de-garde-GRENOBLE-38000) : couverture annoncée, gratuité de l’appel et caractère privé précisé dans les mentions légales.

## Validation et suivi

Transaction limitée aux deux articles avec contrôle de version, sauvegarde privée, test d’atomicité, concurrence, réexécution sans effet et conservation des champs hors cible. Vérifications du rendu pour les quatre rôles, liens téléphoniques conservés après rendu, ancres et FAQ visibles/structurées cohérentes. TypeScript, build et garde de non-régression avant intégration. Contrôle public après publication des métadonnées, contacts en premier, absence du grand visuel et du bouton en tête, dates, liens, FAQ et bouton final.

Quand les données sont accessibles, isoler requêtes de garde nocturne, domicile, dimanche, espèces et noms d’établissement. Mesurer les appels initiés et les liens vers les services lorsque l’instrumentation le permet, sans enregistrer de données médicales. Distinguer ces actions de l’inscription pour une garde future. Un contact trouvé dès le résultat Google peut être utile malgré l’absence de visite : ne pas juger cette page uniquement sur les créations de compte. Comparer impressions, positions et CTR par appareil et requête sur des périodes comparables, sans résultat présumé. Réexaminer les coordonnées avant toute nouvelle mise à jour ou en cas de signalement.
