import { memo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import NearbyEmergencySitters from "@/components/dashboard/NearbyEmergencySitters";
import NearbyHelpersCarousel from "@/components/dashboard/sitter/NearbyHelpersCarousel";

/**
 * Module unifié « Près de chez vous » avec 2 onglets :
 * - Urgence : gardiens disponibles rapidement (animaux)
 * - Coup de main : voisinage compétences (jardin, bricolage, animaux ponctuel)
 *
 * Fusionne deux blocs auparavant empilés dans l'aside du dashboard propriétaire,
 * pour réduire le scroll et clarifier l'intention (urgence vs entraide quotidienne).
 */
const NearbyPeopleTabs = memo(() => {
  return (
    <section
      className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-in"
      aria-label="Personnes près de chez vous"
    >
      <Tabs defaultValue="urgence" className="w-full">
        <div className="px-3 pt-3 pb-2 border-b border-border">
          <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold mb-2 px-1">
            Près de chez vous
          </p>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="urgence" className="text-xs">Urgence</TabsTrigger>
            <TabsTrigger value="entraide" className="text-xs">Coup de main</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="urgence" className="mt-0">
          <NearbyEmergencySitters hideHeader />
        </TabsContent>

        <TabsContent value="entraide" className="mt-0 p-4">
          <NearbyHelpersCarousel hideHeader />
        </TabsContent>
      </Tabs>
    </section>
  );
});

NearbyPeopleTabs.displayName = "NearbyPeopleTabs";
export default NearbyPeopleTabs;
