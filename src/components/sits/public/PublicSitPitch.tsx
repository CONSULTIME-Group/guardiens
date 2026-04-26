/**
 * Bloc narratif "premier contact" affiché en haut de la page publique
 * d'une annonce. Adresse l'audience d'acquisition (visiteur Facebook /
 * lien partagé) et explique en 5 secondes ce qu'est Guardiens.
 *
 * Visible UNIQUEMENT pour les visiteurs anonymes.
 */
import { Home, PawPrint, MapPin, Calendar } from "lucide-react";

interface PublicSitPitchProps {
  ownerFirstName?: string | null;
  city?: string | null;
  petsSummary: string;
  durationDays: number | null;
  datesLabel: string;
  propertyTypeLabel?: string | null;
}

export default function PublicSitPitch({
  ownerFirstName,
  city,
  petsSummary,
  durationDays,
  datesLabel,
  propertyTypeLabel,
}: PublicSitPitchProps) {
  const name = ownerFirstName || "Un membre Guardiens";
  const cityLabel = city || "sa ville";
  const durationPart = durationDays
    ? `pendant ${durationDays} jour${durationDays > 1 ? "s" : ""}`
    : "";

  return (
    <section
      aria-labelledby="public-sit-pitch-heading"
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-primary/[0.02] to-transparent p-5 md:p-7 mb-6"
    >
      <h2
        id="public-sit-pitch-heading"
        className="font-heading text-lg md:text-xl font-semibold leading-snug text-foreground"
      >
        {name} cherche un voisin de confiance pour veiller sur{" "}
        <span className="text-primary">{petsSummary}</span> à {cityLabel}{" "}
        {durationPart}.
      </h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        En échange, vous êtes <strong className="text-foreground">logé(e) gratuitement</strong>{" "}
        chez {name.split(" ")[0]} — une garde entre voisins, sans paiement entre
        membres, sur la base de la confiance et d'un accord signé.
      </p>

      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-sm">
        <li className="flex items-center gap-2 rounded-xl bg-background/60 border border-border px-3 py-2">
          <Home className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          <span>
            <strong className="text-foreground">Logement offert</strong>
            {propertyTypeLabel ? ` · ${propertyTypeLabel}` : ""}
          </span>
        </li>
        <li className="flex items-center gap-2 rounded-xl bg-background/60 border border-border px-3 py-2">
          <PawPrint className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          <span>
            <strong className="text-foreground">Animaux à câliner</strong>
          </span>
        </li>
        <li className="flex items-center gap-2 rounded-xl bg-background/60 border border-border px-3 py-2">
          <MapPin className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          <span>
            <strong className="text-foreground">{cityLabel}</strong>
          </span>
        </li>
      </ul>

      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5 text-primary/70" aria-hidden="true" />
        {datesLabel}
      </p>
    </section>
  );
}
