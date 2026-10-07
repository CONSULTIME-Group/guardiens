/**
 * Lot L4 : Alma compagnon. Module pur, partagé par alma-chat et les tests.
 *
 * 1. Faits verrouillés, voix libre : les réponses fixes des lots L1 à L3
 *    deviennent des consignes (faits vérifiés, action obligatoire, interdits).
 *    Le modèle rédige ; un contrôle après génération retombe sur le gabarit
 *    si un fait manque ou si un interdit apparaît.
 * 2. Personnalisation à partir de données réelles du membre.
 * 3. Touches de chien liées au sujet, amorces jamais répétées sur 20 réponses.
 * 4. Animaux d'une annonce : fiche animal, sinon titre et description.
 * 5. Transparence : Alma est une IA et le dit, jamais de déni.
 */

export const foldC = (s: string): string =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2019\u2018]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// ---------------------------------------------------------------------------
// Faits verrouillés
// ---------------------------------------------------------------------------

export interface LockedFact {
  /** Clé journalisée quand le fait manque. */
  key: string;
  /** Fait à transmettre au modèle, en clair. */
  text: string;
  /** Vrai quand la réponse (repliée) contient le fait. */
  present: (folded: string) => boolean;
}

export interface LockedForbid {
  key: string;
  re: RegExp;
}

export interface LockedBrief {
  kind: "owner_question" | "home_photo" | "space_scope" | "ai_identity";
  facts: LockedFact[];
  forbid: LockedForbid[];
  action: { label: string; path: string; reason: string } | null;
  /** Consigne de rédaction propre au cas. */
  guidance: string;
  /** Gabarit des lots précédents, utilisé en repli. */
  template: string;
}

/** Interdits communs à toute réponse rédigée par le modèle. */
export const COMMON_FORBIDS: LockedForbid[] = [
  { key: "tiret_long", re: /[\u2013\u2014]/ },
  { key: "emoji", re: /\p{Extended_Pictographic}/u },
  { key: "gratuit", re: /gratuit/i },
  { key: "voisin", re: /voisin/i },
  { key: "a_vie", re: /\b(à|a) vie\b/i },
  { key: "dossier", re: /dans votre dossier/i },
  { key: "tutoiement", re: /\b(tu as|tu es|tu peux|tu veux|ton profil|ta garde|tes annonces)\b/i },
];

export function lockedDirective(b: LockedBrief): string {
  return [
    "FAITS VERROUILLÉS, à donner tous, dans ta voix, sans en changer le sens :",
    ...b.facts.map((f) => `- ${f.text}`),
    b.action ? `ACTION OBLIGATOIRE affichée sous ta réponse : « ${b.action.label} ». Le bouton porte l'action : ne recopie jamais son libellé dans tes phrases (ni majuscule, ni guillemets), dis avec tes mots ce qu'il permet, sans écrire de lien.` : "",
    `CONSIGNE : ${b.guidance}`,
    "INTERDITS : aucun lieu, aucune annonce, aucun chiffre qui ne figure pas ci-dessus ; aucune autre action que l'action obligatoire ; aucun tiret long ; aucun emoji ; vouvoiement.",
    "Rédige librement, chaleureusement, comme Alma. Pas de liste « Localisation : », « Dates : », fais des phrases.",
  ].filter(Boolean).join("\n");
}

/** Liste des manques et interdits ; vide quand la réponse est conforme. */
export function checkLocked(answer: string, b: LockedBrief): string[] {
  const issues: string[] = [];
  const f = foldC(answer);
  if (!f) return ["reponse_vide"];
  for (const fact of b.facts) if (!fact.present(f)) issues.push(`manque:${fact.key}`);
  for (const x of [...COMMON_FORBIDS, ...b.forbid]) if (x.re.test(answer)) issues.push(`interdit:${x.key}`);
  return issues;
}

// ---------------------------------------------------------------------------
// Animaux d'une annonce
// ---------------------------------------------------------------------------

export interface ListingPet { name?: string | null; species?: string | null; breed?: string | null; age?: number | null }

const TEXT_ANIMALS: Array<[RegExp, string]> = [
  [/\byorkshires?\b/, "yorkshire"],
  [/\blabradors?\b/, "labrador"],
  [/\bgolden( retriever)?s?\b/, "golden retriever"],
  [/\bbergers?( allemands?| australiens?)?\b/, "berger"],
  [/\bchihuahuas?\b/, "chihuahua"],
  [/\bteckels?\b/, "teckel"],
  [/\bcaniches?\b/, "caniche"],
  [/\bbouledogues?\b/, "bouledogue"],
  [/\bcavaliers? king charles\b/, "cavalier king charles"],
  [/\bjack russell\b/, "jack russell"],
  [/\bchiots?\b/, "chiot"],
  [/\bchatons?\b/, "chaton"],
  [/\bchiens?\b|\bchiennes?\b|\btoutous?\b/, "chien"],
  [/\bchats?\b|\bchattes?\b|\bminous?\b/, "chat"],
  [/\bchevaux\b|\bcheval\b|\bponeys?\b|\bjuments?\b/, "cheval"],
  [/\bpoules?\b/, "poules"],
  [/\blapins?\b/, "lapin"],
  [/\bperroquets?\b|\boiseaux?\b|\bperruches?\b/, "oiseau"],
];

/** Animal cité dans le titre ou la description, le plus précis d'abord. */
export function animalFromText(...texts: Array<string | null | undefined>): string | null {
  const q = foldC(texts.filter(Boolean).join(" "));
  if (!q) return null;
  for (const [re, label] of TEXT_ANIMALS) if (re.test(q)) return label;
  return null;
}

/** Âge cité près de l'animal, par exemple « yorkshire de 11 ans ». */
export function ageFromText(...texts: Array<string | null | undefined>): number | null {
  const m = foldC(texts.filter(Boolean).join(" ")).match(/\bde (\d{1,2}) ans\b/);
  return m ? Number(m[1]) : null;
}

const SPECIES_LABEL: Record<string, string> = {
  dog: "chien", cat: "chat", horse: "cheval", bird: "oiseau", rodent: "rongeur",
  fish: "poisson", reptile: "reptile", farm_animal: "animal de ferme", nac: "NAC",
};

export function petLabel(p: ListingPet): string {
  const kind = (p.breed && p.breed.trim()) || SPECIES_LABEL[p.species ?? ""] || "animal";
  const age = typeof p.age === "number" && p.age > 0 ? ` de ${p.age} an${p.age > 1 ? "s" : ""}` : "";
  return p.name ? `${p.name} (${kind}${age})` : `${kind}${age}`;
}

// ---------------------------------------------------------------------------
// L1 : question au propriétaire, sur une fiche d'annonce
// ---------------------------------------------------------------------------

export interface OwnerBriefInput {
  locationLabel: string;
  communeMissing: boolean;
  startDate: string | null;
  endDate: string | null;
  pets: ListingPet[];
  title: string | null;
  description: string | null;
  viewer: "can_apply" | "applied" | "owner_space";
  action: { label: string; path: string; reason: string };
  template: string;
}

const MONTHS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
function dateParts(iso: string | null): { day: number; month: number; year: number } | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return y && m && d ? { day: d, month: m, year: y } : null;
}
export function frDateLong(iso: string | null, withYear = true): string {
  const p = dateParts(iso);
  if (!p) return "";
  return `${p.day === 1 ? "1er" : p.day} ${MONTHS_FR[p.month - 1]}${withYear ? ` ${p.year}` : ""}`;
}
const datePresent = (iso: string | null) => (f: string) => {
  const p = dateParts(iso);
  if (!p) return true;
  return f.includes(MONTHS[p.month - 1]) && new RegExp(`\\b${p.day}(er)?\\b`).test(f);
};

export function ownerQuestionBrief(i: OwnerBriefInput): LockedBrief {
  const facts: LockedFact[] = [];
  const locKey = foldC(i.locationLabel.split(",")[0] || i.locationLabel);
  facts.push({
    key: "localisation",
    text: `Localisation de la garde : ${i.locationLabel}${i.communeMissing ? " (la commune exacte n'est pas encore précisée sur l'annonce)" : ""}.`,
    present: (f) => f.includes(locKey),
  });
  if (i.startDate && i.endDate) {
    facts.push({
      key: "dates",
      text: `Dates : du ${frDateLong(i.startDate, false)} au ${frDateLong(i.endDate)}.`,
      present: (f) => datePresent(i.startDate)(f) && datePresent(i.endDate)(f),
    });
  }
  const textAnimal = i.pets.length ? null : animalFromText(i.title, i.description);
  const textAge = textAnimal ? ageFromText(i.title, i.description) : null;
  if (i.pets.length) {
    const labels = i.pets.map(petLabel);
    facts.push({
      key: "animaux",
      text: `Animaux de l'annonce : ${labels.join(", ")}.`,
      present: (f) => i.pets.some((p) => {
        const w = foldC(p.name || p.breed || SPECIES_LABEL[p.species ?? ""] || "");
        return w ? f.includes(w) : true;
      }),
    });
  } else if (textAnimal) {
    facts.push({
      key: "animaux",
      text: `L'annonce parle d'un ${textAnimal}${textAge ? ` de ${textAge} ans` : ""} dans son titre ou sa description (aucune fiche animal détaillée). Parle du ${textAnimal} de l'annonce, n'écris jamais qu'aucun animal n'est déclaré.`,
      present: (f) => f.includes(foldC(textAnimal)),
    });
  }
  const closing = i.viewer === "applied"
    ? "La question s'adresse au propriétaire ; la personne a déjà postulé, elle peut la lui poser dans la conversation de sa candidature, c'est lui qui répondra."
    : i.viewer === "owner_space"
      ? "La question s'adresse au propriétaire ; pour la lui poser, il faut passer en espace gardien puis envoyer sa candidature avec un message, c'est lui qui répondra."
      : "La question s'adresse au propriétaire ; pour la lui poser, il suffit d'envoyer sa candidature avec un message, c'est lui qui répondra.";
  facts.push({
    key: "proprietaire",
    text: closing,
    present: (f) => /proprietaire/.test(f) && (i.viewer === "applied" ? /conversation|candidature/.test(f) : /candidat|postul/.test(f)),
  });
  return {
    kind: "owner_question",
    facts,
    forbid: [
      { key: "vie_alma", re: /\b(Lyon|C[oó]rdoba|Elisa)\b/ },
      { key: "aucun_animal", re: /aucun animal (d[ée]clar|saisi)/i },
      { key: "autre_annonce", re: /\/sits\/(?!.*postuler)/ },
      { key: "messagerie", re: i.viewer === "applied" ? /$^/ : /messagerie/i },
    ],
    action: i.action,
    guidance:
      "La personne pose une question au propriétaire de cette annonce, pas à toi. Donne d'abord ce que la fiche contient (localisation, dates, animal), puis explique qui répondra et comment. Une touche de chien sur l'animal de l'annonce est bienvenue, en une phrase, jamais en ouverture. Ne parle jamais de ta propre vie ici, et ne propose aucune autre annonce.",
    template: i.template,
  };
}

/** Gabarit L1 sans la ligne « aucun animal déclaré » : on cite le texte ou on se tait. */
export function ownerTemplateAnimalLine(pets: ListingPet[], title: string | null, description: string | null): string | null {
  if (pets.length) return null;
  const a = animalFromText(title, description);
  return a ? `Animal cité dans l'annonce : le ${a}.` : "";
}

// ---------------------------------------------------------------------------
// L2 : photo du logement
// ---------------------------------------------------------------------------

export function homePhotoBrief(action: { label: string; path: string; reason: string }, template: string): LockedBrief {
  return {
    kind: "home_photo",
    facts: [
      { key: "galerie", text: "Les photos du logement se gèrent à un seul endroit : Mon profil propriétaire, rubrique Galerie.", present: (f) => /galerie/.test(f) },
      { key: "suppression", text: "Dans la Galerie, chaque photo peut être ajoutée, remplacée ou supprimée.", present: (f) => /(supprim|retir|remplac|ajout)/.test(f) },
      { key: "couverture", text: "Si la photo supprimée servait de couverture à l'annonce, la photo suivante de la Galerie la remplace.", present: () => true },
    ],
    forbid: [{ key: "messagerie", re: /messagerie/i }],
    action,
    guidance: "Réponds à la question sur la photo du logement, simplement, et indique la Galerie. Ne parle jamais de messagerie.",
    template,
  };
}

// ---------------------------------------------------------------------------
// L3 : espace actif et périmètre réel
// ---------------------------------------------------------------------------

export interface SpaceScopeInput {
  /** Phrase L3 sur l'espace, si l'espace est en cause. */
  spaceSentence: string | null;
  /** Le passage d'espace est possible (rôle both). */
  switchable: boolean;
  /** Pays demandé sans annonce, par exemple « en Italie ». */
  foreignInCountry: string | null;
  /** Lieu français sans annonce. */
  frenchNoneLabel: string | null;
  /** Mots du lieu demandé à ne jamais présenter comme disponibles (« Toscane »). */
  askedPlaceWords: string[];
  action: { label: string; path: string; reason: string };
  template: string;
}

export function spaceScopeBrief(i: SpaceScopeInput): LockedBrief {
  const facts: LockedFact[] = [];
  if (i.foreignInCountry) {
    const country = foldC(i.foreignInCountry.replace(/^(en|au|aux)\s+/i, ""));
    facts.push({ key: "france", text: "Guardiens propose des gardes en France, Polynésie française comprise.", present: (f) => /france/.test(f) });
    facts.push({ key: "pays_sans_garde", text: `Il n'y a aucune garde ${i.foreignInCountry} aujourd'hui.`, present: (f) => f.includes(country) && /\b(aucune?|pas de|n'y a pas)\b/.test(f) });
  }
  if (i.frenchNoneLabel) {
    const label = foldC(i.frenchNoneLabel);
    facts.push({ key: "lieu_sans_garde", text: `Il n'y a aucune garde publiée à ${i.frenchNoneLabel} aujourd'hui ; une alerte de secteur prévient dès qu'une annonce y paraît.`, present: (f) => f.includes(label) && /\b(aucune?|pas de|n'y a pas)\b/.test(f) });
  }
  if (i.spaceSentence) {
    if (/espace propri/i.test(i.spaceSentence) && /espace gardien/i.test(i.spaceSentence)) {
      facts.push({ key: "espaces", text: i.spaceSentence, present: (f) => /espace proprietaire/.test(f) && /espace gardien/.test(f) });
    } else {
      facts.push({ key: "espace", text: i.spaceSentence, present: (f) => /espace/.test(f) });
    }
  }
  const forbid: LockedForbid[] = [
    { key: "international", re: /international/i },
    { key: "publier_brouillon", re: /publier (le|votre) brouillon/i },
    ...i.askedPlaceWords.filter(Boolean).map((w) => ({ key: `lieu_${foldC(w)}`, re: new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i") })),
  ];
  return {
    kind: "space_scope",
    facts,
    forbid,
    action: i.action,
    guidance:
      "Dis ce qui est, avec chaleur : où se trouvent les gardes, dans quel espace on est, ce qui manque. Nomme le pays demandé plutôt que la région. Aucune action de propriétaire (brouillon, publication) sur une intention de gardien.",
    template: i.template,
  };
}

// ---------------------------------------------------------------------------
// Transparence (règlement européen sur l'IA, article 50)
// ---------------------------------------------------------------------------

const HUMAN_Q = /(vraie personne|vrai(e)? humain|personne (reelle|reel|en chair)|un(e)? humain(e)?\b|etre humain|un robot|une ia\b|un ia\b|intelligence artificielle|un bot\b|chatbot|une machine|un programme|un algorithme|une vraie|quelqu'un de reel)/;
const ASKING = /(\?|est[- ]ce que|es[- ]tu|etes[- ]vous|tu es|vous etes|je parle (a|avec)|c'est (un|une)|suis[- ]je en train)/;

/** Vrai quand la personne demande sincèrement si elle parle à une personne, une IA ou un robot. */
export function asksIfHuman(message: string): boolean {
  const q = foldC(message);
  if (!q || q.length > 220) return false;
  return HUMAN_Q.test(q) && ASKING.test(q);
}

/** Lot L4b : trois gabarits, aucun n'ouvre sur « Je suis ». */
export const AI_IDENTITY_TEMPLATES = [
  "Vous parlez à l'assistante IA de Guardiens, sous les traits d'Alma, la chienne de la maison. Pour échanger avec une personne, Jérémie et Elisa lisent les messages qu'on leur adresse. Dites-moi ce que vous cherchez, je regarde avec vous.",
  "Bonne question, et la réponse est simple : une intelligence artificielle, celle de Guardiens, qui prend la voix d'Alma, notre chienne. Jérémie et Elisa, eux, lisent chaque message qu'on leur envoie. Sur quoi puis-je vous aider ?",
  "C'est une IA qui vous répond, l'assistante de Guardiens, avec la voix d'Alma, la chienne de la maison. Derrière moi, Jérémie et Elisa lisent les messages qu'on leur écrit. Que puis-je regarder pour vous ?",
];
export const AI_IDENTITY_TEMPLATE = AI_IDENTITY_TEMPLATES[0];

/** Gabarit dont l'amorce n'a pas servi récemment. */
export function pickAiIdentityTemplate(recentAnswers: string[], rand: () => number = Math.random): string {
  const used = new Set(recentAnswers.map(openerKey));
  const free = AI_IDENTITY_TEMPLATES.filter((t) => !used.has(openerKey(t)));
  const pool = free.length ? free : AI_IDENTITY_TEMPLATES;
  return pool[Math.floor(rand() * pool.length) % pool.length];
}

export function aiIdentityBrief(template?: string): LockedBrief {
  return {
    kind: "ai_identity",
    facts: [
      { key: "ia", text: "Tu es l'assistante IA de Guardiens (une intelligence artificielle), incarnée par Alma, la chienne de la maison.", present: (f) => /\b(ia|intelligence artificielle|assistante virtuelle)\b/.test(f) },
      { key: "retour_aide", text: "Après l'avoir dit, reviens à ce que tu peux faire pour la personne.", present: () => true },
    ],
    forbid: [
      { key: "ouverture_je_suis", re: /^\s*je suis (l'|une |un )?(assistante|ia\b|intelligence)/i },
      { key: "deni", re: /je (suis|reste) (une |un )?(vraie|vrai|r[ée]elle) (personne|humaine?)|je suis humaine|je ne suis pas (une |un )?(ia|intelligence|robot|programme|machine)/i },
    ],
    action: null,
    guidance: "Réponds vrai, avec chaleur et dans ta voix, en une ou deux phrases, puis reviens à ce que tu peux faire. Jamais de déni, jamais de détour. Ne commence pas par « Je suis » : varie l'ouverture (la question, la personne, une image de chienne). Ne parle d'aucun échange passé qui ne figure pas dans l'historique.",
    template: template ?? AI_IDENTITY_TEMPLATE,
  };
}

// ---------------------------------------------------------------------------
// Personnalisation et variété
// ---------------------------------------------------------------------------

/** Cinq premiers mots, repliés et sans ponctuation. */
export function openerKey(text: string): string {
  return foldC(text).replace(/[^a-z0-9' ]+/g, " ").split(" ").filter(Boolean).slice(0, 5).join(" ");
}

export function repeatsOpener(answer: string, recentAnswers: string[]): boolean {
  const k = openerKey(answer);
  return k.split(" ").length >= 3 && recentAnswers.slice(0, 20).some((r) => openerKey(r) === k);
}

export interface CompanionInput {
  firstName: string | null;
  city: string | null;
  pets: ListingPet[];
  /** Garde en cours ou à venir, en une phrase factuelle. */
  currentSit: string | null;
  /** Titres de ses annonces. */
  listings: string[];
  /** Dernier échange de moins de 7 jours. */
  lastExchange: { question: string; answer: string; daysAgo: number } | null;
  /** Amorces déjà utilisées sur les 20 dernières réponses. */
  recentOpeners: string[];
  /** Conversation libre, sans question pratique. */
  freeTalk: boolean;
}

/** Lot L4b : trois réponses modèles, pour le ton seulement. */
export const VOICE_EXAMPLES = [
  "EXEMPLES DE TON (lieux, dates et animaux entre crochets sont des places vides : ne reprends que ceux des faits de ce tour, jamais ceux des exemples) :",
  "1. Fiche d'annonce avec un yorkshire, question « Quel est le nom de votre village ? » : « La garde se trouve à [localisation de la fiche], du [dates de la fiche], avec un yorkshire de [âge] ans à la maison. À cet âge, un yorkshire apprécie surtout les siestes au chaud et les petits tours du jardin, je le comprends bien. Le nom exact du village, c'est le propriétaire qui vous le donnera : envoyez-lui votre candidature avec un message, il vous répondra. »",
  "2. Question « Comment supprimer la photo de ma maison ? » : « Les photos de votre logement se gèrent à un seul endroit, la Galerie de votre profil propriétaire. Chacune s'y remplace ou s'y supprime, et si c'était la couverture de votre annonce, la suivante prend sa place. Une maison bien montrée, c'est comme une porte entrouverte : on a envie d'y passer la truffe. »",
  "3. Question « Je cherche une garde en Toscane » depuis l'espace propriétaire : « Il n'y a aucune garde en Italie aujourd'hui : Guardiens propose des gardes en France, Polynésie française comprise. Vous êtes dans votre espace propriétaire, qui montre vos propres annonces ; les gardes des autres membres vous attendent dans votre espace gardien. Côté France, il y a de belles balades à faire, j'en remue déjà la queue. »",
  "Dans ces exemples : une seule touche de chien, liée au sujet, jamais en ouverture ; prénom au plus une fois ; vouvoiement ; aucun tiret long.",
].join("\n");

export function companionDirective(c: CompanionInput): string {
  const lines = ["COMPAGNON, ce que tu sais de la personne (données réelles, rien d'autre) :"];
  if (c.firstName) lines.push(`- Prénom : ${c.firstName}. Au plus une fois dans la réponse, pas forcément en ouverture.`);
  if (c.city) lines.push(`- Ville : ${c.city}.`);
  if (c.pets.length) lines.push(`- Ses animaux : ${c.pets.map(petLabel).join(", ")}. Si la question touche à ses animaux ou à une garde chez elle, nomme-les.`);
  if (c.currentSit) lines.push(`- ${c.currentSit}`);
  if (c.listings.length) lines.push(`- Ses annonces : ${c.listings.slice(0, 3).map((t) => `« ${t.slice(0, 80)} »`).join(", ")}.`);
  if (c.lastExchange) {
    lines.push(`- Il y a ${c.lastExchange.daysAgo <= 0 ? "moins d'un jour" : `${c.lastExchange.daysAgo} jour${c.lastExchange.daysAgo > 1 ? "s" : ""}`}, elle t'a demandé : « ${c.lastExchange.question.slice(0, 160)} ». Si c'est lié, fais le lien avec naturel (« la dernière fois, vous cherchiez… »), sinon n'en parle pas.`);
  }
  lines.push(
    "TOUCHE DE CHIEN : au plus une par réponse, liée au sujet de la question (un animal cité, une balade, une maison), jamais en ouverture détachée du sujet, jamais un fait inventé sur la personne.",
  );
  lines.push(
    "Ne fais jamais référence à un échange passé (« comme je vous l'ai dit », « la dernière fois ») s'il ne figure pas dans l'historique ou ci-dessus.",
    "Ne cite aucune annonce, aucun lieu, aucun animal de la personne qui ne figure pas dans ses faits ou dans sa question.",
    "Un bouton porte l'action sous ta réponse : n'écris jamais son libellé avec sa majuscule (pas « Vous pouvez Postuler »), décris l'action avec tes mots.",
    VOICE_EXAMPLES,
  );
  if (!c.freeTalk) lines.push("Question pratique : pas d'humeur du jour ni d'anecdote générale, l'information d'abord.");
  if (c.recentOpeners.length) {
    lines.push(`AMORCES DÉJÀ UTILISÉES avec cette personne, ne commence par aucune d'elles : ${c.recentOpeners.slice(0, 20).map((o) => `« ${o} »`).join(", ")}.`);
  }
  return lines.join("\n");
}

/** Vrai pour une question pratique sur ses animaux, une garde chez soi ou un départ. */
export function asksAboutOwnPets(message: string): boolean {
  const q = foldC(message);
  return /\b(mon|ma|mes|nos|notre) (chien|chienne|chat|chatte|chiot|chaton|animal|animaux|toutou|bete|betes|cheval|chevaux|lapin)s?\b/.test(q)
    || /\b(faire garder|pendant mon absence|je pars|trouver un gardien|garder mes|garde pour mes|garde de mes)\b/.test(q);
}

/** Phrase factuelle sur la garde en cours ou à venir, depuis les faits vérifiés. */
export function currentSitSentence(facts: any, todayIso: string): string | null {
  const list = Array.isArray(facts?.gardes_confirmees) ? facts.gardes_confirmees : [];
  const next = list
    .filter((g: any) => (g?.fin ?? g?.end_date ?? "") >= todayIso)
    .sort((a: any, b: any) => String(a?.debut ?? a?.start_date ?? "").localeCompare(String(b?.debut ?? b?.start_date ?? "")))[0];
  if (!next) return null;
  const start = next.debut ?? next.start_date ?? null;
  const end = next.fin ?? next.end_date ?? null;
  const place = next.ville ?? next.city ?? null;
  const ongoing = start && start <= todayIso;
  return `${ongoing ? "Garde en cours" : "Garde à venir"}${place ? ` à ${place}` : ""}${start && end ? `, du ${frDateLong(start, false)} au ${frDateLong(end)}` : ""}.`;
}

// ---------------------------------------------------------------------------
// Lot L4b : filet de sortie sur le texte final, sur tous les chemins.
// ---------------------------------------------------------------------------

export interface OutputGuardInput {
  /** Texte replié de ce que le modèle a reçu sur la personne : faits, dossier, question, historique. */
  memberText: string;
  /** Texte replié de tout le contexte autorisé (membre + fiche, inventaire, sources, faits verrouillés). */
  contextText: string;
  /** Lieux connus (communes, départements, régions), sous leur graphie usuelle. */
  gazetteer: string[];
  /** Mots repliés des lieux étrangers sans annonce publiée. */
  noListingPlaces: string[];
  /** Libellés des boutons proposés sous la réponse. */
  actionLabels: string[];
  /** Un échange antérieur figure dans le contexte (historique ou dernier échange). */
  hasPriorExchange: boolean;
  /** Question sur Alma elle-même : sa biographie (Lyon, Córdoba) peut être citée. */
  allowAlmaBio?: boolean;
}

const stripAccents = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const NEGATION = /\b(aucune?|pas de|pas d'|n'y a pas|n'existe|ne propose|ni)\b/;
const POSSESSIVE = /\b(votre|vos)\b/;
const PHANTOM = /(comme je vous (l')?ai (deja )?(dit|explique|indique|precise)|je vous l'ai (deja )?dit|comme (je le disais|deja dit|dit plus haut|indique precedemment)|comme evoque|je vous le redis|je le repete|la derniere fois)/;
export const ACTION_VERBS = ["Postuler", "Publier", "Créer", "Passer", "Voir", "Ouvrir", "Régler", "Reprendre", "Compléter", "Ajouter", "Modifier", "Activer", "Écrire", "Envoyer", "Gérer", "Découvrir", "Rechercher", "Préparer"];
/** Mots ambigus en tête de phrase : jamais pris pour un lieu. */
const GAZ_SKIP = new Set(["Nord", "Lot", "Cher", "Ain", "Var", "Manche", "Somme", "Paris-Saclay"]);
/** Biographie d'Alma, que le modèle connaît par sa consigne. */
const ALMA_BIO = ["lyon", "cordoba"];

export function splitSentences(text: string): string[] {
  return (text || "").split(/(?<=[.!?\u2026])\s+|\n+/).filter((x) => x.trim());
}

function labelVerbs(labels: string[]): Set<string> {
  const out = new Set(ACTION_VERBS);
  for (const l of labels) {
    const w = (l || "").trim().split(/\s+/)[0];
    if (w && /^\p{Lu}/u.test(w)) out.add(w);
  }
  return out;
}

/** Positions des verbes de bouton recopiés avec leur majuscule, hors début de phrase. */
function labelCopies(text: string, labels: string[]): Array<{ index: number; word: string }> {
  const verbs = labelVerbs(labels);
  const out: Array<{ index: number; word: string }> = [];
  const re = /\p{Lu}[\p{L}']*/gu;
  for (const m of text.matchAll(re)) {
    if (!verbs.has(m[0])) continue;
    const before = text.slice(0, m.index).replace(/[\s«"“(]+$/u, "");
    if (!before || /[.!?\u2026:\n]$/.test(before)) continue;
    out.push({ index: m.index!, word: m[0] });
  }
  return out;
}

function placesIn(sentence: string, gazetteer: string[]): string[] {
  const s = stripAccents(sentence);
  const out: string[] = [];
  for (const g of gazetteer) {
    if (!g || GAZ_SKIP.has(g)) continue;
    const name = stripAccents(g);
    if (!/^\p{Lu}/u.test(name)) continue;
    if (new RegExp(`(^|[^\\p{L}])${escRe(name)}(?![\\p{L}])`, "u").test(s)) out.push(g);
  }
  return out;
}

const inText = (folded: string, place: string) =>
  new RegExp(`(^|[^a-z])${escRe(foldC(place))}(?![a-z])`).test(folded);

/** Défauts du texte final ; vide quand il est conforme. */
export function checkOutput(answer: string, g: OutputGuardInput): string[] {
  const issues = new Set<string>();
  for (const sentence of splitSentences(answer)) {
    const f = foldC(sentence);
    for (const w of g.noListingPlaces) {
      if (inText(f, w) && !NEGATION.test(f)) issues.add(`lieu_sans_annonce:${w}`);
    }
    for (const place of placesIn(sentence, g.gazetteer)) {
      const k = foldC(place);
      if (POSSESSIVE.test(f) && !inText(g.memberText, k)) issues.add(`lieu_hors_faits:${k}`);
      else if (!inText(g.contextText, k) && !(g.allowAlmaBio && ALMA_BIO.includes(k))) issues.add(`lieu_hors_faits:${k}`);
    }
    if (!g.hasPriorExchange && PHANTOM.test(f)) issues.add("echange_fantome");
  }
  if (labelCopies(answer, g.actionLabels).length) issues.add("libelle_recopie");
  return [...issues];
}

/**
 * Réparation déterministe : verbe de bouton remis en minuscule, phrases qui
 * citent un lieu interdit ou un échange fantôme retirées.
 */
export function repairOutput(answer: string, g: OutputGuardInput): string {
  let text = answer || "";
  const copies = labelCopies(text, g.actionLabels).sort((a, b) => b.index - a.index);
  for (const c of copies) {
    text = text.slice(0, c.index) + c.word.charAt(0).toLocaleLowerCase("fr") + c.word.slice(1) + text.slice(c.index + c.word.length);
  }
  const paragraphs = text.split(/\n{2,}/).map((p) => {
    const kept = splitSentences(p).filter((s) => checkOutput(s, { ...g, actionLabels: [] }).length === 0);
    return kept.join(" ");
  }).filter((p) => p.trim());
  const out = paragraphs.join("\n\n").trim();
  // Une phrase qui commençait par un connecteur orphelin reste lisible.
  return out.replace(/^(Et|Mais|Donc|Alors),?\s+(\p{L})/u, (_m, _c, l) => l.toLocaleUpperCase("fr"));
}
