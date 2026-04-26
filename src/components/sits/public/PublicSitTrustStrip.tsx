/**
 * Bandeau "preuve sociale" léger pour la page publique d'annonce.
 * Affiché aux anonymes uniquement.
 *
 * Volontairement sobre : pas de chiffres inventés. On met en avant les
 * garanties structurelles + un rappel des avis croisés.
 *
 * Vocabulaire : on parle de "gardiens" (rôle réel sur la plateforme).
 */
import { ShieldCheck, Star, FileSignature, LifeBuoy } from "lucide-react";

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Identités vérifiées",
    sub: "Pièce d'identité contrôlée",
  },
  {
    icon: FileSignature,
    title: "Accord de garde signé",
    sub: "Cadre clair pour les deux parties",
  },
  {
    icon: Star,
    title: "Avis croisés",
    sub: "Propriétaires & gardiens s'évaluent",
  },
  {
    icon: LifeBuoy,
    title: "Gardiens d'urgence",
    sub: "Mobilisables si imprévu",
  },
];

export default function PublicSitTrustStrip() {
  return (
    <section
      aria-label="Garanties Guardiens"
      className="rounded-2xl border border-border bg-card px-4 py-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm"
    >
      {PILLARS.map(({ icon: Icon, title, sub }) => (
        <div key={title} className="flex items-start gap-2.5">
          <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-semibold text-foreground leading-tight text-[13px]">{title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{sub}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
