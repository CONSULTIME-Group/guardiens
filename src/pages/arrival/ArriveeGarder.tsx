/**
 * G2, Vos affinités pour garder (lot 2). Pré-rempli depuis la base, écrit par
 * buildAffinityWrites : seules les colonnes renseignées partent.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Head from "@/components/seo/Head";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchMySitterProfile } from "@/lib/myProfile";
import { buildAffinityWrites } from "@/lib/affinityOnboardingWrites";
import {
  ARRIVAL_ANIMALS, ARRIVAL_SITTER_TYPE_OPTIONS, ARRIVAL_WORK_OPTIONS, arrivalUrl, readCarry, toggleAnimals,
} from "@/lib/arrival";
import { ArrivalShell, Eyebrow, MultiChoice, SaveError, SingleChoice, trackArrival, useArrivalT, useArrivalViewed } from "@/components/arrival/ArrivalUI";

export interface G2Input { userId: string; role: string | null; animals: string[]; work: string; sitterType: string; vehicle: boolean | null }

/** Écritures de G2 (sitter_profiles seulement). */
export function buildG2Writes(i: G2Input) {
  const role = (i.role as "owner" | "sitter" | "both" | null) ?? null;
  return buildAffinityWrites({
    userId: i.userId, currentRole: role, chosenRole: role ?? "sitter",
    needsPostal: false, postalCode: "", departementCode: null,
    showSitterBlock: true, showOwnerBlock: false,
    animalTypes: i.animals, workDuringSit: i.work, sitterType: i.sitterType, hasVehicle: i.vehicle,
    presenceExpected: "", preferredSitterTypes: [], homeAmbiance: [], lifePace: "", interests: [], languages: [],
  }).sitter;
}

const ArriveeGarder = () => {
  const t = useArrivalT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const carry = readCarry(params);
  const [loading, setLoading] = useState(true);
  const [animals, setAnimals] = useState<string[]>([]);
  const [work, setWork] = useState("");
  const [sitterType, setSitterType] = useState("");
  const [vehicle, setVehicle] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchMySitterProfile(user.id, { fresh: true }).then(({ data }) => {
      if (cancelled) return;
      const sp = (data ?? {}) as Record<string, any>;
      setAnimals(Array.isArray(sp.animal_types) ? sp.animal_types : []);
      setWork(sp.work_during_sit || "");
      setSitterType(sp.sitter_type || "");
      setVehicle(typeof sp.has_vehicle === "boolean" ? sp.has_vehicle : null);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);
  useArrivalViewed("G2", !loading);

  const valid = animals.length > 0 && !!work && !!sitterType;

  const save = async () => {
    if (!user || !valid) return;
    setSaving(true);
    setFailed(false);
    const row = buildG2Writes({ userId: user.id, role: user.role ?? null, animals, work, sitterType, vehicle });
    if (row) {
      const { error } = await supabase.from("sitter_profiles").upsert(row as any, { onConflict: "user_id" });
      if (error) { setSaving(false); setFailed(true); return; }
    }
    trackArrival("completed", "G2");
    navigate(arrivalUrl("/arrivee/vous-connaitre", carry));
  };

  if (!user || loading) return null;
  const name = user.firstName;

  return (
    <ArrivalShell header={t("arrival.g2.header")} sitterStep={{ current: "affinities" }}>
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
      <div className="space-y-3">
        <Eyebrow>{t("arrival.g2.eyebrow")}</Eyebrow>
        <h1 className="text-3xl font-semibold">{name ? t("arrival.g2.title", { name }) : t("arrival.g2.title_noname")}</h1>
        <p className="text-foreground/80">{t("arrival.g2.text")}</p>
      </div>
      <figure className="arrival-card p-4 space-y-3" aria-label={t("arrival.g2.example")} data-testid="g2-example">
        <figcaption className="arrival-eyebrow">{t("arrival.g2.example")}</figcaption>
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-2 border-[color:var(--arrival-green)] leading-none">
            <span className="text-lg font-semibold">{t("arrival.g2.example_score")}</span>
            <span className="text-[10px] text-muted-foreground">{t("arrival.g2.example_label")}</span>
          </span>
          <p className="font-semibold">{t("arrival.g2.example_title")}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-[color:var(--arrival-field)] px-3 py-1">{t("arrival.g2.example_chip1")}</span>
          <span className="rounded-full bg-[color:var(--arrival-field)] px-3 py-1">{t("arrival.g2.example_chip2")}</span>
        </div>
      </figure>
      <ol className="space-y-3 text-sm">
        {[t("arrival.g2.point1"), t("arrival.g2.point2"), t("arrival.g2.point3")].map((p, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card font-semibold">{i + 1}</span>
            <span>{p}</span>
          </li>
        ))}
      </ol>
      <MultiChoice label={t("arrival.g2.animals")} value={animals} onChange={(v) => setAnimals(toggleAnimals(animals, v))}
        options={ARRIVAL_ANIMALS.map((a) => ({ value: a, label: a }))} />
      <SingleChoice id="g2-work" label={t("arrival.g2.work")} value={work} onChange={setWork} options={ARRIVAL_WORK_OPTIONS} />
      <SingleChoice id="g2-type" label={t("arrival.g2.type")} value={sitterType} onChange={setSitterType} options={ARRIVAL_SITTER_TYPE_OPTIONS} />
      <div className="space-y-1">
        <SingleChoice id="g2-vehicle" label={t("arrival.g2.vehicle")} value={vehicle === null ? "" : vehicle ? "yes" : "no"}
          onChange={(v) => setVehicle(v === "yes")}
          options={[{ value: "yes", label: t("arrival.g2.yes") }, { value: "no", label: t("arrival.g2.no") }]} />
        <p className="text-sm text-muted-foreground">{t("arrival.g2.vehicle_help")}</p>
      </div>
      <SaveError show={failed} />
      <button type="button" className="arrival-primary" onClick={save} disabled={!valid || saving}>{t("arrival.continue")}</button>
      <p className="text-center"><button type="button" className="arrival-link text-sm" onClick={() => navigate(-1)}>{t("arrival.back")}</button></p>
    </ArrivalShell>
  );
};

export default ArriveeGarder;
