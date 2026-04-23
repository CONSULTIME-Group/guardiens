import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CheckCircle2, XCircle, HardDrive } from "lucide-react";

type StorageProbeResult = {
  name: "localStorage" | "sessionStorage";
  available: boolean;
  isMemoryShim: boolean;
  canWrite: boolean;
  canRead: boolean;
  canRemove: boolean;
  roundtripOk: boolean;
  error?: string;
};

const probeStorage = (
  name: "localStorage" | "sessionStorage",
): StorageProbeResult => {
  const result: StorageProbeResult = {
    name,
    available: false,
    isMemoryShim: false,
    canWrite: false,
    canRead: false,
    canRemove: false,
    roundtripOk: false,
  };

  try {
    const storage = (window as any)[name] as Storage | undefined;
    if (!storage) {
      result.error = "API indisponible (window." + name + " = undefined)";
      return result;
    }
    result.available = true;

    // Le shim mémoire installé par installStorageFallback() est un objet
    // littéral, pas une instance de Storage. On le détecte ainsi.
    result.isMemoryShim =
      typeof Storage === "undefined" || !(storage instanceof Storage);

    const probeKey = "__guardiens_probe_" + Date.now();
    const probeValue = "ok-" + Math.random().toString(36).slice(2, 8);

    storage.setItem(probeKey, probeValue);
    result.canWrite = true;

    const readBack = storage.getItem(probeKey);
    result.canRead = readBack !== null;
    result.roundtripOk = readBack === probeValue;

    storage.removeItem(probeKey);
    result.canRemove = storage.getItem(probeKey) === null;
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  return result;
};

/**
 * Témoin avec état local + compteur de montages.
 * - `count` prouve que l'état React n'est pas réinitialisé.
 * - `mountCountRef` prouve que le composant n'a pas été démonté/remonté.
 */
const WitnessSection = ({ label, testId }: { label: string; testId: string }) => {
  const [count, setCount] = useState(0);
  const mountCountRef = useRef(0);

  useEffect(() => {
    mountCountRef.current += 1;
  }, []);

  return (
    <div className="space-y-3" data-testid={testId}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <span>{label}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCount((c) => c + 1)}
          data-testid={`${testId}-increment`}
        >
          Incrémenter
        </Button>
        <span className="text-sm text-foreground">
          Compteur :{" "}
          <strong data-testid={`${testId}-count`} className="font-mono">
            {count}
          </strong>
        </span>
        <span className="text-xs text-muted-foreground">
          Montages :{" "}
          <strong data-testid={`${testId}-mounts`} className="font-mono">
            {mountCountRef.current || 1}
          </strong>
        </span>
      </div>
    </div>
  );
};

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
  const [snapshot, setSnapshot] = useState<{
    topCount: number | null;
    bottomCount: number | null;
    topMounts: number | null;
    bottomMounts: number | null;
  } | null>(null);
  const [storageResults, setStorageResults] = useState<StorageProbeResult[] | null>(null);
  const [storageRanAt, setStorageRanAt] = useState<string | null>(null);

  const runStorageDiagnostic = () => {
    const results = [probeStorage("localStorage"), probeStorage("sessionStorage")];
    setStorageResults(results);
    setStorageRanAt(new Date().toLocaleTimeString());

    // Log cadré et lisible dans la console
    if (typeof console.groupCollapsed === "function") {
      console.groupCollapsed(
        "%c[Storage Diagnostic] Résultats",
        "color:#2563eb;font-weight:bold;",
      );
      results.forEach((r) => {
        const status = r.available && r.roundtripOk ? "✅ OK" : "⚠️ Problème";
        console.log(`${status} — ${r.name}`, {
          available: r.available,
          isMemoryShim: r.isMemoryShim,
          canWrite: r.canWrite,
          canRead: r.canRead,
          canRemove: r.canRemove,
          roundtripOk: r.roundtripOk,
          error: r.error,
        });
      });
      console.groupEnd();
    } else {
      console.log("[Storage Diagnostic]", results);
    }
  };

  const readWitnessState = () => {
    const get = (id: string) => {
      const el = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
      const n = el ? Number(el.textContent) : NaN;
      return Number.isFinite(n) ? n : null;
    };
    return {
      topCount: get("witness-top-count"),
      bottomCount: get("witness-bottom-count"),
      topMounts: get("witness-top-mounts"),
      bottomMounts: get("witness-bottom-mounts"),
    };
  };

  const triggerScenario = (key: Exclude<Scenario, "none">) => {
    setSnapshot(readWitnessState());
    setScenario(key);
  };

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

  // Vérification : on relit l'état des témoins après chaque crash et on compare
  // au snapshot pris juste avant. Si counts/mounts sont identiques, l'isolation
  // a fonctionné et l'état React des témoins a été préservé.
  const verification = (() => {
    if (!snapshot || scenario === "none") return null;
    const current = readWitnessState();
    const checks = [
      {
        label: "Compteur témoin haut préservé",
        ok: current.topCount === snapshot.topCount,
        detail: `${snapshot.topCount} → ${current.topCount}`,
      },
      {
        label: "Compteur témoin bas préservé",
        ok: current.bottomCount === snapshot.bottomCount,
        detail: `${snapshot.bottomCount} → ${current.bottomCount}`,
      },
      {
        label: "Témoin haut non remonté",
        ok: current.topMounts === snapshot.topMounts,
        detail: `${snapshot.topMounts} → ${current.topMounts} montage(s)`,
      },
      {
        label: "Témoin bas non remonté",
        ok: current.bottomMounts === snapshot.bottomMounts,
        detail: `${snapshot.bottomMounts} → ${current.bottomMounts} montage(s)`,
      },
    ];
    return { checks, allOk: checks.every((c) => c.ok) };
  })();

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
            <CardTitle className="text-base">Section stable (témoin haut)</CardTitle>
          </CardHeader>
          <CardContent>
            <WitnessSection
              label="Incrémentez ce compteur AVANT de déclencher une erreur."
              testId="witness-top"
            />
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
                    onClick={() => triggerScenario(s.key)}
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
                  setSnapshot(null);
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
            <CardTitle className="text-base">Seconde section stable (témoin bas)</CardTitle>
          </CardHeader>
          <CardContent>
            <WitnessSection
              label="Incrémentez aussi ce compteur AVANT de déclencher une erreur."
              testId="witness-bottom"
            />
          </CardContent>
        </Card>

        <Card data-testid="storage-diagnostic">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              Diagnostic stockage navigateur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vérifie l'accès en écriture / lecture / suppression sur{" "}
              <code className="font-mono text-xs">localStorage</code> et{" "}
              <code className="font-mono text-xs">sessionStorage</code>. Utile
              pour confirmer si le shim mémoire de fallback est actif (preview
              iframe sandboxée, navigation privée, etc.).
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={runStorageDiagnostic}
                size="sm"
                data-testid="run-storage-diagnostic"
              >
                Lancer le diagnostic
              </Button>
              {storageRanAt && (
                <span className="text-xs text-muted-foreground">
                  Dernière exécution : {storageRanAt}
                </span>
              )}
            </div>

            {storageResults && (
              <div className="space-y-3" data-testid="storage-results">
                {storageResults.map((r) => {
                  const allOk = r.available && r.roundtripOk && r.canRemove;
                  return (
                    <div
                      key={r.name}
                      className={
                        "rounded-md border p-3 " +
                        (allOk
                          ? "border-primary/40 bg-primary/5"
                          : "border-destructive/40 bg-destructive/5")
                      }
                      data-testid={`storage-result-${r.name}`}
                      data-ok={allOk}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {allOk ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="font-mono text-sm font-semibold text-foreground">
                          {r.name}
                        </span>
                        {r.isMemoryShim && (
                          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                            shim mémoire
                          </span>
                        )}
                      </div>

                      <ul className="space-y-1 text-xs">
                        {[
                          ["API disponible", r.available],
                          ["Écriture (setItem)", r.canWrite],
                          ["Lecture (getItem)", r.canRead],
                          ["Aller-retour identique", r.roundtripOk],
                          ["Suppression (removeItem)", r.canRemove],
                        ].map(([label, ok]) => (
                          <li
                            key={label as string}
                            className="flex items-center gap-2"
                          >
                            {ok ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            )}
                            <span className="text-foreground">{label as string}</span>
                          </li>
                        ))}
                      </ul>

                      {r.error && (
                        <p className="mt-2 text-xs font-mono text-destructive break-all">
                          {r.error}
                        </p>
                      )}
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground">
                  Détails complets également disponibles dans la console
                  navigateur (groupe « Storage Diagnostic »).
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {verification && (
          <Card
            className={
              verification.allOk
                ? "border-primary/40 bg-primary/5"
                : "border-destructive/40 bg-destructive/5"
            }
            data-testid="verification-panel"
            data-all-ok={verification.allOk}
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {verification.allOk ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                Vérification automatique des témoins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {verification.checks.map((c) => (
                  <li key={c.label} className="flex items-start gap-2">
                    {c.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    )}
                    <span className="text-foreground">
                      {c.label}{" "}
                      <span className="text-muted-foreground font-mono text-xs">
                        ({c.detail})
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Snapshot pris au moment du déclenchement, comparé à l'état
                actuel des témoins après le crash isolé par l'ErrorBoundary.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
};

export default TestErrorBoundary;
