import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import AffinityPilotCard from "./_components/dashboard/AffinityPilotCard";

/**
 * Page dédiée au pilotage du score d'affinité. Accueille la carte déplacée
 * depuis la vue d'ensemble (distribution, visibilité, surfaces, 30 jours).
 * Le titre d'onglet est posé par AdminLayout ("Affinité | Admin Guardiens").
 */
const AdminAffinity = () => (
  <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
    <AdminPageHeader
      title="Affinité"
      description="Distribution, visibilité et surfaces du score d'affinité sur 30 jours."
    />
    <AffinityPilotCard />
  </div>
);

export default AdminAffinity;
