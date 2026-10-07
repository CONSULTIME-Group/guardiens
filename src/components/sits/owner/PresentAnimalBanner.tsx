/**
 * Lot L4 : encart dans la gestion d'une annonce publiée sans fiche animal
 * alors que le titre ou la description en cite un. Ouvre l'ajout d'animal.
 */
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { animalToPresent, presentAnimalTitle, type SitAnimalMentionInput } from "@/lib/sitAnimalMention";

export default function PresentAnimalBanner({ sit, petCount }: { sit: SitAnimalMentionInput & { id: string; status?: string | null }; petCount: number }) {
  const navigate = useNavigate();
  const animal = animalToPresent(sit, petCount);
  if (!animal) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-sm text-card-foreground flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1">
        <p className="font-medium">{presentAnimalTitle(animal)}</p>
        <p className="text-muted-foreground">Votre annonce en parle, mais sa fiche n'a pas encore de présentation : les gardiens aiment savoir qui ils vont rencontrer.</p>
      </div>
      <Button
        size="sm"
        onClick={() => {
          void trackEvent("sit_animal_mention_add_pets", { source: "owner_view_published", metadata: { sit_id: sit.id } });
          navigate("/owner-profile?section=animals");
        }}
      >
        Ajouter mon animal
      </Button>
    </div>
  );
}
