export interface MissionsCityFAQ {
  q: string;
  a: string;
}

export interface MissionsCityContent {
  slug: string;
  cityName: string;
  coordinates: { lat: number; lng: number };
  radiusKm: 30;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  heroImage?: string;
  heroAlt?: string;
  sections: { heading: string; body: string }[];
  faq: MissionsCityFAQ[];
}

const LYON_IMAGE = "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/property-photos/articles-inline/hero-lyon.webp";

export const MISSIONS_CITIES: Record<string, MissionsCityContent> = {
  lyon: {
    slug: "lyon",
    cityName: "Lyon",
    coordinates: { lat: 45.764, lng: 4.8357 },
    radiusKm: 30,
    metaTitle: "Recréer du lien à Lyon : coups de main entre gens du coin | Guardiens",
    metaDescription: "À Lyon, découvrez les besoins ouverts et les personnes disponibles pour un coup de main. Une façon concrète de rencontrer les gens du coin.",
    h1: "Recréer du lien à Lyon, un coup de main à la fois",
    intro: "Nourrir un chat à la Croix-Rousse, réceptionner un colis à Vaise ou arroser un balcon à Villeurbanne peut devenir le début d'une vraie rencontre.",
    heroImage: LYON_IMAGE,
    heroAlt: "Vue de Lyon",
    sections: [
      {
        heading: "Pourquoi cela compte à Lyon",
        body: "À Lyon, un besoin très simple peut ouvrir une vraie conversation. Nourrir un chat à la Croix-Rousse, réceptionner un colis à Vaise ou arroser un balcon à Villeurbanne donne une raison concrète de se rencontrer. Le geste compte, bien sûr, mais il crée surtout un premier contact entre des personnes qui vivent à proximité. Guardiens rend ce contact visible et facile à proposer. Chacun peut exprimer ce qui lui serait utile, puis découvrir les gens du coin prêts à répondre. La confiance se construit à partir d'un échange clair, choisi et ancré dans le quotidien. Une porte s'ouvre, quelques mots s'échangent, un visage devient familier. La technologie reste à sa place : elle rapproche un besoin et une disponibilité. La rencontre, elle, appartient aux personnes. À Lyon et autour, chaque coup de main peut ainsi devenir le début d'une relation locale qui se prolonge naturellement.",
      },
      {
        heading: "Ce qui s'échange à Lyon et autour",
        body: "Les coups de main prennent la forme de la vie ordinaire. À la Croix-Rousse, une personne peut chercher quelqu'un pour nourrir son chat. À Vaise, une autre souhaite faire réceptionner un colis. À Villeurbanne, quelques plantes attendent un arrosage pendant une absence. On peut aussi proposer de porter un objet, partager un trajet, accompagner une course, expliquer un outil numérique ou transmettre un savoir-faire. Ces gestes ont un point commun : ils sont assez précis pour permettre une réponse simple. La personne qui aide sait ce qui est attendu, celle qui formule son besoin choisit le moment et les conditions qui lui conviennent. Autour de Lyon, de Caluire-et-Cuire à Tassin-la-Demi-Lune, cette clarté facilite les premières rencontres. Un service rendu devient alors une occasion de discuter, de découvrir une personne du coin et, parfois, d'imaginer un prochain échange.",
      },
      {
        heading: "Comment le coup de main commence",
        body: "Vous décrivez votre besoin avec vos mots, votre ville et le moment souhaité. Dix personnes du coin reçoivent alors votre demande. L'une d'elles dit « Je peux ». Vous échangez directement pour préciser le rendez-vous, le geste attendu et ce que vous souhaitez proposer en retour. Cette progression garde chaque décision entre vos mains. La carte permet aussi de voir les besoins ouverts et les personnes disponibles autour de Lyon. Vous pouvez parcourir les profils, lire les savoir-faire proposés et écrire à la personne qui vous semble correspondre. Après le coup de main, chacun peut confirmer la rencontre et laisser un mot sur l'autre personne. Ce retour raconte une expérience humaine, avec un prénom, une ville et une attention partagée. Il aide les prochains membres à comprendre que derrière chaque besoin se trouve une rencontre réelle entre gens du coin.",
      },
      {
        heading: "Une logique d'échange",
        body: "L'Entraide repose sur une circulation simple : vous recevez aujourd'hui, vous donnez demain, selon vos possibilités. Le retour peut prendre la forme d'un autre service, d'un savoir-faire transmis, d'une attention ou d'un moment partagé. Chacun apporte ce qu'il sait faire et demande ce qui lui serait utile. Cette souplesse crée une relation équilibrée, fondée sur l'accord entre les personnes. À Lyon, le lien se construit ainsi à partir de gestes concrets et de rendez-vous choisis. Le coup de main sert de point de départ. La confiance grandit ensuite grâce à la parole tenue, au mot laissé après la rencontre et à la possibilité de se retrouver. Guardiens facilite la mise en relation, puis laisse toute la place à l'échange humain. De besoin en besoin, les gens du coin deviennent des visages connus et des personnes sur lesquelles chacun peut compter.",
      },
    ],
    faq: [
      { q: "Quelles communes autour de Lyon apparaissent dans le rayon ?", a: "La carte couvre Lyon et les communes proches selon leur distance réelle, notamment Villeurbanne, Caluire-et-Cuire et Tassin-la-Demi-Lune. Les besoins et les personnes sont classés par proximité." },
      { q: "Que faire lorsque le fil est calme aujourd'hui à Lyon ?", a: "Décrivez votre besoin. Il reste visible et les personnes disponibles autour de Lyon peuvent le découvrir puis dire « Je peux »." },
      { q: "Qui peut utiliser l'Entraide à Lyon ?", a: "L'Entraide est ouverte à tous les membres. Vous convenez ensemble d'un service ou d'une attention en retour." },
      { q: "Quelle différence avec une garde de maison à Lyon ?", a: "L'Entraide répond à un besoin ponctuel dans la journée. Une garde de maison couvre un séjour de plusieurs jours sur place." },
    ],
  },
  marseille: {
    slug: "marseille",
    cityName: "Marseille",
    coordinates: { lat: 43.2965, lng: 5.3698 },
    radiusKm: 30,
    metaTitle: "Recréer du lien à Marseille : coups de main entre gens du coin | Guardiens",
    metaDescription: "À Marseille, découvrez les besoins ouverts et les personnes disponibles pour un coup de main. Une façon concrète de rencontrer les gens du coin.",
    h1: "Recréer du lien à Marseille, un coup de main à la fois",
    intro: "Nourrir un chat au Panier, réceptionner un colis à la Plaine ou arroser des plantes vers Aubagne peut devenir le début d'une vraie rencontre.",
    sections: [
      {
        heading: "Pourquoi cela compte à Marseille",
        body: "À Marseille, un besoin quotidien peut devenir une invitation à se rencontrer. Nourrir un chat au Panier, réceptionner un colis à la Plaine ou arroser des plantes du côté d'Aubagne crée un motif clair pour entrer en contact. Guardiens relie une personne qui exprime ce qui lui serait utile à des gens du coin disponibles pour donner un coup de main. Le service ouvre la conversation, puis chacun choisit la suite. Quelques messages permettent de préciser le rendez-vous, une porte s'ouvre et deux personnes qui vivaient à proximité se découvrent enfin. La technologie facilite ce premier pas tout en laissant la relation se construire librement. À Marseille et autour, l'Entraide transforme ainsi les gestes ordinaires en occasions de faire connaissance. Une aide ponctuelle peut devenir un prénom retenu, une discussion qui se prolonge et une confiance locale qui grandit au fil des échanges.",
      },
      {
        heading: "Ce qui s'échange à Marseille et autour",
        body: "Les coups de main partent de situations familières. Au Panier, une personne peut demander une visite pour son chat. À la Plaine, quelqu'un cherche une présence pour réceptionner un colis. Vers Aubagne, des plantes ont besoin d'eau pendant une absence. D'autres besoins concernent une course, un objet à déplacer, un appareil à comprendre, un trajet à partager ou un savoir-faire à transmettre. Chaque demande décrit un geste précis et un moment possible. Cette simplicité permet à une personne disponible de se reconnaître immédiatement dans le besoin et de répondre en confiance. Marseille, Allauch, Aubagne ou Plan-de-Cuques deviennent alors les points de départ d'échanges choisis entre gens du coin. Le service rendu reste concret, tandis que la rencontre ouvre un espace plus large : quelques mots, une attention, la découverte d'une personne et l'envie possible de se revoir pour un autre coup de main.",
      },
      {
        heading: "Comment le coup de main commence",
        body: "Vous écrivez ce dont vous avez besoin, indiquez votre ville et proposez le moment qui vous convient. Dix personnes du coin reçoivent votre demande. L'une d'elles dit « Je peux ». Vous poursuivez alors la conversation directement pour préciser le rendez-vous, le geste et l'attention prévue en retour. La carte rassemble les besoins ouverts et les personnes disponibles autour de Marseille. Elle permet de repérer ce qui se passe près de chez vous, puis de consulter les profils et les savoir-faire proposés. Vous restez libre de choisir la personne avec laquelle vous souhaitez échanger. Une fois le coup de main réalisé, chacun peut confirmer la rencontre et écrire quelques mots sur l'autre personne. Ces preuves racontent des échanges réels avec des prénoms et des villes. Elles donnent confiance et montrent que l'Entraide prend vie à travers des rencontres concrètes entre gens du coin.",
      },
      {
        heading: "Une logique d'échange",
        body: "L'Entraide avance grâce à une réciprocité souple. Vous pouvez demander un coup de main aujourd'hui et proposer votre disponibilité une autre fois. Le retour se décide ensemble : un service, un savoir-faire, une attention ou un moment partagé. Cette liberté respecte les possibilités de chacun et place les deux personnes sur un pied d'égalité. À Marseille, la relation commence avec un besoin formulé clairement. Elle grandit grâce au rendez-vous tenu, à la conversation et à la confiance créée sur place. Le coup de main devient le prétexte d'une rencontre qui pourra compter au-delà du geste initial. Guardiens organise la mise en relation et rend visibles les disponibilités du coin. Les personnes font le reste, avec leurs mots, leur temps et ce qu'elles souhaitent transmettre. Chaque échange contribue ainsi à rendre les liens locaux plus simples, plus directs et plus vivants.",
      },
    ],
    faq: [
      { q: "Quelles communes autour de Marseille apparaissent dans le rayon ?", a: "La carte couvre Marseille et les communes proches selon leur distance réelle, notamment Allauch, Aubagne et Plan-de-Cuques. Les besoins et les personnes sont classés par proximité." },
      { q: "Que faire lorsque le fil est calme aujourd'hui à Marseille ?", a: "Décrivez votre besoin. Il reste visible et les personnes disponibles autour de Marseille peuvent le découvrir puis dire « Je peux »." },
      { q: "Qui peut utiliser l'Entraide à Marseille ?", a: "L'Entraide est ouverte à tous les membres. Vous convenez ensemble d'un service ou d'une attention en retour." },
      { q: "Quelle différence avec une garde de maison à Marseille ?", a: "L'Entraide répond à un besoin ponctuel dans la journée. Une garde de maison couvre un séjour de plusieurs jours sur place." },
    ],
  },
  strasbourg: {
    slug: "strasbourg",
    cityName: "Strasbourg",
    coordinates: { lat: 48.5734, lng: 7.7521 },
    radiusKm: 30,
    metaTitle: "Recréer du lien à Strasbourg : coups de main entre gens du coin | Guardiens",
    metaDescription: "À Strasbourg, découvrez les besoins ouverts et les personnes disponibles pour un coup de main. Une façon concrète de rencontrer les gens du coin.",
    h1: "Recréer du lien à Strasbourg, un coup de main à la fois",
    intro: "Nourrir un chat à la Krutenau, réceptionner un colis à Neudorf ou arroser des plantes à Schiltigheim peut devenir le début d'une vraie rencontre.",
    sections: [
      {
        heading: "Pourquoi cela compte à Strasbourg",
        body: "À Strasbourg, un besoin concret peut rapprocher des personnes qui vivent à quelques rues. Nourrir un chat à la Krutenau, réceptionner un colis à Neudorf ou arroser des plantes à Schiltigheim offre une raison simple de faire connaissance. Guardiens met en relation la personne qui exprime son besoin et les gens du coin prêts à donner un coup de main. La demande est claire, la réponse reste libre et la conversation commence autour d'un geste utile. La technologie facilite cette première étape, puis la rencontre prend toute sa place. Un rendez-vous choisi permet d'associer un prénom à un visage et de découvrir une personne disponible près de chez soi. À Strasbourg et autour, l'Entraide transforme ainsi le quotidien en occasions de créer des liens. Chaque coup de main peut ouvrir une relation locale fondée sur l'attention, la parole tenue et l'envie de participer à son tour.",
      },
      {
        heading: "Ce qui s'échange à Strasbourg et autour",
        body: "Les échanges commencent avec des besoins faciles à comprendre. À la Krutenau, une personne peut chercher quelqu'un pour passer voir son chat. À Neudorf, une autre souhaite faire réceptionner un colis. À Schiltigheim, quelques plantes attendent un arrosage. Un coup de main peut aussi concerner une course, un meuble à déplacer, un trajet, un outil numérique ou une compétence à partager. Le lieu et le moment donnent un cadre concret à la demande. La personne disponible peut alors répondre en sachant comment elle peut être utile. Strasbourg, Illkirch-Graffenstaden, Bischheim ou Ostwald deviennent les points de départ de rencontres entre gens du coin. Le geste apporte une réponse immédiate, tandis que l'échange crée une proximité nouvelle. Une discussion commence, un savoir-faire circule et une prochaine occasion de s'entraider peut apparaître naturellement.",
      },
      {
        heading: "Comment le coup de main commence",
        body: "Vous indiquez votre besoin, votre ville et le moment souhaité. Dix personnes du coin reçoivent votre demande. L'une d'elles dit « Je peux ». Vous échangez ensuite directement pour convenir du rendez-vous, préciser le geste et choisir ensemble l'attention proposée en retour. La carte présente les besoins ouverts et les personnes disponibles autour de Strasbourg. Vous pouvez découvrir les profils, lire les coups de main proposés et contacter la personne qui correspond à votre situation. Chaque étape reste lisible et chaque choix vous appartient. Après la rencontre, vous pouvez confirmer que le coup de main a eu lieu et laisser quelques mots sur l'autre personne. Ces retours associent un prénom, une ville et une expérience vécue. Ils rendent les échanges visibles et donnent aux prochains membres une image concrète de l'Entraide entre gens du coin.",
      },
      {
        heading: "Une logique d'échange",
        body: "L'Entraide forme une chaîne de gestes choisis. Vous pouvez recevoir un coup de main lorsque vous en avez besoin, puis offrir votre temps ou votre savoir-faire quand l'occasion se présente. Le retour se construit ensemble et peut prendre plusieurs formes : un service futur, une compétence transmise, une attention ou un moment partagé. Cette souplesse permet à chacun de contribuer selon ses possibilités. À Strasbourg, le besoin crée le premier contact. La rencontre donne ensuite sa valeur à l'échange. Un rendez-vous tenu, quelques mots et une expérience confirmée font grandir la confiance entre les personnes. Guardiens rend les besoins et les disponibilités visibles, tout en laissant les gens du coin décider de leur relation. De coup de main en coup de main, les échanges installent une proximité concrète et donnent envie de participer à son tour.",
      },
    ],
    faq: [
      { q: "Quelles communes autour de Strasbourg apparaissent dans le rayon ?", a: "La carte couvre Strasbourg et les communes proches selon leur distance réelle, notamment Schiltigheim, Illkirch-Graffenstaden et Bischheim. Les besoins et les personnes sont classés par proximité." },
      { q: "Que faire lorsque le fil est calme aujourd'hui à Strasbourg ?", a: "Décrivez votre besoin. Il reste visible et les personnes disponibles autour de Strasbourg peuvent le découvrir puis dire « Je peux »." },
      { q: "Qui peut utiliser l'Entraide à Strasbourg ?", a: "L'Entraide est ouverte à tous les membres. Vous convenez ensemble d'un service ou d'une attention en retour." },
      { q: "Quelle différence avec une garde de maison à Strasbourg ?", a: "L'Entraide répond à un besoin ponctuel dans la journée. Une garde de maison couvre un séjour de plusieurs jours sur place." },
    ],
  },
};

export const MISSIONS_CITY_SLUGS = Object.keys(MISSIONS_CITIES);