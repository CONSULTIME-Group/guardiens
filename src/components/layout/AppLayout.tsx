import { Outlet } from "react-router-dom";
import { Sidebar, BottomNav } from "./Navigation";

export const AppLayout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};
