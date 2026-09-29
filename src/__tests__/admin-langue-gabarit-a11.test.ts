import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { adminNavGroups_export } from "@/components/admin/AdminSidebar";
import {
  adminLabel, cellValue, fieldValue, memberName, EMPTY_TABLE_VALUE,
  SIT_STATUS_LABELS, APPLICATION_STATUS_LABELS, MISSION_STATUS_LABELS, MISSION_RESPONSE_STATUS_LABELS,
  CONVERSATION_CONTEXT_LABELS, SPECIES_LABELS, ALMA_FREQUENCY_LABELS, ANALYSIS_REQUEST_STATUS_LABELS, ROLE_LABELS,
} from "@/lib/admin/labels";
import { resolveEmailTab, MUTUAL_AID_PILOT_ROUTE } from "@/lib/admin/emailSections";
import { nextPublishedState, ARTICLE_CATEGORIES } from "@/lib/admin/articleCategories";

const read = (p: string) => readFileSync(p, "utf8");
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|ts)$/.test(n) ? [p] : [];
  });

describe("A11, gabarit : un h1 égal au libellé du menu", () => {
  const app = read("src/App.tsx");
  const lazyPath = (name: string): string | null => {
    const m = app.match(new RegExp(`const ${name} = lazy\\(\\(\\) => import\\("\\./([^"]+)"\\)`));
    return m ? `src/${m[1]}.tsx` : null;
  };
  const items = adminNavGroups_export.flatMap((g) => g.items);
  for (const item of items) {
    const path = item.to.split("?")[0];
    it(`${item.label} (${item.to})`, () => {
      const m = app.match(new RegExp(`<Route path="${path}" element=\\{<(\\w+) />\\} />`));
      expect(m, `route ${path}`).toBeTruthy();
      const file = lazyPath(m![1]);
      expect(file && existsSync(file), `fichier ${m![1]}`).toBeTruthy();
      const src = read(file!);
      expect(src).toContain("<AdminPageHeader");
      expect(src).not.toMatch(/<h1[\s>]/);
      const titleOk =
        src.includes(`title="${item.label}"`) ||
        src.includes(`title={tab === "projets" ? "Projets" : "Entraide"}`);
      expect(titleOk, `titre ${item.label}`).toBe(true);
    });
  }
  it("la barre latérale ne porte pas de h1", () => {
    expect(read("src/components/admin/AdminSidebar.tsx")).not.toMatch(/<h1[\s>]/);
  });
  it("Articles longue traîne sort du menu, la route reste", () => {
    expect(items.some((i) => i.to === "/admin/articles-longue-traine")).toBe(false);
    expect(app).toContain('<Route path="/admin/articles-longue-traine"');
  });
  it("icônes distinctes dans le menu", () => {
    const icons = items.map((i) => i.icon);
    const byIcon = new Map<unknown, string[]>();
    items.forEach((i) => byIcon.set(i.icon, [...(byIcon.get(i.icon) ?? []), i.label]));
    const dup = [...byIcon.values()].filter((l) => l.length > 1 && !(l.includes("Trafic") && l.includes("Stats campagnes")) && !(l.includes("Pilotage entraide")));
    expect(icons.length).toBeGreaterThan(0);
    expect(dup).toEqual([]);
  });
});

describe("A11, aucun tiret long dans l'admin", () => {
  const files = [...walk("src/pages/admin"), ...walk("src/components/admin")];
  it(`${files.length} fichiers sans tiret cadratin ni demi-cadratin`, () => {
    const bad = files.filter((f) => /[\u2013\u2014]/.test(read(f)));
    expect(bad).toEqual([]);
  });
});

describe("A11, valeur vide unique", () => {
  it("une virgule seule ou un tiret devient « · »", () => {
    for (const v of [",", " , ", "—", "–", "-", "", null, undefined]) expect(cellValue(v)).toBe(EMPTY_TABLE_VALUE);
    expect(fieldValue(",")).toBe("Non renseigné");
    expect(memberName("—")).toBe("Membre");
    expect(cellValue("Lyon")).toBe("Lyon");
  });
  it("aucun repli sur une virgule seule dans l'admin", () => {
    const files = [...walk("src/pages/admin"), ...walk("src/components/admin")];
    const bad = files.filter((f) => /(\|\||\?\?|\?|:)\s*","\s*[}):]/.test(read(f)));
    expect(bad).toEqual([]);
  });
});

describe("A11, dictionnaire de libellés", () => {
  const cover = (keys: string[], dict: Record<string, string>) => keys.filter((k) => !dict[k]);
  it("couvre les enums de la base", () => {
    expect(cover(["draft", "published", "confirmed", "in_progress", "completed", "cancelled", "archived", "expired"], SIT_STATUS_LABELS)).toEqual([]);
    expect(cover(["pending", "viewed", "discussing", "accepted", "rejected", "cancelled"], APPLICATION_STATUS_LABELS)).toEqual([]);
    expect(cover(["open", "in_progress", "completed", "cancelled"], MISSION_STATUS_LABELS)).toEqual([]);
    expect(cover(["pending", "accepted", "declined", "withdrawn"], MISSION_RESPONSE_STATUS_LABELS)).toEqual([]);
    expect(cover(["sit_application", "sitter_inquiry", "mission_help", "owner_pitch", "helper_inquiry"], CONVERSATION_CONTEXT_LABELS)).toEqual([]);
    expect(cover(["dog", "cat", "horse", "bird", "rodent", "fish", "reptile", "farm_animal", "nac"], SPECIES_LABELS)).toEqual([]);
    expect(cover(["silent", "low", "balanced", "talkative"], ALMA_FREQUENCY_LABELS)).toEqual([]);
    expect(cover(["new", "in_progress", "done", "archived"], ANALYSIS_REQUEST_STATUS_LABELS)).toEqual([]);
    expect(cover(["owner", "sitter", "both"], ROLE_LABELS)).toEqual([]);
  });
  it("jamais de clé snake_case à l'écran", () => {
    expect(adminLabel("no_hard_criterion")).toBe("Aucun critère bloquant déclaré");
    expect(adminLabel("Dog")).toBe("Chiens");
    expect(adminLabel("Dlq")).not.toMatch(/_|^Dlq$/);
    expect(adminLabel("cle_inconnue_xyz")).toBe("Cle inconnue xyz");
    expect(adminLabel(null)).toBe("·");
  });
});

describe("A11, redirections", () => {
  it("/admin/lifecycle mène à /admin/nurturing", () => {
    expect(read("src/App.tsx")).toContain('<Route path="/admin/lifecycle" element={<Navigate to="/admin/nurturing" replace />} />');
  });
  it("?tab=mutual-aid mène au pilotage entraide, les anciens onglets restent valides", () => {
    expect(resolveEmailTab("mutual-aid")).toEqual({ redirect: MUTUAL_AID_PILOT_ROUTE });
    expect(resolveEmailTab("logs")).toEqual({ section: "envois", tab: "logs" });
    expect(resolveEmailTab("sitter-digest")).toEqual({ section: "resumes", tab: "sitter-digest" });
    expect(resolveEmailTab(null)).toEqual({ section: "modeles", tab: "templates" });
    expect(read("src/App.tsx")).toContain('<Route path="/admin/pilotage-entraide" element={<AdminMutualAidPilot />} />');
  });
  it("hero-weights est dans le cadre admin", () => {
    const app = read("src/App.tsx");
    const inLayout = app.slice(app.indexOf("<Route element={<AdminLayout />}>"), app.indexOf("{/* App routes */}"));
    expect(inLayout).toContain('path="/admin/hero-weights"');
  });
});

describe("A11, éditeur d'article", () => {
  it("sauvegarder garde le statut publié", () => {
    expect(nextPublishedState("draft", true)).toBe(true);
    expect(nextPublishedState("draft", false)).toBe(false);
    expect(nextPublishedState("unpublish", true)).toBe(false);
    expect(nextPublishedState("publish", false)).toBe(true);
  });
  it("13 catégories communes à la liste et à l'éditeur, retour vers la liste", () => {
    expect(Object.keys(ARTICLE_CATEGORIES)).toHaveLength(13);
    const ed = read("src/pages/ArticleEditor.tsx");
    expect(ed).toContain("ARTICLE_CATEGORIES");
    expect(read("src/pages/AdminArticles.tsx")).toContain("ARTICLE_CATEGORIES");
    expect(ed).not.toContain('navigate("/dashboard")');
    expect(read("src/pages/AdminArticles.tsx")).not.toContain('navigate("/dashboard")');
    expect(ed).toContain('title="Dépublier cet article ?"');
    expect(ed).toContain('data-confirm="generate-ai"');
  });
});

describe("A11, confirmations", () => {
  const cases: [string, string][] = [
    ["src/pages/AdminArticles.tsx", "Lancer le maillage automatique ?"],
    ["src/pages/admin/AdminCityPages.tsx", "Générer les pages des 150 plus grandes villes ?"],
    ["src/pages/admin/AdminDepartments.tsx", "Générer les pages des 101 départements ?"],
    ["src/pages/admin/AdminAnalysisRequests.tsx", "Supprimer cette demande ?"],
    ["src/pages/admin/AdminEmails.tsx", "Seconde confirmation"],
    ["src/pages/admin/AdminAssociations.tsx", "Archiver cette association ?"],
    ["src/pages/admin/_components/alma/MoodsTab.tsx", "window.confirm"],
    ["src/pages/admin/AdminSettings.tsx", "Désactiver les signaux admin ?"],
  ];
  for (const [f, needle] of cases) it(`${f} : ${needle}`, () => expect(read(f)).toContain(needle));
});

describe("A11, textes périmés", () => {
  it("Paramètres sans DNS en attente ni prix codé", () => {
    const s = read("src/pages/admin/AdminSettings.tsx");
    expect(s).not.toContain("DNS en attente");
    expect(s).not.toContain("6,99");
    expect(s).not.toContain("Auto-confirmation");
  });
  it("Journal d'audit sans lien vers /annuaire-pros", () => {
    expect(read("src/pages/admin/AdminAudit.tsx")).not.toContain("/annuaire-pros");
  });
});
