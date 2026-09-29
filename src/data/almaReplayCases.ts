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
  }
];
