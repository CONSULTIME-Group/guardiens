/**
 * Page de test interne — utilisée UNIQUEMENT par la régression visuelle
 * `tests/visual/empty-state-halo.spec.ts`. Elle rend chaque illustration
 * EmptyState dans 3 contextes représentatifs (page, carte, modale) à des
 * positions stables, pour que Playwright puisse :
 *   1. comparer un screenshot complet à une baseline,
 *   2. échantillonner les pixels autour de chaque illustration et vérifier
 *      qu'ils correspondent EXACTEMENT à la couleur du conteneur parent
 *      (=> détection ciblée du halo crème).
 *
 * Cette page n'est PAS référencée dans la navigation et ne doit jamais
 * apparaître dans le sitemap (filtrage par préfixe `/test/`).
 */
import EmptyState, { ILLUSTRATIONS, type IllustrationKey } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";

const KEYS = Object.keys(ILLUSTRATIONS) as IllustrationKey[];

const Block = ({
  illustration,
  contextLabel,
}: {
  illustration: IllustrationKey;
  contextLabel: "page" | "card" | "modal" | "muted";
}) => (
  <div
    data-test-empty-state
    data-illustration={illustration}
    data-context={contextLabel}
    className="w-full"
  >
    <EmptyState illustration={illustration} title={`${illustration} · ${contextLabel}`} />
  </div>
);

const TestEmptyStates = () => {
  return (
    <main className="min-h-screen bg-background p-4 space-y-8">
      <h1 className="font-heading text-xl">EmptyState halo regression harness</h1>

      {/* 1. PAGE — fond direct = --background */}
      <section data-context-section="page" className="bg-background space-y-6">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground">Page</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {KEYS.map((k) => (
            <Block key={`page-${k}`} illustration={k} contextLabel="page" />
          ))}
        </div>
      </section>

      {/* 2. CARTE — fond = --card (souvent blanc pur) */}
      <section data-context-section="card" className="space-y-6">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground">Carte</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {KEYS.map((k) => (
            <Card key={`card-${k}`} className="p-2">
              <Block illustration={k} contextLabel="card" />
            </Card>
          ))}
        </div>
      </section>

      {/* 3. MODALE simulée — fond = --popover, encadrée d'un overlay sombre */}
      <section data-context-section="modal" className="space-y-6">
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground">Modale</h2>
        <div className="bg-foreground/40 p-6 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {KEYS.map((k) => (
              <div
                key={`modal-${k}`}
                className="bg-popover text-popover-foreground rounded-md p-2 shadow-lg"
              >
                <Block illustration={k} contextLabel="modal" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. SECTION MUTED — détecte les écarts sur fond gris-bleu */}
      <section data-context-section="muted" className="bg-muted text-muted-foreground rounded-lg space-y-6 p-4">
        <h2 className="text-sm uppercase tracking-wider">Section muted</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {KEYS.map((k) => (
            <Block key={`muted-${k}`} illustration={k} contextLabel="muted" />
          ))}
        </div>
      </section>
    </main>
  );
};

export default TestEmptyStates;
