import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Search, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
interface CityGuide {
  id: string;
  city: string;
  slug: string;
  intro: string;
  ideal_for: string;
  department: string;
  published: boolean;
}

interface PlaceCount {
  city_guide_id: string;
  count: number;
}


const GuidesListing = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");

  const { data: guides = [], isLoading } = useQuery({
    queryKey: ["city-guides-listing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_guides" as any)
        .select("*")
        .eq("published", true)
        .order("city");
      if (error) throw error;
      return (data || []) as unknown as CityGuide[];
    },
  });

  const { data: placeCounts = [] } = useQuery({
    queryKey: ["guide-place-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_guide_places" as any)
        .select("city_guide_id");
      if (error) throw error;
      // Count per guide
      const counts: Record<string, number> = {};
      ((data || []) as any[]).forEach((p: any) => {
        counts[p.city_guide_id] = (counts[p.city_guide_id] || 0) + 1;
      });
      return Object.entries(counts).map(([city_guide_id, count]) => ({
        city_guide_id,
        count,
      })) as PlaceCount[];
    },
  });

  const getPlaceCount = (guideId: string) =>
    placeCounts.find((p) => p.city_guide_id === guideId)?.count || 0;

  const allDepartments = useMemo(() => 
    [...new Set(guides.map((g) => g.department).filter(Boolean))].sort(),
    [guides]
  );

  const filteredGuides = useMemo(() => {
    let result = guides;
    if (selectedDept !== "all") {
      result = result.filter((g) => g.department === selectedDept);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((g) => g.city.toLowerCase().includes(q) || g.department.toLowerCase().includes(q));
    }
    return result;
  }, [guides, search, selectedDept]);

  const departments = [...new Set(filteredGuides.map((g) => g.department).filter(Boolean))];

  return (
    <>
      <PageMeta
        title="Guides locaux — Où promener, où soigner, où bruncher"
        description="Tout ce qu'un gardien doit savoir en arrivant dans une nouvelle ville. Parcs dog-friendly, vétérinaires, cafés accueillants, sentiers de balade."
        path="/guides"
      />

      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 pt-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
        </div>
        <header className="bg-primary/5 border-b border-border">
          <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6">
              <MapPin className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Guides locaux
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Où promener, où soigner, où bruncher — tout ce qu'un gardien doit savoir en arrivant dans une nouvelle ville.
            </p>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-10">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une ville..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Tous les départements" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les départements</SelectItem>
                {allDepartments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filteredGuides.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              {guides.length === 0 ? "Aucun guide disponible pour le moment." : "Aucun guide ne correspond à votre recherche."}
            </p>
          ) : (
            <div className="space-y-10">
              {departments.map((dept) => {
                const deptGuides = filteredGuides.filter((g) => g.department === dept);
                return (
                  <section key={dept}>
                    <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
                      {dept}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {deptGuides.map((guide) => {
                        const count = getPlaceCount(guide.id);
                        return (
                          <Link key={guide.id} to={`/guide/${guide.slug}`}>
                            <Card className="h-full hover:shadow-md transition-shadow border-border">
                              <CardContent className="p-5">
                                <div className="flex items-start gap-3 mb-3">
                                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <MapPin className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-foreground">{guide.city}</h3>
                                    <p className="text-xs text-muted-foreground">{count} lieux référencés</p>
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground italic line-clamp-2">
                                  {guide.ideal_for}
                                </p>
                              </CardContent>
                            </Card>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </main>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Guardiens", item: "https://guardiens.fr" },
                { "@type": "ListItem", position: 2, name: "Guides locaux", item: "https://guardiens.fr/guides" },
              ],
            }),
          }}
        />
      </div>
    </>
  );
};

export default GuidesListing;
