/**
 * Onglet "Animaux" : sommaire si plusieurs, puis fiche détaillée par animal.
 */
import {
  Pill,
  Utensils,
  AlertTriangle,
  Heart,
  Activity,
  Footprints,
  Clock,
  Info,
} from "lucide-react";
import { PetPhoto } from "@/components/sits/views/PetPhoto";
import BreedProfileCard from "@/components/breeds/BreedProfileCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ACTIVITY_LABELS as ACTIVITY_LEVEL_LABEL,
  WALK_LABELS as WALK_DURATION_LABEL,
  ALONE_LABELS as ALONE_DURATION_LABEL,
} from "@/components/sits/shared/sitConstants";

interface TabAnimauxProps {
  safePets: any[];
  ownerName: string;
}

const TabAnimaux = ({ safePets, ownerName }: TabAnimauxProps) => {
  if (safePets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic text-center py-8">
        Aucun animal renseigné pour cette annonce.
      </p>
    );
  }

  return (
    <>
      {safePets.length > 1 && (
        <nav
          aria-label="Sommaire des animaux"
          className="rounded-2xl border border-border bg-muted/30 p-3 md:p-4"
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            {safePets.length} pensionnaires — cliquez pour aller à une fiche
          </p>
          <div className="flex flex-wrap gap-2">
            {safePets.map((p, idx) => {
              const anchor = `pet-${p?.id || idx}`;
              return (
                <a
                  key={anchor}
                  href={`#${anchor}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById(anchor)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-background border border-border pl-1 pr-3 py-0.5 text-xs hover:border-primary/40 transition"
                >
                  {p?.photo_url ? (
                    <img
                      src={p.photo_url}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[11px] text-muted-foreground/70 font-serif">
                      {(p?.name?.[0] || "?").toUpperCase()}
                    </span>
                  )}
                  <span className="font-medium">{p?.name || "Animal"}</span>
                  {p?.breed && <span className="text-muted-foreground">· {p.breed}</span>}
                </a>
              );
            })}
          </div>
        </nav>
      )}

      {safePets.map((pet, i) => {
        const hasMedication =
          typeof pet.medication === "string" &&
          pet.medication.trim().length > 0 &&
          !/^aucune?$|^non$|^rien$/i.test(pet.medication.trim());
        const hasFood = typeof pet.food === "string" && pet.food.trim().length > 0;
        const hasSpecialNeeds =
          typeof pet.special_needs === "string" && pet.special_needs.trim().length > 0;
        const hasCharacter =
          typeof pet.character === "string" && pet.character.trim().length > 0;
        const activityLabel = pet.activity_level
          ? ACTIVITY_LEVEL_LABEL[pet.activity_level]
          : null;
        const walkLabel = pet.walk_duration ? WALK_DURATION_LABEL[pet.walk_duration] : null;
        const aloneLabel = pet.alone_duration ? ALONE_DURATION_LABEL[pet.alone_duration] : null;

        return (
          <section
            key={pet.id || i}
            id={`pet-${pet.id || i}`}
            className="rounded-2xl border border-border bg-card p-5 md:p-6 scroll-mt-24"
          >
            <div className="flex gap-4 mb-4">
              <PetPhoto
                src={pet.photo_url}
                name={pet.name}
                className="w-24 h-24 md:w-28 md:h-28 rounded-xl"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap mb-1">
                  {pet.name && (
                    <h3 className="text-lg font-semibold text-foreground">{pet.name}</h3>
                  )}
                  {pet.breed && (
                    <span className="text-sm text-muted-foreground">· {pet.breed}</span>
                  )}
                  {pet.age && (
                    <span className="text-xs text-muted-foreground">· {pet.age}</span>
                  )}
                </div>
                {pet.owner_breed_note && (
                  <p className="text-sm text-foreground/90 leading-relaxed mt-1">
                    <span className="font-medium">Selon {ownerName} :</span>{" "}
                    <span className="italic text-muted-foreground">
                      {pet.owner_breed_note}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {hasMedication && (
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/50 p-3 md:p-4 mb-3 flex gap-3">
                <Pill className="h-5 w-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200 mb-1">
                    Médication à administrer
                  </p>
                  <p className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-line leading-relaxed">
                    {pet.medication}
                  </p>
                </div>
              </div>
            )}

            {hasSpecialNeeds && (
              <div className="rounded-xl border border-border bg-muted/40 p-3 md:p-4 mb-3 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground mb-1">
                    Besoins spéciaux
                  </p>
                  <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                    {pet.special_needs}
                  </p>
                </div>
              </div>
            )}

            {hasFood && (
              <div className="rounded-xl border border-border bg-card p-3 md:p-4 mb-3 flex gap-3">
                <Utensils className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground mb-1">
                    Alimentation
                  </p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {pet.food}
                  </p>
                </div>
              </div>
            )}

            {hasCharacter && (
              <div className="rounded-xl border border-border bg-card p-3 md:p-4 mb-3 flex gap-3">
                <Heart className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground mb-1">
                    Caractère
                  </p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {pet.character}
                  </p>
                </div>
              </div>
            )}

            {(activityLabel || walkLabel || aloneLabel) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                {activityLabel && (
                  <div className="rounded-lg bg-muted/40 p-3 flex items-start gap-2">
                    <Activity className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Activité
                      </p>
                      <p className="text-sm font-medium">{activityLabel}</p>
                    </div>
                  </div>
                )}
                {walkLabel && (
                  <div className="rounded-lg bg-muted/40 p-3 flex items-start gap-2">
                    <Footprints className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Balade
                      </p>
                      <p className="text-sm font-medium">{walkLabel}</p>
                    </div>
                  </div>
                )}
                {aloneLabel && (
                  <div className="rounded-lg bg-muted/40 p-3 flex items-start gap-2">
                    <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Solitude tolérée
                      </p>
                      <p className="text-sm font-medium">{aloneLabel}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {pet.breed && (
              <Accordion type="single" collapsible className="mt-2">
                <AccordionItem
                  value={`breed-${pet.id || i}`}
                  className="border border-border rounded-lg bg-accent/20 px-3"
                >
                  <AccordionTrigger className="py-2.5 text-sm font-medium hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" />
                      Voir la fiche race — {pet.breed}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-3">
                    <BreedProfileCard
                      species={pet.species}
                      breed={pet.breed}
                      ownerFirstName={ownerName}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </section>
        );
      })}
    </>
  );
};

export default TabAnimaux;
