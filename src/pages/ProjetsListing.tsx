import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { reportError } from "@/lib/errorLogger";
import PageMeta from "@/components/PageMeta";
import { projetsHubSeo } from "@/lib/projetSeo";
import { isIndexableProjetMission } from "../../supabase/functions/_shared/entraideMissionIndexability.js";
import { faqPageJsonLd } from "@/lib/associationFaq";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import SearchListingCard from "@/components/search/listing/SearchListingCard";
import ProximityFilter, { type RadiusChoice } from "@/components/missions/ProximityFilter";
import { useMissionDistance, type RadiusKm } from "@/hooks/useMissionDistance";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ARTICLE_URL = "/actualites/chantier-participatif-projet-collectif-cadre-legal";
const GUIDE_URL = "/actualites/chantier-participatif-low-tech-participer-lancer-projet";

/**
 * Un projet participatif se rejoint en se déplaçant, parfois loin : les rayons
 * vont donc plus loin que ceux de l'entraide, et « Toute la France » existe.
 */
const PROJET_RADIUS_CHOICES: RadiusChoice[] = [
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
  { value: 100, label: "100 km" },
  { value: 250, label: "250 km" },
  { value: 500, label: "500 km" },
  { value: Number.POSITIVE_INFINITY, label: "Toute la France" },
];
const PROJET_RADIUS_VALUES = PROJET_RADIUS_CHOICES.map((c) => c.value);
const PROJET_DEFAULT_RADIUS: RadiusKm = 250;

const radiusLabel = (value: number) =>
  PROJET_RADIUS_CHOICES.find((c) => c.value === value)?.label ?? `${value} km`;

const LEGAL_GUIDE_URL = "/actualites/chantier-participatif-projet-collectif-cadre-legal";

const PROJETS_FAQ = [
  { question: "Qu'est-ce qu'un chantier participatif ?", answer: "C'est un chantier ouvert à des personnes qui viennent donner un coup de main et apprendre en faisant, chez un particulier ou dans une association, en échange d'un accueil et d'un savoir-faire transmis." },
  { question: "Faut-il savoir bricoler pour participer ?", answer: "Le savoir-faire se transmet sur place. Chaque projet précise ce que vous y apprendrez et ce qui est attendu des participants." },
  { question: "Combien coûte la participation ?", answer: "Guardiens est gratuit. La personne qui porte le projet précise ce qu'elle propose sur place : repas, hébergement, savoir-faire transmis." },
  { question: "Qui est responsable en cas d'accident ?", answer: "Chez un particulier, la personne qui accueille répond en principe des dommages corporels subis par celles qui viennent l'aider. Vérifiez votre assurance habitation, et lisez notre guide du cadre légal.", link: true },
  { question: "Comment publier un projet ?", answer: "Avec le bouton « Publier un projet » : décrivez le lieu, les dates, ce que vous voulez réaliser et ce que vous proposez sur place." },
];

const LegalLink = () => (
  <Link to={LEGAL_GUIDE_URL} className="text-primary underline underline-offset-4">notre guide du cadre légal</Link>
);

const ProjetsEditorial = () => (
  <section className="mt-12 max-w-3xl space-y-10" aria-label="Le chantier participatif">
    <div>
      <h2 className="font-heading text-2xl font-bold mb-3 text-foreground">Le chantier participatif, en quelques mots</h2>
      <p className="text-base leading-relaxed text-foreground/85">Un chantier participatif réunit des personnes qui viennent aider sur un projet concret, un potager, une haie, un abri, un mur en pierre sèche, en échange d'un accueil et d'un savoir-faire transmis. Il se déroule souvent chez un particulier, parfois dans une association. Chacun vient le temps convenu, selon ses envies et ses disponibilités.</p>
    </div>
    <div>
      <h2 className="font-heading text-2xl font-bold mb-3 text-foreground">Rejoindre un projet</h2>
      <ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed text-foreground/85">
        <li>Choisissez un projet près de chez vous, ou plus loin si l'aventure vous tente.</li>
        <li>Lisez ce qui est proposé sur place : dates, tâches, ce que vous apprendrez, repas ou hébergement.</li>
        <li>Écrivez à la personne qui porte le projet pour convenir de votre venue.</li>
      </ol>
    </div>
    <div>
      <h2 className="font-heading text-2xl font-bold mb-3 text-foreground">Lancer votre projet</h2>
      <p className="text-base leading-relaxed text-foreground/85">Décrivez le lieu, les dates, ce que vous voulez réaliser, le savoir-faire que vous transmettez et ce que vous proposez sur place. Publiez-le environ un mois avant, pour laisser à chacun le temps de s'organiser. Avant de commencer, lisez <LegalLink /> : assurance, accueil, responsabilités.</p>
    </div>
    <div>
      <h2 className="font-heading text-2xl font-bold mb-4 text-foreground">Questions fréquentes sur les chantiers participatifs</h2>
      <dl className="space-y-5">
        {PROJETS_FAQ.map((item) => (
          <div key={item.question}>
            <dt className="font-semibold text-foreground mb-1">{item.question}</dt>
            <dd className="text-base leading-relaxed text-foreground/85">
              {item.link ? (<>{item.answer.replace("notre guide du cadre légal.", "")}<LegalLink />.</>) : item.answer}
            </dd>
          </div>
        ))}
      </dl>
    </div>
    <p className="text-base leading-relaxed text-foreground/85">
      Pour aller plus loin : <Link to="/actualites/chantier-participatif-low-tech-participer-lancer-projet" className="text-primary underline underline-offset-4">participer ou lancer un chantier participatif</Link>, <Link to="/petites-missions" className="text-primary underline underline-offset-4">les coups de main près de chez vous</Link>, <Link to="/associations" className="text-primary underline underline-offset-4">les associations et refuges</Link>.
    </p>
  </section>
);

const ProjetsListing = () => {
  const [projets, setProjets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sort, setSort] = useState<"distance" | "recent">("distance");

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("public_small_missions")
          .select("*")
          .eq("category", "projet")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(60);
        // Une lecture en échec n'est pas « aucun projet » : sinon le hub
        // serait servi « ne pas indexer » et mis en cache sur une panne.
        if (error) throw error;
        setProjets((data || []) as any[]);
      } catch (e) {
        reportError(e, { component: "ProjetsListing", source: "load" });
        setProjets([]);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // Liste stable passée au calcul de distance : coordonnées du projet quand
  // elles existent, repli sur le code postal ou la ville sinon.
  const geoItems = useMemo(
    () =>
      projets.map((p) => ({
        id: p.id as string,
        postal_code: (p.postal_code ?? null) as string | null,
        city: (p.city ?? null) as string | null,
        latitude: typeof p.latitude === "number" ? p.latitude : null,
        longitude: typeof p.longitude === "number" ? p.longitude : null,
      })),
    [projets],
  );

  const proximity = useMissionDistance(geoItems, {
    storageKeys: { postal: "projets.postal", radius: "projets.radius" },
    radiusOptions: PROJET_RADIUS_VALUES,
    defaultRadius: PROJET_DEFAULT_RADIUS,
    useCoords: true,
  });

  const { active, radius, getDistance } = proximity;

  // Projets enrichis de leur distance, filtrés au rayon, puis triés.
  const visibleProjets = useMemo(() => {
    const withDistance = projets.map((p) => {
      const d = active ? getDistance(p.id) : null;
      return d == null ? p : { ...p, distance: d };
    });
    const inRadius =
      active && isFinite(radius)
        ? withDistance.filter((p) => typeof p.distance === "number" && p.distance <= radius)
        : withDistance;
    if (!active || sort === "recent") return inRadius;
    return [...inRadius].sort((a, b) => {
      const da = typeof a.distance === "number" ? a.distance : Number.POSITIVE_INFINITY;
      const db = typeof b.distance === "number" ? b.distance : Number.POSITIVE_INFINITY;
      return da - db;
    });
  }, [projets, active, radius, getDistance, sort]);

  // Aucun projet dans le rayon alors qu'il en existe : on propose le palier
  // suivant, jusqu'à « Toute la France ». Jamais de page vide sans issue.
  const nextRadius = useMemo(() => {
    const idx = PROJET_RADIUS_VALUES.indexOf(radius);
    return idx >= 0 && idx < PROJET_RADIUS_VALUES.length - 1 ? PROJET_RADIUS_VALUES[idx + 1] : null;
  }, [radius]);

  const hubSeo = projetsHubSeo({
    loading,
    error: loadError,
    eligibleCount: projets.filter((p) => isIndexableProjetMission(p)).length,
  });

  const emptyByRadius = !loading && projets.length > 0 && visibleProjets.length === 0;


  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Chantiers participatifs et projets à réaliser ensemble | Guardiens"
        description="Planter une haie, construire un abri : rejoignez un chantier participatif près de chez vous ou publiez votre projet. Guardiens est gratuit."
        jsonLd={[faqPageJsonLd(PROJETS_FAQ)]}
        noindex={hubSeo.noindex}
        ready={hubSeo.ready}
        statusCode={hubSeo.statusCode}
      />

      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-8">
          <PageBreadcrumb items={[{ label: "Projets participatifs" }]} />
        </div>

        <header className="max-w-3xl mb-8">
          <p className="text-sm font-semibold text-primary mb-2">Chantiers et projets participatifs</p>
          <h1 className="font-heading text-[2rem] md:text-[2.5rem] font-bold leading-tight mb-4 text-foreground">
            Des chantiers et projets à réaliser ensemble
          </h1>
          <p className="text-base md:text-lg leading-relaxed text-foreground/85">
            Planter un jardin, construire un abri, remettre un lieu en état… Découvrez les projets proposés sur
            Guardiens et participez selon vos envies et vos disponibilités.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="rounded-full">
              <a href="#projets-resultats">Découvrir les projets</a>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/projets/publier">Publier un projet</Link>
            </Button>
          </div>
        </header>

        <div id="projets-resultats" className="scroll-mt-24" />
        {/* Barre de proximité : origine, rayon, et ordre d'affichage. */}
        {!loading && projets.length > 0 && (
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <ProximityFilter
              postal={proximity.postal}
              onPostalChange={proximity.setPostal}
              radius={proximity.radius}
              onRadiusChange={proximity.setRadius}
              active={proximity.active}
              resolving={proximity.resolving}
              isValidPostal={proximity.isValidPostal}
              onUseMyLocation={proximity.useMyLocation}
              onClear={() => proximity.setPostal("")}
              originError={proximity.originError}
              radiusChoices={PROJET_RADIUS_CHOICES}
              radiusAlwaysEnabled
            />
            {proximity.active && (
              <Select value={sort} onValueChange={(v) => setSort(v as "distance" | "recent")}>
                <SelectTrigger className="h-9 w-auto min-w-[140px] text-xs" aria-label="Ordre d'affichage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="distance" className="text-xs">Plus proches</SelectItem>
                  <SelectItem value="recent" className="text-xs">Plus récents</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {loading ? (
          <div className="h-40" aria-busy="true" />
        ) : loadError ? (
          <section className="rounded-[2rem] border border-border bg-muted/50 p-8 md:p-12 max-w-3xl">
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Les projets n'ont pas pu être chargés
            </h2>
            <p className="text-base leading-relaxed text-foreground/85 mb-6">
              La connexion a échoué. Rechargez la page dans un instant pour voir les projets ouverts.
            </p>
            <Button className="rounded-full" onClick={() => window.location.reload()}>
              Recharger la page
            </Button>
          </section>
        ) : emptyByRadius ? (
          <section className="rounded-[2rem] border border-border bg-muted/50 p-8 md:p-12 max-w-3xl">
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Aucun projet à moins de {isFinite(radius) ? `${radius} km` : "cette distance"}
            </h2>
            <p className="text-base leading-relaxed text-foreground/85 mb-6">
              Les projets participatifs se rejoignent souvent de plus loin qu'un coup de main. Élargissez la
              zone pour voir ce qui se prépare ailleurs.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {nextRadius !== null && (
                <Button className="rounded-full" onClick={() => proximity.setRadius(nextRadius)}>
                  Élargir à {radiusLabel(nextRadius)}
                </Button>
              )}
              <Link to="/projets/publier" className="text-sm font-medium underline underline-offset-4 text-foreground/80">
                Publier mon projet
              </Link>
            </div>
          </section>
        ) : visibleProjets.length > 0 ? (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {visibleProjets.map((p, i) => (
              <SearchListingCard
                key={p.id}
                item={p}
                listIndex={i}
                tab="missions"
                hasAccess
                testDemoMode={false}
                formatDate={(d) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "")}
              />
            ))}
          </section>
        ) : (
          <section className="rounded-[2rem] border border-border bg-muted/50 p-8 md:p-12 max-w-3xl">
            <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4 text-foreground">
              Portez le premier projet
            </h2>
            <p className="text-base leading-relaxed text-foreground/85 mb-6">
              Vous avez un projet en tête et l'envie de le mener avec d'autres : décrivez ce que vous voulez
              réaliser, où et quand.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/projets/publier">
                <Button className="rounded-full">Publier mon projet</Button>
              </Link>
              <Link to={GUIDE_URL} className="text-sm font-medium underline underline-offset-4 text-foreground/80">
                Lire comment se prépare un projet participatif
              </Link>
            </div>

          </section>
        )}

        {/* Pied de page court : affiché seulement quand des projets existent. */}
        {!loading && projets.length > 0 && (
          <section className="mt-[52px] rounded-[2rem] border border-border bg-muted/50 p-8 md:p-10 max-w-3xl">
            <h2 className="font-heading text-2xl font-bold mb-3 text-foreground">Vous avez un projet ?</h2>
            <p className="text-base leading-relaxed text-foreground/85 mb-5">
              Décrivez ce que vous voulez réaliser, où et quand. Le cadre et les précautions sont expliqués dans notre journal.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/projets/publier">
                <Button className="rounded-full">Publier un projet</Button>
              </Link>
              <Link to={ARTICLE_URL} className="text-sm font-medium underline underline-offset-4 text-foreground/80">
                Lire le cadre d'un chantier participatif
              </Link>
            </div>
          </section>
        )}

        <ProjetsEditorial />
      </div>
    </div>
  );
};

export default ProjetsListing;
