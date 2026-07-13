/**
 * Étape d'onboarding OBLIGATOIRE (post-inscription) captant les champs
 * qui alimentent le score d'affinité :
 *  - Gardien : animal_types, work_during_sit, sitter_type
 *  - Propriétaire : presence_expected, preferred_sitter_types
 *
 * Contrôlée par le flag `mandatory_affinity_onboarding` en base.
 * Si le rôle n'est pas encore fixé (pas de sélection à l'inscription),
 * on demande d'abord "faire garder / garder / les deux" en une question.
 *
 * Instrumentation : onboarding_shown, onboarding_role_selected,
 * onboarding_completed, onboarding_abandoned (unload / logout partiels).
 *
 * Réutilise les listes d'options centralisées dans profileMatchingOptions.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAffinityOnboardingStatus } from "@/hooks/useAffinityOnboardingStatus";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChipSelect from "@/components/profile/ChipSelect";
import {
  SITTER_ANIMAL_TYPES_OPTIONS,
  SITTER_TYPE_OPTIONS,
  WORK_DURING_SIT_OPTIONS,
  PRESENCE_EXPECTED_OPTIONS,
  IDEAL_SITTER_PROFILE_OPTIONS,
  LIFE_PACE_OPTIONS,
  INTEREST_OPTIONS,
  LANGUAGE_OPTIONS,
  HOME_AMBIANCE_OPTIONS,
} from "@/lib/profileMatchingOptions";

type Role = "owner" | "sitter" | "both";

const OnboardingAffinity = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshProfile, logout } = useAuth();
  const { enabled: flagEnabled, loading: flagLoading } = useFeatureFlag("mandatory_affinity_onboarding");
  const status = useAffinityOnboardingStatus();

  const [saving, setSaving] = useState(false);
  const [chosenRole, setChosenRole] = useState<Role | null>(() => (user?.role as Role) ?? null);
  const [askRole, setAskRole] = useState(false);

  // Sitter fields
  const [animalTypes, setAnimalTypes] = useState<string[]>([]);
  const [workDuringSit, setWorkDuringSit] = useState<string>("");
  const [sitterType, setSitterType] = useState<string>("");
  // Owner fields
  const [presenceExpected, setPresenceExpected] = useState<string>("");
  const [preferredSitterTypes, setPreferredSitterTypes] = useState<string[]>([]);
  const [homeAmbiance, setHomeAmbiance] = useState<string[]>([]);
  // Champs partagés (persistés sur sitter_profiles ET owner_profiles selon les rôles actifs).
  const [lifePace, setLifePace] = useState<string>("");
  const [interests, setInterests] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(["Français"]);

  const shownTrackedRef = useRef(false);
  const completedRef = useRef(false);
  const abandonedEmittedRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const lastStepRef = useRef<{ index: number; name: string }>({ index: 0, name: "role_or_form" });

  // Étape courante (dérivée de l'état visible) pour renseigner metadata.step
  // sur l'événement d'abandon. Recalculée à la volée à chaque émission.
  const currentStepRef = useRef<string>("role_or_form");

  // Rôle inconnu ou "both" imposé par l'utilisateur : la question précède les champs.
  useEffect(() => {
    if (!user) return;
    if (!user.role) setAskRole(true);
    else setChosenRole(user.role as Role);
  }, [user]);

  // Redirection immédiate si le flag est OFF, ou si l'étape est déjà satisfaite.
  useEffect(() => {
    if (flagLoading || status.loading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (!flagEnabled || !status.needsOnboarding) {
      const redirect = searchParams.get("redirect");
      navigate(redirect && redirect.startsWith("/") ? redirect : "/dashboard", { replace: true });
    }
  }, [flagLoading, flagEnabled, status.loading, status.needsOnboarding, user, navigate, searchParams]);

  // Tracking : impression unique par session.
  useEffect(() => {
    if (shownTrackedRef.current) return;
    if (flagLoading || status.loading || !user || !flagEnabled || !status.needsOnboarding) return;
    shownTrackedRef.current = true;
    startedAtRef.current = Date.now();
    void trackEvent("onboarding_shown", {
      source: "/onboarding/affinity",
      metadata: {
        role: user.role ?? null,
        needs_sitter: status.needsSitter,
        needs_owner: status.needsOwner,
      },
    });
    void trackEvent("affinity_onboarding_started", {
      source: "/onboarding/affinity",
      metadata: {
        role: user.role ?? null,
        profile_created_at: status.profileCreatedAt,
        needs_sitter: status.needsSitter,
        needs_owner: status.needsOwner,
      },
    });
  }, [flagLoading, flagEnabled, status.loading, status.needsSitter, status.needsOwner, status.needsOnboarding, status.profileCreatedAt, user]);

  // Abandon : émis AU PLUS UNE FOIS par session/monté du composant, si
  // l'utilisateur n'a pas complété. `reason` distingue le mode de sortie
  // (close_button | navigate_away | page_unload), `step` renseigne l'étape
  // courante au moment de la sortie.
  const emitAbandoned = (reason: "close_button" | "navigate_away" | "page_unload") => {
    if (!shownTrackedRef.current) return;
    if (completedRef.current || abandonedEmittedRef.current) return;
    abandonedEmittedRef.current = true;
    const duration = startedAtRef.current
      ? Math.round((Date.now() - startedAtRef.current) / 1000)
      : 0;
    void trackEvent("onboarding_abandoned", {
      source: "/onboarding/affinity",
      metadata: {
        reason,
        step: currentStepRef.current,
        role: chosenRole,
        needs_sitter: status.needsSitter,
        needs_owner: status.needsOwner,
      },
    });
    void trackEvent("affinity_onboarding_abandoned", {
      source: "/onboarding/affinity",
      metadata: {
        reason,
        step: currentStepRef.current,
        role: chosenRole,
        last_step_index: lastStepRef.current.index,
        last_step_name: lastStepRef.current.name,
        duration_seconds: duration,
      },
    });
  };
  // Ref stable pour être appelée depuis le cleanup / handlers sans redéclencher
  // les effets à chaque changement d'état.
  const emitAbandonedRef = useRef(emitAbandoned);
  emitAbandonedRef.current = emitAbandoned;

  useEffect(() => {
    const onUnload = () => emitAbandonedRef.current("page_unload");
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onUnload);
      // Démontage React sans complétion : navigation interne vers une autre route.
      emitAbandonedRef.current("navigate_away");
    };
  }, []);

  const showSitterBlock = useMemo(
    () => status.needsSitter && (chosenRole === "sitter" || chosenRole === "both"),
    [status.needsSitter, chosenRole],
  );
  const showOwnerBlock = useMemo(
    () => status.needsOwner && (chosenRole === "owner" || chosenRole === "both"),
    [status.needsOwner, chosenRole],
  );

  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (askRole && !chosenRole) missing.push("choisir ce que vous venez faire");
    if (showSitterBlock) {
      if (animalTypes.length === 0) missing.push("les animaux que vous acceptez");
      if (!workDuringSit) missing.push("votre situation pendant la garde");
      if (!sitterType) missing.push("votre profil de gardien");
    }
    if (showOwnerBlock) {
      if (!presenceExpected) missing.push("la présence attendue du gardien");
      if (preferredSitterTypes.length === 0) missing.push("le profil de gardien idéal");
    }
    return missing;
  }, [askRole, chosenRole, showSitterBlock, showOwnerBlock, animalTypes, workDuringSit, sitterType, presenceExpected, preferredSitterTypes]);

  const canSubmit = useMemo(
    () => (showSitterBlock || showOwnerBlock) && missingFields.length === 0,
    [showSitterBlock, showOwnerBlock, missingFields],
  );

  // Tient à jour l'étape courante pour metadata.step des événements d'abandon.
  useEffect(() => {
    let step = "role_or_form";
    if (askRole && !chosenRole) step = "role_pick";
    else if (showSitterBlock && (animalTypes.length === 0 || !workDuringSit || !sitterType)) step = "sitter_form";
    else if (showOwnerBlock && (!presenceExpected || preferredSitterTypes.length === 0)) step = "owner_form";
    else if (showSitterBlock || showOwnerBlock) step = "form_ready";
    currentStepRef.current = step;
  }, [askRole, chosenRole, showSitterBlock, showOwnerBlock, animalTypes, workDuringSit, sitterType, presenceExpected, preferredSitterTypes]);

  const handleRolePick = (r: Role) => {
    setChosenRole(r);
    setAskRole(false);
    lastStepRef.current = { index: 1, name: "role_selected" };
    void trackEvent("onboarding_role_selected", {
      source: "/onboarding/affinity",
      metadata: { role: r },
    });
    void trackEvent("affinity_onboarding_role_selected", {
      source: "/onboarding/affinity",
      metadata: { role: r },
    });
    void trackEvent("affinity_onboarding_step_completed", {
      source: "/onboarding/affinity",
      metadata: { step_index: 0, step_name: "choose_role" },
    });
  };

  const handleSubmit = async () => {
    if (!user || !chosenRole) return;
    setSaving(true);
    try {
      // 1. Persist role if it changed
      if (user.role !== chosenRole) {
        await supabase.from("profiles").update({ role: chosenRole }).eq("id", user.id);
      }
      // 2. Persist sitter fields
      if (showSitterBlock) {
        await supabase
          .from("sitter_profiles")
          .upsert(
            { user_id: user.id, animal_types: animalTypes, work_during_sit: workDuringSit, sitter_type: sitterType },
            { onConflict: "user_id" },
          );
      }
      // 3. Persist owner fields
      if (showOwnerBlock) {
        await supabase
          .from("owner_profiles")
          .upsert(
            { user_id: user.id, presence_expected: presenceExpected, preferred_sitter_types: preferredSitterTypes } as any,
            { onConflict: "user_id" },
          );
      }
      completedRef.current = true;
      const duration = startedAtRef.current
        ? Math.round((Date.now() - startedAtRef.current) / 1000)
        : 0;
      const totalSteps = (showSitterBlock ? 3 : 0) + (showOwnerBlock ? 2 : 0);
      void trackEvent("onboarding_completed", {
        source: "/onboarding/affinity",
        metadata: { role: chosenRole },
      });
      void trackEvent("affinity_onboarding_step_completed", {
        source: "/onboarding/affinity",
        metadata: { step_index: 99, step_name: "form_submitted" },
      });
      void trackEvent("affinity_onboarding_completed", {
        source: "/onboarding/affinity",
        metadata: { role: chosenRole, total_steps: totalSteps, duration_seconds: duration },
      });
      await refreshProfile();
      await status.refresh();
      toast.success("C'est noté, vous pourrez compléter votre profil ensuite.");
      navigate("/dashboard", { replace: true });
    } catch (e) {
      console.error("OnboardingAffinity: save failed", e);
      toast.error("Impossible d'enregistrer, réessayez.");
    } finally {
      setSaving(false);
    }
  };

  if (!user || flagLoading || status.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Chargement...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-start md:items-center justify-center px-4 py-8">
      <Helmet>
        <title>Bienvenue, une dernière étape | Guardiens</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="font-heading text-2xl">Une dernière étape avant le tableau de bord</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ces informations nous servent uniquement à calculer votre score d'affinité et à vous proposer les meilleures correspondances. Aucune saisie libre, moins d'une minute.
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            {askRole && !chosenRole && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Que venez-vous faire sur Guardiens ?</Label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button variant="outline" className="h-auto py-4" onClick={() => handleRolePick("owner")}>
                    Faire garder
                  </Button>
                  <Button variant="outline" className="h-auto py-4" onClick={() => handleRolePick("sitter")}>
                    Garder
                  </Button>
                  <Button variant="outline" className="h-auto py-4" onClick={() => handleRolePick("both")}>
                    Les deux
                  </Button>
                </div>
              </div>
            )}

            {showSitterBlock && (
              <section className="space-y-5" aria-labelledby="sitter-heading">
                <h2 id="sitter-heading" className="font-heading text-lg font-semibold">
                  Vos préférences pour garder
                </h2>

                <div className="space-y-2">
                  <Label id="lbl-animal-types">Quels animaux acceptez-vous ?</Label>
                  <ChipSelect
                    options={SITTER_ANIMAL_TYPES_OPTIONS}
                    selected={animalTypes}
                    onChange={setAnimalTypes}
                    ariaLabelledBy="lbl-animal-types"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="work-during-sit">Votre situation pendant la garde</Label>
                  <Select value={workDuringSit} onValueChange={setWorkDuringSit}>
                    <SelectTrigger id="work-during-sit" className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      {WORK_DURING_SIT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sitter-type">Votre profil de gardien</Label>
                  <Select value={sitterType} onValueChange={setSitterType}>
                    <SelectTrigger id="sitter-type" className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      {SITTER_TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </section>
            )}

            {showOwnerBlock && (
              <section className="space-y-5" aria-labelledby="owner-heading">
                <h2 id="owner-heading" className="font-heading text-lg font-semibold">
                  Vos préférences pour faire garder
                </h2>

                <div className="space-y-2">
                  <Label htmlFor="presence-expected">Votre présence attendue du gardien</Label>
                  <Select value={presenceExpected} onValueChange={setPresenceExpected}>
                    <SelectTrigger id="presence-expected" className="rounded-lg h-12"><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      {PRESENCE_EXPECTED_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label id="lbl-preferred-sitter">Le gardien idéal pour vous</Label>
                  <ChipSelect
                    options={IDEAL_SITTER_PROFILE_OPTIONS}
                    selected={preferredSitterTypes}
                    onChange={setPreferredSitterTypes}
                    ariaLabelledBy="lbl-preferred-sitter"
                  />
                </div>
              </section>
            )}

            <div className="space-y-2 pt-2">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || saving}
                  className="flex-1"
                  aria-describedby={!canSubmit ? "onboarding-missing" : undefined}
                >
                  {saving ? "Enregistrement..." : "Accéder à mon espace"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    emitAbandonedRef.current("close_button");
                    await logout();
                    navigate("/login", { replace: true });
                  }}
                  className="sm:w-auto"
                >
                  Se déconnecter
                </Button>
              </div>
              {!canSubmit && missingFields.length > 0 && (
                <p
                  id="onboarding-missing"
                  role="status"
                  aria-live="polite"
                  className="text-xs text-muted-foreground"
                >
                  Pour continuer, indiquez encore&nbsp;: {missingFields.join(", ")}.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingAffinity;
