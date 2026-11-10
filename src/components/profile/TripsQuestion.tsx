import { useId } from "react";
import { Label } from "@/components/ui/label";
import RadioChipGroup from "./RadioChipGroup";
import { TRIPS_OPTIONS, tripsAnswerOf, tripsColumns, type TripsAnswer, type TripsColumns } from "@/lib/trips";

interface Props {
  value: Partial<TripsColumns>;
  onChange: (columns: TripsColumns) => void;
  /** Libellé de la question ; par défaut « Pour vos trajets sur place ». */
  label?: string;
  /** Phrase sous la question (rôle du champ). */
  roleLine?: string;
  className?: string;
}

/**
 * Question unique des trajets sur place, trois réponses (lot SC1).
 * Même composant partout où la question se pose.
 */
const TripsQuestion = ({ value, onChange, label = "Pour vos trajets sur place", roleLine, className }: Props) => {
  const id = useId();
  const answer = tripsAnswerOf(value) ?? "";
  return (
    <div className={className ?? "space-y-2"} data-field="trips">
      <Label id={`${id}-trips`}>{label}</Label>
      <RadioChipGroup
        ariaLabelledBy={`${id}-trips`}
        options={TRIPS_OPTIONS}
        value={answer}
        onChange={(v) => onChange(tripsColumns((v || null) as TripsAnswer | null))}
      />
      {roleLine && <p className="text-xs text-muted-foreground">{roleLine}</p>}
    </div>
  );
};

export default TripsQuestion;
