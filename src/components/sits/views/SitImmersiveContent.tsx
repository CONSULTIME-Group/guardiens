/**
 * Orchestrateur "fiche annonce immersive".
 *
 * Responsabilités :
 *  - Charger les données dérivées (city/dept, guides, comptage gardiens)
 *  - Composer Hero, Quick facts, 4 onglets (Garde / Animaux / Logement / Attentes), Sidebar
 *
 * Le détail de chaque section vit dans `./tabs/*` pour rester maintenable.
 *
 * IMPORTANT : on ré-exporte `parseRoutine` et `cleanFreeText` pour préserver
 * la compatibilité avec la batterie de tests `__tests__/parseRoutine.test.ts`.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, PawPrint, Home, ShieldCheck } from "lucide-react";
import { slugify } from "@/lib/normalize";
import { CITIES } from "@/data/cities";
import { getCityContent } from "@/data/cityContent";

import SitHero from "./tabs/SitHero";
import SitQuickFacts from "./tabs/SitQuickFacts";
import TabGarde from "./tabs/TabGarde";
import TabAnimaux from "./tabs/TabAnimaux";
import TabLogement from "./tabs/TabLogement";
import TabAttentes from "./tabs/TabAttentes";
import SitSidebar from "./tabs/SitSidebar";
import { speciesLabel } from "./tabs/sitMeta";

// Re-exports pour compatibilité tests existants (parseRoutine.test.ts)
export { parseRoutine, cleanFreeText } from "./tabs/parseRoutine";

const GUIDE_SLUGS = new Set(CITIES.map((c) => c.slug));

interface SitImmersiveContentProps {
  sit: any;
  owner: any;
  property: any;
  pets: any[];
  ownerProfile: any;
}

const SitImmersiveContent = ({
  sit,
  owner,
  property,
  pets,
  ownerProfile,
}: SitImmersiveContentProps) => {
  const [activeTab, setActiveTab] = useState<"garde" | "animaux" | "logement" | "attentes">(
    "garde",
  );

  // -- Photos
  const photos: string[] = Array.isArray(property?.photos)
    ? property.photos.filter((p: any) => typeof p === "string" && p.trim().length > 0)
    : [];

  // -- Hôte / localisation
  const ownerName = owner?.first_name || "L'hôte";
  const cityName = owner?.city || "";
  const citySlug = cityName ? slugify(cityName) : null;
  const department: string | undefined =
    owner?.department || (owner?.postal_code ? String(owner.postal_code).slice(0, 2) : undefined);

  // -- Environnement & équipements
  const environments: string[] = (
    sit?.environments?.length ? sit.environments : ownerProfile?.environments || []
  ).filter(Boolean);
  const amenities: string[] = ((property?.equipments || property?.amenities) ?? []).filter(Boolean);

  // -- Durée
  const durationDays =
    sit?.start_date && sit?.end_date
      ? Math.max(
          1,
          Math.round(
            (new Date(sit.end_date).getTime() - new Date(sit.start_date).getTime()) /
              86400000,
          ),
        )
      : null;

  // -- Animaux
  const safePets = Array.isArray(pets) ? pets.filter(Boolean) : [];
  const speciesSummary = (() => {
    const counts = new Map<string, number>();
    for (const p of safePets) {
      const label = speciesLabel(p?.species);
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    const pluralize = (label: string, n: number) => {
      if (n <= 1) return `${n} ${label.toLowerCase()}`;
      const last = label.slice(-1).toLowerCase();
      const plural = last === "s" || last === "x" ? label : `${label}s`;
      return `${n} ${plural.toLowerCase()}`;
    };
    return Array.from(counts.entries())
      .map(([label, n]) => pluralize(label, n))
      .join(" · ");
  })();

  // -- Routine
  const rawRoutine = sit?.daily_routine || null;
  const hasRoutine =
    typeof rawRoutine === "string" && rawRoutine.trim().length > 0;

  // -- Mot de l'hôte
  const ownerMessage =
    typeof sit?.owner_message === "string" ? sit.owner_message.trim() : "";
  const hasOwnerMessage = ownerMessage.length > 0;

  // -- Sections "Le cadre"
  const expectations =
    typeof sit?.specific_expectations === "string" ? sit.specific_expectations.trim() : "";
  const propertyDescription =
    typeof property?.description === "string" ? property.description.trim() : "";

  // -- Bio hôte
  const ownerBio = (owner?.bio || ownerProfile?.welcome_notes || "").toString().trim();
  const hasOwnerCard = Boolean(owner && (ownerName || cityName || ownerBio));

  // -- Guide local : DB ou static
  const { data: dbGuide } = useQuery({
    queryKey: ["city-guide-by-slug", citySlug],
    enabled: !!citySlug,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!citySlug) return null;
      const { data } = await supabase
        .from("city_guides" as any)
        .select("id, slug, published")
        .eq("slug", citySlug)
        .eq("published", true)
        .maybeSingle();
      return data as any;
    },
  });
  const hasLocalGuide = Boolean(citySlug && (GUIDE_SLUGS.has(citySlug) || dbGuide));

  // -- Comptage gardiens (ville → fallback département)
  const ownerPostalCode: string | undefined = owner?.postal_code
    ? String(owner.postal_code)
    : undefined;
  const deptCode = ownerPostalCode ? ownerPostalCode.slice(0, 2) : undefined;
  const CITY_THRESHOLD = 20;

  const { data: sittersScope } = useQuery({
    queryKey: ["sitters-scope", cityName, deptCode],
    enabled: !!cityName,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: cityRows } = await supabase
        .from("profiles")
        .select("id, sitter_profiles!inner(user_id)")
        .ilike("city", cityName)
        .limit(50);
      const cityCount = cityRows?.length ?? 0;

      if (cityCount >= CITY_THRESHOLD || !deptCode) {
        return { mode: "city" as const, count: cityCount };
      }

      const { data: deptRows } = await supabase
        .from("profiles")
        .select("id, postal_code, sitter_profiles!inner(user_id)")
        .like("postal_code", `${deptCode}%`)
        .limit(50);
      const deptCount = deptRows?.length ?? 0;

      return { mode: "dept" as const, count: deptCount, cityCount };
    },
  });

  const sittersLink = (() => {
    if (!sittersScope || !cityName) return null;
    const params = new URLSearchParams();
    params.set("city", cityName);
    if (ownerPostalCode) params.set("postal_code", ownerPostalCode);
    if (sittersScope.mode === "dept" && deptCode) {
      params.set("zone", "dept");
      params.set("dept", deptCode);
    } else {
      params.set("zone", "city");
    }
    return `/search?${params.toString()}`;
  })();

  const showSittersLink = Boolean(sittersLink && sittersScope && sittersScope.count > 0);

  return (
    <div>
      <SitHero
        photos={photos}
        title={sit?.title}
        cityName={cityName}
        department={department}
      />

      <SitQuickFacts
        sit={sit}
        property={property}
        petsCount={safePets.length}
        speciesSummary={speciesSummary}
        environments={environments}
        durationDays={durationDays}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="w-full"
          >
            <div className="sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-2 mb-6 bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur-md border-b border-border/60 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)]">
              <TabsList
                aria-label="Sections de l'annonce"
                className="w-full grid grid-cols-4 h-auto p-1 bg-muted/60 rounded-xl gap-1"
              >
                <TabsTrigger
                  value="garde"
                  className="text-[11px] md:text-sm py-2 px-1 md:px-3 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Heart className="h-3.5 w-3.5 mr-1 md:mr-1.5 shrink-0 hidden sm:inline" />
                  <span className="truncate">Garde</span>
                </TabsTrigger>
                <TabsTrigger
                  value="animaux"
                  className="text-[11px] md:text-sm py-2 px-1 md:px-3 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <PawPrint className="h-3.5 w-3.5 mr-1 md:mr-1.5 shrink-0 hidden sm:inline" />
                  <span className="truncate">
                    Animaux{safePets.length > 0 ? ` (${safePets.length})` : ""}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="logement"
                  className="text-[11px] md:text-sm py-2 px-1 md:px-3 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Home className="h-3.5 w-3.5 mr-1 md:mr-1.5 shrink-0 hidden sm:inline" />
                  <span className="truncate">
                    <span className="md:hidden">Logement</span>
                    <span className="hidden md:inline">Logement & quartier</span>
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="attentes"
                  className="text-[11px] md:text-sm py-2 px-1 md:px-3 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <ShieldCheck className="h-3.5 w-3.5 mr-1 md:mr-1.5 shrink-0 hidden sm:inline" />
                  <span className="truncate">Attentes</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="garde" className="space-y-6 mt-0">
              <TabGarde
                ownerName={ownerName}
                hasOwnerMessage={hasOwnerMessage}
                ownerMessage={ownerMessage}
                hasRoutine={hasRoutine}
                rawRoutine={rawRoutine}
                safePets={safePets}
                cityName={cityName}
                property={property}
                propertyDescription={propertyDescription}
                amenities={amenities}
                hasLocalGuide={hasLocalGuide}
                expectations={expectations}
                environments={environments}
                setActiveTab={setActiveTab}
              />
            </TabsContent>

            <TabsContent value="animaux" className="space-y-5 mt-0">
              <TabAnimaux safePets={safePets} ownerName={ownerName} />
            </TabsContent>

            <TabsContent value="logement" className="space-y-6 mt-0">
              <TabLogement
                propertyDescription={propertyDescription}
                amenities={amenities}
                photos={photos}
                hasLocalGuide={hasLocalGuide}
                citySlug={citySlug}
                cityName={cityName}
                ownerPostalCode={ownerPostalCode}
              />
            </TabsContent>

            <TabsContent value="attentes" className="space-y-6 mt-0">
              <TabAttentes
                ownerName={ownerName}
                expectations={expectations}
                environments={environments}
              />
            </TabsContent>
          </Tabs>
        </div>

        <SitSidebar
          hasOwnerCard={hasOwnerCard}
          owner={owner}
          ownerName={ownerName}
          cityName={cityName}
          ownerBio={ownerBio}
          hasLocalGuide={hasLocalGuide}
          citySlug={citySlug}
          showSittersLink={showSittersLink}
          sittersLink={sittersLink}
          sittersScope={sittersScope ?? null}
          deptCode={deptCode}
        />
      </div>
    </div>
  );
};

export default SitImmersiveContent;
