import RadioChipGroup from "./RadioChipGroup";

interface YesNoChipsProps {
  /** true = Oui, false = Non, null = jamais répondu. */
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  ariaLabelledBy?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

const YES_NO_OPTIONS = [
  { value: "yes", label: "Oui" },
  { value: "no", label: "Non" },
] as const;

/**
 * Question oui/non à réponse EXPLICITE.
 *
 * Un interrupteur (Switch) écrit un « non » implicite dès que la page est
 * sauvegardée sans que la question ait été lue : le profil enregistre alors
 * une réponse que la personne n'a jamais donnée. Ici, rien n'est présélectionné
 * (null), et seul un clic écrit un vrai Oui ou un vrai Non. Cliquer l'option
 * déjà choisie retire la réponse (retour à null).
 */
const YesNoChips = ({ value, onChange, ariaLabelledBy, ariaLabel, disabled }: YesNoChipsProps) => (
  <RadioChipGroup
    options={[...YES_NO_OPTIONS]}
    value={value === true ? "yes" : value === false ? "no" : ""}
    onChange={(v) => onChange(v === "yes" ? true : v === "no" ? false : null)}
    ariaLabelledBy={ariaLabelledBy}
    ariaLabel={ariaLabel}
    disabled={disabled}
  />
);

export default YesNoChips;
