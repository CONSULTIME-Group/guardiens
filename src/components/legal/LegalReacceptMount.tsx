/**
 * Lot J2b : point de montage de la porte de réacceptation (App.tsx, membre
 * connecté). Avant la plus proche date d'effet d'une version à réaccepter,
 * calculée localement au jour de Paris, rien n'est chargé ni appelé : les
 * budgets de lectures P1b et P3 restent identiques. Ensuite, la porte est
 * chargée à la demande par lazyWithRetry (lot F2).
 */
import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { reacceptCheckDue } from "@/config/legalVersions";

const LegalReacceptGate = lazyWithRetry(() => import("./LegalReacceptGate"), "LegalReacceptGate");

const LegalReacceptMount = () =>
  reacceptCheckDue() ? (
    <Suspense fallback={null}>
      <LegalReacceptGate />
    </Suspense>
  ) : null;

export default LegalReacceptMount;
