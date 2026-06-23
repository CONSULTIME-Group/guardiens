// Page dédiée aux annonces de garde hors France.
// Carte mondiale + grille simple : les distances FR n'ont pas de sens ici,
// mais la position pays/ville doit être immédiatement visible.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Globe2, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { geocodeCity } from "@/lib/geocode";
import fallbackMarrakech from "@/assets/fallback-marrakech.webp";

const CANONICAL = "https://guardiens.fr/annonces/international";

type IntlSit = {
  id: string;
  title: string | null;
  city: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_photo_url: string | null;
  property?: { photos?: string[] | null } | null;
};

type IntlSitWithCoords = IntlSit & { coords?: { lat: number; lng: number } | null };

const pinIcon = L.divIcon({
  className: "",
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  html: `<span style="display:block;width:34px;height:34px;border-radius:9999px;background:hsl(var(--primary));border:3px solid hsl(var(--background));box-shadow:0 8px 20px hsl(var(--foreground) / .22);"></span>`,
});

function InternationalMap({ sits }: { sits: IntlSitWithCoords[] }) {
  const points = sits.filter((s): s is IntlSitWithCoords & { coords: { lat: number; lng: number } } => !!s.coords);
  const center: [number, number] = points[0] ? [points[0].coords.lat, points[0].coords.lng] : [31.6, -8];

  const FitBounds = () => {
    const map = useMap();
    useEffect(() => {
      if (points.length === 1) {
        map.setView([points[0].coords.lat, points[0].coords.lng], 11, { animate: false });
      } else if (points.length > 1) {
        map.fitBounds(points.map((p) => [p.coords.lat, p.coords.lng]) as [number, number][], { padding: [34, 34], maxZoom: 10 });
      }
    }, [map]);
    return null;
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm h-[320px] md:h-[420px]">
      <MapContainer center={center} zoom={points.length > 1 ? 3 : 11} className="h-full w-full" attributionControl={false} scrollWheelZoom={false}>
        <FitBounds />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" subdomains="abcd" maxZoom={19} />
        {points.map((s) => (
          <Marker key={s.id} position={[s.coords.lat, s.coords.lng]} icon={pinIcon} />
        ))}
      </MapContainer>
    </div>
  );
}

export default function InternationalListings() {
  const { t, i18n } = useTranslation();
  const [sits, setSits] = useState<IntlSitWithCoords[] | null>(null);

  const locale =
    ({ fr: "fr-FR", en: "en-GB", es: "es-ES", it: "it-IT", de: "de-DE" } as Record<string, string>)[i18n.language] ||
    "fr-FR";

  function formatPeriod(s?: string | null, e?: string | null) {
    if (!s && !e) return t("intl_listings.flexible_dates");
    const fmt = (d: string) =>
      new Date(d).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
    if (s && e) return `${fmt(s)} → ${fmt(e)}`;
    return fmt((s || e) as string);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("sits")
        .select("id, slug, title, city, country, start_date, end_date, cover_photo_url, property:properties(photos)")
        .eq("status", "published")
        .not("country", "is", null)
        .neq("country", "FR")
        .order("created_at", { ascending: false })
        .limit(60);
      const rows = ((data as IntlSit[]) || []);
      const enriched = await Promise.all(
        rows.map(async (sit) => {
          if (!sit.city) return { ...sit, coords: null };
          const coords = await geocodeCity(sit.city, sit.country || undefined);
          return { ...sit, coords: coords ? { lat: coords.lat, lng: coords.lng } : null };
        }),
      );
      if (cancelled) return;
      setSits(enriched);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-background text-foreground">
      <Helmet>
        <title>{t("intl_listings.meta_title")}</title>
        <meta name="description" content={t("intl_listings.meta_description")} />
        <meta name="robots" content="noindex,follow" />
        <link rel="canonical" href={CANONICAL} />
      </Helmet>

      <main id="main-content" className="min-w-0" role="main">
        <section className="max-w-6xl mx-auto px-4 md:px-6 pt-10 pb-6">
          <p className="hidden md:flex text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3 items-center gap-2">
            <Globe2 className="h-3.5 w-3.5" /> {t("intl_listings.kicker")}
          </p>
          <h1 className="font-heading text-2xl md:text-4xl lg:text-5xl font-medium leading-tight text-foreground tracking-tight max-w-3xl">
            {t("intl_listings.title")}
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            {t("intl_listings.subtitle")}
          </p>
          <p className="mt-3 text-sm">
            <Link to="/annonces" className="text-primary font-semibold hover:underline underline-offset-4">
              {t("intl_listings.back_link")}
            </Link>
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 max-w-4xl">
            <div className="rounded-2xl border border-border bg-card/60 p-5">
              <p className="text-sm md:text-base text-foreground">
                Vous vivez à l'étranger et votre maison en France reste vide plusieurs mois&nbsp;?
                <Link to="/actualites/francais-etranger-garde-maison-france" className="ml-1 text-primary font-semibold hover:underline underline-offset-4">
                  Faire garder sa maison en France pendant son absence
                </Link>.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card/60 p-5">
              <p className="text-sm md:text-base text-foreground">
                Vous vivez à Bali, Marrakech, Lisbonne ou Miami et cherchez un gardien francophone&nbsp;?
                <Link to="/actualites/expat-proprietaire-faire-garder-maison-etranger" className="ml-1 text-primary font-semibold hover:underline underline-offset-4">
                  Faire garder sa maison à l'étranger par un Français
                </Link>.
              </p>
            </div>
          </div>
        </section>


        <section className="max-w-6xl mx-auto px-4 md:px-6 pb-10 md:pb-16 space-y-6">
          {sits === null ? (
            <>
              <Skeleton className="h-[320px] md:h-[420px] rounded-2xl" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-64 rounded-2xl" />
                ))}
              </div>
            </>
          ) : sits.length === 0 ? (
            <div className="border border-dashed border-border rounded-2xl p-10 text-center">
              <Globe2 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <h2 className="font-heading text-xl font-medium text-foreground mb-2">
                {t("intl_listings.empty_title")}
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {t("intl_listings.empty_body")}
              </p>
              <Link
                to="/inscription"
                className="inline-flex mt-5 items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                {t("intl_listings.empty_cta")}
              </Link>
            </div>
          ) : (
            <>
              <InternationalMap sits={sits} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {sits.map((s) => {
                  const city = (s.city || "").toUpperCase();
                  const country = (s.country || "").toUpperCase();
                  const isMarrakech = city.includes("MARRAKECH") || city.includes("MARRAKESH") || country === "MAROC" || country === "MOROCCO";
                  const cover = s.cover_photo_url || s.property?.photos?.[0] || (isMarrakech ? fallbackMarrakech : null);
                  return (
                    <Link
                      key={s.id}
                      to={`/annonces/${s.slug || s.id}`}
                      className="group block rounded-2xl overflow-hidden border border-border bg-card hover:shadow-lg transition-shadow"
                    >
                      <div className="aspect-[4/3] bg-muted overflow-hidden">
                        {cover ? (
                          <img
                            src={cover}
                            alt={s.title || t("intl_listings.cover_alt")}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Globe2 className="h-10 w-10 opacity-40" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                          <MapPin className="h-3 w-3" />
                          {s.city || ","}
                          {s.country && s.country !== "FR" && (
                            <span className="font-medium text-foreground/80">({s.country})</span>
                          )}
                        </p>
                        <h3 className="font-heading text-base font-medium text-foreground line-clamp-2 mb-2">
                          {s.title || t("intl_listings.default_title")}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {formatPeriod(s.start_date, s.end_date)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
