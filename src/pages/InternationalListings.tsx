// Page dédiée aux annonces de garde hors France (lot L2).
// Pays de destination, puis ville du pays et rayon, filtres dates et animaux,
// liste par défaut, carte en option. Moteur partagé : src/lib/intlSitSearch.ts
// (lieu du propriétaire, repli annonce, jamais de FR déduit). Toute la
// recherche vit dans l'adresse (copier, recharger, retour arrière).
import { useEffect, useMemo, useRef, useState } from "react";
import MapErrorBoundary from "@/components/shared/MapErrorBoundary";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Head from "@/components/seo/Head";
import { Globe2, MapPin, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { LeafletUnmountGuard } from "@/components/shared/LeafletUnmountGuard";
import L from "leaflet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DestinationCountrySelect from "@/components/search/DestinationCountrySelect";
import { geocodeCity } from "@/lib/geocode";
import { getCountryName, isValidCountryCode } from "@/lib/countries";
import { communeDeptFromCoords, checkGeocodedPoint, pointUsable } from "@/lib/sitSearchRules";
import { fromPhoton, computeMapViewport, type PlaceSuggestion } from "@/lib/sitterSearch";
import {
  fetchIntlOpenSits,
  intlCountryCounts,
  filterIntl,
  applyIntlRadius,
  uniquePlaceKeys,
  placeKey,
  intlPlaceLabel,
  intlTitle,
  closestSortAvailable,
  geocodeIntlPlace,
  parseUrlPoint,
  carryOverParams,
  SPECIES_LABELS,
  IntlPoolTruncatedError,
  DEST_WORLD,
  DEST_ABROAD,
  type IntlSit,
} from "@/lib/intlSitSearch";
import { MAP_TILE_WORLD_URL, MAP_TILE_WORLD_ATTRIBUTION, MAP_TILE_WORLD_MAX_ZOOM } from "@/lib/mapTiles";
import fallbackMarrakech from "@/assets/fallback-marrakech.webp";

const CANONICAL = "https://guardiens.fr/annonces/international";
const RADII = [25, 50, 100, 200];
const SPECIES = SPECIES_LABELS;

const pinIcon = L.divIcon({
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  html: `<span style="display:block;width:30px;height:30px;border-radius:9999px;background:hsl(var(--primary));border:3px solid hsl(var(--background));box-shadow:0 8px 20px hsl(var(--foreground) / .22);"></span>`,
});

type Pt = { lat: number; lng: number };

function FitView({ bounds, center, zoom }: { bounds: Array<[number, number]> | null; center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) map.fitBounds(bounds, { padding: [34, 34], maxZoom: 10 });
    else map.setView(center, zoom, { animate: false });
  }, [map, bounds, center, zoom]);
  return null;
}

type MapPoint = Pt & { id: string; title: string; place: string; href: string };
function IntlMap({ points, country, center }: { points: MapPoint[]; country: string | null; center: Pt | null }) {
  const vp = computeMapViewport({ country, center, points });
  // Clé = recherche courante : la carte est recréée, aucun ancien repère ni cadrage.
  const key = `${country ?? "all"}|${center ? `${center.lat},${center.lng}` : "-"}|${points.map((p) => p.id).join(",")}`;
  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm h-[320px] md:h-[420px]">
      <MapErrorBoundary>
        <MapContainer key={key} center={vp.center} zoom={vp.zoom} className="h-full w-full" scrollWheelZoom={false}>
          <LeafletUnmountGuard />
          <FitView bounds={vp.bounds} center={vp.center} zoom={vp.zoom} />
          <TileLayer url={MAP_TILE_WORLD_URL} attribution={MAP_TILE_WORLD_ATTRIBUTION} maxZoom={MAP_TILE_WORLD_MAX_ZOOM} />
          {points.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon} title={p.title}>
              <Popup>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.place}</p>
                  <Link to={p.href} className="text-xs font-semibold text-primary">Voir l'annonce</Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </MapErrorBoundary>
    </div>
  );
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export default function InternationalListings() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [all, setAll] = useState<IntlSit[] | null>(null);
  const [loadError, setLoadError] = useState<null | "error" | "truncated">(null);
  const [points, setPoints] = useState<Map<string, Pt | null>>(new Map());
  const [cityCenter, setCityCenter] = useState<Pt | null>(null);
  const [cityFailed, setCityFailed] = useState(false);
  const [cityInput, setCityInput] = useState(params.get("ville") ?? "");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestAbort = useRef<AbortController | null>(null);
  const suggestToken = useRef(0);
  const navigate = useNavigate();
  // Annule toute suggestion en vol : aucune réponse ancienne ne s'affiche.
  const cancelSuggestions = () => {
    suggestToken.current++;
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestAbort.current?.abort();
    suggestAbort.current = null;
    setSuggestions([]);
    setActiveIdx(-1);
  };
  useEffect(() => () => { if (suggestTimer.current) clearTimeout(suggestTimer.current); suggestAbort.current?.abort(); }, []);

  // ── État lu dans l'adresse ──
  const rawCountry = (params.get("pays") || "").toUpperCase();
  // Sans pays : tous les pays hors France ; « monde » : France incluse.
  const world = params.get("pays") === DEST_WORLD;
  const country = rawCountry && rawCountry !== "FR" && isValidCountryCode(rawCountry) ? rawCountry : null;
  const city = params.get("ville") || null;
  const radius = RADII.includes(Number(params.get("rayon"))) ? Number(params.get("rayon")) : 50;
  const start = params.get("debut") || null;
  const end = params.get("fin") || null;
  const speciesLabels = (params.get("animaux") || "").split(",").filter((l) => SPECIES.some((x) => x.label === l));
  const species = speciesLabels.map((l) => SPECIES.find((x) => x.label === l)!.key);
  const view = params.get("vue") === "carte" ? "carte" : "liste";
  const urlPoint = parseUrlPoint(params.get("lat"), params.get("lng"));

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    setParams(next); // entrée d'historique : le retour arrière restaure la recherche
  };

  const locale = ({ fr: "fr-FR", en: "en-GB" } as Record<string, string>)[i18n.language] || "fr-FR";
  const formatPeriod = (s?: string | null, e?: string | null) => {
    if (!s && !e) return t("intl_listings.flexible_dates");
    const fmt = (d: string) => new Date(d).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
    if (s && e) return `${fmt(s)} → ${fmt(e)}`;
    return fmt((s || e) as string);
  };

  // Lecture unique du jeu complet (pages de 1 000), espèces incluses.
  useEffect(() => {
    let cancelled = false;
    // France incluse dans la lecture : sert « Tous les pays, France incluse » ;
    // les autres modes l'écartent en mémoire.
    fetchIntlOpenSits({ withSpecies: true, includeFrance: true })
      .then((rows) => { if (!cancelled) setAll(rows); })
      .catch((e) => {
        console.error("[InternationalListings]", e);
        if (!cancelled) { setLoadError(e instanceof IntlPoolTruncatedError ? "truncated" : "error"); setAll([]); }
      });
    return () => { cancelled = true; };
  }, []);

  // Ville de référence : coordonnées de la suggestion (adresse), sinon un seul géocodage ville + pays.
  useEffect(() => {
    setCityInput(city ?? "");
    setCityFailed(false);
    if (!city) { setCityCenter(null); return; }
    if (urlPoint) {
      setCityCenter(urlPoint);
      return;
    }
    let cancelled = false;
    setCityCenter(null);
    (country ? geocodeIntlPlace(city, country, geocodeCity) : geocodeCity(city)).then((c) => {
      if (cancelled) return;
      if (c) setCityCenter({ lat: c.lat, lng: c.lng });
      else setCityFailed(true);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, country, params.get("lat"), params.get("lng")]);

  const scoped = useMemo(() => (all ? (world || country ? all : all.filter((s) => s.place.country !== "FR")) : []), [all, world, country]);
  const base = useMemo(() => filterIntl(scoped, { country, start, end, species }), [scoped, country, start, end, species.join(",")]);

  // Géocodage à la demande seulement (carte ou ville), une fois par lieu distinct.
  const needPoints = view === "carte" || !!city;
  useEffect(() => {
    if (!needPoints || !all) return;
    const todo = uniquePlaceKeys(base).filter((k) => !points.has(k.key));
    if (!todo.length) return;
    let cancelled = false;
    const deptOf = new Map(base.map((s) => [placeKey(s), s.place] as const));
    Promise.all(todo.map(async (k) => {
      const c = await geocodeIntlPlace(k.city, k.country, geocodeCity);
      // France (mode « France incluse ») : même contrôle de département que L1.
      const place = deptOf.get(k.key);
      if (c && place && place.country === "FR" && place.dept) {
        const check = checkGeocodedPoint(place, await communeDeptFromCoords(c.lat, c.lng));
        if (!pointUsable(check)) return [k.key, null] as const;
      }
      return [k.key, c] as const;
    })).then((res) => {
      if (cancelled) return;
      setPoints((prev) => {
        const next = new Map(prev);
        for (const [key, c] of res) next.set(key, c ? { lat: c.lat, lng: c.lng } : null);
        return next;
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needPoints, base, all]);

  const pointOf = (s: IntlSit): Pt | null => {
    const k = placeKey(s);
    return k ? points.get(k) ?? null : null;
  };
  const pointsPending = needPoints && uniquePlaceKeys(base).some((k) => !points.has(k.key));

  const { items: radiusItems, unlocated } = useMemo(
    () => applyIntlRadius(base, city ? cityCenter : null, radius, pointOf),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, cityCenter, city, radius, points],
  );
  const results = city ? (cityCenter ? radiusItems : []) : radiusItems;

  const canClosest = closestSortAvailable(city ? cityCenter : null);
  const sort = params.get("tri") === "proches" && canClosest ? "proches" : "recentes";
  const sorted = useMemo(() => {
    const out = [...results];
    if (sort === "proches") out.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    return out;
  }, [results, sort]);

  const counts = useMemo(() => intlCountryCounts((all ?? []).filter((s) => s.place.country !== "FR")), [all]);

  const mapPoints: MapPoint[] = sorted.flatMap((s) => {
    const p = pointOf(s);
    return p ? [{ id: s.id, ...p, title: s.title || t("intl_listings.default_title"), place: intlPlaceLabel(s.place), href: `/annonces/${s.slug || s.id}` }] : [];
  });
  const located = mapPoints.length;
  const title = intlTitle(country, city, world);
  const hasFilters = !!(country || world || city || start || end || species.length || params.get("tri"));
  // Ville choisie : tant que la ville ou les lieux ne sont pas situés, aucun chiffre définitif.
  const locating = !!city && ((!cityCenter && !cityFailed) || (!!cityCenter && pointsPending));

  // ── Autocomplétion par pays (Photon, communes uniquement) ──
  const onCityInput = (v: string) => {
    setCityInput(v);
    cancelSuggestions();
    if (v.trim().length < 2) return;
    const token = suggestToken.current;
    const forCountry = country;
    suggestTimer.current = setTimeout(async () => {
      const ctrl = new AbortController();
      suggestAbort.current = ctrl;
      try {
        const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(v.trim())}&limit=15&lang=fr&layer=city&layer=locality&layer=district`, { signal: ctrl.signal });
        const json = await r.json();
        if (token !== suggestToken.current) return; // réponse périmée
        const list = fromPhoton(json, forCountry).filter((x) => world || x.country !== "FR").slice(0, 8);
        setSuggestions(list);
        setActiveIdx(list.length ? 0 : -1);
      } catch {
        if (token === suggestToken.current) setSuggestions([]);
      }
    }, 250);
  };
  const onCityKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { cancelSuggestions(); return; }
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => (i + 1) % suggestions.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); pickCity(suggestions[activeIdx]); }
  };
  const pickCity = (s: PlaceSuggestion) => {
    cancelSuggestions();
    update({
      ville: s.name,
      // « France incluse » reste global ; sinon le pays suit la ville choisie.
      pays: world ? DEST_WORLD : s.country,
      lat: s.lat != null ? String(round3(s.lat)) : null,
      lng: s.lng != null ? String(round3(s.lng)) : null,
    });
  };
  const clearCity = () => { cancelSuggestions(); update({ ville: null, lat: null, lng: null, tri: null }); };
  const onCountry = (v: string) => {
    cancelSuggestions();
    if (v === "FR") {
      // Retour au moteur France (L1) : dates et animaux compatibles conservés.
      const q = carryOverParams(params, "france").toString();
      navigate(`/annonces${q ? `?${q}` : ""}`);
      return;
    }
    const next = v === DEST_ABROAD ? null : v;
    // Une ville d'un autre pays est retirée : jamais de ville résiduelle.
    update({ pays: next, ville: null, lat: null, lng: null, tri: null, rayon: null });
  };
  const toggleSpecies = (k: string) => {
    const set = new Set(speciesLabels);
    if (set.has(k)) set.delete(k); else set.add(k);
    update({ animaux: [...set].join(",") || null });
  };

  return (
    <div className="bg-background text-foreground">
      <Head>
        <title>{t("intl_listings.meta_title")}</title>
        <meta name="description" content={t("intl_listings.meta_description")} />
        <meta name="robots" content="noindex,follow" />
        <link rel="canonical" href={CANONICAL} />
      </Head>

      <div className="min-w-0">
        <section className="max-w-6xl mx-auto px-4 md:px-6 pt-10 pb-6">
          <p className="hidden md:flex text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3 items-center gap-2">
            <Globe2 className="h-3.5 w-3.5" /> {t("intl_listings.kicker")}
          </p>
          <h1 className="font-heading text-2xl md:text-4xl lg:text-5xl font-medium leading-tight text-foreground tracking-tight max-w-3xl">
            {title}
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            {t("intl_listings.subtitle")}
          </p>
          <p className="mt-3 text-sm">
            <Link to="/annonces" className="text-primary font-semibold hover:underline underline-offset-4">
              {t("intl_listings.back_link")}
            </Link>
          </p>
        </section>

        {/* Barre de recherche : pays, ville du pays, rayon, dates, animaux */}
        <section aria-label="Rechercher une garde à l'étranger" className="max-w-6xl mx-auto px-4 md:px-6 pb-6">
          <div className="rounded-2xl border border-border bg-card p-4 md:p-5 space-y-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
              <label className="space-y-1.5 min-w-0">
                <span className="text-xs font-medium text-muted-foreground">Pays de destination</span>
                <DestinationCountrySelect value={country ?? (world ? DEST_WORLD : DEST_ABROAD)} onChange={onCountry} counts={counts} />
              </label>
              <div className="space-y-1.5 relative min-w-0">
                <label htmlFor="intl-city" className="text-xs font-medium text-muted-foreground">
                  Ville {country ? `(${getCountryName(country)})` : world ? "(tous pays, France incluse)" : "(hors France)"}
                </label>
                <div className="relative">
                  <Input
                    id="intl-city"
                    value={cityInput}
                    onChange={(e) => onCityInput(e.target.value)}
                    placeholder={country ? `Une ville, ${getCountryName(country)}` : world ? "Une ville, tous pays" : "Une ville à l'étranger"}
                    onKeyDown={onCityKey}
                    role="combobox"
                    aria-expanded={suggestions.length > 0}
                    aria-activedescendant={activeIdx >= 0 ? `intl-city-opt-${activeIdx}` : undefined}
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-controls="intl-city-list"
                  />
                  {city && (
                    <button type="button" onClick={clearCity} aria-label="Retirer la ville" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {suggestions.length > 0 && (
                  <ul id="intl-city-list" role="listbox" aria-label="Villes suggérées" className="absolute z-[500] mt-1 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
                    {suggestions.map((s, i) => (
                      <li key={`${s.name}-${s.detail}-${i}`} id={`intl-city-opt-${i}`} role="option" aria-selected={i === activeIdx}>
                        <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActiveIdx(i)} onClick={() => pickCity(s)} className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${i === activeIdx ? "bg-muted" : ""}`}>
                          <span className="font-medium text-foreground">{s.name}</span>
                          {s.detail && <span className="text-muted-foreground">, {s.detail}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Rayon</span>
                <Select value={String(radius)} onValueChange={(v) => update({ rayon: v === "50" ? null : v })} disabled={!city}>
                  <SelectTrigger aria-label="Rayon" className="md:w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RADII.map((r) => <SelectItem key={r} value={String(r)}>{r} km</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Du</span>
                <Input type="date" value={start ?? ""} onChange={(e) => update({ debut: e.target.value || null })} className="w-40" aria-label="Date de début" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Au</span>
                <Input type="date" value={end ?? ""} onChange={(e) => update({ fin: e.target.value || null })} className="w-40" aria-label="Date de fin" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Trier</span>
                <Select value={sort} onValueChange={(v) => update({ tri: v === "proches" ? "proches" : null })}>
                  <SelectTrigger aria-label="Trier" className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recentes">Plus récentes</SelectItem>
                    <SelectItem value="proches" disabled={!canClosest}>
                      {canClosest ? "Plus proches" : "Plus proches (choisissez une ville)"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </label>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={() => setParams(new URLSearchParams(view === "carte" ? { vue: "carte" } : {}))}>
                  Réinitialiser
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Animaux">
              {SPECIES.map((s) => {
                const on = speciesLabels.includes(s.label);
                return (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleSpecies(s.label)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-muted"}`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 md:px-6 pb-10 md:pb-16 space-y-5">
          {all === null ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-foreground" aria-live="polite">
                  {locating
                    ? `Localisation en cours autour de ${city}…`
                    : `${sorted.length} annonce${sorted.length > 1 ? "s" : ""}${city ? ` à ${radius} km de ${city}` : country ? ` : ${getCountryName(country)}` : world ? " dans tous les pays, France incluse" : " à l'étranger"}`}
                </p>
                <div className="inline-flex rounded-full border border-border p-0.5" role="group" aria-label="Affichage">
                  <button type="button" aria-pressed={view === "liste"} onClick={() => update({ vue: null })} className={`rounded-full px-3 py-1 text-xs font-medium ${view === "liste" ? "bg-primary text-primary-foreground" : "text-foreground"}`}>Liste</button>
                  <button type="button" aria-pressed={view === "carte"} onClick={() => update({ vue: "carte" })} className={`rounded-full px-3 py-1 text-xs font-medium ${view === "carte" ? "bg-primary text-primary-foreground" : "text-foreground"}`}>Carte</button>
                </div>
              </div>

              {loadError === "error" && <p role="alert" className="text-sm text-destructive">Impossible de charger les annonces. Réessayez dans un instant.</p>}
              {loadError === "truncated" && <p role="alert" className="text-sm text-destructive">Trop d'annonces pour un comptage complet : la liste n'est pas affichée plutôt que d'être incomplète.</p>}
              {cityFailed && (
                <p role="status" className="text-sm text-muted-foreground">
                  Nous n'avons pas pu situer « {city} ». Aucune distance n'est calculée ; retirez la ville ou choisissez une suggestion.
                </p>
              )}
              {city && cityCenter && unlocated > 0 && !pointsPending && (
                <p className="text-sm text-muted-foreground">
                  {unlocated} annonce{unlocated > 1 ? "s" : ""} du pays n'{unlocated > 1 ? "ont" : "a"} pas de lieu situable : non comptée{unlocated > 1 ? "s" : ""} dans le rayon.
                </p>
              )}

              {view === "carte" && (
                <>
                  <IntlMap points={mapPoints} country={country} center={city ? cityCenter : null} />
                  <p className="text-xs text-muted-foreground">
                    {pointsPending ? "Placement des annonces sur la carte…" : `${located} annonce${located > 1 ? "s" : ""} située${located > 1 ? "s" : ""} sur ${sorted.length}${sorted.length - located > 0 ? `, ${sorted.length - located} lieu${sorted.length - located > 1 ? "x" : ""} à préciser` : ""}. Positions approximatives à l'échelle de la commune.`}
                  </p>
                </>
              )}

              {locating ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true">
                  {[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
                </div>
              ) : sorted.length === 0 ? (
                <div className="border border-dashed border-border rounded-2xl p-10 text-center">
                  <Globe2 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                  <h2 className="font-heading text-xl font-medium text-foreground mb-2">
                    {hasFilters ? "Aucune annonce ne correspond à cette recherche" : t("intl_listings.empty_title")}
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {hasFilters ? "Élargissez le rayon, retirez un filtre ou choisissez un autre pays." : t("intl_listings.empty_body")}
                  </p>
                  {hasFilters ? (
                    <Button className="mt-5 rounded-full" onClick={() => setParams(new URLSearchParams({ pays: DEST_WORLD }))}>Voir tous les pays, France incluse</Button>
                  ) : (
                    <Link to="/inscription" className="inline-flex mt-5 items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity">
                      {t("intl_listings.empty_cta")}
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {sorted.map((s) => {
                    const c = (s.place.city || "").toUpperCase();
                    const isMarrakech = c.includes("MARRAKECH") || c.includes("MARRAKESH") || s.place.country === "MA";
                    const cover = s.cover_photo_url || s.photos?.[0] || (isMarrakech ? fallbackMarrakech : null);
                    return (
                      <Link key={s.id} to={`/annonces/${s.slug || s.id}`} className="group block rounded-2xl overflow-hidden border border-border bg-card hover:shadow-lg transition-shadow">
                        <div className="aspect-[4/3] bg-muted overflow-hidden">
                          {cover ? (
                            <img src={cover} alt={s.title || t("intl_listings.cover_alt")} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Globe2 className="h-10 w-10 opacity-40" /></div>
                          )}
                        </div>
                        <div className="p-4">
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                            <MapPin className="h-3 w-3" />
                            <span>{intlPlaceLabel(s.place)}</span>
                            {s.distance != null && <span>· {s.distance < 1 ? "< 1" : Math.round(s.distance)} km</span>}
                          </p>
                          <h3 className="font-heading text-base font-medium text-foreground line-clamp-2 mb-2">{s.title || t("intl_listings.default_title")}</h3>
                          <p className="text-xs text-muted-foreground">{formatPeriod(s.start_date, s.end_date)}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}

          <div className="grid gap-4 md:grid-cols-2 max-w-4xl pt-4">
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
      </div>
    </div>
  );
}
