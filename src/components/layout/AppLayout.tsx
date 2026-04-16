import { useState } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import { Sidebar, BottomNav } from "./Navigation";
import { BackButton } from "./BackButton";
import Breadcrumbs from "./Breadcrumbs";
import { useAuth } from "@/contexts/AuthContext";
import OnboardingModal from "@/components/onboarding/OnboardingModal";

export const AppLayout = () => {
  const { user, refreshProfile } = useAuth();
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
        <BackButton />
        <Breadcrumbs />
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
