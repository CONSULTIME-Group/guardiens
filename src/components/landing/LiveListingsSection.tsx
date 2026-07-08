import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import fallbackMarrakech from "@/assets/fallback-marrakech.webp";


const fallbackImageFor = (city: string | null): string | null => {
  if (!city) return null;
  const c = city.toUpperCase();
  if (c.includes("MARRAKECH") || c.includes("MARRAKESH")) return fallbackMarrakech;
  return null;
};

interface LiveSit {
  slug?: string | null;
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  city: string | null;
  first_name: string | null;
  avatar_url: string | null;
  cover_photo_url: string | null;
  first_photo: string | null;
  property_type: string | null;
}

const formatDateShort = (d: string | null) =>
  d ? format(new Date(d), "d MMM", { locale: fr }) : "";

const initials = (name: string | null) =>
  name ? name.trim().charAt(0).toUpperCase() : "G";

const LiveListingsSection: React.FC = () => {
  const { t } = useTranslation();
  const [sits, setSits] = useState<LiveSit[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rawSits } = await supabase
        .from("sits")
        .select("id, slug, title, start_date, end_date, user_id, property_id, cover_photo_url")
        .eq("status", "published")
        .eq("accepting_applications", true)
        .order("created_at", { ascending: false })
        .limit(12);

      if (cancelled || !rawSits?.length) {
        if (!cancelled) setLoading(false);
        return;
      }

      const ownerIds = Array.from(new Set(rawSits.map((s) => s.user_id).filter(Boolean)));
      const propIds = Array.from(new Set(rawSits.map((s) => s.property_id).filter(Boolean)));

      const [{ data: owners }, { data: props }] = await Promise.all([
        supabase
          .from("public_profiles")
          .select("id, first_name, avatar_url, city")
          .in("id", ownerIds),
        supabase
          .from("properties")
          .select("id, type, cover_photo_url, photos")
          .in("id", propIds),
      ]);

      const ownerMap = new Map((owners || []).map((o: any) => [o.id, o]));
      const propMap = new Map((props || []).map((p: any) => [p.id, p]));

      const enriched: LiveSit[] = rawSits.map((s: any) => {
        const o = ownerMap.get(s.user_id);
        const p = propMap.get(s.property_id);
        return {
          id: s.id,
          title: s.title,
          start_date: s.start_date,
          end_date: s.end_date,
          city: o?.city ?? null,
          first_name: o?.first_name ?? null,
          avatar_url: o?.avatar_url ?? null,
          cover_photo_url: s.cover_photo_url ?? p?.cover_photo_url ?? null,
          first_photo: p?.photos?.[0] ?? null,
          property_type: p?.type ?? null,
        };
      });

      if (!cancelled) {
        setSits(enriched.slice(0, 8));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;
  if (sits.length < 3) return null;

  return (
    <section
      id="annonces-en-cours"
      className="py-24 md:py-32 bg-background scroll-mt-24"
      aria-labelledby="live-listings-heading"
    >
      <div className="container max-w-6xl mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">
            {t("live_listings.community_eyebrow")}
          </p>
          <h2
            id="live-listings-heading"
            className="font-heading text-3xl md:text-5xl font-semibold text-foreground mb-4"
          >
            {t("live_listings.section_title")}
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("live_listings.section_lede")}
          </p>
        </div>


        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 ${sits.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3 max-w-5xl mx-auto"}`}>
          {sits.map((s) => {
            const photo = s.cover_photo_url || s.first_photo || fallbackImageFor(s.city);
            const dates =
              s.start_date && s.end_date
                ? `${formatDateShort(s.start_date)} → ${formatDateShort(s.end_date)}`
                : null;
            return (
              <Link
                key={s.id}
                to={`/annonces/${s.slug || s.id}`}
                className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all"
              >
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {photo ? (
                    <img
                      src={photo}
                      alt={s.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/40 to-muted">
                      <span className="text-4xl font-heading text-muted-foreground/40">
                        {initials(s.first_name)}
                      </span>
                    </div>
                  )}
                  {s.city && (
                    <span className="absolute bottom-3 left-3 bg-background/95 backdrop-blur text-foreground text-xs font-medium px-2.5 py-1 rounded-full shadow-sm">
                      {s.city}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-heading text-base font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {s.title}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{s.first_name ? t("live_listings.at_name", { name: s.first_name }) : ""}</span>
                    {dates && <span className="font-medium">{dates}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/annonces">
              {t("live_listings.cta_all")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            {t("live_listings.hint")}
          </p>
        </div>

      </div>
    </section>
  );
};

export default LiveListingsSection;
