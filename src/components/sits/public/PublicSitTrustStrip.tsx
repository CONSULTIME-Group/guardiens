/**
 * Bandeau "preuve sociale" léger pour la page publique d'annonce.
 * Affiché aux anonymes uniquement.
 *
 * Volontairement sobre : pas de chiffres inventés. On met en avant les
 * garanties structurelles + un rappel des avis croisés.
 */
import { ShieldCheck, Star, Users } from "lucide-react";

export default function PublicSitTrustStrip() {
  return (
    <section
      aria-label="Garanties Guardiens"
      className="rounded-2xl border border-border bg-card px-5 py-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm"
    >
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-semibold text-foreground leading-tight">Identités vérifiées</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pièce d'identité contrôlée</p>
        </div>
      </div>
      <div className="flex items-start gap-2.5">
        <Star className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-semibold text-foreground leading-tight">Avis croisés</p>
          <p className="text-xs text-muted-foreground mt-0.5">Propriétaires & gardiens s'évaluent</p>
        </div>
      </div>
      <div className="flex items-start gap-2.5">
        <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-semibold text-foreground leading-tight">Réseau local</p>
          <p className="text-xs text-muted-foreground mt-0.5">La confiance entre gens du coin</p>
        </div>
      </div>
    </section>
  );
}
