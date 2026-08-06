/**
 * CompleteProfileToApplyModal
 * ----------------------------------------------------------------------------
 * Complétion de profil « en place » pour un gardien sous le seuil de 60 pour
 * cent, ouverte depuis la page d'une annonce. Objectif : ne jamais faire
 * quitter l'annonce, puis enchaîner directement sur la candidature.
 *
 * Principes :
 *   - On n'affiche QUE les critères manquants, jamais le profil complet.
 *   - Le barème est celui de `src/lib/profileCompletion.ts`, aligné sur le SQL.
 *   - Les champs manquants sont ordonnés par ratio points sur effort.
 *   - La sauvegarde emprunte le chemin canonique `useSitterProfile.saveStep`
 *     (écriture, RPC calculate_profile_completion, refreshProfile), sinon
 *     `useAccessLevel` resterait bloqué au niveau 1.
 *   - Le garde-fou des 60 pour cent n'est pas supprimé, il devient franchissable
 *     sur place.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";
import CompetenceAutocomplete from "@/components/profile/CompetenceAutocomplete";
import GenerateBioButton from "@/components/ai/GenerateBioButton";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSitterProfile } from "@/hooks/useSitterProfile";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { deriveCategoriesFromCompetences } from "@/lib/skills/categories";

/** Seuil de candidature, aligné sur useAccessLevel (source de vérité). */
const APPLY_THRESHOLD = 60;

export type FieldKey = "radius" | "location" | "competences" | "avatar" | "bio";

interface FieldMeta {
  key: FieldKey;
  /** Points du barème `computeSitterCompletion`. */
  points: number;
  title: string;
  /** Pourquoi cela sert, jamais culpabilisant. */
  why: string;
  /** Effort estimé, sert au tri points sur effort. */
  effort: number;
}

export const APPLY_GATE_FIELDS: FieldMeta[] = [
  {
    key: "radius",
    points: 15,
    title: "Votre rayon de déplacement",
    why: "Les propriétaires voient tout de suite si vous pouvez venir jusqu'à chez eux.",
    effort: 1,
  },
  {
    key: "location",
    points: 15,
    title: "Votre prénom et votre commune",
    why: "C'est ce qui vous place sur la carte, et ce qui déclenche les alertes de gardes proches.",
    effort: 2,
  },
  {
    key: "competences",
    points: 15,
    title: "Ce que vous savez faire",
    why: "Les propriétaires cherchent des gestes concrets : soins, jardin, présence rassurante.",
    effort: 2,
  },
  {
    key: "avatar",
    points: 15,
    title: "Votre photo de profil",
    why: "C'est la première chose regardée sur une candidature.",
    effort: 2,
  },
  {
    key: "bio",
    points: 10,
    title: "Quelques lignes sur vous",
    why: "Cinquante caractères suffisent pour donner envie de vous lire.",
    effort: 5,
  },
];

interface Snapshot {
  first_name: string;
  postal_code: string;
  city: string;
  country: string;
  avatar_url: string;
  bio: string;
  geographic_radius: number;
  competences: string[];
  completion: number;
}

interface FormState {
  first_name: string;
  postal_code: string;
  city: string;
  country: string;
  avatar_url: string;
  bio: string;
  geographic_radius: number;
  competences: string[];
}

export interface CompleteProfileToApplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé une fois le seuil franchi : le parent enchaîne sur ApplicationModal. */
  onReadyToApply: () => void;
  /** Contexte de mesure, par exemple l'identifiant de l'annonce. */
  sitId?: string;
  /** Origine du clic, pour distinguer la barre haute du sticky mobile. */
  source?: string;
}

/** Champs manquants, calculés sur l'instantané serveur puis sur l'état local. */
export function missingFor(state: {
  first_name: string;
  postal_code: string;
  city: string;
  country: string;
  avatar_url: string;
  bio: string;
  geographic_radius: number;
  competences: string[];
}): Record<FieldKey, boolean> {
  const isFR = (state.country || "FR") === "FR";
  return {
    location: !(state.first_name && (isFR ? !!state.postal_code : !!state.city)),
    avatar: !state.avatar_url,
    bio: (state.bio || "").trim().length < 50,
    competences: (state.competences || []).length === 0,
    radius: !(state.geographic_radius > 0),
  };
}

const CompleteProfileToApplyModal = ({
  open,
  onOpenChange,
  onReadyToApply,
  sitId,
  source = "sit_detail",
}: CompleteProfileToApplyModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { saveStep, uploadAvatar, saving } = useSitterProfile();

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [validatedLabels, setValidatedLabels] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const completedRef = useRef<Set<FieldKey>>(new Set());
  const thresholdSentRef = useRef(false);
  const succeededRef = useRef(false);

  /* ------------------------------------------------------------------ */
  /* Instantané serveur : détection fiable des critères manquants.       */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [profileRes, sitterRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("first_name, postal_code, city, country, avatar_url, bio, profile_completion")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("sitter_profiles")
          .select("geographic_radius, competences")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const p: any = profileRes.data || {};
      const s: any = sitterRes.data || {};
      const snap: Snapshot = {
        first_name: p.first_name || "",
        postal_code: p.postal_code || "",
        city: p.city || "",
        country: p.country || "FR",
        avatar_url: p.avatar_url || "",
        bio: p.bio || "",
        geographic_radius: s.geographic_radius || 0,
        competences: s.competences || [],
        completion: p.profile_completion || 0,
      };
      setSnapshot(snap);
      setForm({
        first_name: snap.first_name,
        postal_code: snap.postal_code,
        city: snap.city,
        country: snap.country,
        avatar_url: snap.avatar_url,
        bio: snap.bio,
        // Valeur de départ lisible pour le curseur, non enregistrée tant que
        // le gardien ne valide pas.
        geographic_radius: snap.geographic_radius || 15,
        competences: snap.competences,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    completedRef.current = new Set();
    thresholdSentRef.current = false;
    succeededRef.current = false;
    void trackEvent("apply_gate_inline_opened", {
      source,
      metadata: { sit_id: sitId },
    });
  }, [open, sitId, source]);

  useEffect(() => {
    if (!open || validatedLabels.length > 0) return;
    supabase
      .from("competences_validees")
      .select("label")
      .then(({ data }) => setValidatedLabels((data || []).map((d: any) => d.label)));
  }, [open, validatedLabels.length]);

  /* ------------------------------------------------------------------ */
  /* Score live : socle serveur plus les points regagnés en direct.      */
  /* ------------------------------------------------------------------ */
  const initialMissing = useMemo(
    () => (snapshot ? missingFor(snapshot) : null),
    [snapshot],
  );
  const liveMissing = useMemo(() => (form ? missingFor(form) : null), [form]);

  const visibleFields = useMemo(() => {
    if (!initialMissing) return [];
    return APPLY_GATE_FIELDS.filter((f) => initialMissing[f.key]).sort(
      (a, b) => b.points / b.effort - a.points / a.effort,
    );
  }, [initialMissing]);

  const liveScore = useMemo(() => {
    if (!snapshot || !initialMissing || !liveMissing) return 0;
    const gained = APPLY_GATE_FIELDS.filter(
      (f) => initialMissing[f.key] && !liveMissing[f.key],
    ).reduce((sum, f) => sum + f.points, 0);
    return Math.min(100, snapshot.completion + gained);
  }, [snapshot, initialMissing, liveMissing]);

  const reached = liveScore >= APPLY_THRESHOLD;
  const remaining = Math.max(0, APPLY_THRESHOLD - liveScore);

  // Mesure du remplissage champ par champ, une seule fois par champ.
  useEffect(() => {
    if (!initialMissing || !liveMissing) return;
    APPLY_GATE_FIELDS.forEach((f) => {
      if (
        initialMissing[f.key] &&
        !liveMissing[f.key] &&
        !completedRef.current.has(f.key)
      ) {
        completedRef.current.add(f.key);
        void trackEvent("apply_gate_field_completed", {
          source,
          metadata: { sit_id: sitId, field: f.key, points: f.points },
        });
      }
    });
  }, [initialMissing, liveMissing, sitId, source]);

  useEffect(() => {
    if (reached && !thresholdSentRef.current) {
      thresholdSentRef.current = true;
      void trackEvent("apply_gate_threshold_reached", {
        source,
        metadata: { sit_id: sitId, score: liveScore },
      });
    }
  }, [reached, liveScore, sitId, source]);

  const patch = useCallback((partial: Partial<FormState>) => {
    setForm((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(file);
      if (url) patch({ avatar_url: url });
    } finally {
      input.value = "";
      setUploading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Sauvegarde : chemin canonique, puis relecture du score serveur.     */
  /* ------------------------------------------------------------------ */
  const handleSave = async () => {
    if (!form || !initialMissing || !user) return;

    const payload: Record<string, unknown> = {};
    if (initialMissing.location) {
      payload.first_name = form.first_name.trim();
      payload.city = form.city;
      payload.postal_code = form.postal_code;
      payload.country = form.country;
    }
    if (initialMissing.bio) payload.bio = form.bio.trim();
    if (initialMissing.radius) payload.geographic_radius = form.geographic_radius;
    if (initialMissing.competences) {
      payload.competences = form.competences;
      payload.skill_categories = deriveCategoriesFromCompetences(form.competences);
      payload.available_for_help = true;
    }

    if (Object.keys(payload).length > 0) {
      const ok = await saveStep(payload as any);
      if (!ok) return;
    }

    const { data: row } = await supabase
      .from("profiles")
      .select("profile_completion")
      .eq("id", user.id)
      .maybeSingle();
    const serverScore = row?.profile_completion ?? 0;

    if (serverScore >= APPLY_THRESHOLD) {
      succeededRef.current = true;
      onOpenChange(false);
      onReadyToApply();
      return;
    }

    setSnapshot((prev) => (prev ? { ...prev, completion: serverScore } : prev));
    toast({
      title: "Presque",
      description: `Il vous manque encore ${APPLY_THRESHOLD - serverScore} points pour envoyer votre candidature.`,
    });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !succeededRef.current) {
      void trackEvent("apply_gate_abandoned", {
        source,
        metadata: {
          sit_id: sitId,
          score: liveScore,
          fields_completed: completedRef.current.size,
        },
      });
    }
    onOpenChange(next);
  };

  const bioLen = (form?.bio || "").trim().length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl p-0">
        <div className="px-6 pt-6 pb-4 border-b border-border bg-card sticky top-0 z-10 rounded-t-3xl">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="font-heading text-xl">
              Il ne manque presque rien pour postuler
            </DialogTitle>
            <DialogDescription className="text-sm">
              Les propriétaires choisissent sur ces éléments. Complétez-les ici, vous
              restez sur l'annonce.
            </DialogDescription>
          </DialogHeader>

          {/* Barre de progression, repère du seuil à 60 pour cent */}
          <div className="mt-4">
            <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary motion-safe:transition-all motion-safe:duration-500"
                style={{ width: `${liveScore}%` }}
              />
            </div>
            <div className="relative h-4">
              <span
                className="absolute top-0 -translate-x-1/2 block w-px h-2 bg-foreground/40"
                style={{ left: `${APPLY_THRESHOLD}%` }}
                aria-hidden="true"
              />
            </div>
            <p
              className="text-sm font-medium"
              aria-live="polite"
            >
              {reached ? (
                <span className="text-primary">Vous pouvez postuler.</span>
              ) : (
                <span className="text-muted-foreground">
                  Encore {remaining} points pour pouvoir postuler.
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-7">
          {loading || !form ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            </div>
          ) : visibleFields.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">
              Votre profil est déjà complet, vous pouvez envoyer votre candidature.
            </p>
          ) : (
            visibleFields.map((f) => (
              <section key={f.key} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-heading text-base text-foreground">{f.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{f.why}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      liveMissing && !liveMissing[f.key]
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {liveMissing && !liveMissing[f.key] ? "Acquis" : `+ ${f.points} points`}
                  </span>
                </div>

                {f.key === "radius" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Rayon géographique</Label>
                      <span className="text-sm font-semibold text-primary">
                        {form.geographic_radius} km
                      </span>
                    </div>
                    <Slider
                      value={[form.geographic_radius]}
                      onValueChange={(v) => patch({ geographic_radius: v[0] })}
                      min={10}
                      max={100}
                      step={5}
                      className="py-2"
                    />
                  </div>
                )}

                {f.key === "location" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="gate_first_name">Prénom</Label>
                      <Input
                        id="gate_first_name"
                        value={form.first_name}
                        onChange={(e) => patch({ first_name: e.target.value })}
                        className="rounded-lg h-12"
                        maxLength={100}
                      />
                    </div>
                    <PostalCodeCityFields
                      city={form.city}
                      postalCode={form.postal_code}
                      country={form.country}
                      cityId="gate_city"
                      postalId="gate_postal_code"
                      onChange={(partial) => patch(partial as Partial<FormState>)}
                    />
                  </div>
                )}

                {f.key === "competences" && (
                  <CompetenceAutocomplete
                    competences={form.competences}
                    validatedLabels={validatedLabels}
                    activeCategory={null}
                    onAdd={(label) => {
                      if (form.competences.includes(label)) return;
                      patch({ competences: [...form.competences, label] });
                    }}
                    onRemove={(label) =>
                      patch({ competences: form.competences.filter((c) => c !== label) })
                    }
                  />
                )}

                {f.key === "avatar" && (
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-20 h-20 shrink-0 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary transition-colors"
                    >
                      {form.avatar_url ? (
                        <img
                          src={form.avatar_url}
                          alt="Votre photo de profil"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
                      )}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <span className="text-sm text-muted-foreground">
                      {uploading
                        ? "Envoi en cours..."
                        : form.avatar_url
                          ? "Photo enregistrée, vous pouvez la remplacer."
                          : "Ajouter une photo de profil."}
                    </span>
                  </div>
                )}

                {f.key === "bio" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="gate_bio">Bio</Label>
                      <GenerateBioButton onPick={(text) => patch({ bio: text })} />
                    </div>
                    <Textarea
                      id="gate_bio"
                      value={form.bio}
                      onChange={(e) => patch({ bio: e.target.value })}
                      placeholder="Parlez de vous, de votre rapport aux animaux, de ce qui vous met à l'aise dans une maison."
                      className="rounded-lg min-h-[120px]"
                      maxLength={2000}
                    />
                    <p className="text-xs text-right text-muted-foreground">
                      {bioLen < 50 ? `${bioLen} sur 50 caractères` : `${bioLen} caractères`}
                    </p>
                  </div>
                )}
              </section>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-border bg-card sticky bottom-0 rounded-b-3xl">
          <Button
            className="w-full h-12 rounded-full text-base font-semibold"
            disabled={!reached || saving || loading}
            onClick={handleSave}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                Enregistrement
              </>
            ) : (
              "Enregistrer et postuler"
            )}
          </Button>
          {!reached && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Encore {remaining} points, vous y êtes presque.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompleteProfileToApplyModal;
