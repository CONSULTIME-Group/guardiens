/** Lot 1 : un seul point d'entrée à la demande pour /bienvenue et /arrivee/*,
 * chaque écran chargé à son tour (aucune liste de dépendances dans l'entrée). */
import { Suspense, type ComponentType, type ReactNode } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { useLocation } from "react-router-dom";

const S = () => import("./ArrivalSitterScreens");
const SCREENS = {
  "/bienvenue": lazy(() => import("./Bienvenue")),
  "/arrivee/vous": lazy(() => import("./ArriveeVous")),
  "/arrivee/depart": lazy(() => import("./ArriveeDepart")),
  "/arrivee/affinites": lazy(() => import("./ArriveeAffinites")),
  "/arrivee/aussi": lazy(() => import("./ArriveeAussi")),
  "/arrivee/garder": lazy(() => S().then((m) => ({ default: m.G2 }))),
  "/arrivee/vous-connaitre": lazy(() => S().then((m) => ({ default: m.G3 }))),
  "/arrivee/savoir-faire": lazy(() => S().then((m) => ({ default: m.G4 }))),
  "/arrivee/application": lazy(() => S().then((m) => ({ default: m.N1 }))),
  "/arrivee/premier-pas": lazy(() => S().then((m) => ({ default: m.G5 }))),
  "/arrivee/entraide": lazy(() => S().then((m) => ({ default: m.E1 }))),
  "*": lazy(() => import("@/pages/NotFound")),
} as const;

/** `g` : garde d'authentification de App.tsx (ProtectedRoute), passée en prop pour alléger l'entrée. */
const ArrivalRoutes = ({ g: Guard }: { g: ComponentType<{ children: ReactNode }> }) => {
  const { pathname } = useLocation();
  const key = pathname.replace(/\/+$/, "") as keyof typeof SCREENS;
  const Screen = SCREENS[key] ?? SCREENS["*"];
  return <Guard><Suspense fallback={null}><Screen /></Suspense></Guard>;
};

export default ArrivalRoutes;
