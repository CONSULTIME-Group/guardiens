/**
 * NearbySittersSection (vague 16) — Gardiens du coin, dans le flux propriétaire.
 *
 * Trio d'en-tête, 3 rangées compactes de gardiens réels issus de
 * useNearbyOwnerSitters, chip d'affinité RÉCIPROQUE si calculable, deux
 * liens texte par rangée (Profil, Lui écrire), lien "Tous les gardiens
 * près de chez vous" en pied de section.
 *
 * Aucun bouton primaire, la star garde le seul primaire de l'écran.
 * Si aucun gardien proche : rien ne s'affiche (return null).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useNearbyOwnerSitters } from "@/hooks/useNearbyOwnerSitters";
import { supabase } from "@/integrations/supabase/client";
import type { AffinitySitterInput } from "@/lib/affinityScore";
import { SectionHeader } from "../sitter/SitterMatchSection";
import OwnerToSitterAffinity from "@/components/matching/OwnerToSitterAffinity";

const AFFINITY_COLUMNS =
  "user_id, animal_types, life_pace, languages, interests, work_during_sit, sensitivities, special_animal_skills, sitter_type, experience_years, travels_with_children, travels_with_own_animals";

const NearbySittersSection = () => {
  const { user } = useAuth();
  const { data, isLoading } = useNearbyOwnerSitters(user?.id);
  const sitters = (data?.sitters ?? []).slice(0, 3);
  const radiusUsed = data?.radiusUsed ?? null;
  const [affinityMap, setAffinityMap] = useState<Record<string, AffinitySitterInput>>({});

  useEffect(() => {
    if (sitters.length === 0) return;
    const ids = sitters.map((s) => s.id);
    let cancelled = false;
    supabase
      .from("sitter_profiles")
      .select(AFFINITY_COLUMNS)
      .in("user_id", ids)
      .then(({ data: rows }) => {
        if (cancelled) return;
        const next: Record<string, AffinitySitterInput> = {};
        (rows || []).forEach((row: any) => {
          if (row?.user_id) {
            const { user_id, ...rest } = row;
            next[user_id] = rest as AffinitySitterInput;
          }
        });
        setAffinityMap(next);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sitters.map((s) => s.id).join(",")]);

  if (isLoading || sitters.length === 0) return null;

  const subtitle = radiusUsed
    ? `Trois profils vérifiés dans un rayon de ${radiusUsed} km.`
    : "Trois profils vérifiés parmi les plus proches disponibles.";

  return (
    <section aria-label="Les gens du coin" className="min-w-0">
      <SectionHeader
        eyebrow="Les gens du coin"
        title="Ils sont prêts à garder près de chez vous."
        subtitle={subtitle}
      />

      <ul role="list" className="flex flex-col" style={{ gap: "14px" }}>
        {sitters.map((s) => {
          const affinityInput = affinityMap[s.id] ?? null;
          const distanceKm =
            typeof s.distance_km === "number" && s.distance_km > 0
              ? s.distance_km < 1
                ? "< 1 km"
                : `${Math.round(s.distance_km)} km`
              : null;
          const skills = (s.custom_skills || []).slice(0, 2);
          const metaParts = [distanceKm, skills.length > 0 ? `Aide sur : ${skills.join(", ")}` : null].filter(Boolean);

          return (
            <li
              key={s.id}
              role="listitem"
              className="flex items-center flex-wrap rounded-2xl border border-border bg-card"
              style={{
                padding: "14px",
                gap: "14px",
                boxShadow:
                  "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
              }}
            >
              {/* Avatar */}
              <div
                className="shrink-0 overflow-hidden rounded-full"
                style={{ width: 42, height: 42, background: "hsl(var(--primary) / 0.12)" }}
                aria-hidden="true"
              >
                {s.avatar_url ? (
                  <img
                    src={s.avatar_url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center font-heading text-primary"
                    style={{ fontSize: "16px", fontWeight: 600 }}
                  >
                    {(s.first_name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Identité + méta */}
              <div className="min-w-0 flex-1">
                <p
                  className="font-heading text-foreground truncate"
                  style={{ fontSize: "15.5px", fontWeight: 600, lineHeight: 1.25 }}
                >
                  {s.first_name || "Gardien"}
                </p>
                {metaParts.length > 0 && (
                  <p
                    className="font-sans text-muted-foreground truncate"
                    style={{ fontSize: "12.5px", marginTop: "4px" }}
                  >
                    {metaParts.join(" · ")}
                  </p>
                )}
                {affinityInput && (
                  <div style={{ marginTop: "8px" }}>
                    <OwnerToSitterAffinity
                      sitterProfile={affinityInput}
                      context="owner_dashboard_nearby_sitters"
                      targetId={s.id}
                      size="sm"
                      showCta={false}
                      scope="list"
                      variant="semantic"
                    />
                  </div>
                )}
              </div>

              {/* Actions texte */}
              <div className="flex items-center shrink-0" style={{ gap: "14px" }}>
                <Link
                  to={`/gardiens/${s.id}`}
                  className="text-primary hover:underline underline-offset-4"
                  style={{ fontSize: "13px", fontWeight: 700 }}
                >
                  Profil
                </Link>
                <Link
                  to={`/messages?with=${s.id}`}
                  className="text-primary hover:underline underline-offset-4"
                  style={{ fontSize: "13px", fontWeight: 700 }}
                >
                  Lui écrire
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      <div style={{ marginTop: "14px" }}>
        <Link
          to="/search?role=sitter"
          className="text-primary hover:underline underline-offset-4"
          style={{ fontSize: "13px", fontWeight: 700 }}
        >
          Tous les gardiens près de chez vous
        </Link>
      </div>
    </section>
  );
};

export default NearbySittersSection;
