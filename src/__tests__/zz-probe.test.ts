import { it } from "vitest";
it("p", async () => { await import("@/components/admin/AdminSidebar"); console.log("sidebar ok"); await import("@/hooks/useAdminBadges"); console.log("badges ok"); await import("@/pages/AdminHeroWeights"); console.log("hero ok"); }, 60000);
