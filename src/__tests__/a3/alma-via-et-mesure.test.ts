/**
 * Lot A3 : publication venue d'Alma (via=alma), entonnoir admin sur les
 * membres connectés, consommation du tour dans classification.usage.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildVerifiedFacts } from "../../../supabase/functions/_shared/alma-facts";
import { emptyInventory } from "../../../supabase/functions/_shared/alma-inventory";
import {
  ALMA_VIA_FORMS,
  almaResponseAction,
  almaResponseChips,
  applyDraftToAction,
  computeNextAction,
  withAlmaVia,
  type NextActionInput,
} from "../../../supabase/functions/_shared/alma-next-action";
import { emptyAlmaUsage, readGatewayUsage, recordModelCall } from "../../../supabase/functions/_shared/alma-usage";
import { readFormPrefill, readPublishVia } from "@/lib/formPrefill";
import { ALMA_FUNNEL_RPC, buildAlmaFunnel } from "@/pages/admin/_components/alma/DiscoveryFunnelCard";

const read = (p: string) => readFileSync(p, "utf8");
const query = (path: string) => new URLSearchParams(path.split("?")[1] ?? "");

const base = (over: Partial<NextActionInput> = {}): NextActionInput => ({
  facts: buildVerifiedFacts({ role: "owner", ownSits: [], received: [], sent: [], missions: [], today: "2026-10-14" }),
  inventory: emptyInventory({ postal_code: "69005" }),
  accountRole: "owner",
  activeRole: "owner",
  question: "je pars en vacances, qui garde mes chats ?",
  register: "dossier",
  completion: 80,
  ...over,
} as NextActionInput);

describe("A3, chemins d'Alma vers les formulaires de publication", () => {
  it("/sits/create porte via=alma et garde le titre proposé", () => {
    const next = computeNextAction(base());
    expect(next.action?.path.startsWith("/sits/create")).toBe(true);
    const out = almaResponseAction(next.action)!;
    expect(query(out.path).get("via")).toBe("alma");
    expect(query(out.path).get("titre")).toBe(query(next.action!.path).get("titre"));
    expect(out.reason).toBe(next.action!.reason);
  });

  it("/petites-missions/creer porte via=alma avec titre et description d'Alma", () => {
    const next = computeNextAction(base({
      accountRole: "both", activeRole: "sitter", question: "je cherche de l'aide pour mes chevaux", helpIntent: true,
    }));
    const drafted = applyDraftToAction("Voici.\nBROUILLON: Aide pour mes chevaux | Foin et pansage le matin.", next.action, next.chips);
    expect(drafted.action!.path.startsWith("/petites-missions/creer")).toBe(true);
    const out = almaResponseAction(drafted.action)!;
    const q = query(out.path);
    expect(q.get("via")).toBe("alma");
    expect(q.get("titre")).toBe("Aide pour mes chevaux");
    expect(q.get("description")).toBe("Foin et pansage le matin.");
    // Le formulaire relit toujours le préremplissage.
    expect(readFormPrefill(q, { titleMax: 100, descriptionMax: 1000 })).toMatchObject({
      title: "Aide pour mes chevaux",
      description: "Foin et pansage le matin.",
    });
    expect(readPublishVia(q)).toBe("alma");
  });

  it("formulaire sans paramètre, brouillon repris, pastilles : via=alma partout", () => {
    expect(withAlmaVia("/petites-missions/creer")).toBe("/petites-missions/creer?via=alma");
    expect(withAlmaVia("/sits/create?draftId=d1")).toBe("/sits/create?draftId=d1&via=alma");
    expect(withAlmaVia("/sits/create?draftId=d1#dates")).toBe("/sits/create?draftId=d1&via=alma#dates");
    expect(almaResponseChips([{ label: "a", path: "/sits/create?titre=x" }, { label: "b", prompt: "b ?" }])).toEqual([
      { label: "a", path: "/sits/create?titre=x&via=alma" },
      { label: "b", prompt: "b ?" },
    ]);
  });

  it("idempotent, autres chemins inchangés, valeur étrangère remplacée", () => {
    expect(withAlmaVia("/sits/create?via=alma")).toBe("/sits/create?via=alma");
    expect(withAlmaVia("/sits/create?via=mail&titre=x")).toBe("/sits/create?titre=x&via=alma");
    for (const p of ["/mon-secteur", "/sits/abc?postuler=1", "/projets/publier?titre=x", "/petites-missions"]) {
      expect(withAlmaVia(p)).toBe(p);
    }
    expect([...ALMA_VIA_FORMS]).toEqual(["/sits/create", "/petites-missions/creer"]);
    expect(almaResponseAction(null)).toBeNull();
  });

  it("le moteur et le préremplissage restent sans via (marquage à la réponse seulement)", () => {
    const next = computeNextAction(base());
    expect(next.action!.path).not.toContain("via=");
    const src = read("supabase/functions/alma-chat/index.ts");
    expect(src).toContain("...(locked?.action ? { action: almaResponseAction(locked.action) } : {})");
    expect(src).toContain("...(lockedChips.length ? { chips: almaResponseChips(lockedChips) } : {})");
    expect(src).toContain("...(action ? { action: almaResponseAction(action) } : {})");
  });

  it("readPublishVia : liste fermée", () => {
    expect(readPublishVia(new URLSearchParams("via=alma"))).toBe("alma");
    expect(readPublishVia(new URLSearchParams("via=autre"))).toBeNull();
    expect(readPublishVia(new URLSearchParams(""))).toBeNull();
  });

  it("les événements de publication reprennent via", () => {
    const sit = read("src/pages/CreateSit.tsx");
    const sitBlock = sit.slice(sit.indexOf('trackEvent("sit_publish_succeeded"'), sit.indexOf("} catch", sit.indexOf('trackEvent("sit_publish_succeeded"')));
    expect(sitBlock).toContain("via: publishViaRef.current ?? readPublishVia(searchParams)");
    expect(sit).toContain("const publishViaRef = useRef(readPublishVia(searchParams));");
    const mission = read("src/pages/CreateSmallMission.tsx");
    expect(mission).toMatch(/trackEvent\("mission_composer_submitted", \{ metadata: \{[^}]*via: publishVia \} \}\)/);
  });
});

describe("A3, entonnoir admin : membres connectés seulement", () => {
  const sql = read("supabase/prepared-migrations/20261014180100_a3_alma_mesure.sql");

  it("la fonction exclut user_id nul et les comptes administrateurs, partout", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.admin_a3_alma_funnel_counts(p_since timestamptz)");
    const body = sql.slice(sql.indexOf("RETURN QUERY"), sql.indexOf("END $function$"));
    expect(body.match(/e\.user_id IS NOT NULL/g)).toHaveLength(2);
    expect(body.match(/NOT public\.has_role\(e\.user_id, 'admin'::public\.app_role\)/g)).toHaveLength(2);
    expect(sql).toContain("public.has_role(auth.uid(), 'admin'::public.app_role)");
  });

  it("ouverture automatique (origin whisper) séparée de l'ouverture volontaire", () => {
    expect(sql).toContain("coalesce(e.metadata->>'origin', '') = 'whisper' THEN 'opened_automatic'");
    expect(sql).toContain("THEN 'opened_voluntary'");
  });

  it("droits : REVOKE nommé puis GRANT aux seuls authenticated et service_role", () => {
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.admin_a3_alma_funnel_counts(timestamptz) FROM PUBLIC, anon, authenticated;");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.admin_a3_alma_funnel_counts(timestamptz) TO authenticated, service_role;");
  });

  it("la carte lit la nouvelle fonction, plus admin_a10_event_counts", () => {
    const card = read("src/pages/admin/_components/alma/DiscoveryFunnelCard.tsx");
    expect(ALMA_FUNNEL_RPC).toBe("admin_a3_alma_funnel_counts");
    expect(card).not.toContain("admin_a10_event_counts");
  });

  it("chiffres du 14/10/2026 : base = ouvertures, chaque étape sous 100 %", () => {
    const f = buildAlmaFunnel([
      { step: "opened_automatic", n: 438, members: 222 },
      { step: "opened_voluntary", n: 65, members: 50 },
      { step: "alma_dock_expanded", n: 503, members: 244 },
      { step: "alma_composer_seen", n: 485, members: 241 },
      { step: "alma_prompt_suggestion_clicked", n: 6, members: 5 },
      { step: "alma_composer_focused", n: 105, members: 76 },
      { step: "alma_composer_typed", n: 27, members: 22 },
      { step: "alma_conversation_message_sent", n: 55, members: 32 },
    ]);
    expect(f.base).toBe(503);
    expect(f.lines.map((l) => l.key)).toEqual([
      "alma_dock_expanded", "opened_voluntary", "opened_automatic", "alma_composer_seen",
      "alma_prompt_suggestion_clicked", "alma_composer_focused", "alma_composer_typed",
      "alma_conversation_message_sent", "alma_action_clicked",
    ]);
    expect(f.lines.every((l) => l.share <= 100)).toBe(true);
    expect(f.lines.find((l) => l.key === "alma_conversation_message_sent")!.share).toBe(11);
    expect(f.lines.find((l) => l.key === "opened_voluntary")!.share).toBe(13);
    expect(f.lines[0].members).toBe(244);
  });

  it("sans données : aucun pourcentage", () => {
    expect(buildAlmaFunnel([]).lines.every((l) => l.share === 0 && l.n === 0)).toBe(true);
  });
});

describe("A3, consommation du tour (classification.usage)", () => {
  it("lit prompt_tokens et completion_tokens du gateway", () => {
    expect(readGatewayUsage({ usage: { prompt_tokens: 1200, completion_tokens: 180, total_tokens: 1380 } })).toEqual({ input: 1200, output: 180 });
    expect(readGatewayUsage({ choices: [] })).toEqual({ input: null, output: null });
    expect(readGatewayUsage(null)).toEqual({ input: null, output: null });
  });

  it("compte les appels, relance comprise, et additionne les jetons fournis", () => {
    const u = emptyAlmaUsage();
    recordModelCall(u, { ok: true, data: { usage: { prompt_tokens: 1000, completion_tokens: 100 } } });
    recordModelCall(u, { ok: true, data: { usage: { prompt_tokens: 1100, completion_tokens: 90 } } });
    expect(u).toEqual({ model_calls: 2, input_tokens: 2100, output_tokens: 190 });
    const failed = recordModelCall(emptyAlmaUsage(), { ok: false });
    expect(failed).toEqual({ model_calls: 1, input_tokens: null, output_tokens: null });
  });

  it("alma-chat journalise usage sur chaque chemin du tour", () => {
    const src = read("supabase/functions/alma-chat/index.ts");
    expect(src).toContain("const usage = emptyAlmaUsage();");
    expect(src).toContain("recordModelCall(usage, res);");
    expect(src).toContain("...(locked ? { fallback_template: true, unanswered: false } : {}), usage }");
    expect(src).toContain("(classification as any).usage = usage;");
    expect(src).toContain("usage: emptyAlmaUsage() }");
    expect(read("supabase/functions/_shared/ai-gateway.ts")).toContain("return { ok: true, data };");
  });
});
