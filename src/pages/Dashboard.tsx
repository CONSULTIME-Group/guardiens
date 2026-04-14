import { useAuth } from "@/contexts/AuthContext";
import { useRef, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useToast } from "@/hooks/use-toast";
import OwnerDashboard from "@/components/dashboard/OwnerDashboard";
import SitterDashboard from "@/components/dashboard/SitterDashboard";

const Dashboard = () => {
  const { activeRole, user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [displayedRole, setDisplayedRole] = useState(activeRole);
  const [transitioning, setTransitioning] = useState(false);
  const isFirstRender = useRef(true);
  const welcomeShown = useRef(false);

  useEffect(() => {
    if (!welcomeShown.current) {
      const hash = window.location.hash;
      if (hash.includes("type=signup") || hash.includes("type=email")) {
        welcomeShown.current = true;
        toast({ title: "Bienvenue sur Guardiens !" });
        window.history.replaceState({}, "", "/dashboard");
      }
    }
    // Handle role activation query params
    const activated = searchParams.get("activated");
    const cancelled = searchParams.get("cancelled");
    if (activated === "true") {
      toast({ title: "Bienvenue dans l'espace gardien !" });
      window.history.replaceState({}, "", "/dashboard");
    } else if (cancelled === "true") {
      toast({ title: "Vous avez annulé. Vous pouvez activer l'espace gardien quand vous voulez." });
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [toast]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayedRole(activeRole);
      return;
    }
    if (activeRole !== displayedRole) {
      setTransitioning(true);
      const timeout = setTimeout(() => {
        setDisplayedRole(activeRole);
        setTransitioning(false);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [activeRole]);

  return (
    <div className="max-w-4xl mx-auto overflow-x-hidden">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>

      <div
        key={displayedRole}
        className={transitioning ? "animate-fade-out" : "animate-fade-in"}
      >
        {displayedRole === "owner" ? <OwnerDashboard /> : <SitterDashboard />}
      </div>
    </div>
  );
};

export default Dashboard;
