/**
 * SpotlightNearbyPanel : onglet « Près de chez vous » d'OwnerSitterSpotlight.
 *
 * Reprend à l'identique la logique de l'ancienne NearbySittersSection
 * (déplacée ici le 25/08/2026, fusion à onglets) : `useNearbyOwnerSitters`,
 * tri par distance, chip d'affinité réciproque discrète (jamais de gros
 * badge de pourcentage), liens texte Profil / Lui écrire, lien
 * « Tous les gardiens près de chez vous » en pied.
 *
 * Seul l'habillage change : l'eyebrow « Les gens du coin » devient le h3 du
 * panneau, le h2 « Les gardiens » et le sélecteur d'onglet sont portés par
 * OwnerSitterSpotlight. L'en-tête reprend le composant SectionHeader de la
 * marque (trait, eyebrow, titre serif, sous-titre). Si aucun gardien proche
 * n'est trouvé, le panneau affiche un état vide court, jamais du blanc :
 * l'onglet reste visible et cliquable dans tous les cas.
 */
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useNearbyOwnerSitters } from "@/hooks/useNearbyOwnerSitters";
import OwnerToSitterAffinity from "@/components/matching/OwnerToSitterAffinity";
import { avatarImageUrl } from "@/lib/storageImage";
import { SectionHeader } from "@/components/dashboard/sitter/SitterMatchSection";
import { Button } from "@/components/ui/button";

const SpotlightNearbyPanel = () => {
  const { user } = useAuth();
  const { data, isLoading } = useNearbyOwnerSitters(user?.id);
  const sitters = (data?.sitters ?? []).slice(0, 3);
  const radiusUsed = data?.radiusUsed ?? null;
  // Lot 2B (05/09/2026) : l'entrée d'affinité arrive avec le hook de
  // proximité, plus de requête dédiée depuis le panneau.
  if (isLoading) return null;

  // Différence de tri posée explicitement (25/08/2026) : ce panneau est un
  // annuaire de proximité, pas un classement par affinité. La chip
  // d'affinité réciproque reste affichée, en style discret, jamais en gros
  // badge de pourcentage comme sur l'onglet « Pour vous ».
  const subtitle = radiusUsed
    ? `Trois profils de gardiens dans un rayon de ${radiusUsed} km. Ici, le tri se fait par distance, pas par affinité.`
    : "Trois profils de gardiens parmi les plus proches disponibles. Ici, le tri se fait par distance, pas par affinité.";

  // Vivier proche chargé et vide : l'onglet reste cliquable, le panneau
  // raconte la situation et ouvre une porte de sortie (règle 1 bis).
  if (sitters.length === 0) {
    return (
      <div className="min-w-0">
        <SectionHeader
          as="h3"
          eyebrow="Les gens du coin"
          title="Votre secteur se remplit encore."
          subtitle="Aucun gardien n'est inscrit tout près de chez vous pour le moment. Élargissez la recherche, ou invitez une personne de confiance à rejoindre Guardiens."
        />
        <div className="rounded-2xl border border-dashed border-border bg-card p-5 md:p-6">
          <div className="flex flex-col items-start gap-3">
            <Link
              to="/search?role=sitter"
              className="text-sm text-primary hover:underline underline-offset-2 font-medium"
            >
              Voir tous les gardiens
            </Link>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/inscription?role=sitter&refer=owner">Parrainer un proche gardien</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <SectionHeader
        as="h3"
        eyebrow="Les gens du coin"
        title="Ils sont prêts à garder près de chez vous."
        subtitle={subtitle}
      />

      <ul role="list" className="flex flex-col" style={{ gap: "14px" }}>
        {sitters.map((s) => {
          const affinityInput = s.affinity_input;
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
                    src={avatarImageUrl(s.avatar_url, 42)}
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
    </div>
  );
};

export default SpotlightNearbyPanel;
