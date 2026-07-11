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
import { PreviewDiagnosticBanner } from "@/components/PreviewDiagnosticBanner";
import DuplicateAccountGuard from "@/components/auth/DuplicateAccountGuard";
import ScrollToTop from "@/components/layout/ScrollToTop";
import DeferredTrackers from "@/components/analytics/DeferredTrackers";
// CookieConsent retiré (mesure d'audience exemptée CNIL)
import { toast } from "sonner";
import { reportError } from "@/lib/errorLogger";

// ──── Critical routes (eager) ────
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import AuthConfirm from "./pages/AuthConfirm";
import { AppLayout } from "@/components/layout/AppLayout";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

// ──── Lazy-loaded routes ────
const FallbackSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);
// Dashboard est lazy : il tire OngoingSitHero, MonAnnonceCard et tout le
// graphe propriétaire (~40Ko de chunks). Inutile sur /login, /landing, etc.
const Dashboard = lazy(() => import("./pages/Dashboard"));
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
const SeoDebug = lazy(() => import("./pages/SeoDebug"));
const BuildInfo = lazy(() => import("./pages/BuildInfo"));
const AuditTarifs = lazy(() => import("./pages/AuditTarifs"));
const AdminPrerender = lazy(() => import("./pages/AdminPrerender"));
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
const ArticleInventaire = lazy(() => import("./pages/ArticleInventaire"));
const AdminAnalysisRequests = lazy(() => import("./pages/admin/AdminAnalysisRequests"));
const AuthorPage = lazy(() => import("./pages/AuthorPage"));
const About = lazy(() => import("./pages/About"));
const Observatoire = lazy(() => import("./pages/Observatoire"));
const BreedsListing = lazy(() => import("./pages/BreedsListing"));
const BreedPage = lazy(() => import("./pages/BreedPage"));
const Contact = lazy(() => import("./pages/Contact"));
const Terms = lazy(() => import("./pages/Terms"));
const Cgs = lazy(() => import("./pages/Cgs"));
const Privacy = lazy(() => import("./pages/Privacy"));
const AdminArticles = lazy(() => import("./pages/AdminArticles"));
const ProsListing = lazy(() => import("./pages/ProsListing"));
const ProDetail = lazy(() => import("./pages/ProDetail"));
const ProOnboarding = lazy(() => import("./pages/ProOnboarding"));
const OnboardingAffinity = lazy(() => import("./pages/OnboardingAffinity"));
const MyProProfile = lazy(() => import("./pages/MyProProfile"));
const ProCategoryListing = lazy(() => import("./pages/ProCategoryListing"));
const AdminProDirectory = lazy(() => import("./pages/admin/AdminProDirectory"));
const ArticleEditor = lazy(() => import("./pages/ArticleEditor"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminAudit = lazy(() => import("./pages/admin/AdminAudit"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminListings = lazy(() => import("./pages/admin/AdminListings"));
const AdminSitsManagement = lazy(() => import("./pages/admin/AdminSitsManagement"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminReviewDisputes = lazy(() => import("./pages/admin/AdminReviewDisputes"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminVerifications = lazy(() => import("./pages/admin/AdminVerifications"));
const AdminPros = lazy(() => import("./pages/admin/AdminPros"));
const AdminEmails = lazy(() => import("./pages/admin/AdminEmails"));
const AdminEmailHealth = lazy(() => import("./pages/admin/AdminEmailHealth"));
const AdminAlma = lazy(() => import("./pages/admin/AdminAlma"));
const AdminExperienceVerification = lazy(() => import("./pages/admin/AdminExperienceVerification"));
const PlancheBadges = lazy(() => import("./pages/PlancheBadges"));
const TestBadgesLongLabels = lazy(() => import("./pages/TestBadgesLongLabels"));
const TestHeroGallery = lazy(() => import("./pages/TestHeroGallery"));
const TestHeroDistribution = lazy(() => import("./pages/TestHeroDistribution"));
const AdminHeroWeights = lazy(() => import("./pages/AdminHeroWeights"));
const TestErrorBoundary = lazy(() => import("./pages/TestErrorBoundary"));
const TestEmptyStates = lazy(() => import("./pages/TestEmptyStates"));

const PreviewOngoingSitHero = lazy(() => import("./pages/dev/PreviewOngoingSitHero"));
const PreviewMissionCards = lazy(() => import("./pages/dev/PreviewMissionCards"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const EmailPreferences = lazy(() => import("./pages/EmailPreferences"));
const CityPage = lazy(() => import("./pages/CityPage"));
const AdminCityPages = lazy(() => import("./pages/admin/AdminCityPages"));
const FAQ = lazy(() => import("./pages/FAQ"));
const AdminFAQ = lazy(() => import("./pages/admin/AdminFAQ"));
const GuidesListing = lazy(() => import("./pages/GuidesListing"));
const GuideDetail = lazy(() => import("./pages/GuideDetail"));
const AdminGuides = lazy(() => import("./pages/admin/AdminGuides"));
const AdminDepartments = lazy(() => import("./pages/admin/AdminDepartments"));
const AdminBreeds = lazy(() => import("./pages/admin/AdminBreeds"));
const AdminLongTailArticles = lazy(() => import("./pages/admin/AdminLongTailArticles"));
const AdminArticlesRefreshPostPivot = lazy(() => import("./pages/admin/AdminArticlesRefreshPostPivot"));
const Parrainage = lazy(() => import("./pages/Parrainage"));
const DevenirHomeSitter = lazy(() => import("./pages/DevenirHomeSitter"));
const AlmaTips = lazy(() => import("./pages/AlmaTips"));
const AlmaEvolution = lazy(() => import("./pages/AlmaEvolution"));

const DepartmentPage = lazy(() => import("./pages/DepartmentPage"));
const Pricing = lazy(() => import("./pages/Pricing"));

const SmallMissionDetail = lazy(() => import("./pages/SmallMissionDetail"));
const MissionsCityPage = lazy(() => import("./pages/MissionsCityPage"));
const CreateSmallMission = lazy(() => import("./pages/CreateSmallMission"));
const MentionsLegales = lazy(() => import("./pages/MentionsLegales"));
const AdminSmallMissions = lazy(() => import("./pages/admin/AdminSmallMissions"));
const Questions = lazy(() => import("./pages/Questions"));
const EntraideHub = lazy(() => import("./pages/EntraideHub"));
const QuestionDetail = lazy(() => import("./pages/QuestionDetail"));
const QuestionCreate = lazy(() => import("./pages/QuestionCreate"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminLegal = lazy(() => import("./pages/admin/AdminLegal"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminContactMessages = lazy(() => import("./pages/admin/AdminContactMessages"));
const AdminSEO = lazy(() => import("./pages/admin/AdminSEO"));
const AdminLifecycle = lazy(() => import("./pages/admin/AdminLifecycle"));
const AdminSkills = lazy(() => import("./pages/admin/AdminSkills"));
const AdminMassEmails = lazy(() => import("./pages/admin/AdminMassEmails"));
const AdminMassEmailsStats = lazy(() => import("./pages/admin/AdminMassEmailsStats"));
const AdminRelanceIncomplet = lazy(() => import("./pages/admin/AdminRelanceIncomplet"));
const AdminNurturing = lazy(() => import("./pages/admin/AdminNurturing"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminTraffic = lazy(() => import("./pages/admin/AdminTraffic"));
const AdminErrors = lazy(() => import("./pages/admin/AdminErrors"));
const AdminDiagnostics = lazy(() => import("./pages/admin/AdminDiagnostics"));
const AdminTestSitterFields = lazy(() => import("./pages/admin/AdminTestSitterFields"));
const EmergencySitter = lazy(() => import("./pages/EmergencySitter"));
const MySubscription = lazy(() => import("./pages/MySubscription"));
const Favorites = lazy(() => import("./pages/Favorites"));
const PublicSitDetail = lazy(() => import("./pages/PublicSitDetail"));
const PublicListings = lazy(() => import("./pages/PublicListings"));
const InternationalListings = lazy(() => import("./pages/InternationalListings"));
const DemoSitDetail = lazy(() => import("./pages/DemoSitDetail"));
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
  const location = useLocation();
  if (loading) return <FallbackSpinner />;
  if (!isAuthenticated) {
    // Preserve the originally requested URL so the user is returned
    // to it after a successful login/signup.
    const target = `${location.pathname}${location.search}${location.hash}`;
    const safe = target.startsWith("/") && !target.startsWith("//") ? target : "/dashboard";
    const redirectQuery = safe && safe !== "/dashboard"
      ? `?redirect=${encodeURIComponent(safe)}`
      : "";
    return <Navigate to={`/login${redirectQuery}`} replace />;
  }
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


const ParrainageRoute = () => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return (
      <AppLayout>
        <Parrainage />
      </AppLayout>
    );
  }
  return <Parrainage />;
};

// Routes de contenu (ressources, SEO) : coquille AppLayout pour les
// utilisateurs connectés, page publique inchangée pour les visiteurs.
const ContentRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <AppLayout>{children}</AppLayout>;
  return <>{children}</>;
};

// Coquille publique complète (PublicHeader + PublicFooter) pour les visiteurs
// non connectés sur les pages de contenu/SEO qui ne rendent PAS leur propre
// PublicHeader. Pour les utilisateurs connectés : AppLayout (sidebar).
const PublicShellRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <AppLayout>{children}</AppLayout>;
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <main className="flex-1 min-w-0">{children}</main>
      <PublicFooter />
    </div>
  );
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
      
      <Route path="/conseils" element={<ContentRoute><AlmaTips /></ContentRoute>} />
      <Route path="/alma" element={<AppLayout><AlmaEvolution /></AppLayout>} />
      <Route path="/actualites" element={<ContentRoute><News /></ContentRoute>} />
      <Route path="/actualites/inventaire-guardiens-france" element={<PublicShellRoute><ArticleInventaire /></PublicShellRoute>} />
      <Route path="/actualites/:slug" element={<PublicShellRoute><ArticleDetail /></PublicShellRoute>} />
      <Route path="/auteurs/:slug" element={<AuthorPage />} />
      <Route path="/articles" element={<Navigate to="/actualites" replace />} />
      <Route path="/articles/:slug" element={<NavigateBlogSlug />} />
      <Route path="/blog" element={<Navigate to="/actualites" replace />} />
      <Route path="/blog/:slug" element={<NavigateBlogSlug />} />
      <Route path="/a-propos" element={<About />} />
      <Route path="/observatoire-garde-animaux" element={<PublicShellRoute><Observatoire /></PublicShellRoute>} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/cgu" element={<Terms />} />
      <Route path="/cgs" element={<Cgs />} />
      <Route path="/confidentialite" element={<Privacy />} />
      <Route path="/mentions-legales" element={<MentionsLegales />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/guides" element={<ContentRoute><GuidesListing /></ContentRoute>} />
      <Route path="/guides/:slug" element={<PublicShellRoute><GuideDetail /></PublicShellRoute>} />
      <Route path="/guide" element={<Navigate to="/guides" replace />} />
      <Route path="/guide/:slug" element={<NavigateGuideSlug />} />
      <Route path="/house-sitting/:slug" element={<PublicShellRoute><CityPage /></PublicShellRoute>} />
      <Route path="/races" element={<PublicShellRoute><BreedsListing /></PublicShellRoute>} />
      <Route path="/races/:slug" element={<PublicShellRoute><BreedPage /></PublicShellRoute>} />
      <Route path="/departement/:slug" element={<PublicShellRoute><DepartmentPage /></PublicShellRoute>} />

      <Route path="/tarifs" element={<Pricing />} />
      <Route path="/test-accord" element={<div className="p-6 bg-background min-h-screen"><TestAccordLazy /></div>} />
      <Route path="/gardien-urgence" element={<EmergencySitter />} />
      <Route path="/petites-missions" element={<ContentRoute><EntraideHub /></ContentRoute>} />
      <Route path="/petites-missions/creer" element={<ProtectedRoute><CreateSmallMission /></ProtectedRoute>} />
      <Route path="/petites-missions/nouveau" element={<Navigate to="/petites-missions/creer" replace />} />
      <Route path="/petites-missions/lyon" element={<MissionsCityPage />} />
      <Route path="/petites-missions/:id" element={<SmallMissionDetail />} />
      <Route path="/questions" element={<Navigate to="/petites-missions?tab=questions" replace />} />
      <Route path="/questions/nouvelle" element={<ProtectedRoute><AppLayout><QuestionCreate /></AppLayout></ProtectedRoute>} />
      <Route path="/questions/:id" element={<AppLayout><QuestionDetail /></AppLayout>} />
      <Route path="/actualites/gardes-longue-duree-guide" element={<Navigate to="/actualites" replace />} />
      <Route path="/profil/:id" element={<RedirectProfil />} />
      <Route path="/proprietaires/:id" element={<RedirectProprietaire />} />
      <Route path="/annonces" element={<PublicListings />}/>
      <Route path="/annonces/international" element={<AppLayout><InternationalListings /></AppLayout>} />
      <Route path="/annonces/demo/:slug" element={<DemoSitDetail />} />
      <Route path="/annonces/:id" element={<PublicSitDetail />} />
      <Route path="/gardiens/:id" element={<PublicSitterProfile />} />
      <Route path="/pros" element={<ContentRoute><ProsListing /></ContentRoute>} />
      <Route path="/pros/inscription" element={<AppLayout><ProOnboarding /></AppLayout>} />
      <Route path="/onboarding/affinity" element={<ProtectedRoute><OnboardingAffinity /></ProtectedRoute>} />
      <Route path="/pros/mon-espace" element={<AppLayout><MyProProfile /></AppLayout>} />

      <Route path="/pros/categorie/:catSlug" element={<AppLayout><ProCategoryListing /></AppLayout>} />
      <Route path="/pros/categorie/:catSlug/:villeSlug" element={<AppLayout><ProCategoryListing /></AppLayout>} />
      <Route path="/pros/:slug" element={<AppLayout><ProDetail /></AppLayout>} />
      <Route element={<AdminLayout />}>
        <Route path="/admin/seo-debug" element={<SeoDebug />} />
        <Route path="/admin/build-info" element={<BuildInfo />} />
        <Route path="/admin/audit-tarifs" element={<AuditTarifs />} />
        <Route path="/admin/prerender" element={<AdminPrerender />} />
        <Route path="/admin" element={<AdminOverview />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/audit" element={<AdminAudit />} />
        <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/listings" element={<AdminListings />} />
        <Route path="/admin/sits-management" element={<AdminSitsManagement />} />
        <Route path="/admin/reviews" element={<AdminReviews />} />
        <Route path="/admin/review-disputes" element={<AdminReviewDisputes />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/verifications" element={<AdminVerifications />} />
        <Route path="/admin/pros" element={<AdminPros />} />
        <Route path="/admin/pros-annuaire" element={<AdminProDirectory />} />
        <Route path="/admin/emails" element={<AdminEmailHealth />} />
        <Route path="/admin/emails-transactionnels" element={<AdminEmails />} />
        <Route path="/admin/alma" element={<AdminAlma />} />
        <Route path="/admin/experiences" element={<AdminExperienceVerification />} />
        <Route path="/admin/articles" element={<AdminArticles />} />
        <Route path="/admin/articles/refresh-post-pivot" element={<AdminArticlesRefreshPostPivot />} />
        <Route path="/admin/articles/:id" element={<ArticleEditor />} />
        <Route path="/admin/city-pages" element={<AdminCityPages />} />
        <Route path="/admin/guides" element={<AdminGuides />} />
        <Route path="/admin/analysis-requests" element={<AdminAnalysisRequests />} />
        <Route path="/admin/departments" element={<AdminDepartments />} />
        <Route path="/admin/breeds" element={<AdminBreeds />} />
        <Route path="/admin/articles-longue-traine" element={<AdminLongTailArticles />} />

        <Route path="/admin/faq" element={<AdminFAQ />} />
        <Route path="/admin/small-missions" element={<AdminSmallMissions />} />
        <Route path="/admin/legal" element={<AdminLegal />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/contact-messages" element={<AdminContactMessages />} />
        <Route path="/admin/traffic" element={<AdminTraffic />} />
        <Route path="/admin/seo" element={<Navigate to="/admin/traffic?tab=acquisition" replace />} />
        <Route path="/admin/analytics" element={<Navigate to="/admin/traffic" replace />} />
        <Route path="/admin/lifecycle" element={<AdminLifecycle />} />
        <Route path="/admin/skills" element={<AdminSkills />} />
        <Route path="/admin/envois-groupes" element={<AdminMassEmails />} />
        <Route path="/admin/envois-groupes/stats" element={<AdminMassEmailsStats />} />
        <Route path="/admin/relance-incomplet" element={<AdminRelanceIncomplet />} />
        <Route path="/admin/nurturing" element={<AdminNurturing />} />
        <Route path="/admin/messages" element={<AdminMessages />} />
        <Route path="/admin/errors" element={<AdminErrors />} />
        <Route path="/admin/diagnostics" element={<AdminDiagnostics />} />
        <Route path="/admin/test-sitter-fields" element={<AdminTestSitterFields />} />
      </Route>
      {/* App routes */}
      <Route path="/dashboard" element={<DashboardRouteShell />} />
      {/* /search est public (consultable sans connexion) */}
      <Route path="/search" element={<AppLayout><SearchPage /></AppLayout>} />
      <Route path="/recherche" element={<AppLayout><SearchPage /></AppLayout>} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/profile" element={<Profile />} />
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
      <Route path="/admin/hero-weights" element={<AdminHeroWeights />} />
      <Route path="/test/error-boundary" element={<TestErrorBoundary />} />
      <Route path="/test/empty-states" element={<TestEmptyStates />} />
      
      <Route path="/dev/preview/ongoing-sit-hero" element={<PreviewOngoingSitHero />} />
      <Route path="/dev/preview/mission-cards" element={<PreviewMissionCards />} />
      <Route path="/unsubscribe" element={<Unsubscribe />} />
      <Route path="/email-preferences" element={<EmailPreferences />} />
      <Route path="/parrainage" element={<ParrainageRoute />} />
      <Route path="/devenir-home-sitter" element={<DevenirHomeSitter />} />
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
              <OfflineBanner />
              <PreviewDiagnosticBanner />
              <DuplicateAccountGuard />
              <AppRoutes />
              <DeferredTrackers />
              {/* Bannière cookies retirée : mesure d'audience GA4 exemptée CNIL
                  (anonymize_ip, pas de pub/signals). Voir src/lib/cookieConsent.ts. */}
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
