// Page publique éditoriale — toutes les annonces de garde ouvertes.
// Objectif : conversion. Pas de sidebar dashboard, pas de filtres lourds.
// Visiteurs anonymes & connectés y accèdent depuis la LP / le header public.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, MapPin, Calendar, Search as SearchIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface LiveSit {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  city: string | null;
  first_name: string | null;
  cover_photo_url: string | null;
  first_photo: string | null;
  property_type: string | null;
}

const formatDateShort = (d: string | null) =>
  d ? format(new Date(d), "d MMM", { locale: fr }) : "";

const initial = (name: string | null) =>
  name ? name.trim().charAt(0).toUpperCase() : "G";

export default function PublicListings() {
  const [sits, setSits] = useState<LiveSit[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rawSits } = await supabase
        .from("sits")
        .select("id, title, start_date, end_date, user_id, property_id")
        .eq("status", "published")
        .eq("accepting_applications", true)
        .order("created_at", { ascending: false })
        .limit(60);

      if (cancelled || !rawSits?.length) {
        if (!cancelled) setLoading(false);
        return;
      }

      const ownerIds = Array.from(new Set(rawSits.map((s) => s.user_id).filter(Boolean)));
      const propIds = Array.from(new Set(rawSits.map((s) => s.property_id).filter(Boolean)));

      const [{ data: owners }, { data: props }] = await Promise.all([
        supabase
          .from("public_profiles")
          .select("id, first_name, city")
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
          cover_photo_url: p?.cover_photo_url ?? null,
          first_photo: p?.photos?.[0] ?? null,
          property_type: p?.type ?? null,
        };
      });

      if (!cancelled) {
        setSits(enriched);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sits;
    return sits.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.first_name?.toLowerCase().includes(q),
    );
  }, [sits, query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Annonces de garde en cours — Guardiens</title>
        <meta
          name="description"
          content="Découvrez les annonces de garde en cours partout en France. Consultation libre, inscription gratuite pour postuler."
        />
        <link rel="canonical" href="https://guardiens.fr/annonces" />
      </Helmet>

      <PublicHeader />

      {/* HERO éditorial */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" aria-hidden />
        <div className="relative max-w-5xl mx-auto px-5 sm:px-6 py-16 md:py-24 text-center">
          <p className="text-xs md:text-[13px] tracking-[0.22em] uppercase text-primary font-medium mb-4">
            En direct de la communauté
          </p>
          <h1 className="font-heading text-4xl md:text-6xl font-semibold leading-[1.05] mb-6">
            Les annonces de garde
            <br />
            <span className="text-primary">qui cherchent un gardien.</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Maisons, appartements, animaux à choyer. Consultez librement les annonces publiées
            par les propriétaires. L'inscription est gratuite pour postuler.
          </p>

          {/* Recherche simple */}
          <div className="mt-10 max-w-xl mx-auto">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrer par ville, prénom ou mot-clé…"
                className="pl-11 h-12 rounded-full bg-card border-border text-base"
                aria-label="Rechercher une annonce"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {loading ? "Chargement…" : `${filtered.length} annonce${filtered.length > 1 ? "s" : ""} ouverte${filtered.length > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      </section>

      {/* GRILLE */}
      <section className="max-w-6xl mx-auto px-5 sm:px-6 py-14 md:py-20">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-3xl bg-muted aspect-[4/5]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-heading text-2xl font-semibold mb-3">Aucune annonce ne correspond.</p>
            <p className="text-muted-foreground">Essayez un autre mot-clé, ou revenez bientôt.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((s) => {
              const photo = s.cover_photo_url || s.first_photo;
              const dates =
                s.start_date && s.end_date
                  ? `${formatDateShort(s.start_date)} → ${formatDateShort(s.end_date)}`
                  : "Dates flexibles";
              return (
                <Link
                  key={s.id}
                  to={`/annonces/${s.id}`}
                  className="group bg-card border border-border rounded-3xl overflow-hidden hover:border-primary/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
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
                        <span className="text-5xl font-heading text-muted-foreground/40">
                          {initial(s.first_name)}
                        </span>
                      </div>
                    )}
                    {s.city && (
                      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-background/95 backdrop-blur text-foreground text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                        <MapPin className="h-3 w-3" />
                        {s.city}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h2 className="font-heading text-lg font-semibold text-foreground line-clamp-2 mb-3 group-hover:text-primary transition-colors leading-snug">
                      {s.title}
                    </h2>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">{s.first_name ? `Chez ${s.first_name}` : ""}</span>
                      <span className="inline-flex items-center gap-1 font-medium shrink-0">
                        <Calendar className="h-3 w-3" />
                        {dates}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* CTA conversion */}
      <section className="border-t border-border/60 bg-gradient-to-br from-primary/[0.04] via-background to-background">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 py-20 md:py-28 text-center">
          <h2 className="font-heading text-3xl md:text-5xl font-semibold leading-tight mb-5">
            Envie de garder une maison&nbsp;?
          </h2>
          <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            Inscrivez-vous gratuitement en deux minutes pour postuler aux annonces qui vous attirent.
            Sans engagement.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link to="/inscription?role=sitter">
                Créer mon compte gardien
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8">
              <Link to="/comment-ca-marche">Comment ça marche</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Gratuit pour les propriétaires. Sans carte bancaire à l'inscription.
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
