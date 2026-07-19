/**
 * Corps immersif de la fiche annonce : quick facts, onglets et sidebar.
 *
 * Séparé de SitImmersiveHero pour permettre un ordre narratif flexible
 * dans SitterSitView (hero, action, rencontre, puis ce corps).
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { slugify } from "@/lib/normalize";
import { CITIES } from "@/data/cities";
import { getCityContent } from "@/data/cityContent";

import SitQuickFacts from "./tabs/SitQuickFacts";
import TabGarde from "./tabs/TabGarde";
import TabAnimaux from "./tabs/TabAnimaux";
import TabLogement from "./tabs/TabLogement";
import TabAttentes from "./tabs/TabAttentes";
import SitSidebar from "./tabs/SitSidebar";
import { speciesLabel } from "./tabs/sitMeta";

const GUIDE_SLUGS = new Set(CITIES.map((c) => c.slug));

interface SitImmersiveBodyProps {
  sit: any;
  owner: any;
  property: any;
  pets: any[];
  ownerProfile: any;
}

const SitImmersiveBody = ({
  sit,
  owner,
  property,
  pets,
  ownerProfile,
}: SitImmersiveBodyProps) => {
  const [activeTab, setActiveTab] = useState<"garde" | "animaux" | "logement" | "attentes">(
    "garde",
  );

  const photos: string[] = Array.isArray(property?.photos)
    ? property.photos.filter((p: any) => typeof p === "string" && p.trim().length > 0)
    : [];

  const ownerName = owner?.first_name || "L'hôte";
  const cityName = owner?.city || "";
  const citySlug = cityName ? slugify(cityName) : null;
  const department: string | undefined =
    owner?.department || (owner?.postal_code ? String(owner.postal_code).slice(0, 2) : undefined);

  const environments: string[] = (
    sit?.environments?.length ? sit.environments : ownerProfile?.environments || []
  ).filter(Boolean);
  const amenities: string[] = ((property?.equipments || property?.amenities) ?? []).filter(Boolean);

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

  const rawRoutine = sit?.daily_routine || null;
  const hasRoutine =
    typeof rawRoutine === "string" && rawRoutine.trim().length > 0;

  const ownerMessage =
    typeof sit?.owner_message === "string" ? sit.owner_message.trim() : "";
  const hasOwnerMessage = ownerMessage.length > 0;

  const expectations =
    typeof sit?.specific_expectations === "string" ? sit.specific_expectations.trim() : "";
  const propertyDescription =
    typeof property?.description === "string" ? property.description.trim() : "";

  const ownerBio = (owner?.bio || ownerProfile?.welcome_notes || "").toString().trim();
  const hasOwnerCard = Boolean(owner && (ownerName || cityName || ownerBio));

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
      const { count: cityCount } = await supabase
        .from("public_profiles")
        .select("id", { count: "exact", head: true })
        .in("role", ["sitter", "both"])
        .ilike("city", cityName);
      const safeCityCount = cityCount ?? 0;

      if (safeCityCount >= CITY_THRESHOLD || !deptCode) {
        return { mode: "city" as const, count: safeCityCount };
      }

      const { count: deptCount } = await supabase
        .from("public_profiles")
        .select("id", { count: "exact", head: true })
        .in("role", ["sitter", "both"])
        .like("postal_code", `${deptCode}%`);

      return { mode: "dept" as const, count: deptCount ?? 0, cityCount: safeCityCount };
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
            <div className="sticky top-16 z-20 -mx-3 md:-mx-6 px-4 md:px-6 py-2 mb-6 bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur-md border-b border-border/60 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)]">
              <TabsList
                aria-label="Sections de l'annonce"
                className="w-full grid grid-cols-4 h-auto p-1 bg-muted/60 rounded-xl gap-1"
              >
                <TabsTrigger
                  value="garde"
                  className="text-[11px] md:text-sm py-2 px-1 md:px-3 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <span className="truncate">Garde</span>
                </TabsTrigger>
                <TabsTrigger
                  value="animaux"
                  className="text-[11px] md:text-sm py-2 px-1 md:px-3 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <span className="truncate">
                    Animaux{safePets.length > 0 ? ` (${safePets.length})` : ""}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="logement"
                  className="text-[11px] md:text-sm py-2 px-1 md:px-3 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <span className="truncate">
                    <span className="md:hidden">Logement</span>
                    <span className="hidden md:inline">Logement & quartier</span>
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="attentes"
                  className="text-[11px] md:text-sm py-2 px-1 md:px-3 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
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
                openTo={sit?.open_to ?? null}
                minGardienSits={sit?.min_gardien_sits ?? null}
                acceptsSitterPets={(sit as any)?.accepts_sitter_pets ?? null}
                acceptsSitterChildren={(sit as any)?.accepts_sitter_children ?? null}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:sticky lg:top-32 lg:self-start">
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
    </div>
  );
};

export default SitImmersiveBody;
