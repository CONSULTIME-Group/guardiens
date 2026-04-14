import { Outlet } from "react-router-dom";
import { Sidebar, BottomNav } from "./Navigation";
import { BackButton } from "./BackButton";
import Breadcrumbs from "./Breadcrumbs";

export const AppLayout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main id="main-content" className="flex-1 pb-20 md:pb-0 overflow-x-hidden" role="main">
        <BackButton />
        <Breadcrumbs />
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};
