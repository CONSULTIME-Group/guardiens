import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import SearchPage from "./pages/SearchPage";
import Messages from "./pages/Messages";
import Sits from "./pages/Sits";
import CreateSit from "./pages/CreateSit";
import SitDetail from "./pages/SitDetail";
import HouseGuide from "./pages/HouseGuide";
import LeaveReview from "./pages/LeaveReview";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import OwnerProfile from "./pages/OwnerProfile";
import CreateLongStay from "./pages/CreateLongStay";
import LongStayDetail from "./pages/LongStayDetail";
import EditLongStay from "./pages/EditLongStay";
import News from "./pages/News";
import ArticleDetail from "./pages/ArticleDetail";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import AdminArticles from "./pages/AdminArticles";
import ArticleEditor from "./pages/ArticleEditor";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminListings from "./pages/admin/AdminListings";
import AdminSitsManagement from "./pages/admin/AdminSitsManagement";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminReports from "./pages/admin/AdminReports";
import AdminVerifications from "./pages/admin/AdminVerifications";
import AdminEmails from "./pages/admin/AdminEmails";
import NotFound from "./pages/NotFound";
import Unsubscribe from "./pages/Unsubscribe";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement...</div>;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
    <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
    <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
    <Route path="/actualites" element={<News />} />
    <Route path="/actualites/:slug" element={<ArticleDetail />} />
    <Route path="/a-propos" element={<About />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="/cgu" element={<Terms />} />
    <Route path="/confidentialite" element={<Privacy />} />
    {/* Admin routes with dedicated layout */}
    <Route element={<AdminLayout />}>
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route path="/admin/listings" element={<AdminListings />} />
      <Route path="/admin/sits-management" element={<AdminSitsManagement />} />
      <Route path="/admin/reviews" element={<AdminReviews />} />
      <Route path="/admin/reports" element={<AdminReports />} />
      <Route path="/admin/verifications" element={<AdminVerifications />} />
      <Route path="/admin/emails" element={<AdminEmails />} />
      <Route path="/admin/articles" element={<AdminArticles />} />
      <Route path="/admin/articles/:id" element={<ArticleEditor />} />
    </Route>
    {/* App routes */}
    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/sits" element={<Sits />} />
      <Route path="/sits/create" element={<CreateSit />} />
      <Route path="/sits/:id" element={<SitDetail />} />
      <Route path="/review/:sitId" element={<LeaveReview />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/house-guide/:propertyId" element={<HouseGuide />} />
      <Route path="/owner-profile" element={<OwnerProfile />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/long-stays/create" element={<CreateLongStay />} />
      <Route path="/long-stays/:id" element={<LongStayDetail />} />
      <Route path="/long-stays/:id/edit" element={<EditLongStay />} />
    </Route>
    <Route path="/unsubscribe" element={<Unsubscribe />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
