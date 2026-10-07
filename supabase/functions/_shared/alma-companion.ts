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
    b.action ? `ACTION OBLIGATOIRE affichée sous ta réponse : « ${b.action.label} ». Tu peux l'annoncer, sans écrire de lien.` : "",
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

export const AI_IDENTITY_TEMPLATE =
  "Je suis l'assistante IA de Guardiens, et c'est sous les traits d'Alma, la chienne de la maison, que je vous réponds. Derrière moi, Jérémie et Elisa lisent les messages qu'on leur adresse. Dites-moi ce que vous cherchez, je regarde avec vous.";

export function aiIdentityBrief(): LockedBrief {
  return {
    kind: "ai_identity",
    facts: [
      { key: "ia", text: "Tu es l'assistante IA de Guardiens (une intelligence artificielle), incarnée par Alma, la chienne de la maison.", present: (f) => /\b(ia|intelligence artificielle|assistante virtuelle)\b/.test(f) },
      { key: "retour_aide", text: "Après l'avoir dit, reviens à ce que tu peux faire pour la personne.", present: () => true },
    ],
    forbid: [
      { key: "deni", re: /je (suis|reste) (une |un )?(vraie|vrai|r[ée]elle) (personne|humaine?)|je suis humaine|je ne suis pas (une |un )?(ia|intelligence|robot|programme|machine)/i },
    ],
    action: null,
    guidance: "Réponds vrai, avec chaleur et dans ta voix, en une ou deux phrases, puis reviens à ce que tu peux faire. Jamais de déni, jamais de détour.",
    template: AI_IDENTITY_TEMPLATE,
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
