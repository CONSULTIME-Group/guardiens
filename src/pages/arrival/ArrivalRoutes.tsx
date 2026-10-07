/** Lot 1 : un seul module à la demande pour /bienvenue et /arrivee/*. */
import { useLocation } from "react-router-dom";
import Bienvenue from "./Bienvenue";
import ArriveeVous from "./ArriveeVous";
import ArriveeDepart from "./ArriveeDepart";
import ArriveeAffinites from "./ArriveeAffinites";
import ArriveeAussi from "./ArriveeAussi";
import NotFound from "@/pages/NotFound";

const SCREENS: Record<string, () => JSX.Element | null> = {
  "/bienvenue": Bienvenue,
  "/arrivee/vous": ArriveeVous,
  "/arrivee/depart": ArriveeDepart,
  "/arrivee/affinites": ArriveeAffinites,
  "/arrivee/aussi": ArriveeAussi,
};

const ArrivalRoutes = () => {
  const { pathname } = useLocation();
  const Screen = SCREENS[pathname.replace(/\/+$/, "")] ?? NotFound;
  return <Screen />;
};

export default ArrivalRoutes;
