/** Lot GUIDE1 : générateur du guide de la maison, lecture côté gardien, nettoyage (migration 0184). */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { withoutUnfilledPlaceholders } from "@/lib/accordDeGarde";
import { uploadFailureMetadata } from "@/lib/uploadFailure";

const read = (p: string) => readFileSync(p, "utf8");

describe("GUIDE1, le gardien ne lit jamais une trame à accolades", () => {
  it("un champ resté en trame revient vide, les autres restent", () => {
    const out = withoutUnfilledPlaceholders({
      vet_name: "Dr Martin",
      vet_address: "Cabinet situé {adresse}",
      emergency_contact_name: "Contactez {nom du contact de secours} au {téléphone}",
      emergency_contact_phone: "06 12 34 56 78",
      published: true,
    });
    expect(out).toEqual({
      vet_name: "Dr Martin",
      vet_address: "",
      emergency_contact_name: "",
      emergency_contact_phone: "06 12 34 56 78",
      published: true,
    });
    expect(withoutUnfilledPlaceholders(null)).toBeNull();
  });
  it("les deux écrans du gardien passent par ce filtre et gardent le téléphone d'urgence", () => {
    for (const f of ["src/components/messages/HouseGuideBlock.tsx", "src/components/messages/HelpButton.tsx"]) {
      const s = read(f);
      expect(s).toContain("withoutUnfilledPlaceholders(data)");
      expect(s).toContain("guide.emergency_contact_name || guide.emergency_contact_phone");
    }
  });
});

describe("GUIDE1, une trame ne remplace jamais un texte saisi", () => {
  const form = read("src/components/owner-profile/OwnerHouseGuideForm.tsx");
  it("seuls les deux champs de texte libre vides reçoivent une trame", () => {
    expect(form).toContain("if (!prev.wifi_instructions.trim() && drafts.wifi_info?.trim())");
    expect(form).toContain("if (!prev.detailed_instructions.trim() && drafts.neighborhood?.trim())");
    expect(form).not.toMatch(/vet_address: drafts\./);
    expect(form).not.toMatch(/emergency_contact_name: drafts\./);
    expect(form).toContain("if (filled.size === 0) return 0;");
  });
  it("la bulle annonce deux trames et dit quand les textes restent en place", () => {
    const bubble = read("src/components/ai/alma/AlmaHouseGuideAssist.tsx");
    expect(bubble).toContain("Générer les 2 trames");
    expect(bubble).toContain("vos textes restent en place");
  });
});

describe("GUIDE1, fonction generate-house-guide", () => {
  const fn = read("supabase/functions/generate-house-guide/index.ts");
  it("deux trames, plafond compté par la fonction", () => {
    expect(fn).toContain('required: ["wifi_info", "neighborhood"]');
    expect(fn).not.toContain("veterinary:");
    expect(fn).not.toContain("emergency:");
    expect(fn).toContain('event_type: "alma_house_guide_call"');
    expect(fn).toContain("if (countErr) return json(");
  });
  it("un terme proscrit ou un numéro donne la trame générique entière", () => {
    expect(fn).toContain("if (PROSCRIBED.test(cleaned) || INVENTED_PHONE.test(cleaned))");
    expect(fn).not.toContain('"personne de confiance"');
    const phone = /(?:\+33|\b0)[1-9](?:[ .-]?\d{2}){4}\b/;
    expect(phone.test("appelez le 04 78 12 34 56")).toBe(true);
    expect(phone.test("le 15, le 18 ou le 112")).toBe(false);
  });
});

describe("GUIDE1, migration 0184", () => {
  const sql = read("drizzle/migrations/0184_guide1_guides_nettoyage.sql");
  it("sauvegarde avant d'écrire, tables de sauvegarde fermées", () => {
    expect(sql.indexOf("INSERT INTO public.house_guides_guide1_backup")).toBeLessThan(sql.indexOf("UPDATE public.house_guides h SET"));
    expect(sql).toContain("REVOKE ALL ON public.house_guides_guide1_backup FROM anon, authenticated;");
    expect(sql).toContain("REVOKE ALL ON public.city_guide_places_guide1_backup FROM anon, authenticated;");
  });
  it("un lieu n'est supprimé que sauvegardé, la sélection retenue à la main reste", () => {
    expect(sql).toMatch(/DELETE FROM public\.city_guide_places p\s+USING cible c/);
    expect(sql).toContain("EXISTS (SELECT 1 FROM sauvegarde s WHERE s.id = p.id)");
    const overrides = read("src/data/guideOverrides.ts");
    const ids = [...new Set(overrides.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? [])];
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(sql).toContain(`'${id}'`);
  });
  it("le contrat de production suit la migration", () => {
    const contracts = JSON.parse(read("scripts/db/production-contracts.json"));
    const c = contracts.contracts.find((x: { migration: string }) => x.migration === "0184_guide1_guides_nettoyage.sql");
    expect(c?.checks?.length).toBe(3);
  });
});

describe("GUIDE1, motif des échecs d'envoi de photo", () => {
  it("message, besoin et couverture d'article portent l'étape et le motif", () => {
    for (const f of ["src/pages/Messages.tsx", "src/components/missions/MissionPhotoUpload.tsx", "src/pages/ArticleEditor.tsx"]) {
      expect(read(f)).toContain("uploadFailureMetadata(file, stage, err)");
    }
    const file = new File(["x"], "photo.HEIC", { type: "image/heic" });
    expect(uploadFailureMetadata(file, "upload", { message: "new row violates row-level security policy" })).toMatchObject({
      ext: "heic", stage: "upload", reason: "new row violates row-level security policy",
    });
  });
});
