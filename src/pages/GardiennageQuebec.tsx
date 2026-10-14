/**
 * /gardiennage-maison-quebec (lot QC1, 14/10/2026) : page d'entrée pour les
 * propriétaires et gardiens du Québec, et pour les gardiens de France qui
 * veulent garder au Québec. Textes et FAQ : src/lib/quebecPage.ts.
 * Blocs vivants : annonces ouvertes au Canada (fetchIntlOpenSits), gardiens
 * inscrits au Canada (search_sitter_country_counts), guides locaux du Canada.
 */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchIntlOpenSits, intlPlaceLabel } from "@/lib/intlSitSearch";
import { fetchSitterCountryCounts } from "@/lib/sitterSearch";
import {
  AVE_URL,
  DIPLOMATIE_URL,
  IRCC_URL,
  QUEBEC_DESCRIPTION,
  QUEBEC_FAQ,
  QUEBEC_H1,
  QUEBEC_INTRO,
  QUEBEC_PATH,
  QUEBEC_SECTIONS,
  QUEBEC_TITLE,
  QUEBEC_URL,
  quebecJsonLd,
} from "@/lib/quebecPage";

const OWNER_SIGNUP = `/inscription?role=owner&redirect=${encodeURIComponent("/sits/create")}`;
const SITTER_SIGNUP = "/inscription?role=sitter";
const CANADA_LISTINGS = "/annonces/international?pays=CA";

const fmtDate = (d: string | null) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : null;

export default function GardiennageQuebec() {
  const { data: sits = [] } = useQuery({
    queryKey: ["quebec-page-sits"],
    queryFn: async () => (await fetchIntlOpenSits()).filter((s) => s.place.country === "CA").slice(0, 6),
    staleTime: 5 * 60 * 1000,
  });
  const { data: sitterCount = 0 } = useQuery({
    queryKey: ["quebec-page-sitters"],
    queryFn: async () => (await fetchSitterCountryCounts()).find((r) => r.code === "CA")?.count ?? 0,
    staleTime: 5 * 60 * 1000,
  });
  const { data: guides = [] } = useQuery({
    queryKey: ["quebec-page-guides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_guides")
        .select("slug, city")
        .eq("country", "CA")
        .eq("published", true)
        .order("city");
      if (error) throw error;
      return (data ?? []) as Array<{ slug: string; city: string }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const [owners, sittersQc, sittersFr, practical] = QUEBEC_SECTIONS;

  return (
    <>
      <PageMeta title={QUEBEC_TITLE} description={QUEBEC_DESCRIPTION} path={QUEBEC_PATH} canonical={QUEBEC_URL} jsonLd={quebecJsonLd()} />

      <div className="mx-auto max-w-3xl px-4 py-8">
        <PageBreadcrumb items={[{ label: "Gardiennage de maison au Québec" }]} />

        <article className="prose prose-stone max-w-none font-body">
          <h1 className="font-heading text-2xl md:text-4xl font-bold text-foreground">{QUEBEC_H1}</h1>
          <p className="text-lg text-muted-foreground">{QUEBEC_INTRO}</p>

          <div className="not-prose my-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to={OWNER_SIGNUP}>Publier mon annonce</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={SITTER_SIGNUP}>Devenir gardien</Link>
            </Button>
          </div>

          {[owners, sittersQc].map((s) => (
            <section key={s.id} id={s.id}>
              <h2 className="font-heading text-2xl font-semibold mt-8">{s.title}</h2>
              {s.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {s.steps ? (
                <ol>
                  {s.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              ) : null}
            </section>
          ))}

          <section id="annonces">
            <h2 className="font-heading text-2xl font-semibold mt-8">Annonces de garde au Canada</h2>
            {sits.length > 0 ? (
              <ul>
                {sits.map((s) => {
                  const start = fmtDate(s.start_date);
                  const end = fmtDate(s.end_date);
                  return (
                    <li key={s.id}>
                      <Link to={`/annonces/${s.slug || s.id}`} className="underline">
                        {s.title || "Garde de maison"}
                      </Link>
                      {", "}
                      {intlPlaceLabel(s.place)}
                      {start && end ? ` (du ${start} au ${end})` : ""}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>Les prochaines annonces publiées au Canada apparaîtront ici dès leur mise en ligne.</p>
            )}
            <p>
              <Link to={CANADA_LISTINGS} className="underline">Toutes les annonces au Canada</Link>
              {sitterCount > 0 ? ` · ${sitterCount} gardien${sitterCount > 1 ? "s" : ""} inscrit${sitterCount > 1 ? "s" : ""} au Canada` : ""}
            </p>
          </section>

          {[sittersFr, practical].map((s) => (
            <section key={s.id} id={s.id}>
              <h2 className="font-heading text-2xl font-semibold mt-8">{s.title}</h2>
              {s.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {s.id === "gardiens-france" ? (
                <p className="text-sm text-muted-foreground">
                  Sources officielles :{" "}
                  <a href={AVE_URL} target="_blank" rel="noopener" className="underline">autorisation de voyage électronique (Canada)</a>,{" "}
                  <a href={IRCC_URL} target="_blank" rel="noopener" className="underline">Immigration, Réfugiés et Citoyenneté Canada</a>,{" "}
                  <a href={DIPLOMATIE_URL} target="_blank" rel="noopener" className="underline">conseils aux voyageurs (France)</a>.
                </p>
              ) : null}
            </section>
          ))}

          {guides.length > 0 ? (
            <section id="guides">
              <h2 className="font-heading text-2xl font-semibold mt-8">Guides locaux au Canada</h2>
              <p>Parcs, balades, vétérinaires et animaleries vérifiés dans OpenStreetMap, avec l'itinéraire pour chaque lieu.</p>
              <ul>
                {guides.map((g) => (
                  <li key={g.slug}>
                    <Link to={`/guides/${g.slug}`} className="underline">Guide de {g.city}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section id="faq">
            <h2 className="font-heading text-2xl font-semibold mt-8">Questions fréquentes</h2>
            {QUEBEC_FAQ.map((f) => (
              <div key={f.question}>
                <h3 className="font-heading text-lg font-semibold mt-4">{f.question}</h3>
                <p>{f.answer}</p>
              </div>
            ))}
          </section>

          <Card className="not-prose mt-10 border-primary/20 bg-primary/5">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-heading text-xl font-semibold text-foreground m-0">Votre maison, vos animaux, une personne de confiance</h2>
              <p className="text-muted-foreground m-0">
                Publiez votre annonce en quelques minutes, ou créez votre profil de gardien. Guardiens est gratuit.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link to={OWNER_SIGNUP}>Publier mon annonce</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to={SITTER_SIGNUP}>Devenir gardien</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <nav className="mt-10 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground mb-2">À lire ensuite</p>
            <ul className="space-y-1">
              <li><Link to={CANADA_LISTINGS} className="underline">Annonces de garde au Canada</Link></li>
              <li><Link to="/devenir-home-sitter" className="underline">Devenir gardien, le guide</Link></li>
              <li><Link to="/guides" className="underline">Tous les guides locaux</Link></li>
              <li><Link to="/faq" className="underline">FAQ complète</Link></li>
            </ul>
          </nav>
        </article>
      </div>
    </>
  );
}
