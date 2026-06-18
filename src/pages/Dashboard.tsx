import { useAuth } from "@/contexts/AuthContext";
import { useRef, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useToast } from "@/hooks/use-toast";
import OwnerDashboard from "@/components/dashboard/OwnerDashboard";
import SitterDashboard from "@/components/dashboard/SitterDashboard";
import ProSpaceBanner from "@/components/dashboard/ProSpaceBanner";
import { DashboardErrorBoundary } from "@/components/dashboard/DashboardErrorBoundary";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";


const Dashboard = () => {
  const { activeRole, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [displayedRole, setDisplayedRole] = useState(activeRole);
  const [transitioning, setTransitioning] = useState(false);
  const isFirstRender = useRef(true);
  const welcomeShown = useRef(false);
  const activationFired = useRef(false);
  const profileCheckFired = useRef(false);
  const proRedirectFired = useRef(false);

  // Filet de sécurité parcours pro : si l'utilisateur s'est inscrit avec
  // role=pro mais a atterri sur /dashboard (retour OAuth Google, lien de
  // confirmation email, refresh…), on le renvoie une seule fois vers son
  // espace pro pour qu'il finisse la configuration de sa fiche.
  useEffect(() => {
    if (proRedirectFired.current) return;
    if (!user?.id) return;
    let cancelled = false;
    try {
      const flag = typeof window !== "undefined"
        ? localStorage.getItem("pending_pro_onboarding")
        : null;
      if (flag !== "1") return;
      proRedirectFired.current = true;
      (async () => {
        const { data } = await supabase
          .from("pro_profiles")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        try { localStorage.removeItem("pending_pro_onboarding"); } catch {}
        navigate(data ? "/pros/mon-espace" : "/pros/inscription", { replace: true });
      })();
    } catch {
      // silencieux
    }
    return () => { cancelled = true; };
  }, [user?.id, navigate]);


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

  // Émettre signup_email_confirmed UNE seule fois par utilisateur dès qu'on
  // a la preuve que l'email a été validé (session active sur /dashboard).
  // Trois cas couverts :
  //   1. Lien email classique : hash contient type=signup ou type=email
  //   2. Redirect depuis /auth/confirm (l'event est déjà émis là-bas, on no-op via le flag)
  //   3. Google OAuth ou auto-confirm : pas de hash → on déclenche quand même
  //      car la session active sur /dashboard prouve que l'email est validé.
  // Déduplication via flag localStorage (déjà posé par AuthConfirm si applicable).
  useEffect(() => {
    if (!user?.id) return;
    try {
      const flagKey = `email_confirmed_tracked_${user.id}`;
      if (localStorage.getItem(flagKey)) return;
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const isFromEmailLink = hash.includes("type=signup") || hash.includes("type=email");
      const isFirstDashboard =
        typeof window !== "undefined" &&
        localStorage.getItem("first_dashboard_seen") === "pending";
      // On émet pour tous les cas : email_link, first_dashboard (signup → confirm → dash),
      // OAuth (Google), ou auto-confirm. Avoir une session ici = email validé.
      const shouldEmit = isFromEmailLink || isFirstDashboard;
      if (!shouldEmit) return;
      localStorage.setItem(flagKey, "1");
      trackEvent("signup_email_confirmed", {
        source: "/dashboard",
        metadata: {
          role: user.role || null,
          user_id: user.id,
          via: isFromEmailLink ? "email_link_hash" : "first_dashboard_proxy",
        },
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

      <div className="container mx-auto px-4 pt-4">
        <ProSpaceBanner />
      </div>

      <div
        key={displayedRole}
        className={transitioning ? "animate-fade-out" : "animate-fade-in"}
      >

        <DashboardErrorBoundary
          section={displayedRole === "owner" ? "OwnerDashboard" : "SitterDashboard"}
          label={
            displayedRole === "owner" ? "Le dashboard propriétaire" : "Le dashboard gardien"
          }
        >
          {displayedRole === "owner" ? <OwnerDashboard /> : <SitterDashboard />}
        </DashboardErrorBoundary>
      </div>
    </div>
  );
};

export default Dashboard;
