/**
 * Tests de tri des blocs de la "journée type".
 * Vérifient que parseRoutine retourne TOUJOURS l'ordre logique :
 *   Matin → Midi → Après-midi → Soir → Nuit
 * quel que soit l'ordre dans le texte d'origine.
 */
import { describe, it, expect } from "vitest";
import { parseRoutine } from "../SitImmersiveContent";

const labelsOf = (raw: string) => parseRoutine(raw)?.blocks.map((b) => b.label) ?? [];

describe("parseRoutine — tri chronologique des moments de la journée", () => {
  it("ordre déjà correct : conserve Matin → Midi → Après-midi → Soir → Nuit", () => {
    const txt = [
      "Matin : balade 30 min",
      "Midi : repas",
      "Après-midi : sieste calme",
      "Soir : croquettes + câlins",
      "Nuit : dort dans le panier",
    ].join("\n");
    expect(labelsOf(txt)).toEqual(["Matin", "Midi", "Après-midi", "Soir", "Nuit"]);
  });

  it("ordre totalement inversé : Nuit → Soir → Après-midi → Midi → Matin", () => {
    const txt = [
      "Nuit : panier dans la cuisine",
      "Soir : repas léger",
      "Après-midi : jardin",
      "Midi : pâtée",
      "Matin : sortie pipi",
    ].join("\n");
    expect(labelsOf(txt)).toEqual(["Matin", "Midi", "Après-midi", "Soir", "Nuit"]);
  });

  it("ordre mélangé : Soir, Matin, Nuit, Midi, Après-midi", () => {
    const txt = [
      "Soir — sortie courte",
      "Matin — gamelle + balade",
      "Nuit — dort en bas",
      "Midi — sieste",
      "Après-midi — jeu",
    ].join("\n");
    expect(labelsOf(txt)).toEqual(["Matin", "Midi", "Après-midi", "Soir", "Nuit"]);
  });

  it("blocs partiels mélangés (Soir + Matin) : Matin avant Soir", () => {
    const txt = "Soir : repas\nMatin : balade";
    expect(labelsOf(txt)).toEqual(["Matin", "Soir"]);
  });

  it("variantes de casse et accents : APRÈS-MIDI, aprem, MATIN restent triés", () => {
    const txt = ["APRÈS-MIDI : jardin", "aprem : oups doublon", "MATIN : croquettes"].join("\n");
    const result = parseRoutine(txt);
    expect(result).not.toBeNull();
    // Matin doit venir avant tout après-midi (peu importe combien)
    const labels = result!.blocks.map((b) => b.label);
    expect(labels[0]).toBe("Matin");
    expect(labels.slice(1).every((l) => l === "Après-midi")).toBe(true);
  });

  it("séparateurs hétérogènes (—, –, -, :) avec ordre mélangé", () => {
    const txt = "Soir - tv\nMatin — promenade\nMidi : pâtée\nAprès-midi – sieste";
    expect(labelsOf(txt)).toEqual(["Matin", "Midi", "Après-midi", "Soir"]);
  });

  it("séparateurs inline (• | /) avec ordre mélangé", () => {
    const txt = "Nuit : dort • Matin : balade • Midi : repas";
    expect(labelsOf(txt)).toEqual(["Matin", "Midi", "Nuit"]);
  });

  it("texte avec puces et ordre mélangé", () => {
    const txt = ["- Soir : câlin", "• Matin : sortie", "→ Midi : sieste"].join("\n");
    expect(labelsOf(txt)).toEqual(["Matin", "Midi", "Soir"]);
  });

  it("texte sans aucun moment reconnaissable retourne null (fallback texte libre)", () => {
    expect(parseRoutine("Mon chien aime beaucoup les promenades.")).toBeNull();
  });

  it("input null ou vide retourne null", () => {
    expect(parseRoutine(null)).toBeNull();
    expect(parseRoutine("")).toBeNull();
  });

  it("texte non labellisé entre blocs : préservé dans notes, blocs triés", () => {
    const txt = [
      "Soir : repas",
      "Note : éviter les sucreries",
      "Matin : balade",
    ].join("\n");
    const result = parseRoutine(txt);
    expect(result).not.toBeNull();
    expect(result!.blocks.map((b) => b.label)).toEqual(["Matin", "Soir"]);
    expect(result!.notes).toContain("éviter les sucreries");
  });

  it("ponctuation finale supprimée des textes de blocs même quand mélangés", () => {
    const txt = "Soir : croquettes.\nMatin : balade,";
    const result = parseRoutine(txt);
    expect(result!.blocks[0]).toMatchObject({ label: "Matin", text: "balade" });
    expect(result!.blocks[1]).toMatchObject({ label: "Soir", text: "croquettes" });
  });
});

describe("parseRoutine — détection séparateurs avancés", () => {
  it("tirets longs collés sans espace : Matin—balade, Soir–pâtée", () => {
    const txt = "Matin—balade\nSoir–pâtée";
    expect(labelsOf(txt)).toEqual(["Matin", "Soir"]);
    const r = parseRoutine(txt)!;
    expect(r.blocks[0].text).toBe("balade");
    expect(r.blocks[1].text).toBe("pâtée");
  });

  it("séparateurs inline collés : Matin•balade|Midi•sieste", () => {
    const txt = "Matin : balade•Midi : sieste|Soir : repas";
    expect(labelsOf(txt)).toEqual(["Matin", "Midi", "Soir"]);
  });

  it("numérotation 1) 2) 3) en début de segment", () => {
    const txt = "1) Matin : balade\n2) Midi : pâtée\n3) Soir : câlins";
    const r = parseRoutine(txt)!;
    expect(r.blocks.map((b) => b.label)).toEqual(["Matin", "Midi", "Soir"]);
    expect(r.blocks[0].text).toBe("balade");
  });

  it("numérotation variée : 1. 2/ 3° 4 -", () => {
    const txt = "1. Soir : tv\n2/ Matin : balade\n3° Midi : sieste\n4 - Nuit : panier";
    expect(labelsOf(txt)).toEqual(["Matin", "Midi", "Soir", "Nuit"]);
  });

  it("numérotation inline mélangée avec moments", () => {
    const txt = "1) Soir : repas 2) Matin : balade 3) Midi : sieste";
    expect(labelsOf(txt)).toEqual(["Matin", "Midi", "Soir"]);
  });

  it("label entre parenthèses : (Matin) balade, (Soir) repas", () => {
    const txt = "(Matin) balade tranquille\n(Soir) repas et câlins";
    const r = parseRoutine(txt)!;
    expect(r.blocks.map((b) => b.label)).toEqual(["Matin", "Soir"]);
    expect(r.blocks[0].text).toBe("balade tranquille");
  });

  it("parenthèse d'horaire après label : Matin (8h) : balade", () => {
    const txt = "Matin (8h) : balade\nSoir (19h) : croquettes";
    const r = parseRoutine(txt)!;
    expect(r.blocks.map((b) => b.label)).toEqual(["Matin", "Soir"]);
    expect(r.blocks[0].text).toBe("balade");
    expect(r.blocks[1].text).toBe("croquettes");
  });

  it("parenthèse d'horaire avec texte : Midi (vers 12h30) sieste calme", () => {
    const txt = "Midi (vers 12h30) sieste calme";
    const r = parseRoutine(txt)!;
    expect(r.blocks[0]).toMatchObject({ label: "Midi", text: "sieste calme" });
  });

  it("combo : numérotation + parenthèse + tiret collé, ordre mélangé", () => {
    const txt = "2) Soir (19h)—repas\n1) Matin (8h)—balade\n3) Nuit—panier";
    expect(labelsOf(txt)).toEqual(["Matin", "Soir", "Nuit"]);
    const r = parseRoutine(txt)!;
    expect(r.blocks[0].text).toBe("balade");
  });
});

describe("parseRoutine — cas complets (5 moments)", () => {
  it("Matin/Midi/Après-midi/Soir/Nuit tous renseignés, ordre alphabétique source", () => {
    const txt = [
      "Après-midi : promenade au parc",
      "Matin : balade et croquettes",
      "Midi : pâtée légère",
      "Nuit : dort dans le panier",
      "Soir : câlins devant la TV",
    ].join("\n");
    const r = parseRoutine(txt)!;
    expect(r).not.toBeNull();
    expect(r.blocks).toHaveLength(5);
    expect(r.blocks.map((b) => b.label)).toEqual([
      "Matin",
      "Midi",
      "Après-midi",
      "Soir",
      "Nuit",
    ]);
    expect(r.blocks.map((b) => b.text)).toEqual([
      "balade et croquettes",
      "pâtée légère",
      "promenade au parc",
      "câlins devant la TV",
      "dort dans le panier",
    ]);
    expect(r.notes).toBe("");
  });

  it("5 moments avec horaires entre parenthèses + tirets collés", () => {
    const txt = [
      "Matin (7h)—gamelle + sortie",
      "Midi (12h)—pâtée",
      "Après-midi (15h)—jeu au jardin",
      "Soir (19h)—balade longue",
      "Nuit (23h)—dort au calme",
    ].join("\n");
    const labels = labelsOf(txt);
    expect(labels).toEqual(["Matin", "Midi", "Après-midi", "Soir", "Nuit"]);
  });
});

describe("parseRoutine — cas partiels (1 à 4 moments)", () => {
  it("1 seul moment : Matin uniquement", () => {
    const r = parseRoutine("Matin : balade rapide")!;
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0]).toMatchObject({ label: "Matin", text: "balade rapide" });
  });

  it("1 seul moment : Soir uniquement (autre moment du spectre)", () => {
    const r = parseRoutine("Soir : repas + câlins")!;
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0]).toMatchObject({ label: "Soir", text: "repas + câlins" });
  });

  it("2 moments non contigus : Matin + Nuit", () => {
    const r = parseRoutine("Nuit : dort\nMatin : sortie pipi")!;
    expect(r.blocks.map((b) => b.label)).toEqual(["Matin", "Nuit"]);
  });

  it("3 moments : Matin + Midi + Soir (sans Après-midi ni Nuit)", () => {
    const r = parseRoutine("Soir : croquettes\nMatin : balade\nMidi : sieste")!;
    expect(r.blocks.map((b) => b.label)).toEqual(["Matin", "Midi", "Soir"]);
  });

  it("4 moments : tout sauf Nuit", () => {
    const r = parseRoutine(
      "Après-midi : jeu\nSoir : câlins\nMatin : balade\nMidi : pâtée",
    )!;
    expect(r.blocks.map((b) => b.label)).toEqual(["Matin", "Midi", "Après-midi", "Soir"]);
    expect(r.blocks).toHaveLength(4);
  });

  it("label répété (Matin x2) : conserve les deux occurrences, triées en tête", () => {
    const r = parseRoutine("Matin : balade courte\nSoir : repas\nMatin : 2e sortie")!;
    const labels = r.blocks.map((b) => b.label);
    expect(labels.filter((l) => l === "Matin")).toHaveLength(2);
    expect(labels[labels.length - 1]).toBe("Soir");
  });
});

describe("parseRoutine — texte libre sans label", () => {
  it("phrase simple sans aucun moment retourne null", () => {
    expect(parseRoutine("Mon chien aime beaucoup les promenades.")).toBeNull();
  });

  it("paragraphe multi-lignes sans aucun moment retourne null", () => {
    const txt = [
      "Voici quelques infos sur la routine.",
      "Le chien dort beaucoup dans la journée.",
      "Pensez à bien fermer la porte du jardin.",
    ].join("\n");
    expect(parseRoutine(txt)).toBeNull();
  });

  it("texte qui contient les mots 'matin' ou 'soir' mais pas en début de ligne", () => {
    const txt = "Le chien aime se balader le matin et dort tôt le soir.";
    expect(parseRoutine(txt)).toBeNull();
  });

  it("seulement des labels sans contenu (Matin: / Soir:) retourne null", () => {
    expect(parseRoutine("Matin :\nSoir :\nNuit :")).toBeNull();
  });

  it("label seul + ligne libre : null car aucun bloc avec contenu", () => {
    expect(parseRoutine("Matin :\nÀ voir ensemble")).toBeNull();
  });

  it("texte libre + 1 vrai bloc : retourne le bloc et garde le reste en notes", () => {
    const r = parseRoutine(
      "Quelques notes générales sur le chien.\nMatin : balade tranquille\nIl est très calme.",
    )!;
    expect(r.blocks.map((b) => b.label)).toEqual(["Matin"]);
    expect(r.notes).toContain("Quelques notes");
    expect(r.notes).toContain("très calme");
  });
});

describe("parseRoutine — tolérance aux espaces et caractères spéciaux", () => {
  it("espaces multiples autour du séparateur (Matin   :   ...)", () => {
    const txt = "Matin   :   balade\nSoir   :   repas";
    expect(labelsOf(txt)).toEqual(["Matin", "Soir"]);
  });

  it("espaces insécables (NBSP) autour du séparateur", () => {
    const txt = "Matin\u00A0:\u00A0balade matinale\nSoir\u00A0:\u00A0croquettes";
    const r = parseRoutine(txt)!;
    expect(r.blocks.map((b) => b.label)).toEqual(["Matin", "Soir"]);
    expect(r.blocks[0].text).toBe("balade matinale");
  });

  it("narrow NBSP (\\u202F) typographie française avant les deux-points", () => {
    const txt = "Matin\u202F: gamelle\nMidi\u202F: pâtée";
    expect(labelsOf(txt)).toEqual(["Matin", "Midi"]);
  });

  it("label avec décorations markdown : **Matin** : ...", () => {
    const txt = "**Matin** : balade\n**Soir** : câlins";
    expect(labelsOf(txt)).toEqual(["Matin", "Soir"]);
  });

  it("label entre guillemets français « Matin » : ...", () => {
    const txt = "« Matin » : promenade\n« Soir » : repas";
    expect(labelsOf(txt)).toEqual(["Matin", "Soir"]);
  });

  it("label précédé d'un emoji (🌅 Matin : ...)", () => {
    const txt = "🌅 Matin : sortie\n🌙 Soir : panier";
    expect(labelsOf(txt)).toEqual(["Matin", "Soir"]);
  });

  it("séparateur flèche (Matin → ...) et égal (Soir = ...)", () => {
    const txt = "Matin → balade\nSoir = repas léger";
    expect(labelsOf(txt)).toEqual(["Matin", "Soir"]);
  });

  it("tabulations entre label et texte", () => {
    const txt = "Matin\t:\tcroquettes\nSoir\t:\tpanier";
    expect(labelsOf(txt)).toEqual(["Matin", "Soir"]);
  });

  it("label en MAJUSCULES avec espaces multiples", () => {
    const txt = "MATIN    :    sortie pipi\nNUIT    :    dort calme";
    expect(labelsOf(txt)).toEqual(["Matin", "Nuit"]);
  });

  it("Après-midi avec NBSP autour et ordre mélangé", () => {
    const txt = "Après-midi\u00A0:\u00A0sieste\nMatin : balade";
    expect(labelsOf(txt)).toEqual(["Matin", "Après-midi"]);
  });
});

describe("parseRoutine — indications horaires riches (crochets, accolades, multiples)", () => {
  it("crochets droits : Matin [8h] : balade", () => {
    const r = parseRoutine("Matin [8h] : balade\nSoir [19h] : croquettes")!;
    expect(r.blocks.map((b) => b.label)).toEqual(["Matin", "Soir"]);
    expect(r.blocks[0].text).toBe("balade");
    expect(r.blocks[1].text).toBe("croquettes");
  });

  it("parenthèses + tiret long collé : Soir (vers 19h)–croquettes", () => {
    const r = parseRoutine("Matin (7h)–gamelle\nSoir (vers 19h)–croquettes")!;
    expect(r.blocks.map((b) => b.label)).toEqual(["Matin", "Soir"]);
    expect(r.blocks[0].text).toBe("gamelle");
    expect(r.blocks[1].text).toBe("croquettes");
  });

  it("accolades : Midi {12h-13h} - sieste", () => {
    const r = parseRoutine("Midi {12h-13h} - sieste calme")!;
    expect(r.blocks[0].label).toBe("Midi");
    expect(r.blocks[0].text).toBe("sieste calme");
  });

  it("plusieurs blocs d'indication successifs : Matin (7h) [balade] : sortie", () => {
    const r = parseRoutine("Matin (7h) [balade] : sortie au parc\nNuit [22h] : panier")!;
    expect(r.blocks.map((b) => b.label)).toEqual(["Matin", "Nuit"]);
    expect(r.blocks[0].text).toBe("sortie au parc");
    expect(r.blocks[1].text).toBe("panier");
  });

  it("crochets sans séparateur explicite : Soir [19h] croquettes", () => {
    const r = parseRoutine("Matin [8h] balade matinale\nSoir [19h] croquettes")!;
    expect(r.blocks.map((b) => b.label)).toEqual(["Matin", "Soir"]);
    expect(r.blocks[0].text).toBe("balade matinale");
  });

  it("ordre mélangé avec horaires en crochets", () => {
    const txt = [
      "Soir [19h] : repas",
      "Matin [7h] : sortie",
      "Après-midi [15h] : jeu",
    ].join("\n");
    expect(labelsOf(txt)).toEqual(["Matin", "Après-midi", "Soir"]);
  });
});

describe("parseRoutine — blocs collés sur une seule ligne par , ou ;", () => {
  it("virgules entre blocs : Matin : balade, Midi : sieste, Soir : repas", () => {
    const r = parseRoutine("Matin : balade, Midi : sieste, Soir : repas")!;
    expect(r.blocks.map((b) => b.label)).toEqual(["Matin", "Midi", "Soir"]);
    expect(r.blocks[0].text).toBe("balade");
    expect(r.blocks[1].text).toBe("sieste");
    expect(r.blocks[2].text).toBe("repas");
  });

  it("point-virgules entre blocs : Matin : X; Soir : Y; Nuit : Z", () => {
    const r = parseRoutine("Matin : balade; Soir : croquettes; Nuit : panier")!;
    expect(r.blocks.map((b) => b.label)).toEqual(["Matin", "Soir", "Nuit"]);
    expect(r.blocks[1].text).toBe("croquettes");
  });

  it("mix virgules + point-virgules + ordre mélangé", () => {
    const r = parseRoutine("Soir : repas, Matin : sortie; Après-midi : jeu")!;
    expect(r.blocks.map((b) => b.label)).toEqual(["Matin", "Après-midi", "Soir"]);
  });

  it("virgule à l'intérieur du texte d'un bloc ne déclenche PAS de découpe", () => {
    const r = parseRoutine("Matin : balade, jeu et câlins\nSoir : repas")!;
    expect(r.blocks.map((b) => b.label)).toEqual(["Matin", "Soir"]);
    expect(r.blocks[0].text).toBe("balade, jeu et câlins");
  });

  it("blocs collés avec NBSP avant le label : Matin : X,\\u00A0Soir : Y", () => {
    const r = parseRoutine("Matin : balade,\u00A0Soir : repas")!;
    expect(r.blocks.map((b) => b.label)).toEqual(["Matin", "Soir"]);
  });

  it("séparation par , même avec horaires entre crochets", () => {
    const r = parseRoutine("Matin [7h] : sortie, Soir [19h] : croquettes")!;
    expect(r.blocks.map((b) => b.label)).toEqual(["Matin", "Soir"]);
    expect(r.blocks[0].text).toBe("sortie");
    expect(r.blocks[1].text).toBe("croquettes");
  });
});

