import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/normalize";
import { CITIES } from "@/data/cities";
import { buildOgImageUrl } from "@/lib/ogImage";
import ShareLink from "@/components/share/ShareLink";
import { useAlmaCulturalFact } from "@/hooks/useAlmaCulturalFact";

interface BreedProfile {
  species: string;
  breed: string;
  temperament: string | null;
  exercise_needs: string | null;
  grooming: string | null;
  stranger_behavior: string | null;
  sitter_tips: string | null;
  ideal_for: string | null;
  alimentation: string | null;
  health_notes: string | null;
  compatibility: string | null;
  difficulty_level: string | null;
  image_url: string | null;
  image_credit: string | null;
  image_alt: string | null;
  rich_content: string | null;
}

const SPECIES_LABEL: Record<string, string> = {
  dog: "chien",
  cat: "chat",
  bird: "oiseau",
  rodent: "rongeur",
  farm_animal: "animal de ferme",
  horse: "équidé",
};

const SPECIES_PREFIXES = ["dog", "cat", "bird", "rodent", "farm_animal", "horse"];

const BreedPage = () => {
  const { slug = "" } = useParams();
  const [breed, setBreed] = useState<BreedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const prefix = SPECIES_PREFIXES.find((p) => slug.startsWith(`${p}-`));
    if (!prefix) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const breedSlug = slug.slice(prefix.length + 1);
    setLoading(true);
    supabase
      .from("breed_profiles")
      .select("*")
      .eq("species", prefix)
      .then(({ data }) => {
        const match = (data as BreedProfile[] | null)?.find(
          (b) => slugify(b.breed) === breedSlug,
        );
        if (!match) setNotFound(true);
        else setBreed(match);
        setLoading(false);
      });
  }, [slug]);

  // Pass 5 — compagnon culturel : fait race matché sur species + breed slug.
  useAlmaCulturalFact({
    surface: "race_page",
    enabled: !!breed,
    context: {
      animal_species: breed?.species,
      animal_breed: breed ? slugify(breed.breed) : undefined,
    },
  });

  if (notFound) return <Navigate to="/races" replace />;
  if (loading || !breed) {
    return (
      <main className="min-w-0 max-w-3xl mx-auto px-4 py-8 md:py-12">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </main>
    );
  }

  const speciesLabel = SPECIES_LABEL[breed.species] || breed.species;
  const breedCap = breed.breed.charAt(0).toUpperCase() + breed.breed.slice(1);
  const title = `Garde de ${breedCap} à domicile : conseils gardien | Guardiens`;
  const description =
    (breed.sitter_tips || breed.temperament || "")
      .slice(0, 155)
      .replace(/\s+/g, " ")
      .trim() ||
    `Tout pour bien garder un ${speciesLabel} ${breedCap} : tempérament, besoins, conseils gardien.`;
  const canonical = `https://guardiens.fr/races/${slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: canonical,
    inLanguage: "fr-FR",
    about: { "@type": "Thing", name: breedCap },
    publisher: {
      "@type": "Organization",
      name: "Guardiens",
      url: "https://guardiens.fr",
    },
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://guardiens.fr/" },
      { "@type": "ListItem", position: 2, name: "Races", item: "https://guardiens.fr/races" },
      { "@type": "ListItem", position: 3, name: breedCap, item: canonical },
    ],
  };

  // FAQPage : 4 questions standards par race, dérivées des données.
  const faqQuestions: Array<{ q: string; a: string }> = [
    {
      q: `Comment bien garder un ${breedCap} à domicile ?`,
      a:
        (breed.sitter_tips || breed.temperament || "").slice(0, 500) ||
        `Un ${breedCap} se garde au mieux dans son environnement habituel, en respectant ses rituels alimentaires, ses sorties et ses besoins de repos. Les gardiens Guardiens reçoivent un guide complet avant chaque garde.`,
    },
    {
      q: `Combien d'exercice quotidien pour un ${breedCap} ?`,
      a:
        (breed.exercise_needs || "").slice(0, 400) ||
        `Les besoins varient selon l'âge et la santé. Indiquez les habitudes précises de votre ${breedCap} dans l'annonce, les gardiens adaptent leurs sorties en conséquence.`,
    },
    {
      q: `Le ${breedCap} s'entend-il avec les enfants et autres animaux ?`,
      a:
        (breed.compatibility || breed.temperament || "").slice(0, 400) ||
        `La compatibilité dépend du caractère individuel et de l'éducation. Précisez les comportements connus de votre ${breedCap} dans le guide de la maison.`,
    },
    {
      q: `Combien coûte la garde d'un ${breedCap} sur Guardiens ?`,
      a:
        "Pour les propriétaires, Guardiens est gratuit : aucun frais, aucune commission. L'accès gardien est également gratuit aujourd'hui, sans engagement.",
    },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqQuestions.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };


  const ogImage = breed.image_url || buildOgImageUrl({ title: breedCap, subtitle: "Fiche de race, conseils gardien", kind: "race" });

  const sections: Array<{ title: string; body: string | null }> = [
    { title: "Tempérament", body: breed.temperament },
    { title: "Besoins d'exercice", body: breed.exercise_needs },
    { title: "Toilettage", body: breed.grooming },
    { title: "Alimentation", body: breed.alimentation },
    { title: "Santé", body: breed.health_notes },
    { title: "Comportement avec les inconnus", body: breed.stranger_behavior },
    { title: "Compatibilité", body: breed.compatibility },
    { title: "Idéal pour", body: breed.ideal_for },
    { title: "Conseils gardien", body: breed.sitter_tips },
  ].filter((s) => s.body && s.body.trim().length > 0);

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={ogImage} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>

      </Helmet>

      <main className="min-w-0 max-w-3xl mx-auto px-4 py-8 md:py-12">
        <nav className="text-sm text-muted-foreground mb-4">
          <Link to="/" className="hover:underline">Accueil</Link>
          <span className="mx-2">/</span>
          <Link to="/races" className="hover:underline">Races</Link>
          <span className="mx-2">/</span>
          <span className="capitalize">{breed.breed}</span>
        </nav>

        <header className="mb-8">
          <p className="hidden md:block text-sm uppercase tracking-wide text-primary font-semibold mb-2">
            Guide de garde · {speciesLabel}
          </p>
          <h1 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3">
            Garder un {breedCap} à domicile
          </h1>
          {breed.difficulty_level && (
            <span className="inline-block px-3 py-1 rounded-full bg-muted text-sm text-foreground">
              Niveau : {breed.difficulty_level}
            </span>
          )}
          <div className="mt-4">
            <ShareLink url={canonical} title={title} text={description} source="breed_page" />
          </div>
        </header>

        {breed.image_url && (
          <figure className="mb-10 rounded-xl overflow-hidden border border-border bg-muted">
            <img
              src={breed.image_url}
              alt={breed.image_alt || `Photo d'un ${breedCap}`}
              className="w-full h-auto max-h-[480px] object-cover"
              loading="eager"
            />
            {breed.image_credit && (
              <figcaption className="px-4 py-2 text-xs text-muted-foreground bg-muted">
                {breed.image_credit}
              </figcaption>
            )}
          </figure>
        )}

        {breed.rich_content && breed.rich_content.trim().length > 200 ? (
          <article className="prose prose-lg prose-neutral max-w-none prose-headings:font-serif prose-headings:text-foreground prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2 prose-p:text-foreground/85 prose-p:leading-relaxed prose-li:text-foreground/85 prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
            <ReactMarkdown>{breed.rich_content}</ReactMarkdown>
          </article>
        ) : (
          <article className="prose prose-neutral max-w-none">
            {sections.map((s) => (
              <section key={s.title} className="mb-6">
                <h2 className="font-serif text-xl font-semibold text-foreground mb-2">
                  {s.title}
                </h2>
                <p className="text-foreground/90 whitespace-pre-line">{s.body}</p>
              </section>
            ))}
          </article>
        )}

        <section className="mt-12 pt-8 border-t border-border">
          <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
            Trouver un gardien pour votre {breedCap}
          </h2>
          <p className="text-muted-foreground mb-4">
            Guardiens couvre la France entière. Voici quelques hubs où nos gardiens sont actifs :
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {CITIES.map((c) => (
              <Link
                key={c.slug}
                to={`/house-sitting/${c.slug}`}
                className="text-primary hover:underline font-medium text-sm"
              >
                Garde à {c.name}
              </Link>
            ))}
            <Link
              to="/annonces"
              className="text-primary hover:underline font-medium text-sm"
            >
              Toutes les annonces
            </Link>
          </div>
        </section>
      </main>
    </>
  );
};

export default BreedPage;
