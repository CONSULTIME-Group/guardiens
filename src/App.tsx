import { Suspense } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useParams, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { Sidebar, BottomNav } from "./components/layout/Navigation";
import { BackButton } from "./components/layout/BackButton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import SkipToContent from "@/components/layout/SkipToContent";
import OfflineBanner from "@/components/layout/OfflineBanner";
import NetworkErrorMonitor from "@/components/layout/NetworkErrorMonitor";
import { PreviewDiagnosticBanner } from "@/components/PreviewDiagnosticBanner";
import ScrollToTop from "@/components/layout/ScrollToTop";
import PageViewTracker from "@/components/analytics/PageViewTracker";
import CookieConsent from "@/components/layout/CookieConsent";
import { toast } from "sonner";
import { reportError } from "@/lib/errorLogger";

// ──── Critical routes (eager) ────
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import AuthConfirm from "./pages/AuthConfirm";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";

// ──── Lazy-loaded routes ────
const FallbackSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);
const DashboardRouteShell = () => (
  <ProtectedRoute>
    <AppLayout>
      <Dashboard />
    </AppLayout>
  </ProtectedRoute>
);
const AdminLayout = lazy(() => import("@/components/admin/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const SearchOwner = lazy(() => import("./components/search/SearchOwner"));
const Messages = lazy(() => import("./pages/Messages"));
const Sits = lazy(() => import("./pages/Sits"));
const CreateSit = lazy(() => import("./pages/CreateSit"));
const SitDetail = lazy(() => import("./pages/SitDetail"));
const EditSit = lazy(() => import("./pages/EditSit"));
const HouseGuide = lazy(() => import("./pages/HouseGuide"));
const LeaveReview = lazy(() => import("./pages/LeaveReview"));
const MesAvis = lazy(() => import("./pages/MesAvis"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));
const OwnerProfile = lazy(() => import("./pages/OwnerProfile"));
const News = lazy(() => import("./pages/News"));
const ArticleDetail = lazy(() => import("./pages/ArticleDetail"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const AdminArticles = lazy(() => import("./pages/AdminArticles"));
const ArticleEditor = lazy(() => import("./pages/ArticleEditor"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminListings = lazy(() => import("./pages/admin/AdminListings"));
const AdminSitsManagement = lazy(() => import("./pages/admin/AdminSitsManagement"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminReviewDisputes = lazy(() => import("./pages/admin/AdminReviewDisputes"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminVerifications = lazy(() => import("./pages/admin/AdminVerifications"));
const AdminEmails = lazy(() => import("./pages/admin/AdminEmails"));
const AdminExperienceVerification = lazy(() => import("./pages/admin/AdminExperienceVerification"));
const PlancheBadges = lazy(() => import("./pages/PlancheBadges"));
const TestBadgesLongLabels = lazy(() => import("./pages/TestBadgesLongLabels"));
const TestHeroGallery = lazy(() => import("./pages/TestHeroGallery"));
const TestHeroDistribution = lazy(() => import("./pages/TestHeroDistribution"));
const AdminHeroWeights = lazy(() => import("./pages/AdminHeroWeights"));
const TestErrorBoundary = lazy(() => import("./pages/TestErrorBoundary"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const CityPage = lazy(() => import("./pages/CityPage"));
const AdminCityPages = lazy(() => import("./pages/admin/AdminCityPages"));
const FAQ = lazy(() => import("./pages/FAQ"));
const AdminFAQ = lazy(() => import("./pages/admin/AdminFAQ"));
const GuidesListing = lazy(() => import("./pages/GuidesListing"));
const GuideDetail = lazy(() => import("./pages/GuideDetail"));
const AdminGuides = lazy(() => import("./pages/admin/AdminGuides"));
const AdminDepartments = lazy(() => import("./pages/admin/AdminDepartments"));
const DepartmentPage = lazy(() => import("./pages/DepartmentPage"));
const Pricing = lazy(() => import("./pages/Pricing"));
const SmallMissions = lazy(() => import("./pages/SmallMissions"));
const SmallMissionsPublic = lazy(() => import("./pages/SmallMissionsPublic"));
const SmallMissionDetail = lazy(() => import("./pages/SmallMissionDetail"));
const CreateSmallMission = lazy(() => import("./pages/CreateSmallMission"));
const MentionsLegales = lazy(() => import("./pages/MentionsLegales"));
const AdminSmallMissions = lazy(() => import("./pages/admin/AdminSmallMissions"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminLegal = lazy(() => import("./pages/admin/AdminLegal"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminContactMessages = lazy(() => import("./pages/admin/AdminContactMessages"));
const AdminSEO = lazy(() => import("./pages/admin/AdminSEO"));
const AdminSkills = lazy(() => import("./pages/admin/AdminSkills"));
const AdminMassEmails = lazy(() => import("./pages/admin/AdminMassEmails"));
const AdminRelanceIncomplet = lazy(() => import("./pages/admin/AdminRelanceIncomplet"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminErrors = lazy(() => import("./pages/admin/AdminErrors"));
const EmergencySitter = lazy(() => import("./pages/EmergencySitter"));
const MySubscription = lazy(() => import("./pages/MySubscription"));
const Favorites = lazy(() => import("./pages/Favorites"));
const PublicSitDetail = lazy(() => import("./pages/PublicSitDetail"));
const PublicSitterProfile = lazy(() => import("./pages/PublicSitterProfile"));

const TestAccordLazy = lazy(() =>
  import("./components/gardes/AccordDeGarde").then((m) => ({
    default: m.AccordDeGardePreview,
  }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      onError: (error) => {
        console.error("[Mutation error]", error);
        reportError(error, { source: "react-query-mutation" });
        toast.error("Une erreur est survenue. Veuillez réessayer.");
      },
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <FallbackSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

// Redirige /register vers /inscription en préservant query string + hash
// (utile pour les liens externes : Facebook Ads, parrainage ?ref=, UTM, etc.)
const RegisterRedirect = () => {
  const location = useLocation();
  return <Navigate to={`/inscription${location.search}${location.hash}`} replace />;
};

const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement...</div>;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const SmallMissionsRoute = () => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 pb-20 md:pb-0">
          <BackButton />
          <SmallMissions />
        </main>
        <BottomNav />
      </div>
    );
  }
  return <SmallMissionsPublic />;
};

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

const AppRoutes = () => (
  <Suspense fallback={<FallbackSpinner />}>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<RegisterRedirect />} />
      <Route path="/inscription" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
      <Route path="/auth/confirm" element={<AuthConfirm />} />
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
      {/* Legacy: garde longue durée supprimée — redirige vers la home publique */}
      <Route path="/long-stays/:id" element={<Navigate to="/" replace />} />
      <Route path="/actualites/gardes-longue-duree-guide" element={<Navigate to="/actualites" replace />} />
      <Route path="/profil/:id" element={<RedirectProfil />} />
      <Route path="/proprietaires/:id" element={<RedirectProprietaire />} />
      <Route path="/annonces/:id" element={<PublicSitDetail />} />
      <Route path="/gardiens/:id" element={<PublicSitterProfile />} />
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/listings" element={<AdminListings />} />
        <Route path="/admin/sits-management" element={<AdminSitsManagement />} />
        <Route path="/admin/reviews" element={<AdminReviews />} />
        <Route path="/admin/review-disputes" element={<AdminReviewDisputes />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/verifications" element={<AdminVerifications />} />
        <Route path="/admin/emails" element={<AdminEmails />} />
        <Route path="/admin/experiences" element={<AdminExperienceVerification />} />
        <Route path="/admin/articles" element={<AdminArticles />} />
        <Route path="/admin/articles/:id" element={<ArticleEditor />} />
        <Route path="/admin/city-pages" element={<AdminCityPages />} />
        <Route path="/admin/guides" element={<AdminGuides />} />
        <Route path="/admin/departments" element={<AdminDepartments />} />
        <Route path="/admin/faq" element={<AdminFAQ />} />
        <Route path="/admin/small-missions" element={<AdminSmallMissions />} />
        <Route path="/admin/legal" element={<AdminLegal />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/contact-messages" element={<AdminContactMessages />} />
        <Route path="/admin/seo" element={<AdminSEO />} />
        <Route path="/admin/skills" element={<AdminSkills />} />
        <Route path="/admin/envois-groupes" element={<AdminMassEmails />} />
        <Route path="/admin/relance-incomplet" element={<AdminRelanceIncomplet />} />
        <Route path="/admin/messages" element={<AdminMessages />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/admin/errors" element={<AdminErrors />} />
      </Route>
      {/* App routes */}
      <Route path="/dashboard" element={<DashboardRouteShell />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/profile" element={<Profile />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/recherche" element={<SearchPage />} />
        <Route path="/recherche-gardiens" element={<SearchOwner />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/sits" element={<Sits />} />
        <Route path="/sits/create" element={<CreateSit />} />
        <Route path="/sits/:id" element={<SitDetail />} />
        <Route path="/sits/:id/edit" element={<EditSit />} />
        <Route path="/review/:sitId" element={<LeaveReview />} />
        <Route path="/mes-avis" element={<MesAvis />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/house-guide/:propertyId" element={<HouseGuide />} />
        <Route path="/owner-profile" element={<OwnerProfile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/mon-abonnement" element={<MySubscription />} />
        <Route path="/favoris" element={<Favorites />} />
      </Route>
      <Route path="/planche-badges" element={<PlancheBadges />} />
      <Route path="/test/badges-long-labels" element={<TestBadgesLongLabels />} />
      <Route path="/test/hero-gallery" element={<TestHeroGallery />} />
      <Route path="/test/hero-distribution" element={<TestHeroDistribution />} />
      <Route path="/test/empty-state-bg" element={<TestEmptyStateBg />} />
      <Route path="/admin/hero-weights" element={<AdminHeroWeights />} />
      <Route path="/test/error-boundary" element={<TestErrorBoundary />} />
      <Route path="/unsubscribe" element={<Unsubscribe />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <SkipToContent />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <PageViewTracker />
              <OfflineBanner />
              <NetworkErrorMonitor />
              <PreviewDiagnosticBanner />
              <AppRoutes />
              <CookieConsent />
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
