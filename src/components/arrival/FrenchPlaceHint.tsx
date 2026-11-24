import type { FrenchPlaceMatch } from "@/lib/frenchPlaceHint";

/**
 * Lot PAYS1 : sous le code postal du mode « hors de France », quand la saisie
 * désigne une commune française. Le bouton repasse en mode France avec la
 * commune et le code postal officiels.
 */
export const FrenchPlaceHint = ({ match, onLiveInFrance }: { match: FrenchPlaceMatch | null; onLiveInFrance: (m: FrenchPlaceMatch) => void }) => {
  if (!match) return null;
  return (
    <div role="status" data-testid="french-place-hint" className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
      <p className="text-sm text-foreground">
        {match.postalCode} {match.city} est en France. Vous vivez en France ?
      </p>
      <button type="button" className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground" onClick={() => onLiveInFrance(match)}>
        Oui, je vis en France
      </button>
    </div>
  );
};
