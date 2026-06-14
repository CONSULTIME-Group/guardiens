import { useAuth } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import ProfileSkeleton from "@/components/profile/ProfileSkeleton";

const SitterProfilePage = lazy(() => import("./SitterProfile"));
const OwnerProfilePage = lazy(() => import("./OwnerProfile"));

const Profile = () => {
  const { activeRole } = useAuth();

  return (
    <>
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <Suspense fallback={<ProfileSkeleton />}>
        {activeRole === "owner" ? <OwnerProfilePage /> : <SitterProfilePage />}
      </Suspense>
    </>
  );
};

export default Profile;
