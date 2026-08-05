import { useAuth } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";
import Head from "@/components/seo/Head";
import ProfileSkeleton from "@/components/profile/ProfileSkeleton";

const SitterProfilePage = lazy(() => import("./SitterProfile"));
const OwnerProfilePage = lazy(() => import("./OwnerProfile"));

const Profile = () => {
  const { activeRole } = useAuth();

  return (
    <>
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
      <Suspense fallback={<ProfileSkeleton />}>
        {activeRole === "owner" ? <OwnerProfilePage /> : <SitterProfilePage />}
      </Suspense>
    </>
  );
};

export default Profile;
