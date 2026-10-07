/**
 * Lot L1 : encart « commune manquante » pour toute annonce publiée sans
 * commune (ni sur l'annonce, ni sur le profil). Champ commune en ligne qui
 * écrit sits.city et profiles.city. Générique, jamais codé pour une annonce.
 *
 * Mode liste (tableau de bord) : lit la copie partagée fetchMySitsFull,
 * aucune lecture supplémentaire. Mode fiche : reçoit l'annonce en props.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchMySitsFull } from "@/lib/dashboardShared";
import { patchMyProfileCache, useMyProfile } from "@/lib/myProfile";
import { normalizeCityName, normalizeCityTyping } from "@/lib/normalizeCity";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SitLike {
  id: string;
  status?: string | null;
  city?: string | null;
  title?: string | null;
  applications?: unknown[] | null;
}

export const missingCityTitle = (n: number): string =>
  n > 1
    ? `Ajoutez la commune de votre logement : ${n} gardiens ont déjà postulé`
    : n === 1
      ? "Ajoutez la commune de votre logement : 1 gardien a déjà postulé"
      : "Ajoutez la commune de votre logement";

export const sitNeedsCity = (sit: SitLike | null | undefined, ownerCity?: string | null): boolean =>
  !!sit && sit.status === "published" && !(sit.city || "").trim() && !(ownerCity || "").trim();

function Row({ sit, applicationsCount, userId, onSaved, showTitle }: {
  sit: SitLike; applicationsCount: number; userId: string; onSaved: (city: string) => void; showTitle: boolean;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const save = async () => {
    const city = normalizeCityName(value);
    if (city.length < 2) return;
    setSaving(true);
    const { error } = await supabase.from("sits").update({ city }).eq("id", sit.id).eq("user_id", userId);
    if (!error) {
      await supabase.from("profiles").update({ city }).eq("id", userId);
      patchMyProfileCache(userId, { city });
    }
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Commune non enregistrée", description: "Réessayez dans un instant." });
      return;
    }
    toast({ title: "Commune ajoutée", description: `Votre annonce indique désormais ${city}.` });
    onSaved(city);
  };

  return (
    <div className="rounded-xl border border-warning/40 bg-warning/10 p-4" data-testid="missing-sit-city">
      <p className="font-medium text-foreground">{missingCityTitle(applicationsCount)}</p>
      <p className="text-sm text-muted-foreground mt-1">
        {showTitle && sit.title ? `Annonce « ${sit.title} ». ` : ""}
        Les gardiens voient seulement votre code postal et cherchent où se trouve la garde.
      </p>
      <form
        className="mt-3 flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => { e.preventDefault(); void save(); }}
      >
        <label htmlFor={`sit-city-${sit.id}`} className="sr-only">Commune de votre logement</label>
        <Input
          id={`sit-city-${sit.id}`}
          value={value}
          onChange={(e) => setValue(normalizeCityTyping(e.target.value))}
          onBlur={(e) => setValue(normalizeCityName(e.target.value))}
          placeholder="Commune de votre logement"
          maxLength={100}
          autoComplete="address-level2"
          className="h-11 text-base sm:max-w-xs"
        />
        <Button type="submit" disabled={saving || normalizeCityName(value).length < 2}>
          {saving ? "Enregistrement..." : "Enregistrer la commune"}
        </Button>
      </form>
    </div>
  );
}

/** Mode fiche : une annonce donnée. */
export function MissingSitCityInline({ sit, ownerCity, applicationsCount, userId, onSaved }: {
  sit: SitLike; ownerCity?: string | null; applicationsCount: number; userId: string | null | undefined; onSaved?: (city: string) => void;
}) {
  const [savedCity, setSavedCity] = useState<string | null>(null);
  if (!userId || savedCity || !sitNeedsCity(sit, ownerCity)) return null;
  return (
    <Row sit={sit} applicationsCount={applicationsCount} userId={userId} showTitle={false}
      onSaved={(c) => { setSavedCity(c); onSaved?.(c); }} />
  );
}

/** Mode liste : toutes les annonces publiées sans commune du membre. */
export default function MissingSitCityBanner({ userId }: { userId: string | null | undefined }) {
  const qc = useQueryClient();
  // Copie partagée du profil (lot P1), aucune lecture supplémentaire.
  const { data: me, isSuccess: meLoaded } = useMyProfile(userId);
  const ownerCity = (me as any)?.city as string | null | undefined;
  const [done, setDone] = useState<Set<string>>(new Set());
  const { data } = useQuery({
    queryKey: ["missing-sit-city", userId],
    enabled: !!userId && meLoaded && !(ownerCity || "").trim(),
    queryFn: () => fetchMySitsFull(userId as string),
    staleTime: 60_000,
  });
  if (!userId) return null;
  const rows = (data ?? []).filter((s: SitLike) => sitNeedsCity(s, ownerCity) && !done.has(s.id));
  if (rows.length === 0) return null;
  return (
    <div className="space-y-3">
      {rows.map((s: SitLike) => (
        <Row key={s.id} sit={s} userId={userId} showTitle={rows.length > 1}
          applicationsCount={Array.isArray(s.applications) ? s.applications.length : 0}
          onSaved={() => {
            setDone((prev) => new Set(prev).add(s.id));
            void qc.invalidateQueries({ queryKey: ["my-sits-full", userId] });
          }} />
      ))}
    </div>
  );
}
