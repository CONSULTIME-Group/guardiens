/**
 * OwnerFamilySection (vague 11) — VOTRE FAMILLE.
 *
 * Tuiles à hauteur égale, dernière tuile pointillée pour ajouter un compagnon.
 * Aucun EmptyCard système : si aucune famille, une seule tuile pointillée.
 */
import { Link } from "react-router-dom";
import { SectionHeader } from "../sitter/SitterMatchSection";
import { SPECIES_LABEL, capitalize, capitalizeWords } from "./helpers";
import type { Pet, SitRow } from "./types";

interface OwnerFamilySectionProps {
  pets: Pet[];
  getNextSitForPet: (pet: Pet) => SitRow | undefined;
}

const OwnerFamilySection = ({ pets, getNextSitForPet }: OwnerFamilySectionProps) => {
  return (
    <section aria-label="Votre famille" className="px-4 sm:px-5 md:px-8">
      <SectionHeader
        eyebrow="Votre famille"
        title="Ceux qu'on garde avec vous."
      />

      {pets.length === 0 ? (
        <Link
          to="/owner-profile"
          className="block text-center bg-card hover:bg-muted/40 transition-colors"
          style={{
            border: "1px dashed hsl(var(--border))",
            borderRadius: "16px",
            padding: "34px 22px",
          }}
        >
          <p
            className="font-heading text-foreground"
            style={{ fontSize: "16px", fontWeight: 600 }}
          >
            Présentez-nous vos compagnons.
          </p>
          <p
            className="font-sans text-muted-foreground mt-[8px] mx-auto"
            style={{ fontSize: "13px", maxWidth: "38ch", lineHeight: 1.5 }}
          >
            Un prénom, une espèce, une photo, et l'on saura mieux qui vous confierait sa journée.
          </p>
          <span
            className="inline-block mt-[14px] text-primary"
            style={{ fontSize: "13px", fontWeight: 700 }}
          >
            Ajouter un compagnon
          </span>
        </Link>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-[14px] auto-rows-fr">
          {pets.map((pet) => {
            const nextSit = getNextSitForPet(pet);
            return (
              <div
                key={pet.id}
                className="bg-card border border-border flex items-center gap-[14px] h-full"
                style={{
                  borderRadius: "16px",
                  padding: "14px 22px",
                }}
              >
                <div
                  className="rounded-full overflow-hidden shrink-0 flex items-center justify-center"
                  style={{
                    width: "42px",
                    height: "42px",
                    backgroundColor: "hsl(var(--secondary) / 0.16)",
                  }}
                >
                  {pet.photo_url ? (
                    <img
                      src={pet.photo_url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span
                      className="font-heading text-secondary"
                      style={{ fontSize: "18px", fontWeight: 700 }}
                    >
                      {pet.name ? pet.name.charAt(0).toUpperCase() : "?"}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="font-heading text-foreground truncate"
                    style={{ fontSize: "15px", fontWeight: 600 }}
                  >
                    {capitalize(pet.name)}
                  </p>
                  <p
                    className="text-muted-foreground truncate"
                    style={{ fontSize: "12px" }}
                  >
                    {SPECIES_LABEL[pet.species] || capitalizeWords(pet.species)}
                    {pet.age ? ` · ${pet.age} an${pet.age > 1 ? "s" : ""}` : ""}
                  </p>
                  {nextSit?.status === "confirmed" ? (
                    <span
                      className="inline-block mt-[8px] rounded-full bg-primary/10 text-primary"
                      style={{
                        padding: "2px 10px",
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      Garde confirmée
                    </span>
                  ) : nextSit?.status === "published" ? (
                    <span
                      className="inline-block mt-[8px] rounded-full bg-secondary/15 text-secondary"
                      style={{
                        padding: "2px 10px",
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      Annonce en cours
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}

          <Link
            to="/owner-profile"
            className="flex items-center justify-center text-center bg-transparent hover:bg-muted/30 transition-colors h-full"
            style={{
              border: "1px dashed hsl(var(--border))",
              borderRadius: "16px",
              padding: "14px 22px",
              minHeight: "82px",
            }}
          >
            <span
              className="text-primary"
              style={{ fontSize: "13px", fontWeight: 700 }}
            >
              Ajouter un compagnon
            </span>
          </Link>
        </div>
      )}
    </section>
  );
};

export default OwnerFamilySection;
