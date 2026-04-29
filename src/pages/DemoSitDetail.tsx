import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Home,
  PawPrint,
  ShieldCheck,
  Sparkles,
  Sun,
  Sunset,
  Moon,
  Heart,
  Wifi,
  Trees,
  Bike,
  Coffee,
  WashingMachine,
  Mountain,
  Waves,
  Flame,
  Building2,
  ChevronRight,
  BookOpen,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import BreedProfileCard from "@/components/breeds/BreedProfileCard";
import { getDemoSitBySlug } from "@/data/demoListings";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";

const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐕",
  cat: "🐈",
  farm_animal: "🐔",
  rabbit: "🐰",
  bird: "🦜",
  fish: "🐠",
  rodent: "🐹",
  horse: "🐴",
  nac: "🦎",
};

const SPECIES_LABEL: Record<string, string> = {
  dog: "Chien",
  cat: "Chat",
  farm_animal: "Basse-cour",
  rabbit: "Lapin",
  bird: "Oiseau",
  fish: "Poisson",
  rodent: "Rongeur",
  horse: "Équidé",
  nac: "NAC",
};

const ENV_META: Record<string, { label: string; icon: any }> = {
  city: { label: "Ville", icon: Building2 },
  countryside: { label: "Campagne", icon: Trees },
  mountain: { label: "Montagne", icon: Mountain },
  lake: { label: "Lac", icon: Waves },
  garden: { label: "Jardin", icon: Trees },
};

const AMENITY_META: Record<string, { label: string; icon: any }> = {
  wifi: { label: "Wifi fibre", icon: Wifi },
  garden: { label: "Jardin", icon: Trees },
  washing_machine: { label: "Lave-linge", icon: WashingMachine },
  bikes: { label: "Vélos", icon: Bike },
  coffee_machine: { label: "Machine à café", icon: Coffee },
  lake_view: { label: "Vue lac", icon: Waves },
  wood_stove: { label: "Poêle à bois", icon: Flame },
  kayak: { label: "Kayak", icon: Waves },
  balcony: { label: "Balcon", icon: Sun },
  dishwasher: { label: "Lave-vaisselle", icon: WashingMachine },
  elevator: { label: "Ascenseur", icon: Building2 },
};

const DemoSitDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const sit = slug ? getDemoSitBySlug(slug) : null;

  if (!sit) return <Navigate to="/search" replace />;

  const photos = sit.property.photos;
  const formatDate = (d: string | null) =>
    d ? format(new Date(d), "d MMMM yyyy", { locale: fr }) : "";

  const guideHref = `/guides/${sit.owner.citySlug}`;
  const cityHref = `/house-sitting/${sit.owner.citySlug}`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`${sit.title} — Annonce d'exemple — Guardiens`}</title>
        <meta
          name="description"
          content={`Aperçu d'une annonce de garde Guardiens à ${sit.owner.city}. ${sit.description.slice(0, 120)}…`}
        />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      {/* Bandeau démo persistant */}
      <div className="sticky top-0 z-30 bg-amber-400 text-amber-950 text-sm font-medium px-4 py-2.5 shadow-sm flex items-center justify-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span className="text-center">
          <strong>Annonce d'exemple</strong> — pour vous montrer l'expérience Guardiens.
          {" "}
          <Link to="/search" className="underline underline-offset-2 hover:no-underline">
            Voir les vraies annonces
          </Link>
        </span>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        <Link
          to="/search"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la recherche
        </Link>

        {/* Hero */}
        <div className="rounded-3xl overflow-hidden border border-amber-300 border-dashed bg-card mb-6">
          <div className="relative">
            <img
              src={photos[0]}
              alt={sit.title}
              className="w-full h-[280px] md:h-[420px] object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 md:p-8">
              <div className="flex items-center gap-2 mb-2 text-white/90 text-sm">
                <MapPin className="h-4 w-4" />
                <span>{sit.owner.city} · {sit.owner.department}</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight max-w-3xl">
                {sit.title}
              </h1>
            </div>
          </div>

          {photos.length > 1 && (
            <div className="grid grid-cols-2 gap-1 p-1">
              {photos.slice(1, 3).map((p, i) => (
                <img
                  key={i}
                  src={p}
                  alt=""
                  className="w-full h-32 md:h-44 object-cover"
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick facts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="rounded-2xl border border-border bg-card p-4">
            <Calendar className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Dates</p>
            <p className="text-sm font-medium">
              {formatDate(sit.start_date)}
            </p>
            <p className="text-sm font-medium">→ {formatDate(sit.end_date)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {sit.durationDays} jours
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <Home className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Logement</p>
            <p className="text-sm font-medium">
              {sit.property.type === "house" ? "Maison" : "Appartement"}
            </p>
            <p className="text-xs text-muted-foreground">
              {sit.property.surface_m2} m² · {sit.property.rooms} pièces
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <PawPrint className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Animaux</p>
            <p className="text-sm font-medium">{sit.pets.length} pensionnaire{sit.pets.length > 1 ? "s" : ""}</p>
            <p className="text-xs text-muted-foreground">
              {sit.pets.map((p) => SPECIES_EMOJI[p.species] || "🐾").join(" ")}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <Trees className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Cadre</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {sit.property.environments.map((e) => {
                const meta = ENV_META[e];
                if (!meta) return null;
                const Ico = meta.icon;
                return (
                  <span key={e} className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2 py-0.5">
                    <Ico className="h-3 w-3" /> {meta.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Le cadre */}
            <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
              <h2 className="text-lg font-semibold mb-3">Le cadre</h2>
              <p className="text-sm text-foreground/90 leading-relaxed mb-4">
                {sit.description}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {sit.property.description}
              </p>
              {sit.property.amenities.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
                  {sit.property.amenities.map((a) => {
                    const meta = AMENITY_META[a];
                    if (!meta) return null;
                    const Ico = meta.icon;
                    return (
                      <span key={a} className="inline-flex items-center gap-1.5 text-xs bg-accent text-accent-foreground rounded-full px-3 py-1">
                        <Ico className="h-3.5 w-3.5" /> {meta.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Les animaux */}
            <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PawPrint className="h-5 w-5 text-primary" /> Vos pensionnaires
              </h2>
              <div className="space-y-5">
                {sit.pets.map((pet, i) => (
                  <div key={i} className="border-l-2 border-primary/30 pl-4">
                    <div className="flex items-baseline gap-2 flex-wrap mb-1">
                      <span className="text-xl">{SPECIES_EMOJI[pet.species] || "🐾"}</span>
                      <h3 className="font-semibold text-foreground">{pet.name}</h3>
                      {pet.breed && (
                        <span className="text-sm text-muted-foreground">
                          · {pet.breed}
                        </span>
                      )}
                      {pet.age && (
                        <span className="text-xs text-muted-foreground">
                          · {pet.age}
                        </span>
                      )}
                    </div>
                    {pet.notes && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {pet.notes}
                      </p>
                    )}
                    {pet.breed && (
                      <BreedProfileCard
                        species={pet.species}
                        breed={pet.breed}
                        ownerFirstName={sit.owner.first_name}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Journée type */}
            <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
              <h2 className="text-lg font-semibold mb-4">Une journée type</h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Sun className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Matin</p>
                    <p className="text-sm text-muted-foreground">{sit.schedule.morning}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center">
                    <Sunset className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Midi</p>
                    <p className="text-sm text-muted-foreground">{sit.schedule.midday}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Moon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Soir</p>
                    <p className="text-sm text-muted-foreground">{sit.schedule.evening}</p>
                  </div>
                </div>
                {sit.schedule.notes && (
                  <p className="text-xs text-muted-foreground italic pt-2 border-t border-border">
                    {sit.schedule.notes}
                  </p>
                )}
              </div>
            </section>

            {/* Mot du proprio */}
            <section className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">
                  Un mot de {sit.owner.first_name}
                </h2>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed italic">
                « {sit.ownerMessage} »
              </p>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            {/* Profil hôte */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                Votre hôte
              </p>
              <div className="flex items-center gap-3 mb-3">
                {sit.owner.avatar_url ? (
                  <img
                    src={sit.owner.avatar_url}
                    alt={sit.owner.first_name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-xl font-semibold text-muted-foreground">
                    {sit.owner.first_name[0]}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold">{sit.owner.first_name}</p>
                    {sit.owner.identity_verified && <VerifiedBadge size="sm" />}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {sit.owner.city}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {sit.owner.bio}
              </p>
            </div>

            {/* CTA principal */}
            <div className="rounded-2xl border-2 border-amber-300 border-dashed bg-amber-50 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-amber-700" />
                <p className="text-sm font-semibold text-amber-900">
                  Annonce d'exemple
                </p>
              </div>
              <p className="text-sm text-amber-900/80 mb-4 leading-relaxed">
                Cette annonce est fictive — elle illustre l'expérience proposée
                par les vrais hôtes Guardiens : fiches précises, conseils race,
                vraies dates, vrais quartiers.
              </p>
              {!isAuthenticated ? (
                <div className="space-y-2">
                  <Button asChild className="w-full">
                    <Link
                      to="/inscription?role=owner"
                      onClick={() =>
                        trackEvent("cta_proprio_clicked", {
                          source: "demo_sit_detail",
                          metadata: { location: "demo_detail_primary_cta", slug: sit.slug },
                        })
                      }
                    >
                      Publier mon annonce
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link
                      to="/inscription?role=sitter"
                      onClick={() =>
                        trackEvent("cta_sitter_clicked", {
                          source: "demo_sit_detail",
                          metadata: { location: "demo_detail_sitter_cta", slug: sit.slug },
                        })
                      }
                    >
                      Devenir gardien
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link to="/search">Voir les vraies annonces</Link>
                  </Button>
                </div>
              ) : (
                <Button asChild variant="outline" className="w-full">
                  <Link to="/search">Voir les vraies annonces</Link>
                </Button>
              )}
              <p className="text-xs text-amber-800/70 mt-3 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Postuler n'est possible que sur les vraies annonces.
              </p>
            </div>

            {/* Guide local */}
            <Link
              to={guideHref}
              className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/50 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">
                    Guide local
                  </p>
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                    Découvrir {sit.owner.city}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Les bonnes adresses, vétérinaires, parcs à chiens et
                    spots à connaître.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
              </div>
            </Link>

            {/* Page ville */}
            <Link
              to={cityHref}
              className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/50 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">
                    Communauté locale
                  </p>
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                    Gardiens à {sit.owner.city}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Voir les profils vérifiés et l'activité du coin.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
              </div>
            </Link>

            {/* Réassurance */}
            <div className="rounded-2xl bg-muted/50 p-5 text-xs text-muted-foreground space-y-2">
              <p className="flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Sur Guardiens, c'est à 0 € pour les propriétaires, entre gens du coin
              </p>
              <p>
                Aucun paiement entre membres. Profils vérifiés, avis croisés,
                accord de garde signé. La confiance entre gens du coin.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default DemoSitDetail;
