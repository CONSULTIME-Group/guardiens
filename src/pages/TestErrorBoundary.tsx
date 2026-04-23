import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CheckCircle2 } from "lucide-react";

/**
 * Composant volontairement cassé : on rend une valeur `undefined`
 * comme s'il s'agissait d'un composant React. Cela déclenche
 * exactement l'erreur "Component is not a function" / "Element type is invalid".
 */
const BrokenImport: any = undefined;

const ExplodingSection = () => {
  // React essaiera d'appeler `undefined` comme composant -> crash contrôlé
  return <BrokenImport label="Je vais planter" />;
};

const TestErrorBoundary = () => {
  const [exploded, setExploded] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Test ErrorBoundary — composant cassé
          </h1>
          <p className="text-sm text-muted-foreground">
            Cette page simule l'erreur « Component is not a function » pour
            vérifier que l'ErrorBoundary affiche bien son UI de dégradation
            dédiée, sans casser le reste de la page.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Section stable (témoin)</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Si vous voyez ce bloc après avoir déclenché l'erreur, l'isolation
            fonctionne correctement.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Zone à risque</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setExploded(true)}
                disabled={exploded}
              >
                Déclencher « Component is not a function »
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setExploded(false);
                  setResetKey((k) => k + 1);
                }}
              >
                Réinitialiser la zone
              </Button>
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-4">
              <ErrorBoundary key={resetKey}>
                {exploded ? (
                  <ExplodingSection />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Composant intact. Cliquez sur le bouton rouge pour le casser.
                  </p>
                )}
              </ErrorBoundary>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seconde section stable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Cette section reste interactive même si la zone à risque a planté.
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default TestErrorBoundary;
