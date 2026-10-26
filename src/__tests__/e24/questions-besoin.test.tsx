/**
 * Lot E24 « Une question en public, une proposition d'aide en privé ».
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn(async () => ({ data: [], error: null })), functions: { invoke: vi.fn() } },
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/reports/ReportButton", () => ({ default: (p: { targetType: string }) => <span data-report={p.targetType}>Signaler</span> }));

import MissionQuestions from "@/components/entraide/MissionQuestions";
import type { MissionQuestion } from "@/lib/missionQuestions";
import { questionWhen } from "@/lib/missionQuestions";
import {
  QUESTIONS_PER_DAY_MAX,
  QUESTIONS_PER_MISSION_MAX,
  checkAnswer,
  checkQuestion,
  missionAcceptsQuestions,
  missionHasQuestions,
  missionQuestionsPath,
  moderatePublicText,
  questionErrorMessage,
  questionFirstName,
} from "../../../supabase/functions/_shared/mission-question";
import { missionQuestionsUrl } from "../../../supabase/functions/_shared/mission-responders";

afterEach(cleanup);

const read = (p: string) => readFileSync(p, "utf8");
const NEG = /\b(ne|pas|jamais|aucun|aucune|rien)\b|n'|n’/i;
const DASH = /[–—]/;
const FORBIDDEN = /voisin|mission|annonce|candidature|preneur/i;
const ID = "a98e1787-737a-4d62-8880-d6c8b1c335b4";

const q = (over: Partial<MissionQuestion> = {}): MissionQuestion => ({
  id: "q1",
  body: "Les plantes vivent dedans ou sur un balcon ?",
  answer: null,
  answered_at: null,
  created_at: new Date().toISOString(),
  asker_first_name: "Karim",
  is_mine: false,
  is_public: true,
  ...over,
});

describe("règles pures", () => {
  it("longueurs", () => {
    expect(checkQuestion("  Oui  ")).toEqual({ ok: false, reason: "too_short" });
    expect(checkQuestion("x".repeat(281))).toEqual({ ok: false, reason: "too_long" });
    expect(checkQuestion("Les pots   font\n quelle taille ?")).toEqual({ ok: true, text: "Les pots font quelle taille ?" });
    expect(checkAnswer("")).toEqual({ ok: false, reason: "too_short" });
    expect(checkAnswer("x".repeat(501))).toEqual({ ok: false, reason: "too_long" });
  });
  it("plafonds", () => {
    expect(QUESTIONS_PER_MISSION_MAX).toBe(3);
    expect(QUESTIONS_PER_DAY_MAX).toBe(10);
  });
  it("un besoin ouvert, visible, hors projet accueille des questions", () => {
    expect(missionAcceptsQuestions({ status: "open", category: "jardin" })).toBe(true);
    expect(missionAcceptsQuestions({ status: "in_progress", category: "jardin" })).toBe(false);
    expect(missionAcceptsQuestions({ status: "open", category: "projet" })).toBe(false);
    expect(missionAcceptsQuestions({ status: "open", category: "jardin", hidden_at: "2026-10-01" })).toBe(false);
    expect(missionAcceptsQuestions({ status: "open", category: "jardin", moderation_hidden_at: "2026-10-01" })).toBe(false);
    expect(missionAcceptsQuestions(null)).toBe(false);
    expect(missionAcceptsQuestions({ status: "open", category: "jardin", mission_type: "offre" })).toBe(false);
    expect(missionHasQuestions({ category: "jardin", mission_type: "besoin" })).toBe(true);
    expect(missionHasQuestions({ category: "jardin", moderation_hidden_at: "2026-10-01" })).toBe(false);
  });
  it("adresses sans dièse : le lien de connexion ajoute ses jetons après « # »", () => {
    expect(missionQuestionsPath(ID)).toBe(`/petites-missions/${ID}?bloc=questions`);
    expect(missionQuestionsPath(ID)).not.toContain("#");
    const sender = read("supabase/functions/send-transactional-email/index.ts");
    expect(sender).toContain("MISSION_QUESTION_TEMPLATES.has(templateName) ? '?bloc=questions' : ''");
    const fn = read("supabase/functions/mission-question/index.ts");
    expect(fn).not.toContain("#questions");
  });
  it("prénom", () => {
    expect(questionFirstName("  rachel MARTIN")).toBe("Rachel");
    expect(questionFirstName(null)).toBe("");
  });
  it("lien du bloc Questions", () => {
    expect(missionQuestionsUrl(ID)).toBe(`https://guardiens.fr/petites-missions/${ID}?bloc=questions`);
    expect(missionQuestionsUrl(ID, "https://guardiens.fr/acces?t=abc")).toBe("https://guardiens.fr/acces?t=abc");
    expect(missionQuestionsUrl("x")).toBe("https://guardiens.fr/petites-missions");
  });
  it("messages d'erreur positifs, sans tiret", () => {
    for (const r of ["too_short", "too_long", "contact_details", "refused", "mission_closed", "own_mission", "limit_mission", "limit_day", "already_answered", "account_inactive", "unexpected"]) {
      const m = questionErrorMessage(r);
      expect(m.length).toBeGreaterThan(10);
      expect(m).not.toMatch(NEG);
      expect(m).not.toMatch(DASH);
    }
  });
  it("date relative", () => {
    const now = new Date("2026-10-26T12:00:00");
    expect(questionWhen("2026-10-26T08:00:00", now)).toBe("aujourd'hui");
    expect(questionWhen("2026-10-25T08:00:00", now)).toBe("hier");
    expect(questionWhen("2026-10-23T08:00:00", now)).toBe("il y a 3 jours");
  });
});

describe("modération avant enregistrement", () => {
  const opts = (fetchImpl: typeof fetch) => ({ supabaseUrl: "https://x.invalid", serviceKey: "k", fetchImpl });
  const reply = (body: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => body }) as unknown as Response);
  it("coordonnées refusées sans appel réseau", async () => {
    const f = reply({ status: "ok" });
    expect(await moderatePublicText("Appelez-moi au 06 12 34 56 78", opts(f))).toEqual({ verdict: "refused", rule: "contact_details" });
    expect(await moderatePublicText("Je suis au 12 rue des Lilas", opts(f))).toEqual({ verdict: "refused", rule: "contact_details" });
    expect(f).not.toHaveBeenCalled();
  });
  it("ok publie, warning et panne gardent privé, block refuse", async () => {
    expect((await moderatePublicText("Quelle taille font les pots ?", opts(reply({ status: "ok" })))).verdict).toBe("ok");
    expect((await moderatePublicText("Quelle taille font les pots ?", opts(reply({ status: "warning" })))).verdict).toBe("private");
    expect((await moderatePublicText("Quelle taille font les pots ?", opts(reply({}, false))))).toEqual({ verdict: "private", rule: null });
    const boom = vi.fn(async () => { throw new Error("réseau"); }) as unknown as typeof fetch;
    expect((await moderatePublicText("Quelle taille font les pots ?", opts(boom))).verdict).toBe("private");
    expect((await moderatePublicText("Quelle taille font les pots ?", opts(reply({ status: "block", rule: "x" })))).verdict).toBe("refused");
  });
});

describe("bloc Questions", () => {
  const renderBlock = (props: Partial<Parameters<typeof MissionQuestions>[0]>) =>
    render(
      <MemoryRouter>
        <MissionQuestions
          missionId={ID}
          authorFirstName="Martine"
          needTitle="Rempoter deux monsteras"
          userId={null}
          isAuthor={false}
          isOpen
          loginRedirect={`/petites-missions/${ID}`}
          initialQuestions={[]}
          {...props}
        />
      </MemoryRouter>,
    );

  it("visiteur, aucune question : rien", () => {
    const { container } = renderBlock({});
    expect(container.querySelector("[data-mission-questions]")).toBeNull();
  });
  it("visiteur, une question : la liste, la réponse et la connexion", () => {
    renderBlock({ initialQuestions: [q({ answer: "Dedans, au salon.", answered_at: new Date().toISOString() })] });
    expect(screen.getByRole("heading", { name: "Questions (1)" })).toBeTruthy();
    expect(screen.getByText("Réponse de Martine")).toBeTruthy();
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe(`/login?redirect=${encodeURIComponent(`/petites-missions/${ID}?bloc=questions`)}`);
  });
  it("membre, aucune question : l'invitation et « Poser une question »", () => {
    renderBlock({ userId: "u1" });
    expect(screen.getByRole("button", { name: "Poser une question" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Poser une question" }));
    expect(screen.getByText("Visible par tous sur la fiche")).toBeTruthy();
    expect(screen.getByText("Votre prénom et votre question s'affichent pour tous, sur la fiche et dans les moteurs de recherche.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publier ma question" })).toHaveProperty("disabled", true);
  });
  it("auteur : « Publier ma réponse » sous une question sans réponse, aucune invitation à poser", () => {
    renderBlock({ userId: "owner", isAuthor: true, initialQuestions: [q()] });
    expect(screen.getByLabelText("Votre réponse")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publier ma réponse" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Poser une question" })).toBeNull();
  });
  it("question gardée privée : la mention le dit", () => {
    renderBlock({ userId: "u1", initialQuestions: [q({ is_public: false, is_mine: true })] });
    expect(screen.getByText("Lisible par vous et Martine.")).toBeTruthy();
    expect(screen.getByText("Vous")).toBeTruthy();
  });
  it("besoin clos : lecture seule, sans promesse de réponse", () => {
    renderBlock({ userId: "u1", isOpen: false, initialQuestions: [q()] });
    expect(screen.queryByRole("button", { name: "Poser une question" })).toBeNull();
    expect(screen.queryByText("Martine répondra ici.")).toBeNull();
  });
  it("signaler une question d'un autre membre", () => {
    const { container } = renderBlock({ userId: "u1", initialQuestions: [q(), q({ id: "q2", is_mine: true })] });
    expect(container.querySelectorAll('[data-report="mission_question"]').length).toBe(1);
  });
  it("réponse gardée privée : la mention le dit, et « visibles par tous » s'efface quand un texte est privé", () => {
    renderBlock({ userId: "u1", initialQuestions: [q({ is_mine: true, is_public: false, answer: "Oui.", answered_at: new Date().toISOString(), answer_is_public: false })] });
    expect(screen.getByText("Réponse lisible par vous et Martine.")).toBeTruthy();
    expect(screen.queryByText("visibles par tous")).toBeNull();
  });
  it("signale son chargement au pré-rendu", () => {
    const onLoaded = vi.fn();
    renderBlock({ onLoaded });
    expect(onLoaded).toHaveBeenCalledTimes(1);
  });
  it("textes visibles positifs, sans tiret ni mot interdit", () => {
    const { container } = renderBlock({ userId: "u1", initialQuestions: [q(), q({ id: "q2", answer: "Oui.", answered_at: new Date().toISOString() })] });
    const t = (container.textContent ?? "").replace(q().body, "");
    expect(t).not.toMatch(NEG);
    expect(t).not.toMatch(DASH);
    expect(t).not.toMatch(FORBIDDEN);
  });
});

describe("base, envoi et emails", () => {
  const sql = read("drizzle/migrations/0108_e24_questions_besoin.sql");
  it("écriture fermée aux membres, lecture par la fonction", () => {
    expect(sql).toContain("ALTER TABLE public.mission_questions ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("REVOKE ALL ON public.mission_questions FROM anon, authenticated;");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.get_mission_questions(uuid) TO anon, authenticated, service_role;");
    expect(sql).toContain("AND (q.moderation = 'ok' OR auth.uid() IN (q.asker_id, m.user_id))");
    // category est une énumération en production : comparaison sur le texte.
    expect(sql).toContain("coalesce(m.category::text, '') <> 'projet'");
  });
  it("plafonds sous verrou, pré-rendu remis en file, offre et compte inactif écartés", () => {
    expect(sql).toContain("pg_advisory_xact_lock(hashtext('mission_question:' || p_asker_id::text))");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.insert_mission_question(uuid, uuid, text, text, integer, integer) TO service_role;");
    expect(sql).toContain("PERFORM public.enqueue_seo_url('/petites-missions/' || v_slug);");
    expect(sql).toContain("coalesce(m.mission_type::text, '') <> 'offre'");
    expect(sql).toContain("p.account_status = 'active'");
  });
  it("une question se signale et se masque depuis l'admin", () => {
    expect(read("supabase/functions/admin-moderate-report/moderation.ts")).toContain("service.from('mission_questions').update({ hidden_at: now })");
    expect(read("src/pages/admin/AdminReports.tsx")).toContain('mission_question: "Question d\'entraide"');
  });
  it("migration inscrite au journal", () => {
    expect(read("drizzle/migrations/meta/_journal.json")).toContain('"tag": "0108_e24_questions_besoin"');
  });
  it("gabarits enregistrés, transactionnels, en lien profond vers le bloc Questions", () => {
    const registry = read("supabase/functions/_shared/transactional-email-templates/registry.ts");
    const categories = read("supabase/functions/_shared/email-categories.ts");
    const sender = read("supabase/functions/send-transactional-email/index.ts");
    for (const n of ["mission-question-received", "mission-question-answered"]) {
      expect(registry).toContain(`'${n}':`);
      expect(categories).toContain(`'${n}'`);
      const deep = sender.slice(sender.indexOf("const DEEP_LINK_TEMPLATES"), sender.indexOf("const MISSION_DEEP_LINK_TEMPLATES"));
      expect(deep).toContain(`'${n}'`);
    }
    expect(sender).toContain("MISSION_QUESTION_TEMPLATES.has(templateName) ? '?bloc=questions' : ''");
  });
  it("la fonction serveur garde les règles", () => {
    const fn = read("supabase/functions/mission-question/index.ts");
    expect(fn).toContain('if (mission.user_id === userId) return refuse("own_mission");');
    expect(fn).toContain("mission.user_id !== userId");
    expect(fn).toContain('.is("answer", null)');
    expect(fn).toContain("moderatePublicText(check.text");
    expect(fn).toContain('admin.rpc("insert_mission_question"');
    expect(fn).toContain('from("blocked_users")');
    expect(fn).toContain("if (!missionHasQuestions(mission)) return refuse(\"mission_closed\");");
    expect(fn).toContain('if (!token || token === SERVICE_KEY) return json({ ok: false, reason: "unauthorized" }, 401);');
  });
});
