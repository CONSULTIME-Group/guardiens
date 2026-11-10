import { useState } from "react";
import { Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import RadioChipGroup from "@/components/profile/RadioChipGroup";

/**
 * Lot SC4 (10/11/2026, arène claude/arene/2026-11-10-score-completion) :
 * « Voiture nécessaire » se demande au propriétaire une fois par logement,
 * après la mise en ligne de son annonce (le parcours de publication ne
 * s'alourdit pas). La réponse s'écrit dans properties.car_required avec
 * l'heure de la réponse (car_required_answered_at), qui distingue un « non »
 * d'un interrupteur jamais touché. Le calcul d'affinité ne change pas : le
 * critère véhicule s'applique à true seulement.
 */
export const CAR_OPTIONS = [
  { value: "yes", label: "Une voiture est nécessaire sur place" },
  { value: "no", label: "Tout se fait sans voiture" },
];

/**
 * La question vient tant que le logement n'a ni réponse datée ni « oui » déjà
 * posé. Tant que la colonne car_required_answered_at manque (migration 0132
 * non appliquée), la question ne vient jamais.
 */
export function shouldAskOwnerCar(property: { car_required?: boolean | null; car_required_answered_at?: string | null } | null | undefined, sitStatus: string | null | undefined): boolean {
  if (!property || sitStatus !== "published") return false;
  if (property.car_required === true) return false;
  if (!("car_required_answered_at" in property)) return false;
  return !property.car_required_answered_at;
}

interface Props {
  propertyId: string;
  sitId: string;
  onAnswered?: (carRequired: boolean, answeredAt: string) => void;
}

const OwnerCarQuestion = ({ propertyId, sitId, onAnswered }: Props) => {
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  if (done) {
    return <p role="status" className="text-xs text-muted-foreground mb-3">Merci, c'est noté pour vos gardiens.</p>;
  }
  const answer = async (v: string) => {
    if (!v) return;
    setFailed(false);
    const carRequired = v === "yes";
    const answeredAt = new Date().toISOString();
    const { error } = await supabase
      .from("properties")
      .update({ car_required: carRequired, car_required_answered_at: answeredAt } as any)
      .eq("id", propertyId);
    // La colonne existe dès que la question s'affiche (shouldAskOwnerCar).
    if (error) { setFailed(true); return; }
    void trackEvent("owner_car_question_answered", { metadata: { sit_id: sitId, car_required: carRequired } });
    setDone(true);
    onAnswered?.(carRequired, answeredAt);
  };
  return (
    <section className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2" aria-labelledby="owner-car-q" data-testid="owner-car-question">
      <p id="owner-car-q" className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Car className="h-4 w-4 text-primary shrink-0" aria-hidden />
        Pour la garde chez vous, une voiture est-elle nécessaire ?
      </p>
      <RadioChipGroup ariaLabelledBy="owner-car-q" options={CAR_OPTIONS} value="" onChange={answer} />
      <p className="text-xs text-muted-foreground">
        Les gardiens véhiculés passent devant quand la voiture compte. Votre réponse rejoint votre logement.
      </p>
      {failed && <p className="text-xs text-destructive">Enregistrement impossible pour le moment. Réessayez.</p>}
    </section>
  );
};

export default OwnerCarQuestion;
