import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import PetsEditor from "@/components/pets/PetsEditor";
import InlineHousingBlock, { type InlineHousingResult } from "./InlineHousingBlock";
import InlineIdentityBlock from "./InlineIdentityBlock";
import InlinePhotoUpload from "./InlinePhotoUpload";
import { Button } from "@/components/ui/button";
import { isIdentityComplete } from "@/lib/setupState";

export interface SetupStepProps {
  userId: string;
  /** Prénom, code postal et pays actuels du profil, chaînes vides si absents. */
  firstName: string;
  postalCode: string;
  /** Code ISO 2 lettres, "FR" par défaut. */
  country: string;
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
  onIdentitySaved: (identity: { firstName: string; postalCode: string; country: string }) => void;
  onPropertySaved: (property: InlineHousingResult) => void;
  onPetsChanged: (pets: any[]) => void;
  onPhotoUploaded: (url: string) => void;
  onContinue: () => void;
  /** Présent seulement quand l'écran a été ouvert volontairement. */
  onBack?: () => void;
  /**
   * Sortie vers le tableau de bord quand l'écran s'ouvre par le préflight :
   * personne ne doit rester enfermé dans cet écran.
   */
  onQuit?: () => void;
}

const Block = ({
  title, done, optional = false, children,
}: { title: string; done: boolean; optional?: boolean; children: React.ReactNode }) => (
  <section
    className={cn(
      "rounded-2xl border p-4 md:p-5",
      done || optional ? "border-border bg-card" : "border-primary/40 bg-primary/5",
    )}
  >
    <div className="flex items-center gap-2 mb-3">
      {done
        ? <Check className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
        : !optional
          ? <AlertCircle className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          : null}
      <h2 className="font-heading text-base font-semibold">{title}</h2>
      {optional && !done && (
        <span className="text-xs text-muted-foreground">Optionnel</span>
      )}
    </div>
    {children}
  </section>
);

/**
 * Première étape éditable du parcours : les éléments indispensables à une
 * annonce publiable se remplissent ici, sans quitter la page ni perdre la
 * saisie déjà commencée. Les animaux sont recommandés, jamais exigés.
 * L'identité (prénom, code postal, pays) est collectée ici quand elle
 * manque au profil : elle porte la géolocalisation de l'annonce.
 */
const CreateSitSetupStep = ({
  userId, firstName, postalCode, country, propertyId, petCount, photos, photoDone, missingLabels,
  onIdentitySaved, onPropertySaved, onPetsChanged, onPhotoUploaded, onContinue, onBack, onQuit,
}: SetupStepProps) => {
  const identityDone = isIdentityComplete(firstName, postalCode, country);
  const housingDone = !!propertyId;
  const petsDone = petCount > 0;
  const allDone = missingLabels.length === 0;

  // Titre comptable et toujours vrai : il suit en direct ce qui reste à
  // renseigner, sans jamais promettre un nombre d'éléments obsolète.
  const remaining = missingLabels.length;
  const headline =
    remaining <= 0
      ? "Tout est prêt, votre annonce peut partir"
      : remaining === 1
        ? "Un dernier élément et votre annonce peut partir"
        : remaining === 2
          ? "Deux éléments et votre annonce peut partir"
          : "Trois éléments et votre annonce peut partir";

  return (
    <div className="px-4 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold mb-2">
          {headline}
        </h1>
        <p className="text-sm text-muted-foreground">
          Les gardiens choisissent une maison et des animaux, pas seulement des dates.
          Tout se remplit ici, vous enchaînez ensuite sur votre annonce sans rien perdre.
        </p>
      </div>

      <Block title="Votre identité" done={identityDone}>
        {identityDone ? (
          <p className="text-sm text-muted-foreground">
            Votre prénom et votre code postal sont enregistrés. Ils servent à localiser votre annonce.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              Votre prénom accompagne votre annonce, le code postal permet de la localiser.
            </p>
            <InlineIdentityBlock
              userId={userId}
              initialFirstName={firstName}
              initialPostalCode={postalCode}
              initialCountry={country}
              onSaved={onIdentitySaved}
            />
          </>
        )}
      </Block>

      <Block title="Votre logement" done={housingDone}>
        {housingDone ? (
          <p className="text-sm text-muted-foreground">
            Votre logement est enregistré. Vous pouvez le détailler plus tard depuis votre profil.
          </p>
        ) : (
          <InlineHousingBlock userId={userId} onSaved={onPropertySaved} />
        )}
      </Block>

      <Block title="Vos animaux, si vous en avez" done={petsDone} optional>
        {propertyId ? (
          <PetsEditor propertyId={propertyId} onChange={onPetsChanged} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Enregistrez d'abord votre logement juste au dessus, vous pourrez ensuite ajouter vos animaux ici.
          </p>
        )}
      </Block>

      <Block title="Une photo de votre logement" done={photoDone}>
        {photoDone && photos.length > 0 ? (
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
        ) : photoDone ? (
          <p className="text-sm text-muted-foreground">
            Vous avez déjà une photo pour votre annonce. Vous pouvez en ajouter d'autres si vous le souhaitez.
          </p>
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

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <Button
          type="button"
          className="w-full h-12 text-base font-semibold"
          onClick={onContinue}
          disabled={!allDone}
        >
          Continuer vers mon annonce
        </Button>
        {!allDone && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Il reste à renseigner : {missingLabels.join(", ")}. Dès que ces éléments sont là,
            le bouton s'active et vous passez à votre annonce.
          </p>
        )}
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onBack}
          >
            Revenir à mon annonce
          </Button>
        )}
        {onQuit && (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onQuit}
          >
            Je préfère faire ça plus tard
          </Button>
        )}
      </div>

    </div>
  );
};

export default CreateSitSetupStep;
