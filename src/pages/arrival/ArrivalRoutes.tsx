/** Lot 1 : un seul point d'entrée à la demande pour /bienvenue et /arrivee/*,
 * chaque écran chargé à son tour (aucune liste de dépendances dans l'entrée). */
import { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";

const SCREENS = {
  "/bienvenue": lazy(() => import("./Bienvenue")),
  "/arrivee/vous": lazy(() => import("./ArriveeVous")),
  "/arrivee/depart": lazy(() => import("./ArriveeDepart")),
  "/arrivee/affinites": lazy(() => import("./ArriveeAffinites")),
  "/arrivee/aussi": lazy(() => import("./ArriveeAussi")),
  "*": lazy(() => import("@/pages/NotFound")),
} as const;

const ArrivalRoutes = () => {
  const { pathname } = useLocation();
  const key = pathname.replace(/\/+$/, "") as keyof typeof SCREENS;
  const Screen = SCREENS[key] ?? SCREENS["*"];
  return <Suspense fallback={null}><Screen /></Suspense>;
};

export default ArrivalRoutes;
