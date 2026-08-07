import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import PetsEditor from "@/components/pets/PetsEditor";
import InlineHousingBlock, { type InlineHousingResult } from "./InlineHousingBlock";
import InlinePhotoUpload from "./InlinePhotoUpload";
import { Button } from "@/components/ui/button";

export interface SetupStepProps {
  userId: string;
  propertyId: string | null;
  petCount: number;
  photos: string[];
  /**
   * Verdict photo calculé par le parcours, toutes sources confondues : galerie,
   * photos du logement, photo de couverture. Source unique de vérité.
   */
  photoDone: boolean;
  /** Libellés exacts de ce qui reste à renseigner, source unique côté parcours. */
  missingLabels: string[];
  onPropertySaved: (property: InlineHousingResult) => void;
  onPetsChanged: (pets: any[]) => void;
  onPhotoUploaded: (url: string) => void;
  onContinue: () => void;
  /** Présent seulement quand l'écran a été ouvert volontairement. */
  onBack?: () => void;
}

const Block = ({
  title, done, children,
}: { title: string; done: boolean; children: React.ReactNode }) => (
  <section
    className={cn(
      "rounded-2xl border p-4 md:p-5",
      done ? "border-border bg-card" : "border-primary/40 bg-primary/5",
    )}
  >
    <div className="flex items-center gap-2 mb-3">
      {done
        ? <Check className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
        : <AlertCircle className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />}
      <h2 className="font-heading text-base font-semibold">{title}</h2>
    </div>
    {children}
  </section>
);

/**
 * Première étape éditable du parcours : les trois éléments indispensables à une
 * annonce publiable se remplissent ici, sans quitter la page ni perdre la
 * saisie déjà commencée.
 */
const CreateSitSetupStep = ({
  userId, propertyId, petCount, photos, photoDone, missingLabels,
  onPropertySaved, onPetsChanged, onPhotoUploaded, onContinue, onBack,
}: SetupStepProps) => {
  const housingDone = !!propertyId;
  const petsDone = petCount > 0;
  const allDone = missingLabels.length === 0;



  return (
    <div className="px-4 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">
          Trois éléments et votre annonce peut partir
        </h1>
        <p className="text-sm text-muted-foreground">
          Les gardiens choisissent une maison et des animaux, pas seulement des dates.
          Tout se remplit ici, vous enchaînez ensuite sur votre annonce sans rien perdre.
        </p>
      </div>

      <Block title="Votre logement" done={housingDone}>
        {housingDone ? (
          <p className="text-sm text-muted-foreground">
            Votre logement est enregistré. Vous pouvez le détailler plus tard depuis votre profil.
          </p>
        ) : (
          <InlineHousingBlock userId={userId} onSaved={onPropertySaved} />
        )}
      </Block>

      <Block title="Les animaux à faire garder" done={petsDone}>
        {propertyId ? (
          <PetsEditor propertyId={propertyId} onChange={onPetsChanged} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Enregistrez d'abord votre logement juste au dessus, vous pourrez ensuite ajouter vos animaux ici.
          </p>
        )}
      </Block>

      <Block title="Une photo de votre logement" done={photoDone}>
        {photoDone ? (
          <div className="flex flex-wrap gap-2">
            {photos.slice(0, 6).map((url, i) => (
              <img
                key={`${url}-${i}`}
                src={url}
                alt=""
                loading="lazy"
                className="h-20 w-28 rounded-lg object-cover border border-border"
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-3">
            Une seule photo suffit pour commencer, vous pourrez en ajouter d'autres ensuite.
          </p>
        )}
        <div className="mt-3">
          <InlinePhotoUpload
            userId={userId}
            nextPosition={photos.length}
            label={photoDone ? "Ajouter une autre photo" : "Ajouter une photo"}
            onUploaded={onPhotoUploaded}
          />
        </div>
      </Block>

      <div className="rounded-xl border border-border bg-card p-4">
        <Button
          type="button"
          className="w-full h-12 text-base font-semibold"
          onClick={onContinue}
          disabled={!allDone}
        >
          Continuer vers mon annonce
        </Button>
        {!allDone && (
          <p className="text-sm text-muted-foreground mt-2" aria-live="polite">
            Il reste à renseigner : {missingLabels.join(", ")}. Dès que ces éléments sont là,
            le bouton s'active et vous passez à votre annonce.
          </p>
        )}

      </div>
    </div>
  );
};

export default CreateSitSetupStep;
