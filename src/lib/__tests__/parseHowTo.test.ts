import { describe, it, expect } from "vitest";
import { parseHowToFromMarkdown, buildHowToSchema } from "../parseHowTo";

const SAMPLE = `# Titre

## Intro

Bla bla.

## Comment ça marche concrètement : les 7 étapes d'une garde

Une intro avant le premier H3.

### 1. Publier une annonce

Le propriétaire crée son profil et publie l'annonce.

### 2. Recevoir des candidatures

Les gardiens candidatent. **Voir** [ici](/x).

<!-- TODO link: /foo -->

### 3. Échanger

On discute en messagerie.

## Section suivante

Cette H2 doit stopper le parsing.

### 4. NE doit PAS apparaître
`;

describe("parseHowToFromMarkdown", () => {
  it("extrait les steps entre l'H2 et la prochaine H2", () => {
    const steps = parseHowToFromMarkdown(SAMPLE);
    expect(steps).toHaveLength(3);
    expect(steps[0].name).toBe("Publier une annonce");
    expect(steps[1].name).toBe("Recevoir des candidatures");
    expect(steps[1].text).toContain("Voir ici");
    expect(steps[1].text).not.toContain("**");
    expect(steps[1].text).not.toContain("TODO");
    expect(steps[2].name).toBe("Échanger");
  });

  it("retourne [] si aucune section étapes", () => {
    expect(parseHowToFromMarkdown("# Hello\n\nNo steps here")).toEqual([]);
  });
});

describe("buildHowToSchema", () => {
  it("renvoie null si moins de 2 steps", () => {
    expect(buildHowToSchema([], { name: "x" })).toBeNull();
    expect(buildHowToSchema([{ name: "a", text: "b" }], { name: "x" })).toBeNull();
  });

  it("génère un Schema.org HowTo valide", () => {
    const schema = buildHowToSchema(
      [
        { name: "S1", text: "T1" },
        { name: "S2", text: "T2" },
      ],
      { name: "Comment faire", description: "Desc" },
    ) as any;
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("HowTo");
    expect(schema.name).toBe("Comment faire");
    expect(schema.step).toHaveLength(2);
    expect(schema.step[0].position).toBe(1);
    expect(schema.step[0].name).toBe("S1");
  });
});
