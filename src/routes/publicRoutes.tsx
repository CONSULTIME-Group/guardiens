import { lazy } from "react";
import { Route, Navigate, useParams } from "react-router-dom";
import Landing from "@/pages/Landing";

const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const News = lazy(() => import("@/pages/News"));
const ArticleDetail = lazy(() => import("@/pages/ArticleDetail"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const MentionsLegales = lazy(() => import("@/pages/MentionsLegales"));
const FAQ = lazy(() => import("@/pages/FAQ"));
const GuidesListing = lazy(() => import("@/pages/GuidesListing"));
const GuideDetail = lazy(() => import("@/pages/GuideDetail"));
const CityPage = lazy(() => import("@/pages/CityPage"));
const DepartmentPage = lazy(() => import("@/pages/DepartmentPage"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const EmergencySitter = lazy(() => import("@/pages/EmergencySitter"));
const SmallMissionDetail = lazy(() => import("@/pages/SmallMissionDetail"));
const CreateSmallMission = lazy(() => import("@/pages/CreateSmallMission"));
const PublicSitDetail = lazy(() => import("@/pages/PublicSitDetail"));
const PublicSitterProfile = lazy(() => import("@/pages/PublicSitterProfile"));
const PlancheBadges = lazy(() => import("@/pages/PlancheBadges"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));

const TestAccordLazy = lazy(() =>
  import("@/components/gardes/AccordDeGarde").then((m) => ({
    default: m.AccordDeGardePreview,
  }))
);

const NavigateBlogSlug = () => {
  const { slug } = useParams();
  return <Navigate to={`/actualites/${slug}`} replace />;
};

const NavigateGuideSlug = () => {
  const { slug } = useParams();
  return <Navigate to={`/guides/${slug}`} replace />;
};

const RedirectProfil = () => {
  const { id } = useParams();
  if (!id) return <Navigate to="/" replace />;
  return <Navigate to={`/gardiens/${id}`} replace />;
};

const RedirectProprietaire = () => {
  const { id } = useParams();
  if (!id) return <Navigate to="/" replace />;
  return <Navigate to={`/gardiens/${id}?tab=proprio`} replace />;
};

export { NavigateBlogSlug, NavigateGuideSlug, RedirectProfil, RedirectProprietaire, TestAccordLazy };

export const publicRoutes = (
  PublicOnlyRoute: React.ComponentType<{ children: React.ReactNode }>,
  SmallMissionsRoute: React.ComponentType,
  ProtectedRoute: React.ComponentType<{ children: React.ReactNode }>,
) => (
  <>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
    <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
    <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
    <Route path="/reset-password" element={<ResetPassword />} />

    <Route path="/actualites" element={<News />} />
    <Route path="/actualites/:slug" element={<ArticleDetail />} />
    <Route path="/blog" element={<Navigate to="/actualites" replace />} />
    <Route path="/blog/:slug" element={<NavigateBlogSlug />} />
    <Route path="/a-propos" element={<About />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="/cgu" element={<Terms />} />
    <Route path="/confidentialite" element={<Privacy />} />
    <Route path="/mentions-legales" element={<MentionsLegales />} />
    <Route path="/faq" element={<FAQ />} />
    <Route path="/guides" element={<GuidesListing />} />
    <Route path="/guides/:slug" element={<GuideDetail />} />
    <Route path="/guide" element={<Navigate to="/guides" replace />} />
    <Route path="/guide/:slug" element={<NavigateGuideSlug />} />
    <Route path="/house-sitting/:slug" element={<CityPage />} />
    <Route path="/departement/:slug" element={<DepartmentPage />} />
    <Route path="/tarifs" element={<Pricing />} />
    <Route path="/test-accord" element={<div className="p-6 bg-background min-h-screen"><TestAccordLazy /></div>} />
    <Route path="/gardien-urgence" element={<EmergencySitter />} />
    <Route path="/petites-missions" element={<SmallMissionsRoute />} />
    <Route path="/petites-missions/creer" element={<ProtectedRoute><CreateSmallMission /></ProtectedRoute>} />
    <Route path="/petites-missions/:id" element={<SmallMissionDetail />} />
    <Route path="/profil/:id" element={<RedirectProfil />} />
    <Route path="/proprietaires/:id" element={<RedirectProprietaire />} />
    <Route path="/annonces/:id" element={<PublicSitDetail />} />
    <Route path="/gardiens/:id" element={<PublicSitterProfile />} />
    <Route path="/planche-badges" element={<PlancheBadges />} />
    <Route path="/unsubscribe" element={<Unsubscribe />} />
  </>
);
