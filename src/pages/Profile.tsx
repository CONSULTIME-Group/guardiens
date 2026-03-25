import { useAuth } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";

const SitterProfile = lazy(() => import("./SitterProfile"));
const OwnerProfile = lazy(() => import("./OwnerProfile"));

const Profile = () => {
  const { activeRole } = useAuth();

  return (
    <Suspense fallback={<div className="p-6 md:p-10 text-center text-muted-foreground py-20">Chargement...</div>}>
      {activeRole === "owner" ? <OwnerProfile /> : <SitterProfile />}
    </Suspense>
  );
};

export default Profile;
