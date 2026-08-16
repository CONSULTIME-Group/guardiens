import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, HeartHandshake, Mail, Sprout, ChevronRight } from "lucide-react";

const LINKS = [
  {
    to: "/admin/traffic?tab=acquisition",
    icon: BarChart3,
    title: "SEO & acquisition",
    description: "Pages ville, IndexNow, trafic IA et moteurs génératifs.",
  },
  {
    to: "/admin/affinity",
    icon: HeartHandshake,
    title: "Affinité",
    description: "Distribution et visibilité du score d'affinité.",
  },
  {
    to: "/admin/emails",
    icon: Mail,
    title: "Santé email",
    description: "Délivrabilité, files d'attente et rappels onboarding.",
  },
  {
    to: "/admin/nurturing",
    icon: Sprout,
    title: "Nurturing",
    description: "Séquences de cycle de vie et complétude des profils.",
  },
] as const;

/**
 * Bloc 5 de la vue d'ensemble admin : cartes-liens vers les pages de
 * pilotage dédiées, en remplacement des blocs de chiffres déplacés.
 */
export const PilotageLinks = () => (
  <section className="space-y-3" aria-label="Pilotage">
    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
      Pilotage
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {LINKS.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="h-full hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4 flex items-start gap-3">
              <l.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground flex items-center justify-between gap-2">
                  {l.title}
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{l.description}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  </section>
);
