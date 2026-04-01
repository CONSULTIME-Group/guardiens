import { useAuth } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";

const SitterProfilePage = lazy(() => import("./SitterProfile"));
const OwnerProfilePage = lazy(() => import("./OwnerProfile"));

const Profile = () => {
  const { activeRole } = useAuth();

  return (
    <>
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <Suspense fallback={<div className="p-6 md:p-10 text-center text-muted-foreground py-20">Chargement...</div>}>
        {activeRole === "owner" ? <OwnerProfilePage /> : <SitterProfilePage />}
      </Suspense>
    </>
  );
};

export default Profile;
