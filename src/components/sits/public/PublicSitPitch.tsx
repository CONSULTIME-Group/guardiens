/**
 * Bloc narratif "premier contact" affiché en haut de la page publique
 * d'une annonce. Adresse l'audience d'acquisition (visiteur Facebook /
 * lien partagé) et explique en 5 secondes ce qu'est Guardiens.
 *
 * Visible UNIQUEMENT pour les visiteurs anonymes.
 *
 * Vocabulaire : on parle de "gardien" (et non "voisin") — c'est le rôle
 * réel sur la plateforme (vérifié, noté, expérimenté).
 */
import { Home, PawPrint, MapPin, Plane, Heart } from "lucide-react";

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
  const firstName = name.split(" ")[0];
  const cityLabel = city || "sa ville";
  const durationPart = durationDays
    ? `${durationDays} jour${durationDays > 1 ? "s" : ""}`
    : "quelques jours";

  return (
    <section
      aria-labelledby="public-sit-pitch-heading"
      className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/[0.10] via-primary/[0.04] to-transparent p-6 md:p-8 mb-6 shadow-sm"
    >
      {/* Halo décoratif discret */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative">
        <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold text-primary mb-3">
          <Heart className="h-3.5 w-3.5 fill-primary" />
          Une mission de garde à pourvoir
        </p>

        <h2
          id="public-sit-pitch-heading"
          className="font-heading text-xl md:text-2xl font-bold leading-tight text-foreground"
        >
          Devenez le gardien de{" "}
          <span className="text-primary">{petsSummary}</span> à {cityLabel}
          {durationDays ? <> pendant <span className="text-primary">{durationPart}</span></> : null}.
        </h2>

        <p className="mt-3 text-[15px] text-foreground/80 leading-relaxed">
          {firstName} part en voyage et confie sa maison et ses compagnons à un
          gardien Guardiens. <strong className="text-foreground">Vous êtes
          logé(e) gratuitement</strong> en échange de votre présence
          bienveillante&nbsp;: une vraie parenthèse, dans un nouveau décor, à
          votre rythme.
        </p>

        <ul className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-sm">
          <li className="flex items-start gap-2.5 rounded-2xl bg-background/80 backdrop-blur-sm border border-border px-3.5 py-3">
            <Home className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground leading-tight">Logement offert</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {propertyTypeLabel || "Maison ou appartement"}
              </p>
            </div>
          </li>
          <li className="flex items-start gap-2.5 rounded-2xl bg-background/80 backdrop-blur-sm border border-border px-3.5 py-3">
            <PawPrint className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground leading-tight">Animaux à câliner</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {petsSummary}
              </p>
            </div>
          </li>
          <li className="flex items-start gap-2.5 rounded-2xl bg-background/80 backdrop-blur-sm border border-border px-3.5 py-3">
            <Plane className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground leading-tight">Changement de décor</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {cityLabel} · {durationPart}
              </p>
            </div>
          </li>
        </ul>

        <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary/70" aria-hidden="true" />
          {datesLabel}
        </p>
      </div>
    </section>
  );
}
