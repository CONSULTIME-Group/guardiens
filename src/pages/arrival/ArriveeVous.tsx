/**
 * P1, Faisons connaissance (lot 1). Prénom, localisation, type de logement.
 * Le logement créé ne porte ni pièces, ni chambres, ni environnement.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Head from "@/components/seo/Head";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/myProfile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";
import { departmentCodeFromPostal } from "@/lib/postalDepartment";
import { isPostalCodeValidForCountry } from "@/lib/setupState";
import { canSkipP1, safeNext } from "@/lib/arrival";
import { ArrivalShell, Eyebrow, Gouache, SaveError, SingleChoice, trackArrival, useArrivalT, useArrivalViewed } from "@/components/arrival/ArrivalUI";
import ArriveeVousGardien from "./ArriveeVousGardien";
const maisonSeule = new URL("../../assets/landing/maison-seule-450.webp", import.meta.url).href;

const TYPES = ["house", "apartment", "farm", "chalet", "other"] as const;

export interface P1Input { userId: string; firstName: string; postalCode: string; city: string; country: string; type: string; hasProperty: boolean }

/** Écritures de P1, pures et testables. */
export function buildP1Writes(i: P1Input) {
  const country = i.country || "FR";
  const profile: Record<string, unknown> = {
    first_name: i.firstName.trim(),
    postal_code: i.postalCode.trim(),
    city: i.city.trim(),
    country,
    onboarding_minimal_completed: true,
  };
  if (country === "FR") profile.departement_code = departmentCodeFromPostal(i.postalCode);
  const property = i.hasProperty ? null : {
    user_id: i.userId, type: i.type, environment: null, rooms_count: null, bedrooms_count: null,
  };
  return { profile, property };
}

export function p1Valid(o: { firstName: string; postalCode: string; city: string; country: string; type: string }) {
  return o.firstName.trim().length >= 2 && o.city.trim().length > 0 && !!o.type && !!o.country
    && isPostalCodeValidForCountry(o.postalCode, o.country);
}

const ArriveeVousProprietaire = () => {
  const t = useArrivalT();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"), "/sits/create?source=signup");
  const departUrl = `/arrivee/depart?next=${encodeURIComponent(next)}`;
  const [loading, setLoading] = useState(true);
  const [hasProperty, setHasProperty] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("FR");
  const [type, setType] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: p }, { count }, { data: auth }] = await Promise.all([
        fetchMyProfile(user.id, { fresh: true }),
        supabase.from("properties").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.auth.getUser(),
      ]);
      if (cancelled) return;
      const prof = (p ?? {}) as { first_name?: string; postal_code?: string; city?: string; country?: string | null };
      const meta = (auth?.user?.user_metadata ?? {}) as Record<string, string | undefined>;
      const metaName = meta.given_name || meta.first_name || (meta.full_name || meta.name || "").split(" ")[0] || "";
      const has = (count ?? 0) > 0;
      if (canSkipP1({ firstName: prof.first_name, city: prof.city, hasProperty: has })) {
        navigate(departUrl, { replace: true });
        return;
      }
      setFirstName(prof.first_name || metaName);
      setPostalCode(prof.postal_code || "");
      setCity(prof.city || "");
      setCountry(prof.country || "FR");
      setHasProperty(has);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  useArrivalViewed("P1", !loading);

  const valid = p1Valid({ firstName, postalCode, city, country, type: hasProperty ? "x" : type });

  const save = async () => {
    if (!user || !valid) return;
    setSaving(true);
    setFailed(false);
    const w = buildP1Writes({ userId: user.id, firstName, postalCode, city, country, type, hasProperty });
    const { error } = await supabase.from("profiles").update(w.profile as any).eq("id", user.id);
    if (error) { setSaving(false); setFailed(true); return; }
    if (w.property) {
      const { error: pErr } = await supabase.from("properties").insert(w.property as any);
      if (pErr) { setSaving(false); setFailed(true); return; }
      setHasProperty(true);
    }
    trackArrival("completed", "P1");
    void Promise.resolve(refreshProfile?.()).catch(() => {});
    navigate(departUrl);
  };

  if (!user || loading) return null;
  const abroad = country !== "FR";

  return (
    <ArrivalShell header={t("arrival.p1.header")} stepBar="you">
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
      <Gouache src={maisonSeule} size={170} />
      <div className="space-y-3">
        <Eyebrow>{t("arrival.p1.eyebrow")}</Eyebrow>
        <h1 className="text-3xl font-semibold">{t("arrival.p1.title")}</h1>
        <p className="text-foreground/80">{t("arrival.p1.text")}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="arrival-firstname">{t("arrival.p1.name_label")}</Label>
        <Input id="arrival-firstname" className="arrival-field" value={firstName} autoComplete="given-name" onChange={(e) => setFirstName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">{t("arrival.p1.where_label")}</p>
        <PostalCodeCityFields
          city={city}
          postalCode={postalCode}
          country={country}
          cityLabel={t("arrival.p1.city")}
          postalLabel={t("arrival.p1.postal")}
          inputClassName="arrival-field rounded-lg"
          abroadLabel={t("arrival.p1.abroad")}
          franceLabel={t("arrival.p1.in_france")}
          onChange={(v) => {
            if (v.city !== undefined) setCity(v.city);
            if (v.postal_code !== undefined) setPostalCode(v.postal_code);
            if (v.country !== undefined) setCountry(v.country ?? "");
          }}
        />
        {abroad && (
          <div className="space-y-2">
            <Label htmlFor="arrival-postal-abroad">{t("arrival.p1.postal")}</Label>
            <Input id="arrival-postal-abroad" className="arrival-field" value={postalCode} maxLength={12} autoComplete="postal-code" onChange={(e) => setPostalCode(e.target.value)} />
          </div>
        )}
      </div>
      {!hasProperty && (
        <SingleChoice id="arrival-type" label={t("arrival.p1.type_label")} value={type} onChange={setType}
          options={TYPES.map((v) => ({ value: v, label: t(`arrival.p1.types.${v}`) }))} />
      )}
      <SaveError show={failed} />
      <button type="button" className="arrival-primary" onClick={save} disabled={!valid || saving}>{t("arrival.continue")}</button>
    </ArrivalShell>
  );
};

/** Lot 2 : ?flow=sitter|entraide affiche G1, sinon P1. */
const ArriveeVous = () => {
  const [params] = useSearchParams();
  const flow = params.get("flow");
  return flow === "sitter" || flow === "entraide" ? <ArriveeVousGardien /> : <ArriveeVousProprietaire />;
};

export default ArriveeVous;

// Lot 2 : écrans gardien, entraide et application servis par ce même module
// (aucun nom de fichier de plus dans la table de préchargement de l'entrée).
export { default as G2 } from "./ArriveeGarder";
export { default as G3 } from "./ArriveeVousConnaitre";
export { default as G4 } from "./ArriveeSavoirFaire";
export { default as N1 } from "./ArriveeApplication";
export { default as G5 } from "./ArriveePremierPas";
export { default as E1 } from "./ArriveeEntraide";
