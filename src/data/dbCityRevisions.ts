/**
 * Pages villes servies par la base (seo_city_pages) et refondues le 01/10/2026,
 * liste fermée. Le corps éditorial vit en base (sans FAQ) ; la FAQ visible et
 * le JSON-LD FAQPage lisent cette unique liste. Les autres pages villes en
 * base gardent le gabarit historique.
 */

export interface DbCityRevision {
  faq: { q: string; a: string }[];
}

const NO_EMERGENCY =
  "Prévenez-vous mutuellement au plus tôt et gardez une solution de secours personnelle (proche, voisin de confiance, professionnel). Le réseau de gardiens d'urgence de Guardiens n'est pas encore activé.";

const PAID =
  "Non, la garde n'est pas rémunérée sur Guardiens : le gardien est hébergé chez vous. Les frais éventuels (nourriture des animaux, soins, transport) se conviennent à l'avance, par écrit. Les conditions de la plateforme sont sur la page Tarifs.";

export const DB_CITY_REVISIONS: Record<string, DbCityRevision> = {
  rennes: {
    faq: [
      { q: "Comment trouver un gardien à Rennes ?", a: "Publiez une annonce avec votre logement, vos animaux et vos dates. Les gardiens intéressés postulent ; vous lisez leur profil et leurs avis, échangez par messagerie et pouvez les rencontrer avant de choisir. Aucun délai de réponse n'est garanti." },
      { q: "Le gardien est-il payé ?", a: PAID },
      { q: "Où un chien peut-il être lâché à Rennes ?", a: "Dans les espaces canins de la Ville, où la laisse n'est pas obligatoire. Dans les autres parcs et jardins, les chiens sont admis tenus en laisse, selon la Ville et la Métropole de Rennes." },
      { q: "Le gardien sera-t-il présent toute la journée ?", a: "Pas forcément. Le temps de présence et les absences possibles se décident entre vous avant la garde, selon les besoins de vos animaux." },
      { q: "Que se passe-t-il si le gardien annule ?", a: NO_EMERGENCY },
    ],
  },
  bordeaux: {
    faq: [
      { q: "Comment trouver un gardien à Bordeaux ?", a: "Publiez une annonce décrivant votre logement, vos animaux et vos dates. Les gardiens intéressés postulent ; vous consultez leur profil et leurs avis, échangez et pouvez les rencontrer avant de confirmer. Aucun délai de réponse n'est garanti." },
      { q: "Le gardien est-il payé ?", a: PAID },
      { q: "Les chiens sont-ils admis dans les parcs de Bordeaux ?", a: "La présence des chiens est encadrée par le règlement des parcs et jardins de la Ville. Les règles varient selon les lieux : vérifiez l'affichage à l'entrée de chaque parc avant d'y lâcher ou d'y promener un chien." },
      { q: "Que prévoir en cas de forte chaleur ?", a: "Des consignes écrites : horaires de sortie aux heures fraîches, eau à disposition, volets, et ce que vous souhaitez si votre animal montre des signes de malaise (contact du vétérinaire)." },
      { q: "Que se passe-t-il si le gardien annule ?", a: NO_EMERGENCY },
    ],
  },
  "clermont-ferrand": {
    faq: [
      { q: "Comment trouver un gardien à Clermont-Ferrand ?", a: "Publiez une annonce avec votre logement, vos animaux et vos dates. Les gardiens intéressés postulent ; vous lisez leur profil et leurs avis, échangez par messagerie et pouvez les rencontrer avant de choisir. Aucun délai de réponse n'est garanti." },
      { q: "Le gardien est-il payé ?", a: PAID },
      { q: "Peut-on emmener un chien dans la Chaîne des Puys ?", a: "Oui, mais selon l'Office de tourisme, le chien doit être tenu en laisse sur l'ensemble du périmètre Chaîne des Puys et faille de Limagne, et certains secteurs, comme le puy de Combegrasse, lui sont interdits même en laisse." },
      { q: "Que prévoir pour une garde en hiver ?", a: "Des consignes écrites sur le chauffage, la mise hors gel et l'accès au logement par temps de neige, ainsi que le contact d'une personne relais." },
      { q: "Que se passe-t-il si le gardien annule ?", a: NO_EMERGENCY },
    ],
  },
  nice: {
    faq: [
      { q: "Comment trouver un gardien à Nice ?", a: "Publiez une annonce avec votre logement, vos animaux et vos dates. Les gardiens intéressés postulent ; vous consultez leur profil et leurs avis, échangez et pouvez les rencontrer avant de choisir. Aucun délai de réponse n'est garanti." },
      { q: "Le gardien est-il payé ?", a: PAID },
      { q: "Mon chien peut-il aller à la plage à Nice ?", a: "Pas sur toutes les plages. La Ville de Nice indique des plages dédiées aux chiens, la plage de la Lanterne et la plage de Lenval, à fréquenter aux heures les plus douces. Ailleurs, suivez la signalétique." },
      { q: "Que prévoir en été ?", a: "Sorties tôt le matin ou en soirée, éviter le bitume au soleil, eau toujours disponible, et jamais d'animal laissé seul en voiture, comme le rappelle la Ville de Nice." },
      { q: "Que se passe-t-il si le gardien annule ?", a: NO_EMERGENCY },
    ],
  },
  strasbourg: {
    faq: [
      { q: "Comment trouver un gardien à Strasbourg ?", a: "Publiez une annonce avec votre logement, vos animaux et vos dates. Les gardiens intéressés postulent ; vous lisez leur profil et leurs avis, échangez et pouvez les rencontrer avant de choisir. Aucun délai de réponse n'est garanti." },
      { q: "Le gardien est-il payé ?", a: PAID },
      { q: "Où un chien peut-il être lâché à Strasbourg ?", a: "Uniquement dans les aires d'ébats aménagées. Sur la voie publique, la laisse est obligatoire dans toute la ville, selon la Ville et l'Eurométropole de Strasbourg." },
      { q: "Le chien peut-il prendre le tram ?", a: "Oui : la Ville indique que tous les chiens, hors catégorie 1, sont admis gratuitement dans les trams. Un grand chien voyage tenu en laisse et muselé." },
      { q: "Que se passe-t-il si le gardien annule ?", a: NO_EMERGENCY },
    ],
  },
  lille: {
    faq: [
      { q: "Comment trouver un gardien à Lille ?", a: "Publiez une annonce avec votre logement, vos animaux et vos dates. Les gardiens intéressés postulent ; vous consultez leur profil et leurs avis, échangez et pouvez les rencontrer avant de choisir. Aucun délai de réponse n'est garanti." },
      { q: "Le gardien est-il payé ?", a: PAID },
      { q: "Les chiens sont-ils admis dans tous les parcs de Lille ?", a: "Non. La liste des parcs accessibles aux chiens est fixée par arrêté municipal et affichée sur place. Dans ces parcs, les chiens sont tenus en laisse, sauf dans les caniparcs, qui ont leur propre règlement." },
      { q: "Le gardien sera-t-il présent toute la journée ?", a: "Pas forcément. Les absences possibles dans la journée se décident entre vous avant la garde, selon les besoins de vos animaux." },
      { q: "Que se passe-t-il si le gardien annule ?", a: NO_EMERGENCY },
    ],
  },
  biarritz: {
    faq: [
      { q: "Peut-on trouver un gardien à Biarritz ?", a: "Vous pouvez publier une annonce pour Biarritz. Aucun gardien n'indique encore résider dans la commune sur Guardiens, et aucune disponibilité n'est garantie : les candidatures dépendent des gardiens prêts à se déplacer." },
      { q: "Le gardien est-il payé ?", a: PAID },
      { q: "Où un chien peut-il être lâché à Biarritz ?", a: "La Ville a créé un chemin d'environ 300 mètres pour chiens en liberté dans l'espace naturel de Mouriscot, entre l'allée Gabrielle Dorziat et la rue du Lavoir de Compère. Ailleurs dans les parcs, la laisse reste la règle." },
      { q: "Quelles conditions sur le chemin de Mouriscot ?", a: "Selon la Ville, le chien reste à moins de 100 mètres et revient au rappel, il doit être sociable et identifié, les déjections sont ramassées, et les chiens de catégorie 1 et 2 n'y sont pas admis sauf dérogation." },
      { q: "Que se passe-t-il si le gardien annule ?", a: NO_EMERGENCY },
    ],
  },
};
