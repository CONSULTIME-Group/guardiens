/**
 * Lot J2-B : jeu de non-régression d'Alma, figé. Les 38 échanges réels hors
 * administrateurs d'alma_conversations (14 au 28/09/2026), prénoms remplacés
 * par « Membre N », prénom cité dans un message remplacé par « Camille ».
 * Rejoué uniquement au clic depuis /admin/alma.
 */
export interface AlmaReplayCase {
  id: string;
  member: string;
  activeRole: "owner" | "sitter";
  accountRole: "owner" | "sitter" | "both";
  surface: string;
  question: string;
  /** Messages précédents du même membre, dans l'ordre. */
  history: string[];
  /** Lot L3 : contexte réel du membre au moment de la question. */
  context?: string;
  /** Lot L1 : page ouverte au moment de la question (fiche d'annonce). */
  pagePath?: string;
  /** Lot L1 : attentes propres au cas, vérifiées par checkReplayAnswer. */
  expect?: {
    mentionsOwner?: boolean;
    /** Lot L2 : mots que la réponse doit contenir. */
    mentions?: string[];
    /** Lot L3 : lieux qui ne doivent jamais être présentés comme disponibles. */
    placeNotAvailable?: string[];
    /** Lot L3 : libellé d'action interdit (préfixe). */
    forbiddenActionPrefix?: string;
    actionPath?: string;
    forbidden?: string[];
  };
}

export const ALMA_REPLAY_CASES: AlmaReplayCase[] = [
  {
    "id": "cas-01",
    "member": "Membre 1",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "Je m'en occupe",
    "history": []
  },
  {
    "id": "cas-02",
    "member": "Membre 1",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "Comment se passe une garde ?",
    "history": [
      "Je m'en occupe"
    ]
  },
  {
    "id": "cas-03",
    "member": "Membre 2",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "sitter_dashboard",
    "question": "J'aimerais savoir comment se passe le gardiennage",
    "history": []
  },
  {
    "id": "cas-04",
    "member": "Membre 2",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "sitter_dashboard",
    "question": "J'ai rien a payer pour le logement",
    "history": [
      "J'aimerais savoir comment se passe le gardiennage"
    ]
  },
  {
    "id": "cas-05",
    "member": "Membre 3",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "sit_detail",
    "question": "Je postule",
    "history": []
  },
  {
    "id": "cas-06",
    "member": "Membre 4",
    "activeRole": "owner",
    "accountRole": "owner",
    "surface": "owner_dashboard",
    "question": "Je souhaiterais retirar k annonce",
    "history": []
  },
  {
    "id": "cas-07",
    "member": "Membre 5",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "sit_detail",
    "question": "Je m'en occupe",
    "history": []
  },
  {
    "id": "cas-08",
    "member": "Membre 6",
    "activeRole": "owner",
    "accountRole": "both",
    "surface": "listings",
    "question": "Bonjour Alma, j'ai envoyé un message à Camille mais je ne le vois pas apparaître dans les messages. Pourriez-vous m'indiquer si tout est OK merci",
    "history": []
  },
  {
    "id": "cas-09",
    "member": "Membre 7",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "Accompagnez moi",
    "history": []
  },
  {
    "id": "cas-10",
    "member": "Membre 8",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "Y A TIL des propositions en bretagne, normandie ?",
    "history": []
  },
  {
    "id": "cas-11",
    "member": "Membre 8",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "OUI",
    "history": [
      "Y A TIL des propositions en bretagne, normandie ?"
    ]
  },
  {
    "id": "cas-12",
    "member": "Membre 8",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "je ne trouve aucune annonce est ce normal ?",
    "history": [
      "Y A TIL des propositions en bretagne, normandie ?",
      "OUI"
    ]
  },
  {
    "id": "cas-13",
    "member": "Membre 8",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "NON",
    "history": [
      "Y A TIL des propositions en bretagne, normandie ?",
      "OUI",
      "je ne trouve aucune annonce est ce normal ?"
    ]
  },
  {
    "id": "cas-14",
    "member": "Membre 8",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "Que faut il faire ?",
    "history": [
      "Y A TIL des propositions en bretagne, normandie ?",
      "OUI",
      "je ne trouve aucune annonce est ce normal ?",
      "NON"
    ]
  },
  {
    "id": "cas-15",
    "member": "Membre 8",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "Publier mon profil",
    "history": [
      "Y A TIL des propositions en bretagne, normandie ?",
      "OUI",
      "je ne trouve aucune annonce est ce normal ?",
      "NON",
      "Que faut il faire ?"
    ]
  },
  {
    "id": "cas-16",
    "member": "Membre 9",
    "activeRole": "sitter",
    "accountRole": "both",
    "surface": "sit_detail",
    "question": "Je n'arrive pas à ajouter une photo quand je clique rien ne s'ouvre",
    "history": []
  },
  {
    "id": "cas-17",
    "member": "Membre 10",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "sit_detail",
    "question": "Accompagnez moi",
    "history": []
  },
  {
    "id": "cas-18",
    "member": "Membre 11",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "Je m'en occupe",
    "history": []
  },
  {
    "id": "cas-19",
    "member": "Membre 11",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "Comment je m'y prends ?",
    "history": [
      "Je m'en occupe"
    ]
  },
  {
    "id": "cas-20",
    "member": "Membre 11",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "Comment se passe une garde ?",
    "history": [
      "Je m'en occupe",
      "Comment je m'y prends ?"
    ]
  },
  {
    "id": "cas-21",
    "member": "Membre 12",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "sit_detail",
    "question": "Bonjour",
    "history": []
  },
  {
    "id": "cas-22",
    "member": "Membre 12",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "sit_detail",
    "question": "Je suis disponible",
    "history": [
      "Bonjour"
    ]
  },
  {
    "id": "cas-23",
    "member": "Membre 13",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "Je m'en occupe",
    "history": []
  },
  {
    "id": "cas-24",
    "member": "Membre 14",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "Je m'en occupe",
    "history": []
  },
  {
    "id": "cas-25",
    "member": "Membre 14",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "Comment se passe une garde ?",
    "history": [
      "Je m'en occupe"
    ]
  },
  {
    "id": "cas-26",
    "member": "Membre 15",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "Comment supprimer un compte ?",
    "history": []
  },
  {
    "id": "cas-27",
    "member": "Membre 16",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "sitter_dashboard",
    "question": "je voudrais supprimer mon compte svp",
    "history": []
  },
  {
    "id": "cas-28",
    "member": "Membre 16",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "sitter_dashboard",
    "question": "en fait je voudrais faire du gardiennage mais en Indonésie et je ne trouve pas l'option",
    "history": [
      "je voudrais supprimer mon compte svp"
    ]
  },
  {
    "id": "cas-29",
    "member": "Membre 16",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "sitter_dashboard",
    "question": "merci",
    "history": [
      "je voudrais supprimer mon compte svp",
      "en fait je voudrais faire du gardiennage mais en Indonésie et je ne trouve pas l'option"
    ]
  },
  {
    "id": "cas-30",
    "member": "Membre 17",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "Trouve les annonces autour de toulouse",
    "history": []
  },
  {
    "id": "cas-31",
    "member": "Membre 18",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "Accompagnez moi",
    "history": []
  },
  {
    "id": "cas-32",
    "member": "Membre 19",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "Comment se passe une garde ?",
    "history": []
  },
  {
    "id": "cas-33",
    "member": "Membre 20",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "Je m'en occupe",
    "history": []
  },
  {
    "id": "cas-34",
    "member": "Membre 20",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "listings",
    "question": "Je cherche sur la Rochelle",
    "history": [
      "Je m'en occupe"
    ]
  },
  {
    "id": "cas-35",
    "member": "Membre 21",
    "activeRole": "owner",
    "accountRole": "both",
    "surface": "owner_dashboard",
    "question": "Proposez moi un texte",
    "history": []
  },
  {
    "id": "cas-36",
    "member": "Membre 22",
    "activeRole": "owner",
    "accountRole": "both",
    "surface": "sits_list",
    "question": "j'ai peut etre fais une erreur mais je ne pose pas ma candidature je cherche au contraire de l'aide !!!",
    "history": []
  },
  {
    "id": "cas-37",
    "member": "Membre 22",
    "activeRole": "owner",
    "accountRole": "both",
    "surface": "listings",
    "question": "inadapté; j'ai 15 chevaux et poneys",
    "history": [
      "j'ai peut etre fais une erreur mais je ne pose pas ma candidature je cherche au contraire de l'aide !!!"
    ]
  },
  {
    "id": "cas-38",
    "member": "Membre 22",
    "activeRole": "owner",
    "accountRole": "both",
    "surface": "listings",
    "question": "bon je vais en rester là",
    "history": [
      "j'ai peut etre fais une erreur mais je ne pose pas ma candidature je cherche au contraire de l'aide !!!",
      "inadapté; j'ai 15 chevaux et poneys"
    ]
  },
  {
    "id": "cas-39",
    "member": "Membre 23",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "sit_detail",
    "question": "Bonjour quel est le nom de votre joli village ?",
    "history": [],
    "pagePath": "/sits/85315487-7c43-4e10-a97e-821aefd10a8c",
    "expect": {
      "mentionsOwner": true,
      "actionPath": "/sits/85315487-7c43-4e10-a97e-821aefd10a8c?postuler=1",
      "forbidden": ["Lyon", "Córdoba", "Cordoba"]
    }
  },
  {
    "id": "cas-40",
    "member": "Membre 24",
    "activeRole": "sitter",
    "accountRole": "sitter",
    "surface": "sit_detail",
    "question": "Pouvez-vous me préciser la ville",
    "history": [],
    "pagePath": "/sits/85315487-7c43-4e10-a97e-821aefd10a8c",
    "expect": {
      "mentionsOwner": true,
      "actionPath": "/sits/85315487-7c43-4e10-a97e-821aefd10a8c?postuler=1",
      "forbidden": ["Lyon", "Córdoba", "Cordoba"]
    }
  },
  {
    "id": "cas-41",
    "member": "Membre 25",
    "activeRole": "owner",
    "accountRole": "owner",
    "surface": "dashboard",
    "question": "Je veux supprimer la photo de ma maison",
    "history": [],
    "expect": {
      "mentions": ["Galerie"],
      "actionPath": "/owner-profile?section=gallery",
      "forbidden": ["messagerie", "Messagerie"]
    }
  },
  {
    "id": "cas-42",
    "member": "Membre 25",
    "activeRole": "owner",
    "accountRole": "owner",
    "surface": "dashboard",
    "question": "Je ne peux trouver la page pour supprimer la photo de ma maison",
    "history": ["Je veux supprimer la photo de ma maison"],
    "expect": {
      "mentions": ["Galerie"],
      "actionPath": "/owner-profile?section=gallery",
      "forbidden": ["messagerie", "Messagerie"]
    }
  },
  {
    "id": "cas-43",
    "member": "Membre 26",
    "activeRole": "owner",
    "accountRole": "both",
    "surface": "sits_list",
    "question": "Je recherche une garde en toscane",
    "history": [],
    "context": "Rôle both, espace propriétaire actif, brouillon dont la date de début (03/09/2026) est passée",
    "expect": {
      "mentions": [
        "espace propriétaire",
        "espace gardien"
      ],
      "actionPath": "/annonces?espace=gardien",
      "placeNotAvailable": [
        "Toscane",
        "Italie"
      ],
      "forbidden": [
        "international",
        "dossier",
        "Toscane"
      ],
      "forbiddenActionPrefix": "Publier le brouillon"
    }
  },
  {
    "id": "cas-44",
    "member": "Membre 26",
    "activeRole": "owner",
    "accountRole": "both",
    "surface": "listings",
    "question": "Je cherche à garder un chien en toscane.",
    "history": [
      "Je recherche une garde en toscane"
    ],
    "context": "Rôle both, espace propriétaire actif, brouillon dont la date de début (03/09/2026) est passée",
    "expect": {
      "mentions": [
        "espace propriétaire",
        "espace gardien"
      ],
      "actionPath": "/annonces?espace=gardien",
      "placeNotAvailable": [
        "Toscane",
        "Italie"
      ],
      "forbidden": [
        "international",
        "dossier",
        "Toscane"
      ],
      "forbiddenActionPrefix": "Publier le brouillon"
    }
  },
  {
    "id": "cas-45",
    "member": "Membre 26",
    "activeRole": "owner",
    "accountRole": "both",
    "surface": "listings",
    "question": "Où sont les annonces ? Sous la rubrique annonces, je ne trouve que la mienne.",
    "history": [
      "Je recherche une garde en toscane",
      "Je cherche à garder un chien en toscane."
    ],
    "context": "Rôle both, espace propriétaire actif, brouillon dont la date de début (03/09/2026) est passée",
    "expect": {
      "mentions": [
        "espace propriétaire",
        "espace gardien"
      ],
      "actionPath": "/annonces?espace=gardien",
      "placeNotAvailable": [
        "Toscane",
        "Italie"
      ],
      "forbidden": [
        "international",
        "dossier",
        "Toscane"
      ],
      "forbiddenActionPrefix": "Publier le brouillon"
    }
  },
  {
    "id": "cas-46",
    "member": "Membre 26",
    "activeRole": "owner",
    "accountRole": "both",
    "surface": "listings",
    "question": "Où est cette page ?",
    "history": [
      "Je recherche une garde en toscane",
      "Je cherche à garder un chien en toscane.",
      "Où sont les annonces ? Sous la rubrique annonces, je ne trouve que la mienne."
    ],
    "context": "Rôle both, espace propriétaire actif, brouillon dont la date de début (03/09/2026) est passée",
    "expect": {
      "mentions": [
        "espace propriétaire",
        "espace gardien"
      ],
      "actionPath": "/annonces?espace=gardien",
      "placeNotAvailable": [
        "Toscane",
        "Italie"
      ],
      "forbidden": [
        "international",
        "dossier",
        "Toscane"
      ],
      "forbiddenActionPrefix": "Publier le brouillon"
    }
  },
  {
    "id": "cas-47",
    "member": "Membre 25",
    "activeRole": "owner",
    "accountRole": "owner",
    "surface": "listings",
    "question": "Je ne peux trouver la page pour supprimer la photo de ma maison",
    "history": [
      "Je veux supprimer la photo de ma maison"
    ],
    "context": "Classement par motifs (source patterns), question sans lien avec la messagerie",
    "expect": {
      "mentions": [
        "Galerie"
      ],
      "actionPath": "/owner-profile?section=gallery",
      "forbidden": [
        "messagerie",
        "Messagerie",
        "dossier"
      ]
    }
  }
];
