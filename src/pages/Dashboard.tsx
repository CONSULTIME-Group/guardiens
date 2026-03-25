import { useAuth } from "@/contexts/AuthContext";
import OwnerDashboard from "@/components/dashboard/OwnerDashboard";
import SitterDashboard from "@/components/dashboard/SitterDashboard";

const Dashboard = () => {
  const { activeRole } = useAuth();

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto animate-fade-in">
      {activeRole === "owner" ? <OwnerDashboard /> : <SitterDashboard />}
    </div>
  );
};

export default Dashboard;
