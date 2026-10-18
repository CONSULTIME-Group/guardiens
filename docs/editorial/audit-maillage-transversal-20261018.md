# Contrôle final des 133 refontes et maillage complémentaire

## État vérifié avant cette intervention

Le contrôle du 18 octobre 2026 a comparé les 133 sources Markdown de `docs/editorial/` aux 133 articles publiés renvoyés par l’API publique : les corps et les métadonnées présents dans les sources correspondaient tous à la base. Le dernier commit de la série précédente était `261a93f09e1c15bc73c80ee444662b0495d55bf8`, daté du 18 octobre à 04:02:30 UTC, soit 06:02:30 à Paris. Les anciens décomptes de 26 articles revus et 77 restants étaient donc obsolètes.

Les 30 anciennes versions restent en `noindex`. Parmi les 103 lignes sans ce drapeau, quatre articles d’entraide conservent leur canonique de regroupement vers `petites-missions-entraide-guardiens`, conformément à la décision P5. Les 99 autres sont leurs propres canoniques, explicitement ou par le calcul de la page. Aucune règle d’indexabilité n’est modifiée par cette intervention.

Les contrôles des corps et des liens de ressources n’ont trouvé aucune cible d’article absente ou en `noindex` depuis les articles sans ce drapeau. En revanche, 26 articles ne recevaient aucun lien depuis ces autres articles. Cela ne démontre pas qu’ils étaient orphelins à l’échelle du site : les pages de races, le journal, les villes ou le pied de page peuvent aussi les lier.

## Trois lots de deux articles

| Lot | Guides enrichis | Cibles auparavant sans lien entrant depuis les autres articles |
| --- | --- | --- |
| 01 | Garde de chien ; garde de chat à domicile | Berger allemand, berger australien, border collie, malinois, labrador, cavalier King Charles, bouledogue français ; bengal, maine coon, persan, siamois. |
| 02 | Pet-sitting Lyon ; house-sitting en France | Villeurbanne, Vénissieux, villes autour de Lyon avec un chien ; Saint-Étienne, Valence, Clermont-Ferrand, chiffres de l’abandon et pistes d’aide. |
| 03 | Petites missions d’entraide ; définition du house-sitting | Jardinage Grenoble, jardinage Annecy, technologie et lien social ; voyages en France, garde à l’étranger, La Réunion, histoire du projet, préparation d’une première garde en Auvergne. |

Les 26 liens sont insérés dans les sections correspondant au besoin du lecteur. Les guides de races complètent les observations sur l’animal et ne déterminent ni ses besoins ni les compétences d’une personne. Les exemples locaux ne prouvent aucune disponibilité. La garde temporaire n’est pas présentée comme une réponse à toutes les difficultés durables. Le guide d’Auvergne n’est pas présenté comme un témoignage réel.

Les corps enrichis ne changent ni les FAQ, ni les appels à l’action, ni les titres et descriptions, ni les auteurs, ni les dates de publication, ni les URL, ni les canoniques. Les liens de ressources sont complétés à partir des mêmes ajouts. Aucun chiffre Search Console, effet sur le classement ou taux de conversion n’est inventé.

## Application et contrôles

Les trois transactions préparées `20261018090100`, `20261018090200` et `20261018090300` prennent les deux lignes dans un ordre stable, contrôlent version et empreinte du contenu, puis sauvegardent leur état dans une table privée avec RLS. Une erreur sur le second article annule tout le lot. Un nouvel appel sur la version déjà appliquée ne modifie rien. Seuls `content`, `internal_links` et `updated_at` sont écrits.

Validation locale : les trois transactions ont été simulées sur les 133 lignes publiques. Concurrence, annulation complète, conservation des autres lignes et champs, protection des sauvegardes et idempotence passent. Les deux suites existantes `article-guide-house-sitting` et `article-expat-owner` passent : **666 tests**, avant puis après l’ajout du maillage. Le graphe éditorial des sources ne conserve aucune cible d’article absente, non indexable ou sans lien entrant depuis un autre article sans drapeau `noindex`.

Un contrôle du navigateur sur le guide de Lyon a montré la version refondue, son résumé, son visuel, les tableaux, la FAQ et les destinations des deux boutons propriétaires. Le moteur de recherche renvoyait encore une ancienne version de cette même page. La gestion du cache Prerender reste différée conformément à la consigne du propriétaire ; ce document ne prétend pas que les moteurs ont déjà reçu les nouvelles versions.

La relecture de la base après application est consignée dans `registre-refonte-20261018.json`. Ce registre distingue les corps et métadonnées effectivement comparés, l’indexabilité et les liens entrants. Il ne remplace ni une inspection visuelle de chaque URL, ni une vérification de chaque source externe, ni une mesure ultérieure dans Search Console.
