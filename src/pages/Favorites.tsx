/**
 * Page Favoris — UX mobile 2026
 *
 * Passe 1 · Loading : skeleton structuré (2 tabs + cartes) remplace le spinner.
 * Passe 2 · Density : tabs sticky 44 px, cartes compactes tactiles, pas d'icônes décoratives.
 * Passe 3 · Empty states 3 parties : statut + enseignement + 1 CTA par onglet.
 */

import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/shared/EmptyState";
import PageMeta from "@/components/PageMeta";
import FavoritesSkeleton from "@/components/favorites/FavoritesSkeleton";
import SitterCard from "@/components/favorites/SitterCard";
import SitCard from "@/components/favorites/SitCard";

/* ─── skeleton page entière ─────────────────────────────────────────────── */
const PageSkeleton = () => (
  <div className="max-w-xl mx-auto px-4 pt-5 pb-8 space-y-4">
    {/* tabs placeholder */}
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex gap-2 py-2">
        <div className="h-[44px] w-32 rounded-lg bg-muted animate-pulse" />
        <div className="h-[44px] w-32 rounded-lg bg-muted animate-pulse" />
      </div>
    </div>
    <FavoritesSkeleton count={5} />
  </div>
);

/* ─── composant principal ────────────────────────────────────────────────── */
const Favorites = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { data: favorites, isLoading: isLoadingFavorites } = useFavorites();

  const sitterIds = favorites?.filter(f => f.target_type === "sitter").map(f => f.target_id) ?? [];
  const sitIds    = favorites?.filter(f => f.target_type === "sit").map(f => f.target_id)    ?? [];

  const locale =
    i18n.language?.startsWith("en") ? "en-GB"
    : i18n.language?.startsWith("es") ? "es-ES"
    : i18n.language?.startsWith("it") ? "it-IT"
    : i18n.language?.startsWith("de") ? "de-DE"
    : "fr-FR";

  const { data: sitters, isLoading: isLoadingSitters } = useQuery({
    queryKey: ["favorite-sitters", sitterIds],
    queryFn: async () => {
      if (!sitterIds.length) return [];
      const { data, error } = await supabase
        .from("public_profiles")
        .select("id, first_name, avatar_url, city")
        .in("id", sitterIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: sitterIds.length > 0,
  });

  const { data: sits, isLoading: isLoadingSits } = useQuery({
    queryKey: ["favorite-sits", sitIds],
    queryFn: async () => {
      if (!sitIds.length) return [];
      const { data, error } = await supabase
        .from("sits")
        .select("id, title, start_date, end_date, status")
        .in("id", sitIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: sitIds.length > 0,
  });

  /* Chargement initial : on attend au minimum la liste des favoris */
  if (isLoadingFavorites) return <PageSkeleton />;

  const hasSitters = (sitters?.length ?? 0) > 0;
  const hasSits    = (sits?.length ?? 0) > 0;
  const defaultTab = hasSitters ? "sitters" : "sits";

  return (
    <>
      <PageMeta
        title={t("favorites_page.meta_title")}
        description={t("favorites_page.meta_description")}
      />

      <div className="max-w-xl mx-auto pb-10">
        {/* ── En-tête ──────────────────────────────────────────────────── */}
        <div className="px-4 pt-5 pb-3">
          <h1 className="text-xl font-heading font-bold text-foreground leading-tight">
            {t("favorites_page.title")}
          </h1>
        </div>

        {/* ── Tabs sticky 44 px ────────────────────────────────────────── */}
        <Tabs defaultValue={defaultTab} className="w-full">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4">
            <TabsList className="w-full h-[44px] grid grid-cols-2 bg-transparent gap-1 p-0 border-0">
              <TabsTrigger
                value="sitters"
                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm font-medium gap-1.5"
              >
                {t("favorites_page.tab_sitters")}
                {hasSitters && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0 leading-none">
                    {sitters!.length}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="sits"
                className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm font-medium gap-1.5"
              >
                {t("favorites_page.tab_sits")}
                {hasSits && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0 leading-none">
                    {sits!.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Onglet gardiens ──────────────────────────────────────────── */}
          <TabsContent value="sitters" className="mt-0 px-4 pt-4">
            {isLoadingSitters ? (
              <FavoritesSkeleton count={4} />
            ) : !hasSitters ? (
              <EmptyState
                illustration="walkingDog"
                title={t("favorites_page.no_sitter_fav_title")}
                description="Vous n'avez pas encore sauvegardé de gardien. Parcourez les profils et appuyez sur le cœur pour retrouver vos favoris ici."
                actionLabel={t("favorites_page.search_sitter")}
                actionTo="/search"
              />
            ) : (
              <div className="space-y-2">
                {sitters!.map((sitter: any) => (
                  <SitterCard
                    key={sitter.id}
                    sitter={sitter}
                    fallbackLabel={t("favorites_page.member_fallback")}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Onglet gardes ────────────────────────────────────────────── */}
          <TabsContent value="sits" className="mt-0 px-4 pt-4">
            {isLoadingSits ? (
              <FavoritesSkeleton count={4} />
            ) : !hasSits ? (
              <EmptyState
                illustration="emptyCalendar"
                title={t("favorites_page.no_sit_fav_title")}
                description="Vous n'avez pas encore sauvegardé d'annonce de garde. Explorez les annonces disponibles et ajoutez celles qui vous intéressent."
                actionLabel={t("favorites_page.view_listings")}
                actionTo="/sits"
              />
            ) : (
              <div className="space-y-2">
                {sits!.map((sit: any) => (
                  <SitCard
                    key={sit.id}
                    sit={sit}
                    fallbackLabel={t("favorites_page.listing_fallback")}
                    locale={locale}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Favorites;
