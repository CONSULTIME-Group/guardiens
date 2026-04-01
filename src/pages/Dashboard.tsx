import { useAuth } from "@/contexts/AuthContext";
import { useRef, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import OwnerDashboard from "@/components/dashboard/OwnerDashboard";
import SitterDashboard from "@/components/dashboard/SitterDashboard";

const Dashboard = () => {
  const { activeRole } = useAuth();
  const [displayedRole, setDisplayedRole] = useState(activeRole);
  const [transitioning, setTransitioning] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayedRole(activeRole);
      return;
    }
    if (activeRole !== displayedRole) {
      setTransitioning(true);
      const timeout = setTimeout(() => {
        setDisplayedRole(activeRole);
        setTransitioning(false);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [activeRole]);

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div
        key={displayedRole}
        className={transitioning ? "animate-fade-out" : "animate-fade-in"}
      >
        {displayedRole === "owner" ? <OwnerDashboard /> : <SitterDashboard />}
      </div>
    </div>
  );
};

export default Dashboard;
