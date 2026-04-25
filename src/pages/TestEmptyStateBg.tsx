import EmptyState from "@/components/shared/EmptyState";

/**
 * Page de test temporaire — vérifie le fondu de l'EmptyState dans
 * différents conteneurs (page, carte blanche, section grisée).
 * À supprimer après validation visuelle.
 */
const TestEmptyStateBg = () => {
  return (
    <div className="min-h-screen bg-background p-8 space-y-12">
      <div>
        <h2 className="font-heading text-xl mb-3">1. Sur la page (fond --background)</h2>
        <EmptyState illustration="quietLeaf" title="Contexte page" description="Fond crème de la page directement." />
      </div>

      <div>
        <h2 className="font-heading text-xl mb-3">2. Dans une carte blanche pure (--card)</h2>
        <div className="bg-card rounded-lg border border-border shadow-sm p-6">
          <EmptyState illustration="quietLeaf" title="Contexte carte" description="Carte blanche pure (light) / gris foncé (dark)." />
        </div>
      </div>

      <div>
        <h2 className="font-heading text-xl mb-3">3. Dans une section grisée (--muted)</h2>
        <div className="bg-muted rounded-lg p-6">
          <EmptyState illustration="quietLeaf" title="Contexte section grise" description="Beige clair (light) / gris (dark)." />
        </div>
      </div>

      <div>
        <h2 className="font-heading text-xl mb-3">4. Dans une carte avec fond bleu-gris arbitraire</h2>
        <div className="rounded-lg p-6" style={{ background: "hsl(210 20% 92%)" }}>
          <EmptyState illustration="quietLeaf" title="Fond bleu-gris" description="Couleur exotique pour stress test." />
        </div>
      </div>
    </div>
  );
};

export default TestEmptyStateBg;
