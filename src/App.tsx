import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/layout/AppLayout";
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
import NotFound from "./pages/NotFound";

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
