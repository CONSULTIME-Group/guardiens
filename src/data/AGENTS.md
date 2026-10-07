# Décisions techniques, contenus éditoriaux refondus

- Articles guides refondus : la liste fermée GUIDE_ARTICLE_SLUGS (ArticleRenderer) active la mise en page de lecture dédiée (résumé avant l'image, ancres sur les titres, liens soulignés, un seul bloc de ressources) ; le texte reste en base, `:::faq Titre` porte l'unique titre FAQ ; pourquoi : refondre un article sans changer le rendu des autres.

- Pages villes et guides locaux refondus : liste fermée REVISED_CITY_SLUGS (src/data/cityContent.ts, FAQ visible et JSON-LD lus dans `faq`) et GUIDE_OVERRIDES (src/data/guideOverrides.ts, textes sourcés et lieux retenus par identifiant, base intacte) ; pourquoi : refondre une page sans toucher les autres villes ni réécrire les lignes partagées en base.

- Pages villes servies par la base et refondues : liste fermée DB_CITY_REVISIONS (src/data/dbCityRevisions.ts, FAQ visible et JSON-LD), corps éditorial en base avec sauvegarde datée avant écriture ; dans les guides refondus, commerces réduits à nom, adresse et source, badge « chiens admis » seulement si une source le dit ; pourquoi : aucune promesse non sourcée, les autres villes gardent le gabarit.
