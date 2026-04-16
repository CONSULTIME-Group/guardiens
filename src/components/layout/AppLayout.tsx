import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar, BottomNav } from "./Navigation";
import { BackButton } from "./BackButton";
import Breadcrumbs from "./Breadcrumbs";
import { useAuth } from "@/contexts/AuthContext";
import MinimalOnboardingDialog from "@/components/onboarding/MinimalOnboardingDialog";

export const AppLayout = () => {
  const { user, refreshProfile } = useAuth();
  const needsMinimal = user && !user.onboardingMinimalCompleted;
  const [dismissed, setDismissed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main id="main-content" className="flex-1 pb-20 md:pb-0 overflow-x-hidden" role="main">
        <BackButton />
        <Breadcrumbs />
        <Outlet />
      </main>
      <BottomNav />

      {needsMinimal && !dismissed && (
        <MinimalOnboardingDialog
          open
          onComplete={() => {
            setDismissed(true);
            refreshProfile();
          }}
        />
      )}
    </div>
  );
};
