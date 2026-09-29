import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import MutualAidDashboardTab from "./_components/MutualAidDashboardTab";

/**
 * Lot A11 : « Pilotage entraide » a sa propre route, sortie de la page
 * Emails transactionnels. L'ancien lien ?tab=mutual-aid y redirige.
 */
const AdminMutualAidPilot = () => (
  <div className="space-y-6">
    <AdminPageHeader
      title="Pilotage entraide"
      description="Tunnel de conversion, missions dormantes et clôtures automatiques de l'entraide."
    />
    <MutualAidDashboardTab />
  </div>
);

export default AdminMutualAidPilot;
