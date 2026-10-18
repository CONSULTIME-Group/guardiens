import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalUsefulActions } from "@/hooks/useLocalUsefulActions";
import { DEFAULT_LOCAL_ACTION_RADIUS_KM, LOCAL_ACTION_RADII, selectLocalUsefulActions, type SelectedLocalAction } from "@/lib/localUsefulActions";
import { formatCityLabel } from "@/lib/cityLabel";
import { formatDateRangeFr } from "@/lib/formatDateRangeFr";
import { trackEvent } from "@/lib/analytics";

const KIND = { entraide: "Coup de main", projet: "Projet collectif", association: "Association" };

export function LocalUsefulActionsView({ actions, radius, onRadiusChange }: {
  actions: SelectedLocalAction[]; radius: number; onRadiusChange: (radius: number) => void;
}) {
  return (
    <section aria-label="Une action utile près de chez vous" data-testid="local-useful-actions" className="mt-5 border-t border-border/70 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-lg font-semibold">Une action utile près de chez vous</h3>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          À moins de
          <select aria-label="Rayon des actions locales" value={radius} onChange={e => onRadiusChange(Number(e.target.value))} className="min-h-10 rounded-lg border border-border bg-background px-2 text-foreground">
            {LOCAL_ACTION_RADII.map(km => <option key={km} value={km}>{km} km</option>)}
          </select>
        </label>
      </div>
      {actions.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Aucune action ouverte dans ce rayon pour le moment.</p> : (
        <ul className="mt-3 grid list-none gap-3 p-0">
          {actions.map(action => (
            <li key={action.id} className="min-w-0">
            <Link to={action.href} onClick={() => trackEvent("local_useful_action_clicked", { metadata: { action_id: action.id, kind: action.kind, radius_km: radius } })} className="group block min-w-0 rounded-xl border border-border bg-card p-4 hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              <p className="text-xs font-medium text-primary">{KIND[action.kind]}{action.organisation ? ` · ${action.organisation}` : ""}</p>
              <p className="mt-1 break-words text-sm font-semibold text-foreground">{action.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {formatCityLabel(action.city)} · ≈ {Math.max(1, Math.round(action.distanceKm))} km
                {" · "}{/^\d{4}-\d{2}-\d{2}$/.test(action.when) ? formatDateRangeFr(action.when, null) : action.when}
                {" · "}{action.duration}
              </p>
              <span className="mt-2 inline-block text-xs font-semibold text-primary group-hover:underline">Découvrir l’action →</span>
            </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MemberLocalUsefulActions({ userId }: { userId: string }) {
  const storageKey = `guardiens.local-actions-radius.${userId}`;
  const [radius, setRadius] = useState(() => {
    try { const km = Number(localStorage.getItem(storageKey)); if (LOCAL_ACTION_RADII.includes(km as 5 | 15 | 30)) return km; } catch { /* Préférence facultative. */ }
    return DEFAULT_LOCAL_ACTION_RADIUS_KM;
  });
  const [changed, setChanged] = useState(false);
  const { data, isError } = useLocalUsefulActions(userId);
  if (!data?.point || isError) return null;
  const context = { point: data.point, skills: data.skills, interests: data.interests };
  const actions = selectLocalUsefulActions(data.actions, { ...context, radiusKm: radius });
  // Aucun élargissement automatique : le sélecteur reste seulement accessible
  // si une action admissible existe dans un rayon que le membre peut choisir.
  const reachable = actions.length > 0 || LOCAL_ACTION_RADII.some(km => km !== radius
    && selectLocalUsefulActions(data.actions, { ...context, radiusKm: km }).length > 0);
  if (!reachable && !changed) return null;
  return <LocalUsefulActionsView actions={actions} radius={radius} onRadiusChange={km => {
    setRadius(km); setChanged(true);
    try { localStorage.setItem(storageKey, String(km)); } catch { /* Le choix reste utilisable sans stockage. */ }
  }} />;
}

export default function LocalUsefulActions() {
  const { user } = useAuth();
  return user?.id ? <MemberLocalUsefulActions key={user.id} userId={user.id} /> : null;
}
