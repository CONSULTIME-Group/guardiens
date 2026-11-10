import { useId } from "react";
import { Car, IdCard, Footprints } from "lucide-react";
import OptionCards, { type OptionCard } from "./OptionCards";
import FieldRole, { type FieldRoleKind } from "./FieldRole";
import { TRIPS_OPTIONS, tripsAnswerOf, tripsColumns, type TripsAnswer, type TripsColumns } from "@/lib/trips";

interface Props {
  value: Partial<TripsColumns>;
  onChange: (columns: TripsColumns) => void;
  /** Libellé de la question ; par défaut « Pour vos trajets sur place ». */
  label?: string;
  /** Phrase sous la question (effet de la réponse). */
  roleLine?: string;
  /** Étiquettes de rôle sous la question (fiche, affinités). */
  roles?: FieldRoleKind[];
  className?: string;
}

const TRIPS_ICONS: Record<TripsAnswer, OptionCard["icon"]> = {
  own_vehicle: Car,
  license_only: IdCard,
  other_means: Footprints,
};

const TRIPS_DESCRIPTIONS: Partial<Record<TripsAnswer, string>> = {
  other_means: "À pied, à vélo, en transports",
};

/** Les trois réponses en cartes, libellés de src/lib/trips.ts (design pastel du 10/11/2026). */
export const TRIPS_CARDS: OptionCard[] = TRIPS_OPTIONS.map((o) => ({
  ...o,
  icon: TRIPS_ICONS[o.value],
  description: TRIPS_DESCRIPTIONS[o.value],
}));

/**
 * Question unique des trajets sur place, trois réponses (lot SC1).
 * Même composant partout où la question se pose.
 */
const TripsQuestion = ({ value, onChange, label = "Pour vos trajets sur place", roleLine, roles, className }: Props) => {
  const id = useId();
  const answer = tripsAnswerOf(value) ?? "";
  return (
    <div className={className ?? "space-y-2.5"} data-field="trips">
      <p id={`${id}-trips`} className="text-base font-medium leading-snug text-foreground">{label}</p>
      <OptionCards
        ariaLabelledBy={`${id}-trips`}
        options={TRIPS_CARDS}
        value={answer}
        onChange={(v) => onChange(tripsColumns((v || null) as TripsAnswer | null))}
      />
      {roleLine && <p className="text-sm text-muted-foreground">{roleLine}</p>}
      {roles && roles.length > 0 && <FieldRole roles={roles} />}
    </div>
  );
};

export default TripsQuestion;
