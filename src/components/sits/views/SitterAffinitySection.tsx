/**
 * SitterAffinitySection — grammaire ring partagée sur la page annonce (vague 21).
 *
 * Encapsule le calcul via useAffinityWithShadow et le rendu premium :
 *  - trio d'en-tête signature (SectionHeader partagé),
 *  - carte blanche bordure border rayon 20px,
 *  - AffinityRing partagé 70px avec popover d'explication au clic,
 *  - sous-titre Playfair « Ce qui vous rapproche de {prénom} »,
 *  - texte muted rappelant le nombre réel de critères et l'affordance,
 *  - chips pin doux des raisons réelles (result.matched).
 *
 * RÈGLE ABSOLUE : si le score n'est pas fiable (full absent ou displayed=false),
 * la section ne se monte pas du tout (return null). Aucun fallback CTA ici.
 */
import { useAffinityWithShadow } from "@/hooks/useAffinityWithShadow";
import AffinityRing from "@/components/matching/AffinityRing";
import { SectionHeader } from "@/components/dashboard/sitter/SitterMatchSection";
import type {
  AffinitySitterInput,
  AffinityOwnerInput,
} from "@/lib/affinityScore";

interface Props {
  sitterProfile: AffinitySitterInput | null;
  ownerProfile: AffinityOwnerInput | null;
  pets: AffinityOwnerInput["pets"];
  ownerFirstName?: string | null;
  targetId?: string;
}

const SitterAffinitySection = ({
  sitterProfile,
  ownerProfile,
  pets,
  ownerFirstName,
  targetId,
}: Props) => {
  const { full, displayed } = useAffinityWithShadow(
    ownerProfile ? { ...ownerProfile, pets: pets || [] } : null,
    sitterProfile,
    { context: "sit_detail", targetId, enabled: !!sitterProfile && !!ownerProfile },
  );

  if (!full || !displayed) return null;

  const reasons = full.matched ?? [];
  const criteriaCount = reasons.length;
  const first = (ownerFirstName ?? "").trim();

  return (
    <section aria-label="Votre rencontre avec cette maison" className="mt-6 mb-6">
      <SectionHeader
        eyebrow="Votre rencontre avec cette maison"
        title="Vous êtes faits pour vous entendre."
      />

      <article
        className="bg-card border border-border"
        style={{
          borderRadius: "20px",
          padding: "22px",
          boxShadow:
            "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
        }}
      >
        <div className="flex items-start gap-[18px] flex-wrap">
          <AffinityRing score={full.score} result={full} size={70} />

          <div className="min-w-0 flex-1">
            <h3
              className="font-heading text-foreground"
              style={{ fontSize: "17px", fontWeight: 600, lineHeight: 1.3 }}
            >
              {first
                ? `Ce qui vous rapproche de ${first}`
                : "Ce qui vous rapproche de cette maison"}
            </h3>
            <p
              className="text-muted-foreground mt-[6px]"
              style={{ fontSize: "13px", lineHeight: 1.5 }}
            >
              {`Basé sur ${criteriaCount} critère${criteriaCount > 1 ? "s" : ""} partagé${
                criteriaCount > 1 ? "s" : ""
              } entre vos deux profils. Touchez le cercle pour le détail.`}
            </p>

            {reasons.length > 0 && (
              <ul className="flex flex-wrap gap-[8px] mt-[14px] list-none p-0">
                {reasons.map((reason) => (
                  <li
                    key={reason}
                    className="text-primary"
                    style={{
                      background: "hsl(var(--primary) / 0.10)",
                      borderRadius: "9999px",
                      padding: "5px 12px",
                      fontSize: "12.5px",
                      fontWeight: 500,
                    }}
                  >
                    {reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </article>
    </section>
  );
};

export default SitterAffinitySection;
