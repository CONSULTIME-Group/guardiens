import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { useInventaireCounts } from "@/hooks/useInventaireCounts";
import AnalysisRequestForm from "@/components/inventaire/AnalysisRequestForm";
import coverImg from "@/assets/inventaire-guardiens-france.jpg";

const PAGE_URL = "https://guardiens.fr/actualites/inventaire-guardiens-france";
const TITLE = "L'inventaire vivant de Guardiens : ce que couvre la plateforme, aujourd'hui";
const DESCRIPTION =
  "Combien de villes, de races, de lieux dog-friendly, de professionnels sont référencés sur Guardiens. Chiffres mis à jour en direct, et un formulaire pour demander une analyse personnalisée.";

const SPECIES_LABELS: Record<string, string> = {
  dog: "chiens",
  cat: "chats",
  rodent: "rongeurs",
  bird: "oiseaux",
  horse: "chevaux",
  farm_animal: "animaux de ferme",
};

const PLACE_LABELS: Record<string, string> = {
  dog_park: "parcs canins",
  general_park: "parcs et jardins",
  dog_friendly_cafe: "cafés dog-friendly",
  walk_trail: "balades et sentiers",
  pet_shop: "animaleries",
  vet: "vétérinaires",
};

const PRO_LABELS: Record<string, string> = {
  veterinaire: "vétérinaires",
  educateur: "éducateurs canins",
  comportementaliste: "comportementalistes",
  toiletteur: "toiletteurs",
  pension: "pensions",
  ostheopathe: "ostéopathes animaliers",
};

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n || 0);
}

export default function ArticleInventaire() {
  const { data: counts } = useInventaireCounts();

  const c = counts ?? {
    cities_total: 0,
    places_total: 0,
    places_by_category: {},
    breeds_total: 0,
    breeds_by_species: {},
    pros_total: 0,
    pros_by_category: {},
    generated_at: new Date().toISOString(),
  };

  const speciesEntries = Object.entries(c.breeds_by_species).sort((a, b) => b[1] - a[1]);
  const placesEntries = Object.entries(c.places_by_category).sort((a, b) => b[1] - a[1]);
  const prosEntries = Object.entries(c.pros_by_category).sort((a, b) => b[1] - a[1]);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: TITLE,
    description: DESCRIPTION,
    url: PAGE_URL,
    datePublished: "2026-07-05",
    dateModified: c.generated_at,
    image: `https://guardiens.fr${coverImg}`,
    author: [
      { "@type": "Person", name: "Jérémie", url: "https://guardiens.fr/auteurs/jeremie" },
      { "@type": "Person", name: "Elisa", url: "https://guardiens.fr/auteurs/elisa" },
    ],
    publisher: {
      "@type": "Organization",
      name: "Guardiens",
      url: "https://guardiens.fr",
      logo: { "@type": "ImageObject", url: "https://guardiens.fr/logo.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": PAGE_URL },
  };

  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Inventaire vivant Guardiens",
    description:
      "Compteurs publics de la plateforme Guardiens : villes couvertes, races documentées, lieux dog-friendly, professionnels référencés.",
    url: PAGE_URL,
    creator: { "@type": "Organization", name: "Guardiens", url: "https://guardiens.fr" },
    isAccessibleForFree: true,
    inLanguage: "fr",
    dateModified: c.generated_at,
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Comment ces chiffres sont-ils calculés ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ils sont extraits en direct de notre base : guides de ville publiés, fiches de race, lieux dog-friendly référencés, fiches professionnelles actives. Rien n'est estimé.",
        },
      },
      {
        "@type": "Question",
        name: "Puis-je demander une fiche ville ou une race qui manque ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui, via le formulaire de cette page. Chaque demande est lue par l'équipe et priorisée selon le nombre de personnes qui la remontent.",
        },
      },
      {
        "@type": "Question",
        name: "Est-ce que c'est payant pour les propriétaires ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Non. Les propriétaires ne paient rien, jamais. L'espace gardien est également gratuit aujourd'hui, sans engagement, sans commission sur les gardes.",
        },
      },
    ],
  };

  return (
    <>
      <PageMeta
        title={TITLE}
        description={DESCRIPTION}
        path="/actualites/inventaire-guardiens-france"
        image={coverImg}
        type="article"
        publishedAt="2026-07-05"
        author="Jérémie et Elisa"
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(datasetSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <main id="main-content" className="min-w-0">
        <PageBreadcrumb
          items={[
            { label: "Actualités", href: "/actualites" },
            { label: "Inventaire vivant" },
          ]}
        />

        <article className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
          <header className="mb-8">
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground leading-tight mb-3">
              {TITLE}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              {DESCRIPTION}
            </p>
          </header>

          <div className="mb-8 -mx-2 sm:-mx-4">
            <img
              src={coverImg}
              alt="Carte de France illustrée à la gouache, parsemée de petites maisons et d'animaux de compagnie"
              className="block w-full h-auto rounded-xl"
              loading="eager"
              decoding="async"
              width={1600}
              height={896}
            />
          </div>

          {/* Section 1 : compteurs live */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-5">
              Ce que couvre Guardiens, en chiffres
            </h2>
            <p className="text-foreground leading-relaxed mb-5">
              Ces compteurs sont recalculés à chaque visite. Ils reflètent ce que nous avons publié, pas des estimations. Quand une ligne monte, c'est du travail éditorial réel.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard value={fmt(c.cities_total)} label="Villes couvertes" detail="Guides locaux publiés." />
              <StatCard value={fmt(c.breeds_total)} label="Races documentées" detail="Fiches complètes avec conseils de garde." />
              <StatCard value={fmt(c.places_total)} label="Lieux dog-friendly" detail="Parcs, cafés, sentiers, animaleries, vétérinaires." />
              <StatCard value={fmt(c.pros_total)} label="Professionnels" detail="Fiches vérifiées, référencées dans l'annuaire." />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Compteurs mis à jour en direct. Dernière lecture :{" "}
              {new Date(c.generated_at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}.
            </p>
          </section>

          {/* Section 2 : villes */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
              Les villes que nous couvrons
            </h2>
            <p className="text-foreground leading-relaxed mb-4">
              Nous ne publions pas de guide pour publier. Chaque ville a été retenue parce qu'un besoin réel remonte du terrain : des propriétaires cherchent, des gardiens habitent là, des lieux dog-friendly méritent d'être documentés. Les hubs de proximité de la plateforme restent Lyon, Annecy, Grenoble et Chambéry, mais la couverture s'étend France entière.
            </p>
            <p className="text-foreground leading-relaxed mb-4">
              Une ville vous manque ? Demandez-la en bas de page. Nous priorisons celles qui reviennent le plus.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/guides" className="text-primary hover:underline text-sm font-medium">
                Voir tous les guides locaux →
              </Link>
            </div>
          </section>

          {/* Section 3 : races */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
              Les races et espèces documentées
            </h2>
            <p className="text-foreground leading-relaxed mb-5">
              Une fiche de race, chez nous, ne se contente pas de citer le poids et l'espérance de vie. Elle explique comment aborder l'animal quand on le garde : tempérament, exercice, alimentation, comportement avec les inconnus, points de vigilance santé. C'est fait pour être utile aux gardiens autant qu'aux propriétaires.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {speciesEntries.map(([species, n]) => (
                <div key={species} className="rounded-lg border border-border bg-card p-4">
                  <p className="text-2xl font-bold text-primary leading-none">{fmt(n)}</p>
                  <p className="text-sm text-foreground capitalize mt-1">{SPECIES_LABELS[species] || species}</p>
                </div>
              ))}
              {speciesEntries.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucune fiche publiée pour le moment.</p>
              )}
            </div>
            <div className="mt-5">
              <Link to="/races" className="text-primary hover:underline text-sm font-medium">
                Explorer les fiches de race →
              </Link>
            </div>
          </section>

          {/* Section 4 : lieux */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
              Les lieux dog-friendly recensés
            </h2>
            <p className="text-foreground leading-relaxed mb-5">
              Parcs canins, sentiers de balade, cafés qui acceptent les chiens, animaleries, vétérinaires : nous documentons les adresses qui rendent la garde plus simple, ville par ville.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {placesEntries.map(([cat, n]) => (
                <div key={cat} className="rounded-lg border border-border bg-card p-4">
                  <p className="text-2xl font-bold text-primary leading-none">{fmt(n)}</p>
                  <p className="text-sm text-foreground mt-1">{PLACE_LABELS[cat] || cat}</p>
                </div>
              ))}
              {placesEntries.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucun lieu recensé pour le moment.</p>
              )}
            </div>
          </section>

          {/* Section 5 : pros */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
              Les professionnels référencés
            </h2>
            <p className="text-foreground leading-relaxed mb-5">
              Vétérinaires, éducateurs, comportementalistes, toiletteurs : quand vous confiez votre maison à un gardien, savoir vers qui il peut se tourner en cas d'imprévu compte. Nous référençons des fiches vérifiées, jamais achetées.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {prosEntries.map(([cat, n]) => (
                <div key={cat} className="rounded-lg border border-border bg-card p-4">
                  <p className="text-2xl font-bold text-primary leading-none">{fmt(n)}</p>
                  <p className="text-sm text-foreground mt-1">{PRO_LABELS[cat] || cat}</p>
                </div>
              ))}
              {prosEntries.length === 0 && (
                <p className="text-sm text-muted-foreground">Aucun professionnel référencé pour le moment.</p>
              )}
            </div>
            <div className="mt-5">
              <Link to="/pros" className="text-primary hover:underline text-sm font-medium">
                Voir l'annuaire complet →
              </Link>
            </div>
          </section>

          {/* Section 6 : ce que dit le terrain */}
          <section className="mb-12">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
              Ce que dit le terrain
            </h2>
            <div className="space-y-4 text-foreground leading-relaxed">
              <p>
                Depuis 2021, en tant que fondateurs, nous avons accompagné 234 animaux et gardé 37 maisons. Cette période a servi à valider une intuition simple : la garde à domicile, gratuite pour les propriétaires, tient debout quand la confiance est bâtie en amont. Vérification d'identité manuelle, avis croisés, badges publics, Trust Score : rien de tout cela n'est cosmétique.
              </p>
              <p>
                Ce que nous voyons monter : la demande de proximité. Les gens du coin, ceux qu'on croise vraiment. C'est ce qui nous fait ajouter des villes une à une, plutôt que de tirer une couverture bâclée sur toute la France.
              </p>
              <p>
                Ce qui manque encore : plus de fiches de race pour les NAC, plus de lieux dog-friendly dans les villes moyennes, plus de vétérinaires de garde documentés. Tout ce qu'on peut ajouter grâce à vos remontées, on l'ajoute.
              </p>
            </div>
          </section>

          {/* Section 7 : formulaire */}
          <section id="demande" className="mb-12 scroll-mt-20">
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
              Une analyse manque ? Demandez-la
            </h2>
            <p className="text-foreground leading-relaxed mb-6">
              Pas de ping automatique, pas de robot. Une personne lit chaque demande. Si vous laissez un email, on vous prévient quand l'analyse est prête.
            </p>
            <AnalysisRequestForm />
          </section>

          <div className="mt-10 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground italic">
              Article rédigé par Jérémie et Elisa, fondateurs de Guardiens. Dernière mise à jour :{" "}
              {new Date(c.generated_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}.
            </p>
          </div>
        </article>
      </main>
    </>
  );
}

function StatCard({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <Card className="h-full">
      <CardContent className="p-5">
        <p className="text-3xl font-bold text-primary leading-none mb-2">{value}</p>
        <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{detail}</p>
      </CardContent>
    </Card>
  );
}
