import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { PRO_CATEGORIES, getCategoryByValue, getProInitials } from "@/lib/proCategories";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import ProsMap from "@/components/pros/ProsMap";
import ProVerifiedBadge from "@/components/pros/ProVerifiedBadge";
import { useAuth } from "@/contexts/AuthContext";
import PublicHeader from "@/components/layout/PublicHeader";

type ProRow = {
  id: string;
  slug: string;
  raison_sociale: string;
  category: string;
  city: string | null;
  logo_url: string | null;
  description: string | null;
  urgences_24_7: boolean;
  siret_verified: boolean;
  siret_verified_at: string | null;
};

type SortKey = "recent" | "alpha" | "city";

export default function ProsListing() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [pros, setPros] = useState<ProRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useState<"list" | "map">("list");
  const [only247, setOnly247] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("pro_profiles")
        .select("id, slug, raison_sociale, category, city, logo_url, description, urgences_24_7, siret_verified, siret_verified_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      setPros((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const list = pros.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (only247 && !p.urgences_24_7) return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !p.raison_sociale.toLowerCase().includes(q) &&
          !(p.city ?? "").toLowerCase().includes(q) &&
          !(p.description ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
    const sorter: Record<SortKey, (a: ProRow, b: ProRow) => number> = {
      recent: () => 0,
      alpha: (a, b) => a.raison_sociale.localeCompare(b.raison_sociale, "fr"),
      city: (a, b) => (a.city ?? "").localeCompare(b.city ?? "", "fr"),
    };
    return [...list].sort(sorter[sort]);
  }, [pros, category, query, sort, only247]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t("pros_listing.meta_title")}</title>
        <meta name="description" content={t("pros_listing.meta_description")} />
        <link rel="canonical" href="https://guardiens.fr/pros" />
      </Helmet>

      <main className="container mx-auto px-4 py-6 md:py-10 max-w-6xl min-w-0">
        {/* En-tête épuré */}
        <header className="mb-6 md:mb-8">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h1 className="text-2xl md:text-4xl font-display font-bold">
              {t("pros_listing.h1")}
            </h1>
            <span className="text-[9px] md:text-[10px] uppercase tracking-wider font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 md:px-2 md:py-1 rounded align-middle">
              {t("pros_listing.beta")}
            </span>
          </div>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mt-2">
            {t("pros_listing.intro")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/pros/inscription">{t("pros_listing.register_cta")}</Link>
            </Button>
            {isAuthenticated && (
              <Button asChild size="sm" variant="outline">
                <Link to="/pros/mon-espace">{t("pros_listing.my_space")}</Link>
              </Button>
            )}
          </div>
        </header>

        {/* Deux niveaux de pros : pédagogie sobre */}
        <section className="mb-8 rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 className="font-heading text-lg md:text-xl font-semibold text-foreground mb-1">
            Deux niveaux de pros dans notre annuaire
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Vous choisissez selon votre confiance et votre budget.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="mb-2">
                <ProVerifiedBadge surface="card_listing" trackImpression={false} />
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                SIRET contrôlé manuellement par notre équipe. Contact direct au moment de la demande d'inscription. Recommandé pour les gardes qui demandent un professionnel identifié.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="mb-2">
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  Déclaratif
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                Fiche remplie par le pro, sans vérification de notre part. Utile pour explorer un territoire, comparer, ou entrer en contact rapidement.
              </p>
            </div>
          </div>
        </section>


        {/* Barre de filtres unique : recherche + catégorie + tri + 24/7 + vue */}
        <div className="space-y-3 mb-6">
          <div className="flex flex-col md:flex-row gap-2">
            <Input
              placeholder={t("pros_listing.search_placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="md:max-w-sm"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm md:max-w-[220px]"
              aria-label="Catégorie"
            >
              <option value="all">{t("pros_listing.all")}</option>
              {PRO_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm md:max-w-[180px]"
              aria-label={t("pros_listing.sort_aria")}
            >
              <option value="recent">{t("pros_listing.sort_recent")}</option>
              <option value="alpha">{t("pros_listing.sort_alpha")}</option>
              <option value="city">{t("pros_listing.sort_city")}</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={only247} onCheckedChange={(v) => setOnly247(!!v)} />
              Urgences 24/7 uniquement
            </label>
            <div className="inline-flex rounded-md border border-border overflow-hidden ml-auto" role="tablist" aria-label="Mode d'affichage">
              <button
                type="button"
                role="tab"
                aria-selected={view === "list"}
                onClick={() => setView("list")}
                className={`px-3 py-1.5 text-sm font-medium transition ${view === "list" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              >
                Liste
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "map"}
                onClick={() => setView("map")}
                className={`px-3 py-1.5 text-sm font-medium transition border-l border-border ${view === "map" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              >
                Carte
              </button>
            </div>
          </div>
        </div>

        {view === "map" && (
          <div className="mb-8">
            <ProsMap categoryFilter={category} />
            <p className="text-xs text-muted-foreground mt-2">
              Positions arrondies au quartier pour préserver la vie privée des pros.
            </p>
          </div>
        )}

        {view === "list" && (loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t("pros_listing.empty")}
              <div className="mt-4">
                <Button asChild variant="outline">
                  <Link to="/pros/inscription">{t("pros_listing.be_first")}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const cat = getCategoryByValue(p.category);
              return (
                <Link key={p.id} to={`/pros/${p.slug}`} className="group min-w-0">
                  <Card className={`h-full hover:shadow-md transition overflow-hidden relative ${p.siret_verified ? "border-primary/30" : ""}`}>
                    {p.siret_verified && (
                      <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
                        <ProVerifiedBadge
                          verifiedAt={p.siret_verified_at}
                          proId={p.id}
                          surface="card_listing"
                          size="sm"
                        />
                      </div>
                    )}
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        {p.logo_url ? (
                          <img
                            src={p.logo_url}
                            alt={t("pros_listing.logo_alt", { name: p.raison_sociale })}
                            className="w-14 h-14 rounded-lg object-contain bg-muted"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className={`w-14 h-14 rounded-lg flex items-center justify-center font-semibold text-lg ${cat?.placeholderClass ?? "bg-muted text-muted-foreground"}`}
                            aria-hidden="true"
                          >
                            {getProInitials(p.raison_sociale)}
                          </div>
                        )}
                        <div className="min-w-0 pr-16">
                          <h2 className="font-semibold truncate group-hover:underline">
                            {p.raison_sociale}
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            {cat?.label}
                            {p.city ? ` · ${p.city}` : ""}
                          </p>
                        </div>
                      </div>
                      {p.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {p.description}
                        </p>
                      )}
                      {p.urgences_24_7 && (
                        <Badge variant="secondary" className="mt-3">
                          {t("pros_listing.emergencies_24_7")}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ))}

        {/* SEO : silo catégories en bas de page, après le contenu utile */}
        <section className="mt-12 pt-8 border-t border-border" aria-labelledby="browse-by-cat">
          <h2 id="browse-by-cat" className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Parcourir par spécialité
          </h2>
          <div className="flex flex-wrap gap-2">
            {PRO_CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                to={`/pros/categorie/${c.slug}`}
                className="inline-flex items-center px-3 py-1 rounded-full border border-border bg-background text-sm hover:bg-muted transition"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
