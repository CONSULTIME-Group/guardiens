/**
 * Lot PHOTO1 (08/11/2026, demande de Jérémie) : les photos montrent la maison.
 * - rappel avant publication sur toutes les façons de publier, express compris,
 *   sous trois photos ou quand aucune photo analysée ne montre le logement ;
 * - texte de Jérémie (se projeter, gardiens faits pour votre environnement) ;
 * - analyse de chaque photo ajoutée (ce qu'elle montre, netteté, lumière,
 *   rangement) et conseil immédiat ;
 * - « Montrez votre maison » en tête des ajouts sur l'annonce en ligne.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import {
  homePhotoGap,
  homePhotoTip,
  toHomePhotoInsight,
  HOME_PHOTO_MIN_COUNT,
} from "../../../supabase/functions/_shared/home-photo-insight.ts";
import { publishedProfileBoosts } from "@/lib/publishedProfileBoosts";
import { PUBLISH_PHOTO_PROMPT_BODY, PUBLISH_PHOTO_PROMPT_TIPS, publishPhotoPromptTitle } from "@/lib/publishPhotoPrompt";
import CreateSitExpress, { type CreateSitExpressProps } from "@/components/sits/create/CreateSitExpress";

const src = (p: string) => readFileSync(p, "utf8");

describe("PHOTO1, ce qui manque aux photos", () => {
  it("aucune, moins de trois, puis le logement visible", () => {
    expect(homePhotoGap([], [])).toBe("no_photo");
    expect(homePhotoGap(["a", ""], [])).toBe("few");
    expect(homePhotoGap(["a", "b"], [{ photo_url: "a", shows_home: true }])).toBe("few");
    expect(HOME_PHOTO_MIN_COUNT).toBe(3);
  });

  it("trois photos sans relevé : rien à demander (le rappel se fie au nombre)", () => {
    expect(homePhotoGap(["a", "b", "c"], [])).toBe("none");
  });

  it("trois photos dont aucune analysée ne montre le logement : no_home", () => {
    const insights = [
      { photo_url: "a", shows_home: false },
      { photo_url: "b", shows_home: false },
    ];
    expect(homePhotoGap(["a", "b", "c"], insights)).toBe("no_home");
  });

  it("une seule photo du logement suffit", () => {
    const insights = [
      { photo_url: "a", shows_home: false },
      { photo_url: "c", shows_home: true },
    ];
    expect(homePhotoGap(["a", "b", "c"], insights)).toBe("none");
  });

  it("un relevé d'une autre photo est ignoré", () => {
    expect(homePhotoGap(["a", "b", "c"], [{ photo_url: "z", shows_home: false }])).toBe("none");
  });
});

describe("PHOTO1, relevé et conseil", () => {
  it("réponse du modèle ramenée à une ligne propre", () => {
    expect(toHomePhotoInsight("u", { url: "x", subject: "interieur", shows_home: true, issues: ["sombre", 3], score: 140 })).toEqual({
      photo_url: "x", user_id: "u", subject: "interieur", shows_home: true, issues: ["sombre"], score: 100,
    });
    expect(toHomePhotoInsight("u", { url: "x", subject: "plage", shows_home: false })?.subject).toBe("autre");
    expect(toHomePhotoInsight("u", { url: "x", subject: "interieur" })).toBeNull();
    expect(toHomePhotoInsight("u", { url: "", shows_home: true })).toBeNull();
  });

  it("le conseil le plus utile d'abord", () => {
    expect(homePhotoTip({ shows_home: true, subject: "interieur", issues: ["désordre", "sombre"] })).toMatch(/^Photo un peu sombre/);
    expect(homePhotoTip({ shows_home: true, subject: "interieur", issues: ["flou"] })).toMatch(/^Photo un peu floue/);
    expect(homePhotoTip({ shows_home: true, subject: "interieur", issues: ["désordre"] })).toMatch(/premier plan dégagé/);
    expect(homePhotoTip({ shows_home: false, subject: "animal", issues: [] })).toMatch(/photo de la maison/);
    expect(homePhotoTip({ shows_home: true, subject: "exterieur", issues: [] })).toBeNull();
  });

  it("textes sans tiret cadratin ni tournure négative", () => {
    const texts = [
      PUBLISH_PHOTO_PROMPT_BODY,
      PUBLISH_PHOTO_PROMPT_TIPS,
      ...(["sombre", "flou", "désordre", "surexposée", "cadrage_serré"].map((k) => homePhotoTip({ shows_home: true, subject: "interieur", issues: [k] }) ?? "")),
      homePhotoTip({ shows_home: false, subject: "autre", issues: [] }) ?? "",
    ];
    for (const t of texts) {
      expect(t).not.toMatch(/[–—]/);
      expect(t).not.toMatch(/\bne\b|\bn'|\bpas\b|\bjamais\b/i);
    }
  });
});

describe("PHOTO1, rappel avant publication", () => {
  it("titre selon ce qui manque", () => {
    expect(publishPhotoPromptTitle(3, "no_home")).toBe("Montrez où votre gardien va vivre");
    expect(publishPhotoPromptTitle(1, "few")).toBe("Votre annonce part avec une seule photo");
  });

  it("le parcours express n'est plus dispensé du rappel", () => {
    const create = src("src/pages/CreateSit.tsx");
    expect(create).not.toContain("!expressActiveRef.current && !photoPromptConfirmedRef.current");
    expect(create).toContain("loadHomePhotoGap(user.id, propertyPhotoUrls(property?.photos))");
  });

  it("republication depuis l'annonce et depuis Mes annonces : même règle", () => {
    expect(src("src/components/sits/views/OwnerSitView.tsx")).toContain("loadHomePhotoGap(currentUserId");
    expect(src("src/pages/Sits.tsx")).toContain("loadHomePhotoGap(user.id, propertyPhotoUrls(photos))");
  });
});

describe("PHOTO1, analyse à l'ajout", () => {
  it("chaque chemin d'ajout analyse et enregistre la photo", () => {
    expect(src("src/components/sits/create/InlinePhotoUpload.tsx")).toContain("analyzeHomePhoto(userId, url)");
    expect(src("src/pages/CreateSit.tsx")).toContain("analyzeHomePhoto(user.id, url)");
    expect(src("src/lib/uploadOwnerPhoto.ts")).toContain("analyzeHomePhoto(userId, url)");
    expect(src("src/components/owner-profile/OwnerGallery.tsx")).toContain("analyzeHomePhoto(user.id, urlData.publicUrl)");
    for (const f of ["src/components/sits/owner/SitPhotoManager.tsx", "src/components/owner-profile/PhotoQualityChecker.tsx", "src/lib/pickSmartCover.ts"]) {
      expect(src(f)).toContain("persist: true");
    }
  });

  it("la fonction demande ce que montre la photo et n'écrit que pour une photo de la galerie du membre", () => {
    const fn = src("supabase/functions/analyze-photo-quality/index.ts");
    expect(fn).toContain('"subject", "shows_home"]');
    expect(fn).toContain('.from("owner_gallery")');
    expect(fn).toContain('.eq("user_id", userId)');
    expect(fn).toContain('.from("owner_gallery_insights").upsert');
  });

  it("table lue par le propriétaire seul, écrite par la clé de service", () => {
    const sql = src("drizzle/migrations/0119_photo1_regard_photos_logement.sql");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("REVOKE ALL ON TABLE public.owner_gallery_insights FROM PUBLIC, anon, authenticated;");
    expect(sql).toContain("GRANT SELECT ON TABLE public.owner_gallery_insights TO authenticated;");
    expect(sql).toContain("USING (user_id = auth.uid())");
    expect(sql).not.toMatch(/GRANT (INSERT|UPDATE|DELETE|ALL)[^;]*TO authenticated/);
  });

  it("express : le conseil s'affiche sous la photo ajoutée", () => {
    render(
      <CreateSitExpress
        {...({
          period: "noel",
          readinessPercent: 50,
          propertyType: "house",
          city: "Lyon",
          postalCode: "69005",
          pets: [],
          photoUrl: "https://x/p.jpg",
          uploading: false,
          onPhotoFile: () => {},
          photoTip: "Photo un peu sombre : prise en journée, rideaux ouverts, la pièce paraîtra plus accueillante.",
          startDate: "2026-12-20",
          endDate: "2026-12-27",
          onDates: () => {},
          dateError: null,
          flexibleDates: false,
          onFlexibleDates: () => {},
          title: "t",
          onTitle: () => {},
          absenceReason: "a",
          onAbsenceReason: () => {},
          sitterExpectations: "s",
          onSitterExpectations: () => {},
          blocking: [],
          publishing: false,
          onPublish: () => {},
          onBack: () => {},
        } as unknown as CreateSitExpressProps)}
      />,
    );
    expect(screen.getByTestId("express-photo-tip")).toHaveTextContent("Photo un peu sombre");
  });
});

describe("PHOTO1, annonce en ligne", () => {
  it("« Montrez votre maison » en tête quand les photos manquent", () => {
    expect(publishedProfileBoosts({ avatarUrl: null, bio: null, petsCount: 0, homePhotoGap: "no_home" }).map((b) => b.key))
      .toEqual(["home", "pet", "avatar", "bio"]);
    expect(publishedProfileBoosts({ avatarUrl: "a", bio: "x".repeat(60), petsCount: 1, homePhotoGap: "none" })).toEqual([]);
    expect(publishedProfileBoosts({ avatarUrl: "a", bio: "x".repeat(60), petsCount: 1 })).toEqual([]);
  });
});
