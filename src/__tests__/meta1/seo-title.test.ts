import { describe, expect, it } from "vitest";
import {
  TITLE_BODY_MAX,
  TITLE_MAX,
  TITLE_SUFFIX,
  buildBreedTitle,
  buildSitTitle,
  collapseSpaces,
  elideDe,
  mentionsCity,
  truncateAtWord,
} from "@/lib/seoTitle";
import { buildOgImageUrl } from "@/lib/ogImage";

/**
 * Lot SEO-META1 (04/11/2026). Les cas viennent de l'audit Googlebot du plan du site
 * (773 URL) : titres d'annonces coupés en plein mot, doubles espaces, « de » devant voyelle.
 */
const full = (body: string) => `${body}${TITLE_SUFFIX}`;

describe("seoTitle : constantes", () => {
  it("le titre final tient en 60 caractères, suffixe compris", () => {
    expect(TITLE_MAX).toBe(60);
    expect(TITLE_BODY_MAX + TITLE_SUFFIX.length).toBe(TITLE_MAX);
  });
});

describe("collapseSpaces", () => {
  it("supprime les doubles espaces, les insécables et les espaces de bord", () => {
    expect(collapseSpaces("  Garde  maison avec 3 chats ")).toBe("Garde maison avec 3 chats");
    expect(collapseSpaces(null)).toBe("");
  });
});

describe("mentionsCity", () => {
  it("reconnaît la ville sans tenir compte de la casse ni des accents", () => {
    expect(mentionsCity("Garde 16 animaux à Marlhes", "Marlhes")).toBe(true);
    expect(mentionsCity("Maison à ÉCULLY", "Écully")).toBe(true);
    expect(mentionsCity("Garde à Lyon", "Lyonnais")).toBe(false);
    expect(mentionsCity("Garde de chats", "")).toBe(false);
  });
});

describe("truncateAtWord", () => {
  it("renvoie la valeur telle quelle quand elle tient", () => {
    expect(truncateAtWord("Garde de chats", 48)).toBe("Garde de chats");
  });
  it("coupe au dernier mot entier, jamais au milieu d'un mot", () => {
    const out = truncateAtWord("Gardiennage de maison proche du ZooParc de Beauval et des chateaux", 30);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(30);
    const words = out.slice(0, -1).split(" ");
    for (const w of words) {
      expect("Gardiennage de maison proche du ZooParc de Beauval et des chateaux".split(" ")).toContain(w);
    }
  });
  it("retire les mots de liaison et chiffres isolés en fin de coupe", () => {
    expect(truncateAtWord("Garde maison avec 1 chienne et 3 chats", 21)).toBe("Garde maison…");
  });
  it("ne laisse ni espace ni ponctuation avant la coupe", () => {
    const out = truncateAtWord("Garde de deux jeunes chattes Louve et Luna de 6 mois. Quissac", 40);
    expect(out).not.toMatch(/[\s,;:.]…$/);
  });
});

describe("buildSitTitle : annonces", () => {
  it("garde la ville entière et raccourcit seulement le titre (cas Grandchamp-des-Fontaines)", () => {
    const body = buildSitTitle("Garde maison avec 1 chienne et 3 chats ", "Grandchamp-des-Fontaines");
    expect(body.endsWith(" à Grandchamp-des-Fontaines")).toBe(true);
    expect(body).not.toContain("  ");
    expect(body).not.toMatch(/-…\s/);
    expect(full(body).length).toBeLessThanOrEqual(TITLE_MAX);
  });
  it("supprime le double espace avant « à » (cas Siros)", () => {
    expect(buildSitTitle("Garde ponctuelle de ma chienne ", "Siros")).toBe("Garde ponctuelle de ma chienne à Siros");
  });
  it("ne répète pas la ville déjà présente dans le titre (cas Marlhes)", () => {
    expect(buildSitTitle("Garde 16 animaux à Marlhes", "Marlhes")).toBe("Garde 16 animaux à Marlhes");
  });
  it("tient en 60 caractères avec le suffixe sur tous les cas relevés", () => {
    const cases: Array<[string, string]> = [
      ["Garde de deux jeunes chattes Louve et Lùna de 6 mois.", "Quissac"],
      ["Gardiannage de maison proche du ZooParc de Beauval et des châteaux", "Villentrois"],
      ["Garde de Moustik, Lizy, Zina, Flocon, Rouxy et Piwy et Kiwy pendant les fêtes", "Classun"],
      ["Un Noël magique au cœur du magnifique Québec, entouré de nature", "Saint-Ludger"],
      ["Garde d'animaux (chien,chat, poules, cochons d'Inde)", "Vabres-l'Abbaye"],
      ["Garde de deux chattes sphynx dans le sud de la France ", "Clarensac"],
    ];
    for (const [title, city] of cases) {
      const body = buildSitTitle(title, city);
      expect(body.endsWith(` à ${city}`)).toBe(true);
      expect(body).not.toContain("  ");
      expect(full(body).length).toBeLessThanOrEqual(TITLE_MAX);
    }
  });
  it("garde la ville intacte même très longue, avec un plancher pour le titre", () => {
    const body = buildSitTitle("Garde de chats et de poules pour les vacances", "Saint-Remy-en-Bouzemont-Saint-Genest-et-Isson");
    expect(body.endsWith(" à Saint-Remy-en-Bouzemont-Saint-Genest-et-Isson")).toBe(true);
    expect(body.split(" à ")[0].length).toBeGreaterThanOrEqual(8);
  });
  it("retombe sur un titre neutre sans titre ni ville", () => {
    expect(buildSitTitle("", "")).toBe("Garde de maison et animaux");
    expect(buildSitTitle(undefined, "Lyon")).toBe("Garde de maison et animaux à Lyon");
  });
  it("n'ajoute ni virgule ni « Guardiens » : PageMeta pose le suffixe", () => {
    expect(buildSitTitle("Garde de chats", "Lyon")).not.toMatch(/Guardiens/);
  });
});

describe("élision sur les fiches de races", () => {
  it("« d' » devant une voyelle, accentuée ou non", () => {
    expect(elideDe("Âne du cotentin")).toBe("d'Âne du cotentin");
    expect(elideDe("Akita inu")).toBe("d'Akita inu");
    expect(elideDe("Épagneul breton")).toBe("d'Épagneul breton");
    expect(elideDe("Écaille de tortue")).toBe("d'Écaille de tortue");
    expect(elideDe("Oriental")).toBe("d'Oriental");
    expect(elideDe("Appaloosa")).toBe("d'Appaloosa");
  });
  it("« de » devant une consonne et devant un h aspiré", () => {
    expect(elideDe("Labrador")).toBe("de Labrador");
    expect(elideDe("Husky sibérien")).toBe("de Husky sibérien");
    expect(elideDe("Hovawart")).toBe("de Hovawart");
  });
  it("« d' » devant un h muet connu", () => {
    expect(elideDe("Hispano-arabe")).toBe("d'Hispano-arabe");
  });
  it("garde le gabarit complet du titre de race", () => {
    expect(buildBreedTitle("Akita inu")).toBe("Garde d'Akita inu à domicile : conseils gardien | Guardiens");
    expect(buildBreedTitle("Labrador")).toBe("Garde de Labrador à domicile : conseils gardien | Guardiens");
  });
});

describe("og:image dynamiques", () => {
  it("accepte les kinds association et mission", () => {
    const a = new URL(buildOgImageUrl({ title: "L'Arche du Val de Sambre", subtitle: "Ferrière-la-Grande (Nord)", kind: "association" }));
    expect(a.searchParams.get("kind")).toBe("association");
    expect(a.pathname.endsWith("/og-page")).toBe(true);
    const m = new URL(buildOgImageUrl({ title: "Une visite à mon chat", subtitle: "Coup de main à Bordeaux", kind: "mission" }));
    expect(m.searchParams.get("kind")).toBe("mission");
  });
  it("garde le kind guide pour les guides de ville", () => {
    const g = new URL(buildOgImageUrl({ title: "Tassin-la-Demi-Lune", kind: "guide" }));
    expect(g.searchParams.get("kind")).toBe("guide");
    expect(g.searchParams.get("title")).toBe("Tassin-la-Demi-Lune");
  });
});
