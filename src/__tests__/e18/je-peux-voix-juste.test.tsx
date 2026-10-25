/**
 * Verrou du lot E18 « Un seul Je peux, une voix juste » (25/10/2026, arène
 * entraide, décision de Jérémie « ok go ça me va »).
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { needHeadline, quotableNeedTitle, publishedReachLine, ENTRAIDE_DURATION_LABELS } from "@/lib/entraideCopy";
import { waveHeadline, waveEmailDetails } from "../../../supabase/functions/_shared/mission-wave";
import { needExcerpt, NEED_EXCERPT_EMAIL_MAX } from "@/lib/needExcerpt";
import { resolveExchangeLine, composeExchangeOffer, FIXED_EXCHANGE_OFFER, authorExchangeOffer } from "@/lib/entraideExchange";
import { canHelpMessage, QUICK_CAN_HELP_MESSAGE } from "@/lib/missionRespond";
import { canHelpDayOptions } from "@/lib/canHelpDays";
import { ENTRAIDE_IDEAS } from "@/lib/entraideIdeas";
import CanHelpDialog from "@/components/entraide/CanHelpDialog";
import RelatedMissionCard from "@/components/missions/RelatedMissionCard";
import MissionPublishedBanner from "@/components/missions/MissionPublishedBanner";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const NB = " ";

/** 22 titres de test qui reproduisent les formes réelles relevées le 25/10/2026 (n° 50). */
const TITLES = [
  "D'une personne pour arroser mes tomates",
  "D'une aide pour déplacer une armoire",
  "Bonjour, je cherche quelqu'un pour nourrir mes poules",
  "Bonjour je pars une semaine",
  "J'ai besoin d'aide pour tailler ma haie",
  "J'ai un meuble à monter",
  "Cherche personne pour promener mon chien le matin",
  "Cherche coup de main jardin",
  "Garder mon chat samedi",
  "Nourrir les poules deux matins.",
  "Déplacer un canapé au 2e étage !",
  "Un trajet jusqu'à la gare de Lyon Part-Dieu",
  "Un coup de main pour le potager",
  "Aide pour les courses",
  "Besoin d'aide pour arroser",
  "« Ramasser les pommes »",
  "  arroser   les plantes  ",
  "Monter une bibliothèque à deux ?",
  "Promener Filou...",
  "Une partie de belote le jeudi",
  "Tailler une haie de 12 mètres côté rue, ramasser les branches, charger la voiture et porter les sacs à la déchèterie d'Écully",
  "Arroser le potager pendant mes vacances du 3 au 10 août",
];

describe("accroche partagée site et email (n° 50)", () => {
  it("rend une phrase correcte pour les 22 formes de titre", () => {
    for (const title of TITLES) {
      const line = waveHeadline("Marie", 4.2, title, null);
      expect(line, title).toMatch(new RegExp(`^Marie, à 4${NB}km, cherche un coup de main${NB}: «${NB}.+${NB}»\\.$`));
      expect(line, title).not.toMatch(/a besoin de quelqu'un pour/);
      expect(line, title).not.toMatch(/[.!?,;:]\s?»\.$|\.\.$|»\s*\.\./);
      expect(line, title).not.toMatch(/[–—]/);
      expect(line).toBe(needHeadline("Marie", 4.2, title, null));
    }
  });

  it("cite le titre nettoyé, coupé au mot au-delà de 90 caractères", () => {
    expect(quotableNeedTitle("  arroser   les plantes  ")).toBe("arroser les plantes");
    expect(quotableNeedTitle("« Ramasser les pommes »")).toBe("Ramasser les pommes");
    expect(quotableNeedTitle("Nourrir les poules deux matins.")).toBe("Nourrir les poules deux matins");
    const long = quotableNeedTitle(TITLES[20]);
    expect(long.length).toBeLessThanOrEqual(91);
    expect(long.endsWith("…")).toBe(true);
  });

  it("date, distance sous un km et prénom absent", () => {
    expect(needHeadline("Paul", 0.3, "Promener le chien", "8 novembre")).toBe(
      `Paul, à moins d'un km, cherche un coup de main${NB}: «${NB}Promener le chien${NB}», le 8 novembre.`,
    );
    expect(needHeadline(null, null, "Promener le chien")).toBe(`Un membre du coin cherche un coup de main${NB}: «${NB}Promener le chien${NB}».`);
  });
});

describe("email aux aidants", () => {
  const tpl = read("supabase/functions/_shared/transactional-email-templates/mission-help-needed.tsx");

  it("deux lignes d'extrait, date, durée, distance", () => {
    const details = waveEmailDetails({
      title: "Arroser",
      description: `Arroser ${"le potager et les tomates ".repeat(20)}`,
      duration_estimate: "several",
      date_needed: "2026-11-08",
    });
    expect(details.durationLabel).toBe("Plusieurs passages");
    expect(details.dateLabel).toBe("8 novembre");
    expect(details.missionExcerpt!.length).toBeLessThanOrEqual(NEED_EXCERPT_EMAIL_MAX + 1);
    expect(details.missionExcerpt).toBe(needExcerpt(`Arroser ${"le potager et les tomates ".repeat(20)}`, "Arroser", NEED_EXCERPT_EMAIL_MAX));
    expect(tpl).toContain("{missionExcerpt && <Text style={cardExcerpt}>{missionExcerpt}</Text>}");
    expect(tpl).toContain("helpNeededMetaLine(dateLabel, durationLabel, distanceKm)");
  });

  it("jeton et src=vague sur « Je peux » et sur « Voir le détail » (n° 17)", () => {
    expect(tpl).toContain("`${SITE_URL}/entraide/je-peux?t=${encodeURIComponent(canHelpToken)}&src=vague`");
    expect(tpl).toContain("`${SITE_URL}/petites-missions/${missionId}?${token}src=vague`");
    expect(tpl).toContain("href={links.detail}");
  });

  it("la phrase fixe d'échange quitte l'email, le titre donne la distance au-delà de 30 km", () => {
    expect(tpl).not.toContain("En retour : un merci");
    expect(tpl).toContain("Un besoin à ${Math.round(distanceKm)} km de chez vous");
  });
});

describe("fiche : un seul « Je peux » (n° 39, 40)", () => {
  const smd = read("src/pages/SmallMissionDetail.tsx");

  it("la barre collante mobile ouvre la fenêtre « Je peux »", () => {
    const sticky = smd.slice(smd.indexOf('data-testid="mission-sticky-bar"'));
    expect(sticky).toContain('openCanHelp("sticky")');
    expect(sticky).toContain("ENTRAIDE_COPY.canHelp");
    expect(smd).not.toContain("Répondre à cette annonce");
    expect(smd).not.toContain("Répondre avec un mot");
  });

  it("la fiche lit le jeton de l'email pour « Je peux » sans connexion", () => {
    expect(smd).toContain('searchParams.get("t")');
    expect(smd).toContain("canHelpToken={actionToken}");
    const pub = read("src/components/missions/PublicMissionView.tsx");
    expect(pub).toContain("`/entraide/je-peux?t=${encodeURIComponent(canHelpToken)}`");
  });

  it("la bannière « Vos compétences correspondent » disparaît (n° 65)", () => {
    expect(smd).not.toContain("Vos compétences correspondent");
  });

  it("« Plusieurs passages » s'affiche comme au formulaire (n° 38)", () => {
    expect(ENTRAIDE_DURATION_LABELS.several).toBe("Plusieurs passages");
    expect(smd).toContain("ENTRAIDE_DURATION_LABELS");
  });
});

describe("fenêtre « Je peux »", () => {
  const props = {
    open: true,
    firstName: "Martine",
    needTitle: "Tailler une haie",
    needMeta: "Écully · 1 à 2 heures",
    needDescription: "Une haie de 12 mètres.",
    detailPath: "/petites-missions/haie",
    sending: false,
    onCancel: () => undefined,
  };

  it("message vide avec un exemple, jour facultatif enregistré", () => {
    const onSend = vi.fn();
    render(
      <MemoryRouter>
        <CanHelpDialog {...props} needDateNeeded="2099-11-07" needEndDate="2099-11-08" onSend={onSend} />
      </MemoryRouter>,
    );
    const box = screen.getByLabelText(/Un mot pour Martine/) as HTMLTextAreaElement;
    expect(box.value).toBe("");
    expect(box.placeholder).toMatch(/^Par exemple/);
    expect(screen.getByText("Quand êtes-vous libre ?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lire le besoin en entier" })).toHaveAttribute("href", "/petites-missions/haie");
    const chips = screen.getAllByRole("button", { pressed: false }).filter((b) => /nov/.test(b.textContent || ""));
    expect(chips).toHaveLength(2);
    fireEvent.click(chips[0]);
    fireEvent.click(screen.getByRole("button", { name: "Envoyer à Martine" }));
    expect(onSend).toHaveBeenCalledWith(expect.stringMatching(/^Je peux vous aider\. Je suis libre le samedi 7 nov\.$/), "2099-11-07");
  });

  it("un mot tapé part tel quel, sans jour", () => {
    const onSend = vi.fn();
    render(<MemoryRouter><CanHelpDialog {...props} onSend={onSend} /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/Un mot pour Martine/), { target: { value: "J'arrive avec des gants et ma voiture." } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer à Martine" }));
    expect(onSend).toHaveBeenCalledWith("J'arrive avec des gants et ma voiture.", null);
  });

  it("message et jours", () => {
    expect(canHelpMessage("", null)).toBe(QUICK_CAN_HELP_MESSAGE);
    expect(canHelpDayOptions("2020-01-01", "2020-01-03")).toEqual([]);
    expect(canHelpDayOptions("2099-01-01", "2099-01-30")).toHaveLength(4);
  });
});

describe("En retour (décision du 25/10/2026)", () => {
  it("la ligne de l'auteur, sinon helps_with, sinon la phrase fixe", () => {
    expect(resolveExchangeLine({ exchangeOffer: "Un café et des boutures", helpsWith: "bricolage", firstName: "Martine" }))
      .toEqual({ kind: "author", label: "En retour, Martine propose", text: "Un café et des boutures" });
    expect(resolveExchangeLine({ exchangeOffer: FIXED_EXCHANGE_OFFER, helpsWith: "bricolage, jardinage", firstName: "Martine" }))
      .toEqual({ kind: "helps_with", label: "En retour, Martine propose volontiers", text: "bricolage, jardinage" });
    expect(resolveExchangeLine({ exchangeOffer: "", helpsWith: null, firstName: "Martine" }))
      .toEqual({ kind: "fixed", label: null, text: FIXED_EXCHANGE_OFFER });
    expect(authorExchangeOffer(`  ${FIXED_EXCHANGE_OFFER} `)).toBeNull();
  });

  it("compose la ligne à partir des suggestions touchées et du texte libre", () => {
    expect(composeExchangeOffer(["Un café", "Des légumes du jardin"], "et une part de tarte aux pommes"))
      .toBe("Un café, des légumes du jardin et une part de tarte aux pommes");
    expect(composeExchangeOffer([], "  ")).toBe("");
  });

  it("le formulaire enregistre exchange_offer, garde-fou argent compris", () => {
    const form = read("src/pages/CreateSmallMission.tsx");
    expect(form).toContain("En retour, je propose");
    expect(form).toContain("exchange_offer: cleanExchange");
    expect(form).toContain("hasMoneyMention(title, description, exchangeOffer)");
    expect(form).not.toContain("const cleanExchange = FIXED_EXCHANGE_OFFER");
  });

  it("aucune carte liée ne porte la phrase d'échange (n° 35)", () => {
    const { container } = render(
      <MemoryRouter>
        <RelatedMissionCard to="/petites-missions/x" title="Nourrir les poules" city="Écully" timeAgo="il y a 2 j" category="animals" />
      </MemoryRouter>,
    );
    expect(container.textContent).not.toMatch(/En retour|un merci, un café/);
    expect(read("src/components/missions/RelatedMissionCard.tsx")).not.toContain("exchangeOffer");
  });

  it("la phrase s'affiche une fois sur la fiche, sans guillemets", () => {
    for (const f of ["src/pages/SmallMissionDetail.tsx", "src/components/missions/PublicMissionView.tsx"]) {
      const src = read(f);
      expect(src.match(/data-testid="mission-exchange-line"/g)?.length, f).toBe(2);
      expect(src, f).not.toContain("« {mission.exchange_offer} »");
    }
  });
});

describe("textes vrais", () => {
  it("bannière de publication : le besoin est en ligne, la vague part (n° 28)", () => {
    render(
      <MemoryRouter>
        <MissionPublishedBanner missionTitle="Haie" isAuthor published onClose={() => undefined} onToast={() => undefined} waveAudience={7} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Votre besoin est en ligne.")).toBeInTheDocument();
    expect(screen.getByText(/7 personnes à moins de 30 km vont le recevoir/)).toBeInTheDocument();
    expect(read("src/components/missions/MissionPublishedBanner.tsx")).not.toContain("prochain envoi quotidien");
    expect(publishedReachLine(null)).toMatch(/dix à la fois/);
    expect(read("src/i18n/locales/fr/common.json")).toContain('"toast_published_title": "Votre besoin est en ligne."');
  });

  it("relance sans « mission, preneur, contrepartie » (n° 64)", () => {
    const src = read("supabase/functions/_shared/transactional-email-templates/mission-nudge-no-response.tsx");
    const visible = src.slice(src.indexOf("<Preview>"), src.indexOf("export const template"));
    expect(visible.replace(/\{[^{}]*\}/g, "")).not.toMatch(/mission|preneur|contrepartie/i);
  });

  it("« Le coup de main a eu lieu ? » partout, MeetupAnswer laissé au lot E19 (n° 37)", () => {
    for (const f of [
      "src/pages/MissionQuickCanHelp.tsx",
      "src/components/dashboard/MesCoupsDeMain.tsx",
      "src/components/dashboard/owner/OwnerEntraideBand.tsx",
      "supabase/functions/_shared/mission-meetup.ts",
      "supabase/functions/_shared/transactional-email-templates/mission-meetup-confirm-owner.tsx",
      "supabase/functions/_shared/transactional-email-templates/mission-meetup-confirm-helper.tsx",
    ]) {
      expect(read(f), f).not.toContain("Vous vous êtes rencontrés ?");
    }
  });

  it("page jeton : prénom de l'auteur (n° 43, migration 0102)", () => {
    const page = read("src/pages/MissionQuickCanHelp.tsx");
    expect(page).not.toContain('"Une personne"');
    expect(page).toContain("needHeadline(peek.owner_first_name, null, peek.mission_title)");
    const sql = read("drizzle/migrations/0102_e18_prenom_jeton_je_peux.sql");
    expect(sql).toContain("'owner_first_name', v_owner_first_name");
    expect(sql).toContain("REVOKE EXECUTE ON FUNCTION public.peek_mission_action_token(text) FROM PUBLIC, anon, authenticated;");
    expect(read("drizzle/migrations/meta/_journal.json")).toContain("0102_e18_prenom_jeton_je_peux");
  });

  it("« Un trajet » remplace « Nourrir le chat » ; les entrées vers /questions sont retirées", () => {
    expect(ENTRAIDE_IDEAS.map((i) => i.label)).toContain("Un trajet");
    expect(ENTRAIDE_IDEAS.map((i) => i.label)).not.toContain("Nourrir le chat");
    expect(read("src/App.tsx")).toContain('<Route path="/questions" element={<Navigate to="/petites-missions" replace />} />');
    expect(read("src/pages/CreateSmallMission.tsx")).not.toContain("/questions/nouvelle");
    expect(read("src/pages/QuestionDetail.tsx")).not.toContain("tab=questions");
  });
});

/** Textes visibles d'un fichier : nœuds JSX et chaînes qui contiennent une espace. */
function visibleTexts(src: string): string[] {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  const out: string[] = [];
  for (const m of code.matchAll(/>([^<>{}]*[A-Za-zÀ-ÿ][^<>{}]*)</g)) out.push(m[1]);
  for (const m of code.matchAll(/"([^"\n]*\s[^"\n]*)"|'([^'\n]*\s[^'\n]*)'|`([^`\n]*\s[^`\n]*)`/g)) {
    const s = m[1] ?? m[2] ?? m[3] ?? "";
    if (/(^|\s)(text|bg|border|rounded|flex|grid|px|py|mt|mb|gap|font|h|w|min|max|inline|items|justify|shadow|lg:|md:|sm:)[-:\w[\]/.%]*/.test(s) && !/[A-ZÀ-Ý]/.test(s.slice(0, 1))) continue;
    out.push(s);
  }
  return out;
}

describe("lexique unique : textes visibles d'entraide", () => {
  const FORBIDDEN = /\b(missions?|annonces?|candidatures?|preneurs?|rencontrés)\b/i;
  /** Fragments de code (variables, routes, événements) pris par l'extraction. */
  const CODE = /notify-mission|small_mission|mission_|\/petites-missions|missionId|displayName|purpose=|mission\.|\(mission|mission\?|mission\)|=== "|var\(--/;
  const files = [
    "src/pages/SmallMissionDetail.tsx",
    "src/components/entraide/CanHelpDialog.tsx",
    "src/components/missions/RelatedMissionCard.tsx",
    "src/pages/CreateSmallMission.tsx",
    "src/components/missions/MissionPublishedBanner.tsx",
    "src/pages/MissionQuickCanHelp.tsx",
    "src/components/entraide/EntraideIdeas.tsx",
    "supabase/functions/_shared/transactional-email-templates/mission-help-needed.tsx",
    "supabase/functions/_shared/transactional-email-templates/mission-nudge-no-response.tsx",
  ];

  it("aucun « mission », « annonce », « candidature », « preneur », « rencontrés »", () => {
    for (const f of files) {
      const hits = visibleTexts(read(f)).filter((t) => FORBIDDEN.test(t) && !CODE.test(t));
      expect(hits, f).toEqual([]);
    }
    const pub = read("src/components/missions/PublicMissionView.tsx");
    const besoin = pub.slice(pub.lastIndexOf("  return (\n    <>"));
    expect(visibleTexts(besoin).filter((t) => FORBIDDEN.test(t) && !CODE.test(t))).toEqual([]);
  });

  it("clés de traduction de la fiche et du formulaire", () => {
    const json = JSON.parse(read("src/i18n/locales/fr/common.json"));
    for (const section of ["mission_detail", "create_mission_page", "mission_card", "mission_filter_pills"]) {
      for (const [k, v] of Object.entries(json[section] as Record<string, unknown>)) {
        if (typeof v === "string") expect(v, `${section}.${k}`).not.toMatch(FORBIDDEN);
      }
    }
  });

  it("aucun tiret cadratin ni demi-cadratin dans les fichiers du lot", () => {
    for (const f of [...files, "src/lib/entraideCopy.ts", "src/lib/entraideExchange.ts", "src/lib/canHelpDays.ts",
      "supabase/functions/_shared/entraideCopy.ts", "supabase/functions/_shared/needExcerpt.ts", "drizzle/migrations/0102_e18_prenom_jeton_je_peux.sql"]) {
      expect(read(f), f).not.toMatch(/[–—]/);
    }
  });
});
