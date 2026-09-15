import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { reportError } from "@/lib/errorLogger";
import PageMeta from "@/components/PageMeta";
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

const ProjetsListing = () => {
  const [projets, setProjets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"distance" | "recent">("distance");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await (supabase as any)
          .from("public_small_missions")
          .select("*")
          .eq("category", "projet")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(60);
        setProjets((data || []) as any[]);
      } catch (e) {
        reportError(e, { component: "ProjetsListing", source: "load" });
        setProjets([]);
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

  const emptyByRadius = !loading && projets.length > 0 && visibleProjets.length === 0;


  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Projets participatifs, apprendre en donnant un coup de main"
        description="Des particuliers ouvrent leur terrain ou leur maison pour un chantier. Vous venez participer quelques jours et vous repartez avec un savoir-faire."
        noindex={!loading && projets.length === 0}
        ready={!loading}
      />

      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="mb-8">
          <PageBreadcrumb items={[{ label: "Projets participatifs" }]} />
        </div>

        {/* Bloc éditorial : ce qu'est un projet ici */}
        <header className="max-w-3xl mb-[52px]">
          <p className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-terra mb-4">
            <span className="inline-block h-px w-5 bg-terra" aria-hidden />
            Projets participatifs
          </p>
          <h1 className="font-heading text-4xl md:text-5xl font-bold leading-[1.1] mb-6 text-foreground">
            Des chantiers ouverts, chez des particuliers
          </h1>
          <div className="space-y-4 text-lg leading-relaxed text-foreground/85">
            <p>
              Quelqu'un ouvre son terrain ou sa maison pour un chantier : un potager, un abri, un mur en pierre
              sèche, un atelier de récupération.
            </p>
            <p>
              Des gens viennent participer quelques jours, mettent la main à la pâte et repartent avec un
              savoir-faire appris sur place.
            </p>
            <p>
              Les échanges se font en temps et en savoir-faire, dans les deux sens : chacun donne de son
              temps, le porteur du projet transmet ce qu'il sait.
            </p>
          </div>
        </header>

        {/* Adresse au lecteur, affichée dans les deux états de la page. */}
        <section className="max-w-3xl mb-[52px]">
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-6 text-foreground">
            Pourquoi les projets ont leur place ici
          </h2>
          <div className="space-y-4 text-base md:text-lg leading-relaxed text-foreground/85">
            <p>
              Guardiens est un réseau de proximité. Ce qui s'y joue depuis le début, c'est l'entraide entre
              des gens qui habitent au même endroit : veiller sur une maison, nourrir un chat, arroser un
              jardin. Des choses qui représentent un vrai besoin pour l'un, et qui coûtent presque rien à
              l'autre. Un projet participatif, c'est la même chose avec les mains.
            </p>
            <p>
              Ce qu'on y gagne dépasse le chantier. On se sent utile, on passe une journée avec des gens
              rencontrés le matin même, et on repart en sachant faire quelque chose qu'on ignorait la veille.
              C'est le genre d'expérience que seule la proximité fabrique. Pour porter un projet, il suffit
              d'un lieu, d'une envie, et de quelqu'un pour tenir l'autre bout de la planche.
            </p>
            <p>
              Nous commençons tout juste. Les premiers projets seront les nôtres et ceux de membres que nous
              accompagnons un par un, et nous les alimenterons à la main le temps qu'il faudra. Si vous avez
              un chantier en tête, c'est le bon moment : vous serez parmi les premiers, et nous serons
              derrière vous.
            </p>
          </div>
        </section>

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
              Vous avez un chantier en tête chez vous, et l'envie de le mener avec quelques personnes : racontez
              ce que vous voulez construire, ce que vous transmettrez, et ce que vous pouvez proposer sur place.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/projets/publier">
                <Button className="rounded-full">Publier mon projet</Button>
              </Link>
              <Link to={ARTICLE_URL} className="text-sm font-medium underline underline-offset-4 text-foreground/80">
                Lire comment se prépare un projet participatif
              </Link>
            </div>

          </section>
        )}

        {/* Pied de page : affiché seulement quand des projets existent, pour
            ne pas répéter l'invitation déjà portée par l'état vide. */}
        {!loading && projets.length > 0 && (
          <section className="mt-[52px] rounded-[2rem] bg-primary text-primary-foreground p-10 md:p-14">
            <div className="max-w-2xl space-y-5">
              <h2 className="font-heading text-3xl md:text-4xl font-bold">Vous avez un projet</h2>
              <p className="text-lg opacity-90 leading-relaxed">
                Le cadre, les précautions à prendre et la manière d'accueillir des participants chez soi sont
                détaillés dans notre journal.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link to="/projets/publier">
                  <Button size="lg" variant="secondary" className="rounded-full font-bold">
                    Publier mon projet
                  </Button>
                </Link>
                <Link to={ARTICLE_URL} className="text-sm font-medium underline underline-offset-4 opacity-90">
                  Lire l'article
                </Link>
              </div>

            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProjetsListing;
