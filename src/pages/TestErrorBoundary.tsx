import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CheckCircle2 } from "lucide-react";

type Scenario = "none" | "bad-component" | "element-invalid" | "type-error";

/**
 * Scénario 1 : "Component is not a function"
 * On rend une valeur `undefined` comme s'il s'agissait d'un composant.
 */
const BrokenImport: any = undefined;
const BadComponentSection = () => <BrokenImport label="Je vais planter" />;

/**
 * Scénario 2 : "Element type is invalid"
 * On passe un objet (et non un composant ou une string) à React.createElement.
 * Cela déclenche le message "Element type is invalid: expected a string... but got: object".
 */
const InvalidElementType: any = { not: "a component" };
const ElementInvalidSection = () => <InvalidElementType />;

/**
 * Scénario 3 : "Uncaught TypeError"
 * On lit une propriété sur `undefined` pendant le rendu -> TypeError classique.
 */
const TypeErrorSection = () => {
  const data: any = undefined;
  // Accès illégal pendant le render -> capté par l'ErrorBoundary
  return <div>{data.user.name}</div>;
};

const SCENARIOS: Array<{
  key: Exclude<Scenario, "none">;
  label: string;
  description: string;
}> = [
  {
    key: "bad-component",
    label: "« Component is not a function »",
    description:
      "Simule un import cassé : un composant vaut `undefined` au moment du rendu.",
  },
  {
    key: "element-invalid",
    label: "« Element type is invalid »",
    description:
      "Simule un export malformé : on passe un objet à la place d'un composant.",
  },
  {
    key: "type-error",
    label: "« Uncaught TypeError »",
    description:
      "Simule une lecture de propriété sur `undefined` pendant le rendu.",
  },
];

const TestErrorBoundary = () => {
  const [scenario, setScenario] = useState<Scenario>("none");
  const [resetKey, setResetKey] = useState(0);

  const renderScenario = () => {
    switch (scenario) {
      case "bad-component":
        return <BadComponentSection />;
      case "element-invalid":
        return <ElementInvalidSection />;
      case "type-error":
        return <TypeErrorSection />;
      default:
        return (
          <p className="text-sm text-muted-foreground">
            Composant intact. Choisissez un scénario ci-dessus pour déclencher
            une erreur contrôlée.
          </p>
        );
    }
  };

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Test ErrorBoundary — scénarios d'erreurs
          </h1>
          <p className="text-sm text-muted-foreground">
            Cette page simule plusieurs erreurs de rendu pour vérifier que
            l'ErrorBoundary affiche bien son UI de dégradation dédiée, sans
            casser le reste de la page.
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
            <div className="space-y-2">
              {SCENARIOS.map((s) => (
                <div
                  key={s.key}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border border-border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {s.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.description}
                    </p>
                  </div>
                  <Button
                    variant={scenario === s.key ? "secondary" : "destructive"}
                    size="sm"
                    onClick={() => setScenario(s.key)}
                    disabled={scenario === s.key}
                    className="shrink-0"
                  >
                    {scenario === s.key ? "Déclenché" : "Déclencher"}
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScenario("none");
                  setResetKey((k) => k + 1);
                }}
              >
                Réinitialiser la zone
              </Button>
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-4">
              <ErrorBoundary key={resetKey}>{renderScenario()}</ErrorBoundary>
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
