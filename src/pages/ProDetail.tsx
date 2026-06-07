import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryByValue } from "@/lib/proCategories";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [pro, setPro] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      // F-07: ne sélectionner que les colonnes publiques (pas user_id, approved_by, rejection_reason)
      const { data } = await supabase
        .from("pro_profiles")
        .select(
          "id, slug, raison_sociale, category, sub_categories, city, postal_code, description, phone, website, email_contact, urgences_24_7, siret_verified, logo_url, cover_url, tarif_min, tarif_max, tarif_note, horaires, diplomes, ordre_number, zone_radius_km, zone_cities"
        )
        .eq("slug", slug)
        .eq("status", "approved")
        .maybeSingle();
      setPro(data);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-4xl min-w-0">
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!pro) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-2xl text-center min-w-0">
        <h1 className="text-2xl font-bold mb-3">Fiche introuvable</h1>
        <p className="text-muted-foreground mb-6">
          Cette fiche n'existe pas ou n'a pas encore été validée.
        </p>
        <Button asChild>
          <Link to="/pros">Voir l'annuaire</Link>
        </Button>
      </div>
    );
  }

  const cat = getCategoryByValue(pro.category);
  const title = `${pro.raison_sociale} – ${cat?.label}${pro.city ? `, ${pro.city}` : ""}`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title} | Guardiens</title>
        <meta
          name="description"
          content={pro.description?.slice(0, 155) ?? `${cat?.label} ${pro.city ?? ""}`}
        />
        <link rel="canonical" href={`https://guardiens.fr/pros/${pro.slug}`} />
      </Helmet>

      <main className="container mx-auto px-4 py-10 max-w-4xl min-w-0">
        <div className="flex items-start gap-5 mb-8">
          {pro.logo_url ? (
            <img
              src={pro.logo_url}
              alt={`Logo ${pro.raison_sociale}`}
              className="w-24 h-24 rounded-xl object-contain bg-muted"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-muted" />
          )}
          <div className="min-w-0">
            <h1 className="text-3xl font-display font-bold">{pro.raison_sociale}</h1>
            <p className="text-muted-foreground mt-1">
              {cat?.label}
              {pro.city ? ` · ${pro.city}` : ""}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {pro.urgences_24_7 && <Badge variant="secondary">Urgences 24/7</Badge>}
              {pro.siret_verified && <Badge variant="secondary">SIRET vérifié</Badge>}
            </div>
          </div>
        </div>

        {pro.description && (
          <Card className="mb-6">
            <CardContent className="p-6 whitespace-pre-line">{pro.description}</CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {(pro.phone || pro.website || pro.email_contact) && (
            <Card>
              <CardContent className="p-6 space-y-2">
                <h2 className="font-semibold mb-2">Contact</h2>
                {pro.phone && <p>Téléphone : {pro.phone}</p>}
                {pro.email_contact && <p>Email : {pro.email_contact}</p>}
                {pro.website && (
                  <p>
                    Site :{" "}
                    <a
                      href={pro.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {pro.website}
                    </a>
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {(pro.tarif_min || pro.tarif_max || pro.tarif_note) && (
            <Card>
              <CardContent className="p-6 space-y-2">
                <h2 className="font-semibold mb-2">Tarifs indicatifs</h2>
                {(pro.tarif_min || pro.tarif_max) && (
                  <p>
                    {pro.tarif_min ?? "?"} € à {pro.tarif_max ?? "?"} €
                  </p>
                )}
                {pro.tarif_note && (
                  <p className="text-sm text-muted-foreground">{pro.tarif_note}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
