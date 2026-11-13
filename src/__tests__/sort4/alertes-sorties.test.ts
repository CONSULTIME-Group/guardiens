// Lot SORT4 (13/11/2026) : alerte « nouvelle sortie », réglage et arrêt ciblé.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { EMAIL_CATEGORY_MAP } from "../../../supabase/functions/_shared/email-categories";
import { OUTING_ALERT_COPY, OUTING_ALERT_RADII } from "@/lib/outings";

const read = (p: string) => readFileSync(p, "utf8");
const sql = read("drizzle/migrations/0148_sort4_alertes_sorties.sql");
const sender = read("supabase/functions/send-transactional-email/index.ts");
const unsub = read("supabase/functions/handle-email-unsubscribe/index.ts");
const template = read("supabase/functions/_shared/transactional-email-templates/outing-alert.tsx");

describe("règles de l'alerte (décisions des 11 et 12/11)", () => {
  it("trois distances, 15 km par défaut, alerte active sans réglage", () => {
    expect(OUTING_ALERT_RADII.map((r) => r.value)).toEqual(["quartier", "5", "15"]);
    expect(sql).toContain("radius text NOT NULL DEFAULT '15'");
    expect(sql).toContain("CHECK (radius IN ('quartier', '5', '15'))");
    expect(sql).toContain("AND COALESCE(pref.enabled, true)");
    expect(sql).toContain("WHEN '5' THEN 5 ELSE 15 END");
  });
  it("membres vus depuis 30 jours, une alerte par semaine, rien pour une sortie complète ou en ligne", () => {
    // Lot SORT8 (13/11/2026) : la condition de dernière visite est retirée par 0153.
    const sort8 = readFileSync("drizzle/migrations/0153_sort8_alerte_tous_les_membres.sql", "utf8");
    expect(sort8.split("$fn$")[1]).not.toMatch(/last_seen_at/);
    expect(sort8).toContain("AND NOT EXISTS (SELECT 1 FROM public.outing_alert_log l");
    expect(sort8).toContain("LIMIT 300;");
    expect(sql).toContain("WHERE l.user_id = p.id AND l.created_at > p_now - interval '7 days'");
    expect(sql).toContain("IF v_left <= 0 THEN RETURN 0; END IF;");
    expect(sql).toContain("AND o.place_kind <> 'online'");
  });
  it("drapeau créé éteint, une publication passe même si l'alerte échoue", () => {
    expect(sql).toContain("VALUES ('sorties_alertes', false,");
    expect(sql).toMatch(/PERFORM public\.outing_alert_enqueue\(NEW\.id\);\s+EXCEPTION WHEN OTHERS THEN\s+NULL;/);
    expect(sql).not.toMatch(/small_missions/);
  });
});

describe("arrêt des seules alertes sorties", () => {
  it("gabarit classé alerte, avec son lien d'arrêt propre", () => {
    expect(EMAIL_CATEGORY_MAP["outing-alert"]).toBe("alert");
    expect(read("supabase/functions/_shared/transactional-email-templates/registry.ts")).toContain("'outing-alert': outingAlert");
    expect(template).toContain("Arrêter les alertes sorties");
    expect(template).toContain("/sorties/alertes?token=");
    expect(sender).toContain("if (UNSUBSCRIBE_LINK_TEMPLATES.has(templateName) || templateName === OUTING_ALERT_TEMPLATE) {");
  });
  it("le bouton de désinscription de la messagerie coupe les sorties, pas le reste", () => {
    expect(sender).toContain("templateName === OUTING_ALERT_TEMPLATE ? '&scope=outing' : ''");
    expect(unsub).toContain("unsubscribeAll = scope !== 'outing'");
    expect(unsub).toContain("supabase.rpc('outing_alerts_set_by_token', { p_token: token, p_enabled: false })");
    expect(unsub.indexOf("scope === 'outing'")).toBeLessThan(unsub.indexOf(".from('email_unsubscribe_tokens')\n    .select('*')"));
  });
  it("l'alerte sortie reste hors du compteur partagé des récapitulatifs de gardes", () => {
    expect(sender).toContain("r.metadata?.category === 'alert' && !isNearby(r) && r.template_name !== OUTING_ALERT_TEMPLATE");
  });
  it("le jeton ne touche que le réglage des sorties", () => {
    const fn = sql.slice(sql.indexOf("FUNCTION public.outing_alerts_set_by_token"), sql.indexOf("REVOKE ALL ON FUNCTION public.outing_alert_recipients"));
    expect(fn).toContain("INSERT INTO public.outing_alert_preferences");
    expect(fn).not.toMatch(/email_preferences|suppress/);
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.outing_alerts_set_by_token(text, boolean) TO anon, authenticated, service_role;");
  });
  it("la page d'arrêt attend un geste : ouvrir le lien laisse le réglage tel quel", () => {
    const page = read("src/pages/SortiesAlertes.tsx");
    expect(page).not.toContain("useEffect");
    expect(page).toContain('onClick={stop}');
    expect(page).toContain('onClick={resume}');
    const app = read("src/App.tsx");
    expect(app.indexOf('path="/sorties/alertes"')).toBeLessThan(app.indexOf('path="/sorties/:slug"'));
  });
});

describe("Paramètres", () => {
  it("le bloc Sorties vit dans la section Alertes, quand la rubrique est ouverte", () => {
    const section = read("src/components/settings/AlertsSection.tsx");
    expect(section).toContain("{outingsOpen && <OutingAlertsCard postalCode={myPostalCode} />}");
    const card = read("src/components/settings/OutingAlertsCard.tsx");
    expect(card).toContain('aria-label={OUTING_ALERT_COPY.switchLabel}');
    expect(card).toContain('role="radiogroup"');
    expect(card).toContain("setPref(previous)");
  });
  it("textes affirmatifs, ponctuation du projet", () => {
    const texts = Object.values(OUTING_ALERT_COPY).map((v) => (typeof v === "function" ? v("69005") : v));
    for (const t of [...texts, ...OUTING_ALERT_RADII.map((r) => r.label)]) {
      expect(t, t).not.toMatch(/[—–]/);
      expect(t, t).not.toMatch(/\b(ne|pas|jamais|aucun|aucune|rien)\b|n['’]/i);
      expect(t, t).not.toMatch(/voisin/i);
    }
    const visible = template.slice(template.indexOf("const Email"), template.indexOf("export const template"));
    expect(visible).not.toMatch(/[—–]/);
    expect(visible).not.toMatch(/\b(ne|pas|jamais|aucun|aucune|rien)\b/i);
  });
});
