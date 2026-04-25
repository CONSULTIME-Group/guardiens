import { useAuth } from "@/contexts/AuthContext";
import { useRef, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useToast } from "@/hooks/use-toast";
import OwnerDashboard from "@/components/dashboard/OwnerDashboard";
import SitterDashboard from "@/components/dashboard/SitterDashboard";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { activeRole, user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [displayedRole, setDisplayedRole] = useState(activeRole);
  const [transitioning, setTransitioning] = useState(false);
  const isFirstRender = useRef(true);
  const welcomeShown = useRef(false);
  const activationFired = useRef(false);
  const profileCheckFired = useRef(false);

  // Émettre user_activated UNE fois lors du premier affichage du dashboard
  // après inscription (flag posé dans Register.tsx).
  useEffect(() => {
    if (activationFired.current) return;
    if (!user?.id) return;
    try {
      const flag = typeof window !== "undefined"
        ? localStorage.getItem("first_dashboard_seen")
        : null;
      if (flag === "pending") {
        activationFired.current = true;
        const role = (typeof window !== "undefined"
          ? localStorage.getItem("first_dashboard_role")
          : null) || user.role || null;
        try {
          trackEvent("user_activated", {
            source: "/dashboard",
            metadata: { role, user_id: user.id },
          });
        } catch {}
        try {
          localStorage.removeItem("first_dashboard_seen");
          localStorage.removeItem("first_dashboard_role");
        } catch {}
      }
    } catch {
      // silencieux
    }
  }, [user?.id]);

  // Émettre signup_email_confirmed quand l'utilisateur arrive sur le dashboard
  // depuis le lien de confirmation email (hash type=signup ou type=email).
  // À ce moment la session est active → RLS OK pour insérer dans analytics_events.
  // Une seule émission par utilisateur grâce au flag localStorage.
  useEffect(() => {
    if (!user?.id) return;
    try {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const isFromEmailLink = hash.includes("type=signup") || hash.includes("type=email");
      if (!isFromEmailLink) return;
      const flagKey = `email_confirmed_tracked_${user.id}`;
      if (localStorage.getItem(flagKey)) return;
      localStorage.setItem(flagKey, "1");
      trackEvent("signup_email_confirmed", {
        source: "/dashboard",
        metadata: { role: user.role || null, user_id: user.id },
      });
    } catch {
      // silencieux
    }
  }, [user?.id]);

  // Filet de sécurité : si la session est active mais que le profil est introuvable
  // en base (cas catastrophique du trigger handle_new_user cassé), on alerte sans
  // bloquer l'accès. Sur une inscription normale, le profil existe → aucun toast.
  useEffect(() => {
    if (profileCheckFired.current) return;
    if (!user?.id) return;
    profileCheckFired.current = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
        if (error) return; // erreur réseau / RLS : on ne déclenche pas le filet
        if (!data) {
          try {
            await supabase.from("analytics_events").insert({
              user_id: user.id,
              event_type: "signup_failed",
              source: "/dashboard",
              metadata: { stage: "profile_creation", error_code: "trigger_missing", missing: "profile" },
            });
          } catch {}
          toast({
            variant: "destructive",
            title: "Profil incomplet",
            description: "Votre profil n'a pas été correctement créé. Contactez-nous à contact@guardiens.fr.",
          });
        }
      } catch {
        // silencieux
      }
    })();
  }, [user?.id, toast]);

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
    <div className="overflow-x-hidden">
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
