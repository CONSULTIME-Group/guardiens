/**
 * G1, Faisons connaissance (lot 2), variante gardien et entraide.
 * Prénom, commune, photo facultative. Aucune question de logement.
 */
import { useEffect, useRef, useState } from "react";
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
import { avatarImageUrl } from "@/lib/storageImage";
import { afterG1, canSkipG1, readCarry } from "@/lib/arrival";
import { ArrivalShell, Eyebrow, Gouache, SaveError, trackArrival, uploadAvatar, useArrivalT, useArrivalViewed } from "@/components/arrival/ArrivalUI";
const maisonSeule = new URL("../../assets/landing/maison-seule-450.webp", import.meta.url).href;

/** Écritures de G1, pures et testables. */
export function buildG1Writes(i: { firstName: string; postalCode: string; city: string; country: string }) {
  const country = i.country || "FR";
  const profile: Record<string, unknown> = {
    first_name: i.firstName.trim(),
    postal_code: i.postalCode.trim(),
    city: i.city.trim(),
    country,
    onboarding_minimal_completed: true,
  };
  if (country === "FR") profile.departement_code = departmentCodeFromPostal(i.postalCode);
  return profile;
}

const ArriveeVousGardien = () => {
  const t = useArrivalT();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const carry = readCarry(params);
  const entraide = carry.flow === "entraide";
  const nextUrl = afterG1(carry);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("FR");
  const [avatar, setAvatar] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: p }, { data: auth }] = await Promise.all([fetchMyProfile(user.id, { fresh: true }), supabase.auth.getUser()]);
      if (cancelled) return;
      const prof = (p ?? {}) as { first_name?: string; postal_code?: string; city?: string; country?: string | null; avatar_url?: string | null };
      if (canSkipG1({ firstName: prof.first_name, city: prof.city })) { navigate(nextUrl, { replace: true }); return; }
      const meta = (auth?.user?.user_metadata ?? {}) as Record<string, string | undefined>;
      const metaName = meta.given_name || meta.first_name || (meta.full_name || meta.name || "").split(" ")[0] || "";
      setFirstName(prof.first_name || metaName);
      setPostalCode(prof.postal_code || "");
      setCity(prof.city || "");
      setCountry(prof.country || "FR");
      setAvatar(prof.avatar_url || "");
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  useArrivalViewed("G1", !loading);

  const valid = firstName.trim().length >= 2 && city.trim().length > 0 && !!country && isPostalCodeValidForCountry(postalCode, country);

  const onFile = async (f: File | undefined) => {
    if (!f || !user) return;
    setUploading(true);
    setFailed(false);
    try { setAvatar(await uploadAvatar(user.id, f)); } catch { setFailed(true); }
    setUploading(false);
  };

  const save = async () => {
    if (!user || !valid) return;
    setSaving(true);
    setFailed(false);
    const { error } = await supabase.from("profiles").update(buildG1Writes({ firstName, postalCode, city, country }) as any).eq("id", user.id);
    if (error) { setSaving(false); setFailed(true); return; }
    trackArrival("completed", "G1");
    void Promise.resolve(refreshProfile?.()).catch(() => {});
    navigate(nextUrl);
  };

  if (!user || loading) return null;
  const abroad = country !== "FR";

  return (
    <ArrivalShell header={t(entraide ? "arrival.g1.header_entraide" : "arrival.g1.header_sitter")} sitterStep={{ current: "you", entraide }}>
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
      <Gouache src={maisonSeule} size={170} />
      <div className="space-y-3">
        <Eyebrow>{t("arrival.p1.eyebrow")}</Eyebrow>
        <h1 className="text-3xl font-semibold">{t("arrival.p1.title")}</h1>
        <p className="text-foreground/80">{t("arrival.g1.text")}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="arrival-firstname">{t("arrival.p1.name_label")}</Label>
        <Input id="arrival-firstname" className="arrival-field" value={firstName} autoComplete="given-name" onChange={(e) => setFirstName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">{t("arrival.g1.where_label")}</p>
        <PostalCodeCityFields
          city={city}
          postalCode={postalCode}
          country={country}
          cityLabel={t("arrival.p1.city")}
          postalLabel={t("arrival.p1.postal")}
          inputClassName="arrival-field rounded-lg"
          abroadLabel={t("arrival.g1.abroad")}
          franceLabel={t("arrival.g1.in_france")}
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
      <div className="space-y-2">
        <p className="text-sm font-medium">{t("arrival.g1.photo_label")}</p>
        <p className="text-sm text-muted-foreground">{t("arrival.g1.photo_help")}</p>
        <div className="flex items-center gap-4">
          {avatar && <img src={avatarImageUrl(avatar, 64)} alt="" className="h-16 w-16 rounded-full object-cover" />}
          <button type="button" className="arrival-choice" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? t("arrival.g1.photo_sending") : avatar ? t("arrival.g1.photo_change") : t("arrival.g1.photo_add")}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" data-testid="g1-avatar" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      </div>
      <SaveError show={failed} />
      <button type="button" className="arrival-primary" onClick={save} disabled={!valid || saving || uploading}>{t("arrival.continue")}</button>
    </ArrivalShell>
  );
};

export default ArriveeVousGardien;
