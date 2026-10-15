import { Suspense, type ComponentProps } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

/**
 * Lot perf 6 : l'accord de garde ne s'affiche qu'à l'acceptation ou sur
 * demande ; il ne part plus avec la messagerie ni avec la fiche d'annonce.
 */
const AccordDeGarde = lazyWithRetry(() => import("./AccordDeGarde"), "AccordDeGarde");

export default function LazyAccordDeGarde(props: ComponentProps<typeof AccordDeGarde>) {
  return (
    <Suspense fallback={<div className="h-64 m-6 rounded-xl bg-muted/40 animate-pulse" aria-hidden="true" />}>
      <AccordDeGarde {...props} />
    </Suspense>
  );
}
