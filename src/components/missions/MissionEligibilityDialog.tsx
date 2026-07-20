import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { computeProfileCompletion, type ProfileRole } from "@/lib/profileCompletion";
import { logger } from "@/lib/logger";

/**
 * Écran pédagogique remplaçant les erreurs brutes serveur
 * (profile_incomplete / account_not_active) au moment de publier
 * une mission ou d'y répondre.
 *
 * S'appuie sur `computeProfileCompletion` (source de vérité partagée
 * avec le barème SQL) pour lister ce qui manque au membre.
 */
export type MissionEligibilityReason = "profile_incomplete" | "account_not_active";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reason: MissionEligibilityReason | null;
  userId: string | null;
  role: ProfileRole;
  /** Contexte d'origine, utilisé uniquement pour le libellé. */
  context: "publish" | "respond";
}

const COLS = "first_name, postal_code, city, country, avatar_url, bio, identity_verified, account_status, profile_completion";

const MissionEligibilityDialog = ({ open, onOpenChange, reason, userId, role, context }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState<Array<{ key: string; label: string; points: number }>>([]);
  const [completion, setCompletion] = useState<number | null>(null);

  useEffect(() => {
    if (!open || reason !== "profile_incomplete" || !userId) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        // On charge un sur-ensemble de colonnes nécessaires aux deux barèmes.
        const { data: base } = await supabase
          .from("profiles")
          .select(COLS)
          .eq("id", userId)
          .maybeSingle();

        // Signaux d'affinité + galerie sont dans des tables/vues dédiées.
        const [ownerRes, sitterRes, ownerGalRes, sitterGalRes, petRes] = await Promise.all([
          supabase.from("owner_profiles").select("owner_competences, home_ambiance, preferred_sitter_types, interests, languages, life_pace, property_description").eq("user_id", userId).maybeSingle(),
          supabase.from("sitter_profiles").select("competences, lifestyle, geographic_radius, interests, languages, life_pace, animal_types").eq("user_id", userId).maybeSingle(),
          supabase.from("owner_gallery").select("id", { head: true, count: "exact" }).eq("user_id", userId),
          supabase.from("sitter_gallery").select("id", { head: true, count: "exact" }).eq("user_id", userId),
          supabase.from("pets").select("id", { head: true, count: "exact" }).eq("user_id", userId),
        ]);

        if (!alive) return;
        const merged = {
          role,
          ...(base ?? {}),
          ...(ownerRes.data ?? {}),
          ...(sitterRes.data ?? {}),
          has_owner_gallery: (ownerGalRes.count ?? 0) > 0,
          has_sitter_gallery: (sitterGalRes.count ?? 0) > 0,
          has_pet: (petRes.count ?? 0) > 0,
        } as any;

        const res = computeProfileCompletion(role, merged);
        setCompletion(res.score);
        setMissing(res.missing.map((m) => ({ key: m.key, label: m.label, points: m.points })));
      } catch (err) {
        logger.warn("MissionEligibilityDialog: fetch failed", { err: String(err) });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [open, reason, userId, role]);

  if (!reason) return null;

  const isSuspended = reason === "account_not_active";
  const title = isSuspended
    ? "Votre compte n'est pas actif"
    : (context === "publish" ? "Complétez votre profil pour publier" : "Complétez votre profil pour répondre");

  const description = isSuspended
    ? "Contactez le support pour rétablir l'accès à l'entraide."
    : "L'entraide entre membres suppose un profil suffisamment renseigné (60 % minimum). Voici ce qui vous en rapproche.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {!isSuspended && (
          <div className="space-y-3">
            {typeof completion === "number" && (
              <div className="text-sm">
                <span className="font-semibold text-foreground">Actuellement {completion} %</span>
                <span className="text-muted-foreground"> · objectif 60 %</span>
              </div>
            )}
            {loading ? (
              <p className="text-sm text-muted-foreground">Analyse de votre profil…</p>
            ) : missing.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {missing.slice(0, 6).map((m) => (
                  <li key={m.key} className="flex items-start gap-2">
                    <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span className="text-foreground">
                      {m.label}
                      <span className="text-muted-foreground"> · +{m.points} pts</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Votre profil est proche de l'objectif, il ne manque quasiment rien.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Vous pouvez tout compléter en quelques minutes depuis votre espace profil.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Plus tard
          </Button>
          {isSuspended ? (
            <Button onClick={() => navigate("/contact")}>Contacter le support</Button>
          ) : (
            <Button onClick={() => { onOpenChange(false); navigate("/profile"); }}>
              Compléter mon profil
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MissionEligibilityDialog;
