/**
 * Lot TRF-6 : tête d'onglet de /admin/traffic, une phrase et trois chiffres.
 */
import type { ReactNode } from "react";

export interface SynthesisKpi { label: string; value: string; hint?: string }

export function TabSynthesis({ phrase, kpis, testid }: { phrase: ReactNode; kpis: SynthesisKpi[]; testid: string }) {
  return (
    <section className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3" data-testid={testid} aria-label="Synthèse">
      <p className="text-xs font-medium text-primary">En une phrase</p>
      <p className="text-base font-medium leading-snug text-foreground">{phrase}</p>
      <dl className="grid grid-cols-3 gap-2">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg bg-card p-2.5">
            <dt className="text-[11px] text-muted-foreground">{k.label}</dt>
            <dd className="font-heading text-xl font-semibold tabular-nums text-foreground">{k.value}</dd>
            {k.hint && <dd className="text-[11px] text-muted-foreground">{k.hint}</dd>}
          </div>
        ))}
      </dl>
    </section>
  );
}

export default TabSynthesis;
