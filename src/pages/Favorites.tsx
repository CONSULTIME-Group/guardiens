import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Heart, User, Calendar, MapPin, ArrowRight, Loader2, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import FavoriteButton from "@/components/shared/FavoriteButton";
import EmptyState from "@/components/shared/EmptyState";
import PageMeta from "@/components/PageMeta";

const Favorites = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { data: favorites, isLoading } = useFavorites();

  const sitterIds = favorites?.filter(f => f.target_type === "sitter").map(f => f.target_id) || [];
  const sitIds = favorites?.filter(f => f.target_type === "sit").map(f => f.target_id) || [];

  const locale = i18n.language?.startsWith("en") ? "en-GB"
    : i18n.language?.startsWith("es") ? "es-ES"
    : i18n.language?.startsWith("it") ? "it-IT"
    : i18n.language?.startsWith("de") ? "de-DE"
    : "fr-FR";

  const { data: sitters } = useQuery({
    queryKey: ["favorite-sitters", sitterIds],
    queryFn: async () => {
      if (!sitterIds.length) return [];
      const { data, error } = await supabase
        .from("public_profiles")
        .select("id, first_name, avatar_url, city")
        .in("id", sitterIds);
      if (error) throw error;
      return data || [];
    },
    enabled: sitterIds.length > 0,
  });

  const { data: sits } = useQuery({
    queryKey: ["favorite-sits", sitIds],
    queryFn: async () => {
      if (!sitIds.length) return [];
      const { data, error } = await supabase
        .from("sits")
        .select("id, title, start_date, end_date, status")
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
      <PageMeta title={t("favorites_page.meta_title")} description={t("favorites_page.meta_description")} />
      <div className="max-w-3xl mx-auto px-4 py-5 md:py-8">
        <div className="flex items-center gap-3 mb-5 md:mb-8">
          <Heart className="h-6 w-6 text-red-500 fill-red-500" />
          <h1 className="text-2xl font-heading font-bold text-foreground">{t("favorites_page.title")}</h1>
        </div>

        {!hasAny ? (
          <EmptyState
            illustration="heartBookmark"
            title={t("favorites_page.empty_title")}
            description={t("favorites_page.empty_description")}
            actionLabel={t("favorites_page.explore_sitters")}
            actionTo="/search"
            actionIcon={Search}
          />
        ) : (
          <Tabs defaultValue={hasSitters ? "sitters" : "sits"} className="space-y-6">
            <TabsList className="w-full md:w-auto">
              <TabsTrigger value="sitters" className="gap-2">
                <User className="h-4 w-4" />
                {t("favorites_page.tab_sitters")} {hasSitters && <Badge variant="secondary" className="ml-1 text-xs">{sitters!.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="sits" className="gap-2">
                <Calendar className="h-4 w-4" />
                {t("favorites_page.tab_sits")} {hasSits && <Badge variant="secondary" className="ml-1 text-xs">{sits!.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sitters" className="space-y-3">
              {!hasSitters ? (
                <EmptyState illustration="walkingDog" title={t("favorites_page.no_sitter_fav_title")} description={t("favorites_page.no_sitter_fav_desc")} actionLabel={t("favorites_page.search_sitter")} actionTo="/search" actionIcon={Search} />
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
                            {sitter.first_name || t("favorites_page.member_fallback")}
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
                <EmptyState illustration="emptyCalendar" title={t("favorites_page.no_sit_fav_title")} description={t("favorites_page.no_sit_fav_desc")} actionLabel={t("favorites_page.view_listings")} actionTo="/search" actionIcon={Search} />
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
                            {sit.title || t("favorites_page.listing_fallback")}
                          </Link>
                          <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground">
                            {sit.start_date && (
                              <span>
                                {new Date(sit.start_date).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                                {sit.end_date && ` → ${new Date(sit.end_date).toLocaleDateString(locale, { day: "numeric", month: "short" })}`}
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
