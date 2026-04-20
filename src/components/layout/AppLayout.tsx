import { useState } from "react";
import { Outlet, useSearchParams, Link } from "react-router-dom";
import { Sidebar, BottomNav } from "./Navigation";
import { BackButton } from "./BackButton";
import Breadcrumbs from "./Breadcrumbs";
import NotificationBell from "./NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";

export const AppLayout = () => {
  const { user, refreshProfile } = useAuth();
  usePresenceHeartbeat();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  // Determine if onboarding modal should show
  const isTour = searchParams.get("tour") === "true";
  const needsMinimal = user && !user.onboardingMinimalCompleted;
  const needsOnboarding = user && !user.onboardingCompleted && !user.onboardingDismissedAt;

  const showOnboarding = !dismissed && (isTour || needsMinimal || needsOnboarding);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main id="main-content" className="flex-1 pb-20 md:pb-0 overflow-x-hidden" role="main">
        {/* Mobile top bar : logo + notification bell */}
        <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-2 bg-background/95 backdrop-blur border-b border-border">
          <Link to="/dashboard" className="font-heading text-lg font-bold tracking-tight">
            <span className="text-primary">g</span>
            <span className="text-foreground">uardiens</span>
          </Link>
          <NotificationBell />
        </div>
        {/* Single navigation aid: BackButton on mobile, Breadcrumbs on desktop */}
        <div className="md:hidden">
          <BackButton />
        </div>
        <div className="hidden md:block">
          <Breadcrumbs />
        </div>
        <Outlet />
      </main>
      <BottomNav />

      {showOnboarding && (
        <OnboardingModal
          open
          onClose={() => {
            setDismissed(true);
            setSearchParams({});
            refreshProfile();
          }}
          onMinimalComplete={() => {
            refreshProfile();
          }}
        />
      )}
    </div>
  );
};
