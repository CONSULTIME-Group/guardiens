/**
 * Lot G-ENT2 (01/11/2026, maquette « Parcours gardien v2 ») : l'entraide au
 * premier pas du gardien.
 * - Besoins ouverts près de chez la personne (au plus trois), « Je peux »
 *   ouvre la fiche du besoin où la réponse se donne.
 * - Sans besoin proche : la proposition de la personne, écrite d'après ses
 *   savoir-faire (profiles.helps_with), publiée en un geste. Elle s'affiche
 *   dans « Autour de vous » (vue public_helpers) pour les gens du coin.
 * - Carte miroir : faire garder sa maison, avec le même compte.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { hasMoneyMention } from "@/lib/missionContentGuards";
import { helpOfferPhrase } from "@/lib/arrival";
import { invalidateMyProfile } from "@/lib/myProfile";
import { missionSpotKey } from "@/lib/missionSpot";
import { MISSION_SPOT_SMALL } from "@/components/entraide/missionSpotImages";
import type { FirstStepData } from "@/lib/arrivalFirstStep";
import { SaveError, useArrivalT } from "@/components/arrival/ArrivalUI";
import { Textarea } from "@/components/ui/textarea";
const universGardes = new URL("../../assets/aquarelles/univers-gardes-320.webp", import.meta.url).href;

const HELPS_WITH_MAX = 200;

export function G5Needs({ data, className = "" }: { data: FirstStepData; className?: string }) {
  const t = useArrivalT();
  const needs = data.needs ?? [];
  if (!needs.length) return <G5Offer data={data} className={className} />;
  return (
    <section aria-labelledby="g5-needs" className={className} data-testid="g5-needs">
      <h2 id="g5-needs" className="text-xl font-semibold leading-snug lg:text-2xl">{t("arrival.g5e.needs_title")}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground lg:text-[15px]">{t("arrival.g5e.needs_text")}</p>
      <ul className="mt-1.5">
        {needs.map((n) => (
          <li key={n.id} className="flex items-center gap-[14px] border-b border-border py-[14px] last:border-b-0">
            <img src={MISSION_SPOT_SMALL[missionSpotKey(n.category, n.title, n.description)]} alt="" aria-hidden="true"
              width={56} height={56} className="h-14 w-14 shrink-0 object-contain lg:h-[72px] lg:w-[72px]" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-snug lg:text-base">{n.title}</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground lg:text-sm">
                {n.distanceKm != null ? t("arrival.g5e.need_meta", { city: n.city, d: Math.max(n.distanceKm, 1) }) : n.city}
              </p>
            </div>
            <Link to={n.path} className="arrival-outline shrink-0"
              onClick={() => void trackEvent("arrival_g5_need_clicked", { source: "arrival", metadata: { mission_id: n.id } })}>
              {t("arrival.g5e.can")}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function G5Offer({ data, className = "" }: { data: FirstStepData; className?: string }) {
  const t = useArrivalT();
  const [phrase, setPhrase] = useState(data.helpsWith || helpOfferPhrase(data.competences ?? []));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [money, setMoney] = useState(false);
  const [published, setPublished] = useState(!!data.helpsWith && data.availableForHelp);
  const city = data.city;

  const publish = async () => {
    const text = phrase.trim().slice(0, HELPS_WITH_MAX);
    if (!text) return;
    if (hasMoneyMention(text)) { setMoney(true); return; }
    setSaving(true); setFailed(false); setMoney(false);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { setSaving(false); setFailed(true); return; }
    const { error } = await supabase.from("profiles").update({ helps_with: text, available_for_help: true } as any).eq("id", uid);
    setSaving(false);
    if (error) { setFailed(true); return; }
    invalidateMyProfile(uid);
    setPhrase(text);
    setEditing(false);
    setPublished(true);
    void trackEvent("arrival_g5_offer_published", { source: "arrival", metadata: { prefilled: !data.helpsWith } });
  };

  return (
    <section aria-labelledby="g5-offer" className={className} data-testid="g5-offer">
      <h2 id="g5-offer" className="text-xl font-semibold leading-snug lg:text-2xl">
        {published ? t("arrival.g5e.offer_live_title", { city }) : city ? t("arrival.g5e.offer_title", { city }) : t("arrival.g5e.offer_title_nocity")}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(published ? "arrival.g5e.offer_live_text" : "arrival.g5e.offer_text")}</p>
      <div className="arrival-card mt-[14px] p-4">
        <p className="text-xs font-semibold text-muted-foreground">{t(published ? "arrival.g5e.offer_yours" : "arrival.g5e.offer_label")}</p>
        {editing ? (
          <Textarea aria-label={t("arrival.g5e.offer_label")} className="arrival-field mt-2" rows={3} maxLength={HELPS_WITH_MAX}
            value={phrase} onChange={(e) => setPhrase(e.target.value)} />
        ) : (
          <p className="mt-1.5 text-base leading-relaxed">{phrase}</p>
        )}
        {!editing && (
          <button type="button" className="arrival-link mt-1 text-[13px]" onClick={() => setEditing(true)}>{t("arrival.g5e.offer_edit")}</button>
        )}
      </div>
      {money && <p role="alert" className="mt-2 text-sm text-destructive">{t("arrival.g4.money")}</p>}
      <SaveError show={failed} />
      {(!published || editing) ? (
        <button type="button" className="arrival-secondary mt-[14px] w-full" onClick={publish} disabled={saving || !phrase.trim()}>
          {t(published ? "arrival.g5e.offer_save" : "arrival.g5e.offer_publish")}
        </button>
      ) : (
        <p className="mt-[14px] text-sm"><Link to="/petites-missions" className="arrival-link">{t("arrival.g5e.offer_see")}</Link></p>
      )}
    </section>
  );
}

export function G5OwnerMirror({ role, className = "" }: { role: string | null; className?: string }) {
  const t = useArrivalT();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const target = "/sits/create?source=arrival_g5";

  const go = async () => {
    void trackEvent("arrival_g5_owner_mirror_clicked", { source: "arrival", metadata: { role } });
    if (role === "sitter") {
      setSaving(true); setFailed(false);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      const { error } = uid ? await supabase.rpc("change_user_role", { p_user_id: uid, p_new_role: "both" as any }) : { error: true };
      setSaving(false);
      if (error) { setFailed(true); return; }
    }
    navigate(target);
  };

  return (
    <div className={className}>
      <button type="button" onClick={go} disabled={saving} data-testid="g5-owner-mirror"
        className="arrival-card flex w-full items-center gap-[14px] p-[14px] text-left">
        <img src={universGardes} alt="" aria-hidden="true" width={80} height={64} className="h-16 w-20 shrink-0 object-contain" />
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold">{t("arrival.g5e.mirror_title")}</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{t("arrival.g5e.mirror_text")}</span>
        </span>
      </button>
      <SaveError show={failed} />
    </div>
  );
}
