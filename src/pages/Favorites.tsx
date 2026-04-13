import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Heart, User, Calendar, MapPin, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import FavoriteButton from "@/components/shared/FavoriteButton";
import PageMeta from "@/components/PageMeta";

const Favorites = () => {
  const { user } = useAuth();
  const { data: favorites, isLoading } = useFavorites();

  const sitterIds = favorites?.filter(f => f.target_type === "sitter").map(f => f.target_id) || [];
  const sitIds = favorites?.filter(f => f.target_type === "sit").map(f => f.target_id) || [];

  // Fetch sitter profiles
  const { data: sitters } = useQuery({
    queryKey: ["favorite-sitters", sitterIds],
    queryFn: async () => {
      if (!sitterIds.length) return [];
      const { data, error } = await supabase
        .from("public_profiles")
        .select("id, first_name, last_name, avatar_url, city, role")
        .in("id", sitterIds);
      if (error) throw error;
      return data || [];
    },
    enabled: sitterIds.length > 0,
  });

  // Fetch sits
  const { data: sits } = useQuery({
    queryKey: ["favorite-sits", sitIds],
    queryFn: async () => {
      if (!sitIds.length) return [];
      const { data, error } = await supabase
        .from("sits")
        .select("id, title, city, start_date, end_date, status")
        .in("id", sitIds);
      if (error) throw error;
      return data || [];
    },
    enabled: sitIds.length > 0,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasSitters = sitters && sitters.length > 0;
  const hasSits = sits && sits.length > 0;
  const hasAny = hasSitters || hasSits;

  return (
    <>
      <PageMeta title="Mes favoris — Guardiens" description="Retrouvez vos gardiens et annonces sauvegardés." />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="h-6 w-6 text-red-500 fill-red-500" />
          <h1 className="text-2xl font-heading font-bold text-foreground">Mes favoris</h1>
        </div>

        {!hasAny ? (
          <div className="text-center py-16 space-y-4">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <p className="text-muted-foreground">
              Vous n'avez pas encore de favoris.
            </p>
            <p className="text-sm text-muted-foreground/70">
              Parcourez les profils de gardiens ou les annonces pour en ajouter.
            </p>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 text-primary font-medium text-sm hover:underline mt-2"
            >
              Explorer les gardiens <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <Tabs defaultValue={hasSitters ? "sitters" : "sits"} className="space-y-6">
            <TabsList>
              <TabsTrigger value="sitters" className="gap-2">
                <User className="h-4 w-4" />
                Gardiens {hasSitters && <Badge variant="secondary" className="ml-1 text-xs">{sitters!.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="sits" className="gap-2">
                <Calendar className="h-4 w-4" />
                Annonces {hasSits && <Badge variant="secondary" className="ml-1 text-xs">{sits!.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sitters" className="space-y-3">
              {!hasSitters ? (
                <p className="text-center py-8 text-muted-foreground text-sm">Aucun gardien en favori.</p>
              ) : (
                sitters!.map((sitter: any) => (
                  <Card key={sitter.id} className="group hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Link to={`/gardiens/${sitter.id}`}>
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={sitter.avatar_url} />
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {(sitter.first_name || "?")[0]}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/gardiens/${sitter.id}`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {sitter.first_name} {sitter.last_name?.[0] ? `${sitter.last_name[0]}.` : ""}
                          </Link>
                          {sitter.city && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" /> {sitter.city}
                            </p>
                          )}
                        </div>
                        <FavoriteButton targetType="sitter" targetId={sitter.id} size="md" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="sits" className="space-y-3">
              {!hasSits ? (
                <p className="text-center py-8 text-muted-foreground text-sm">Aucune annonce en favori.</p>
              ) : (
                sits!.map((sit: any) => (
                  <Card key={sit.id} className="group hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/annonces/${sit.id}`}
                            className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                          >
                            {sit.title || "Annonce de garde"}
                          </Link>
                          <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground">
                            {sit.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {sit.city}
                              </span>
                            )}
                            {sit.start_date && (
                              <span>
                                {new Date(sit.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                {sit.end_date && ` → ${new Date(sit.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <FavoriteButton targetType="sit" targetId={sit.id} size="md" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
};

export default Favorites;
