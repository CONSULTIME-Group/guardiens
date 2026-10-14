import {
  MODERATION_RULES,
  MODERATION_RULE_GROUP_LABELS,
  type ModerationRuleGroup,
} from "../../../../supabase/functions/_shared/moderation-rules.ts";

/**
 * Lot J2c : choix de la règle des CGU appliquée (articles 7, 10 et 11.4),
 * reprise dans l'email motivé envoyé au membre (CGU 14.5).
 */
interface Props {
  id: string;
  value: string;
  onChange: (ruleId: string) => void;
  disabled?: boolean;
  /** Restreint la liste aux cas d'un groupe (par exemple 11.4). */
  groups?: ModerationRuleGroup[];
}

const GROUPS: ModerationRuleGroup[] = ["7", "10", "11.4"];

export const ModerationRuleSelect = ({ id, value, onChange, disabled, groups = GROUPS }: Props) => (
  <select
    id={id}
    value={value}
    disabled={disabled}
    onChange={(e) => onChange(e.target.value)}
    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
  >
    <option value="">Choisir la règle appliquée</option>
    {groups.map((g) => (
      <optgroup key={g} label={MODERATION_RULE_GROUP_LABELS[g]}>
        {MODERATION_RULES.filter((r) => r.group === g).map((r) => (
          <option key={r.id} value={r.id}>{r.label}</option>
        ))}
      </optgroup>
    ))}
  </select>
);
