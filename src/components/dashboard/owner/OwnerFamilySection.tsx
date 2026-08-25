import { useRef, useState } from "react";
import { avatarImageUrl } from "@/lib/storageImage";

/**
 * OwnerFamilySection (vague 11) — VOTRE FAMILLE.
 *
 * Tuiles à hauteur égale, dernière tuile pointillée pour ajouter un compagnon.
 * Aucun EmptyCard système : si aucune famille, une seule tuile pointillée.
 *
 * Édition (25/08/2026) : les tuiles ne sont plus en lecture seule. Un clic
 * sur un compagnon ouvre `PetsEditor` (CRUD complet) dans un dialogue, scopé
 * au logement de CET animal (`pet.property_id`), ce qui reste juste si le
 * propriétaire a plusieurs logements. « Ajouter un compagnon » ouvre le même
 * éditeur sur le premier logement ; sans logement déclaré, le lien vers
 * /owner-profile (création du logement) reste le seul chemin possible, un
 * animal est toujours rattaché à un logement.
 */
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PetsEditor from "@/components/pets/PetsEditor";
import BreedEditorialLink from "@/components/breeds/BreedEditorialLink";
import { SectionHeader } from "../sitter/SitterMatchSection";
import { SPECIES_LABEL, capitalize, capitalizeWords } from "./helpers";
import type { Pet, SitRow } from "./types";

interface OwnerFamilySectionProps {
  pets: Pet[];
  /** Logements du propriétaire : cible de l'ajout d'un compagnon. */
  propertyIds: string[];
  /** Recharge les données du dashboard après une mutation réelle. */
  onPetsChanged: () => void;
  getNextSitForPet: (pet: Pet) => SitRow | undefined;
}

/** Empreinte d'une liste d'animaux pour ne recharger le dashboard que si
 *  quelque chose a réellement changé (l'ouverture seule ne recharge rien). */
const petSignature = (list: readonly Pet[]): string =>
  JSON.stringify(
    list.map((p) => [p.id, p.name, p.species, p.breed ?? null, p.age ?? null, p.photo_url ?? null]),
  );

const OwnerFamilySection = ({ pets, propertyIds, onPetsChanged, getNextSitForPet }: OwnerFamilySectionProps) => {
  const [editorPropertyId, setEditorPropertyId] = useState<string | null>(null);
  const baselineRef = useRef<string | null>(null);

  const openEditor = (propertyId: string) => {
    // Le premier onChange de PetsEditor est son chargement initial : il fixe
    // la ligne de base, il ne déclenche pas de rechargement du dashboard.
    baselineRef.current = null;
    setEditorPropertyId(propertyId);
  };

  const handleEditorChange = (list: Pet[]) => {
    const sig = petSignature(list);
    if (baselineRef.current === null) {
      baselineRef.current = sig;
      return;
    }
    if (sig !== baselineRef.current) {
      baselineRef.current = sig;
      onPetsChanged();
    }
  };

  const addTile = propertyIds.length > 0 ? (
    <button
      type="button"
      onClick={() => openEditor(propertyIds[0])}
      className="flex items-center justify-center text-center bg-transparent hover:bg-muted/30 transition-colors h-full w-full cursor-pointer"
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
    </button>
  ) : (
    // Sans logement déclaré, l'ajout passe par la création du logement.
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
  );

  return (
    <section aria-label="Votre famille" className="px-4 sm:px-5 md:px-8">
      <SectionHeader
        eyebrow="Votre famille"
        title="Ceux qu'on garde avec vous."
      />

      {pets.length === 0 ? (
        propertyIds.length > 0 ? (
          <button
            type="button"
            onClick={() => openEditor(propertyIds[0])}
            className="block w-full text-center bg-card hover:bg-muted/40 transition-colors cursor-pointer"
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
          </button>
        ) : (
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
        )
      ) : (
        <div className="grid grid-cols-1 min-[430px]:grid-cols-2 md:grid-cols-3 gap-[14px] auto-rows-fr">
          {pets.map((pet) => {
            const nextSit = getNextSitForPet(pet);
            return (
              <div
                key={pet.id}
                className="bg-card border border-border flex flex-col h-full px-[14px] py-[14px] sm:px-[22px] w-full"
                style={{
                  borderRadius: "16px",
                }}
              >
              <button
                type="button"
                onClick={() => openEditor(pet.property_id)}
                aria-label={`Modifier ${pet.name}`}
                className="flex items-center gap-[14px] w-full text-left cursor-pointer bg-transparent"
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
                      src={avatarImageUrl(pet.photo_url, 42)}
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
                    className="font-heading text-foreground break-words"
                    style={{ fontSize: "15px", fontWeight: 600 }}
                  >
                    {capitalize(pet.name)}
                  </p>
                  <p
                    className="text-muted-foreground break-words"
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
              </button>
                {pet.breed ? (
                  <div className="mt-[8px] pl-[56px]">
                    {/* Raccourci contextuel vers la fiche de race. Le lien ne
                        se rend que si la fiche existe vraiment (résolution
                        partagée avec PetAdviceSection), jamais de lien mort.
                        Hors du bouton : le clic n'ouvre pas l'éditeur. */}
                    <BreedEditorialLink
                      species={pet.species}
                      breed={pet.breed}
                      label={`Le guide du ${capitalizeWords(pet.breed)}`}
                      ariaLabel={`Le guide du ${capitalizeWords(pet.breed)}, la race de ${capitalize(pet.name)}`}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}

          {addTile}
        </div>
      )}

      <Dialog open={editorPropertyId !== null} onOpenChange={(open) => { if (!open) setEditorPropertyId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vos compagnons</DialogTitle>
            <DialogDescription>
              Ajoutez, modifiez ou retirez un compagnon de ce logement.
            </DialogDescription>
          </DialogHeader>
          {editorPropertyId && (
            <PetsEditor propertyId={editorPropertyId} onChange={handleEditorChange} />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default OwnerFamilySection;
