import { useEffect } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPricingBaseline } from "@/lib/pricing";
import { trackEvent } from "@/lib/analytics";

/**
 * Pivot pricing "gratuit sans deadline" : tant que PRICING_IS_ACTIVE = false,
 * cette page devient un simple rappel du modèle. Aucun abonnement à gérer.
 */
export default function MySubscription() {
  useEffect(() => {
    trackEvent("pricing_baseline_seen", { metadata: { surface: "my_subscription" } });
  }, []);

  return (
    <>
      <PageMeta
        title="Mon abonnement | Guardiens"
        description="Vous avez accès complet à Guardiens gratuitement. Aucun abonnement à gérer aujourd'hui."
        path="/mon-abonnement"
      />
      <div className="min-h-screen bg-background">
        <PageBreadcrumb items={[{ label: "Mon abonnement" }]} />
        <main className="max-w-2xl mx-auto px-4 py-10 min-w-0">
          <h1 className="font-heading text-3xl md:text-4xl font-bold mb-3">
            Vous avez accès complet à Guardiens
          </h1>
          <p className="font-body text-foreground/70 mb-6">
            Aucun abonnement actif à gérer pour le moment.
          </p>

          <Card className="border-2 border-primary/40">
            <CardContent className="p-6 md:p-8">
              <p className="font-body text-base leading-relaxed text-foreground/80 mb-4">
                {getPricingBaseline()}
              </p>
              <ul className="font-body text-sm space-y-1.5 text-foreground/75 mb-6">
                <li>· Accès à toutes les fonctionnalités</li>
                <li>· Aucune limite d'usage</li>
                <li>· Aucun engagement, aucune carte bancaire requise</li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline">
                  <Link to="/tarifs">Voir nos engagements</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/contact">Nous contacter</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <p className="font-body text-xs text-foreground/55 mt-6">
            Vous serez informé par email 30 jours à l'avance si le modèle change.
          </p>
        </main>
      </div>
    </>
  );
}
