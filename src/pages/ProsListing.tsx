import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { PRO_CATEGORIES, getCategoryByValue } from "@/lib/proCategories";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type ProRow = {
  id: string;
  slug: string;
  raison_sociale: string;
  category: string;
  city: string | null;
  logo_url: string | null;
  description: string | null;
  urgences_24_7: boolean;
};

export default function ProsListing() {
  const [pros, setPros] = useState<ProRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string | "all">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("pro_profiles" as any)
        .select("id, slug, raison_sociale, category, city, logo_url, description, urgences_24_7")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      setPros((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return pros.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
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
  }, [pros, category, query]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Annuaire des pros animaliers près de chez vous | Guardiens</title>
        <meta
          name="description"
          content="Trouvez vétérinaires, éducateurs, toiletteurs, ostéopathes et autres professionnels animaliers vérifiés près de chez vous."
        />
        <link rel="canonical" href="https://guardiens.fr/pros" />
      </Helmet>

      <main className="container mx-auto px-4 py-10 max-w-6xl min-w-0">
        <header className="mb-10">
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <h1 className="text-4xl font-display font-bold">
              Pros animaliers près de chez vous
            </h1>
            <span className="text-[10px] uppercase tracking-wider font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded">
              Bêta
            </span>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Vétérinaires, éducateurs, toiletteurs, ostéopathes, transporteurs, photographes…
            tous les pros vérifiés au service de vos animaux, partout en France.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Annuaire en phase bêta : les premières fiches arrivent. Vous êtes pro ?
            Inscrivez-vous gratuitement, votre fiche sera validée sous 48h.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/pros/inscription">Inscrire mon activité</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/pros/mon-espace">Mon espace pro</Link>
            </Button>
          </div>

          <div className="mt-8 rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <p className="font-medium mb-1">Vous êtes gardien particulier déclaré en auto-entreprise&nbsp;?</p>
            <p className="text-muted-foreground">
              Cet annuaire référence des pros animaliers (vétérinaires, éducateurs, toiletteurs…) qui n'assurent pas
              forcément de garde. Si vous proposez des gardes rémunérées à titre professionnel, demandez plutôt le
              badge <strong>Gardien Pro vérifié</strong> depuis vos{" "}
              <Link to="/settings" className="underline font-medium">paramètres</Link>. Il s'affichera sur votre profil
              et dans la recherche gardiens.
            </p>
          </div>
        </header>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <Input
            placeholder="Rechercher un pro, une ville…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="md:max-w-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={category === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCategory("all")}
            >
              Tous
            </Badge>
            {PRO_CATEGORIES.map((c) => (
              <Badge
                key={c.value}
                variant={category === c.value ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setCategory(c.value)}
              >
                {c.label}
              </Badge>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucun pro ne correspond à votre recherche pour le moment.
              <div className="mt-4">
                <Button asChild variant="outline">
                  <Link to="/pros/inscription">Être le premier inscrit</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const cat = getCategoryByValue(p.category);
              return (
                <Link key={p.id} to={`/pros/${p.slug}`} className="group">
                  <Card className="h-full hover:shadow-md transition">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        {p.logo_url ? (
                          <img
                            src={p.logo_url}
                            alt={`Logo ${p.raison_sociale}`}
                            className="w-14 h-14 rounded-lg object-contain bg-muted"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-muted" />
                        )}
                        <div className="min-w-0">
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
                          Urgences 24/7
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
