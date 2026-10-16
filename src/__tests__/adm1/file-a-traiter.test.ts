import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildActionQueue,
  entryPriority,
  entrySection,
  inferAiTopic,
  type SuggestedAction,
} from "@/components/admin/signals/actionQueue";
import type { AdminSignalBase } from "@/components/admin/signals/signalGrouping";
import { queueSummaryLine } from "@/pages/admin/_components/dashboard/SignalsSection";
import { sitGroupAction, startCountdown } from "@/components/admin/signals/SitSignalGroupCard";
import {
  isSitImminent,
  isSitStarted,
  queueSectionOf,
  SIT_TIMED_TYPES,
} from "../../../supabase/functions/_shared/admin-signal-config.ts";
import { cadreDe } from "../../../supabase/functions/_shared/legal-purpose.ts";

// Vendredi 16 octobre 2026, 12 h 30 à Paris.
const NOW = Date.parse("2026-10-16T10:30:00Z");

let seq = 0;
const sig = (over: Partial<AdminSignalBase> = {}): AdminSignalBase => ({
  id: `s${++seq}`,
  signal_type: "pending_application",
  severity: "critical",
  entity_type: "application",
  entity_id: `a${seq}`,
  detected_at: "2026-10-10T08:00:00Z",
  metadata: {},
  ...over,
});

const sits = new Map([
  ["milo", { start_date: "2026-10-09" }],
  ["cevennes", { start_date: "2026-10-16" }],
  ["saintcyr", { start_date: "2026-10-19" }],
  ["marseille", { start_date: "2026-10-31" }],
  ["tahiti", { start_date: "2026-12-04" }],
]);

describe("ADM1, dates de garde", () => {
  it("une garde commencée la veille est passée, le jour même reste actionnable", () => {
    expect(isSitStarted("2026-10-09", NOW)).toBe(true);
    expect(isSitStarted("2026-10-15", NOW)).toBe(true);
    expect(isSitStarted("2026-10-16", NOW)).toBe(false);
    expect(isSitStarted(null, NOW)).toBe(false);
  });

  it("une garde à 7 jours ou moins est imminente", () => {
    expect(isSitImminent("2026-10-16", NOW)).toBe(true);
    expect(isSitImminent("2026-10-23", NOW)).toBe(true);
    expect(isSitImminent("2026-10-24", NOW)).toBe(false);
    expect(isSitImminent("2026-10-09", NOW)).toBe(false);
  });

  it("le jour de Paris fait foi, pas le jour UTC", () => {
    // 23 h 30 UTC le 15/10 = 1 h 30 le 16/10 à Paris : une garde du 15 est commencée.
    expect(isSitStarted("2026-10-15", Date.parse("2026-10-15T23:30:00Z"))).toBe(true);
  });

  it("même liste de types que le CTE sit_started de la migration", () => {
    const sql = readFileSync("drizzle/migrations/0088_adm1_signaux_lisibles.sql", "utf8");
    const m = sql.match(/s\.signal_type IN \(([^)]*)\)\s*AND si\.start_date/);
    expect(m).not.toBeNull();
    const types = [...m![1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort();
    expect(types).toEqual([...SIT_TIMED_TYPES].sort());
  });
});

describe("ADM1, file À traiter", () => {
  it("écarte les gardes commencées, y compris la confirmation portée par l'annonce", () => {
    const queue = buildActionQueue(
      [
        sig({ metadata: { sit_id: "milo" } }),
        sig({ signal_type: "stalled_discussion", severity: "warning", metadata: { sit_id: "milo" } }),
        sig({ signal_type: "owner_sit_unconfirmed", entity_type: "sit", entity_id: "milo" }),
        sig({ metadata: { sit_id: "marseille" } }),
      ],
      [],
      { sits, now: NOW },
    );
    expect(queue.map((e) => (e.kind === "sit" ? e.sitId : e.kind))).toEqual(["marseille"]);
  });

  it("une garde imminente passe en priorité haute, même sur une discussion à l'arrêt", () => {
    const queue = buildActionQueue(
      [sig({ signal_type: "stalled_discussion", severity: "warning", metadata: { sit_id: "cevennes" } })],
      [],
      { sits, now: NOW },
    );
    expect(queue).toHaveLength(1);
    expect(entryPriority(queue[0])).toBe("haute");
  });

  it("à priorité égale, la garde qui commence le plus tôt passe d'abord", () => {
    const queue = buildActionQueue(
      [
        sig({ metadata: { sit_id: "tahiti" } }),
        sig({ metadata: { sit_id: "marseille" } }),
        sig({ signal_type: "stalled_discussion", severity: "warning", metadata: { sit_id: "saintcyr" } }),
      ],
      [],
      { sits, now: NOW },
    );
    expect(queue.map((e) => (e.kind === "sit" ? e.sitId : "x"))).toEqual(["saintcyr", "marseille", "tahiti"]);
  });

  it("range chaque entrée dans sa section", () => {
    const queue = buildActionQueue(
      [
        sig({ metadata: { sit_id: "marseille" } }),
        sig({ signal_type: "suspicious_account", severity: "warning", entity_type: "profile" }),
        sig({ signal_type: "prerender_monthly_budget_reached", entity_type: "system" }),
        sig({ signal_type: "alma_contact_request", entity_type: "profile" }),
        sig({ signal_type: "listing_proximity_large_broadcast", severity: "warning", entity_type: "sit" }),
      ],
      [],
      { sits, now: NOW },
    );
    const sections = Object.fromEntries(queue.map((e) => [
      e.kind === "sit" ? e.sitId : e.kind === "signal" ? e.signal.signal_type : e.kind,
      entrySection(e),
    ]));
    expect(sections).toEqual({
      marseille: "membres",
      suspicious_account: "moderation",
      prerender_monthly_budget_reached: "technique",
      alma_contact_request: "membres",
      listing_proximity_large_broadcast: "technique",
    });
    expect(queueSectionOf("type_inconnu")).toBe("technique");
  });

  it("la suggestion IA sur le rendu SEO ne double pas le signal de pré-rendu", () => {
    const ai: SuggestedAction = {
      title: "Ajuster le budget du service de rendu SEO",
      why: "Le plafond mensuel du cache a été atteint.",
      link: "/admin/seo",
      priority: "basse",
      topic: "autre",
    };
    expect(inferAiTopic(ai)).toBe("rendu_seo");
    const queue = buildActionQueue(
      [sig({ signal_type: "prerender_monthly_budget_reached", entity_type: "system" })],
      [ai],
      { sits, now: NOW },
    );
    expect(queue).toHaveLength(1);
    expect(queue[0].kind).toBe("signal");
    expect(entryPriority(queue[0])).toBe("haute");
  });
});

describe("ADM1, textes", () => {
  it("ligne de compte en actions par section", () => {
    expect(queueSummaryLine({ membres: 4, moderation: 1, technique: 2 }))
      .toBe("7 actions : 4 membres à contacter, 1 en modération, 2 techniques.");
    expect(queueSummaryLine({ membres: 1, moderation: 0, technique: 0 })).toBe("1 action : 1 membre à contacter.");
    expect(queueSummaryLine({ membres: 0, moderation: 0, technique: 0 })).toBeNull();
  });

  it("verbe d'action et échéance de l'annonce", () => {
    expect(sitGroupAction(["pending_application", "owner_sit_unconfirmed"]))
      .toBe("Aider le propriétaire à confirmer son gardien avant le départ.");
    expect(sitGroupAction(["pending_application"]))
      .toBe("Relancer le propriétaire pour qu'il réponde aux candidatures.");
    expect(startCountdown("2026-10-16", NOW)).toBe("La garde commence aujourd'hui.");
    expect(startCountdown("2026-10-17", NOW)).toBe("La garde commence demain.");
    expect(startCountdown("2026-10-19", NOW)).toBe("La garde commence dans 3 jours.");
    expect(startCountdown("2026-10-09", NOW)).toBeNull();
  });

  it("pied de page légal : article contracté", () => {
    expect(cadreDe("le suivi opérationnel de la plateforme")).toBe("du suivi opérationnel de la plateforme");
    expect(cadreDe("la gestion de votre annonce")).toBe("de la gestion de votre annonce");
    expect(cadreDe("l'accompagnement de votre garde")).toBe("de l'accompagnement de votre garde");
    expect(cadreDe("du suivi de votre compte Guardiens")).toBe("du suivi de votre compte Guardiens");
    expect(cadreDe("de l'envoi des messages signés Alma")).toBe("de l'envoi des messages signés Alma");
    expect(cadreDe("les échanges")).toBe("des échanges");
  });

  it("aucun tiret cadratin ni demi-cadratin dans les nouveaux textes", () => {
    const files = [
      "supabase/functions/_shared/admin-signal-config.ts",
      "src/components/admin/signals/SitSignalGroupCard.tsx",
      "src/pages/admin/_components/dashboard/SignalsSection.tsx",
    ];
    for (const f of files) expect(readFileSync(f, "utf8")).not.toMatch(/[—–]/);
  });
});

describe("ADM1, migration", () => {
  const sql = readFileSync("drizzle/migrations/0088_adm1_signaux_lisibles.sql", "utf8");
  it("le détecteur de tarif ignore les admins, messages et candidatures", () => {
    expect(sql.match(/has_role\(NEW\.sender_id, 'admin'::public\.app_role\)/g)).toHaveLength(1);
    expect(sql.match(/has_role\(NEW\.sitter_id, 'admin'::public\.app_role\)/g)).toHaveLength(1);
  });
  it("la clôture des gardes commencées suit le jour de Paris et garde les droits de service", () => {
    expect(sql).toContain("(now() AT TIME ZONE 'Europe/Paris')::date");
    expect(sql).toContain("UNION ALL SELECT * FROM sit_started) u");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.auto_resolve_admin_signals() FROM PUBLIC, anon, authenticated;");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.auto_resolve_admin_signals() TO service_role;");
  });
});
