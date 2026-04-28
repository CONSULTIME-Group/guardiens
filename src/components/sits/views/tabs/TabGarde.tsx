/**
 * Onglet "Garde" : mot de l'hôte, journée type, aperçus cliquables
 * vers les autres onglets (Animaux / Logement / Attentes).
 */
import { Heart, Info, ArrowRight, PawPrint, Home, ShieldCheck } from "lucide-react";
import { ROUTINE_ICONS } from "./sitMeta";
import { parseRoutine, cleanFreeText } from "./parseRoutine";

interface TabGardeProps {
  ownerName: string;
  hasOwnerMessage: boolean;
  ownerMessage: string;
  hasRoutine: boolean;
  rawRoutine: string | null;
  safePets: any[];
  cityName: string;
  property: any;
  propertyDescription: string;
  amenities: string[];
  hasLocalGuide: boolean;
  expectations: string;
  environments: string[];
  setActiveTab: (tab: "garde" | "animaux" | "logement" | "attentes") => void;
}

const TabGarde = ({
  ownerName,
  hasOwnerMessage,
  ownerMessage,
  hasRoutine,
  rawRoutine,
  safePets,
  cityName,
  property,
  propertyDescription,
  amenities,
  hasLocalGuide,
  expectations,
  environments,
  setActiveTab,
}: TabGardeProps) => {
  const routine = parseRoutine(rawRoutine);

  return (
    <>
      {/* Mot du proprio */}
      {hasOwnerMessage && (
        <section className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Un mot de {ownerName}</h2>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed italic whitespace-pre-line">
            « {ownerMessage} »
          </p>
        </section>
      )}

      {/* Journée type */}
      {hasRoutine && (
        <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 className="text-lg font-semibold mb-4">Une journée type</h2>
          {routine ? (
            <div className="space-y-4">
              {routine.blocks.map((b, i) => {
                const meta = ROUTINE_ICONS[b.label] || ROUTINE_ICONS.Matin;
                const Ico = meta.icon;
                return (
                  <div key={i} className="flex gap-3">
                    <div
                      className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${meta.bg} ${meta.fg}`}
                    >
                      <Ico className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{b.label}</p>
                      <p className="text-sm text-muted-foreground">{b.text}</p>
                    </div>
                  </div>
                );
              })}
              {routine.notes && (
                <p className="text-xs text-muted-foreground italic pt-2 border-t border-border">
                  {routine.notes}
                </p>
              )}
            </div>
          ) : (
            (() => {
              const isEn =
                typeof navigator !== "undefined" &&
                !!navigator.language?.toLowerCase().startsWith("en");
              const chipLabel = isEn ? "Free format" : "Format libre";
              const chipTooltip = isEn
                ? "The text could not be structured into Morning / Noon / Evening blocks. Encourage the owner to prefix each line with a time of day."
                : "Le texte n'a pas pu être structuré en blocs Matin / Midi / Soir. Encouragez le propriétaire à préfixer chaque ligne par un moment de la journée.";
              return (
                <div className="space-y-2" data-testid="routine-fallback-freetext">
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-muted/60 text-muted-foreground text-[11px] px-2 py-0.5 border border-border"
                    title={chipTooltip}
                    aria-label={chipLabel}
                  >
                    <Info className="h-3 w-3" />
                    {chipLabel}
                  </span>
                  <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                    {cleanFreeText(rawRoutine || "")}
                  </p>
                </div>
              );
            })()
          )}
        </section>
      )}

      {!hasOwnerMessage && !hasRoutine && (
        <p className="text-sm text-muted-foreground italic text-center py-4">
          {ownerName} n'a pas encore détaillé le déroulé de la garde.
        </p>
      )}

      {/* Aperçus */}
      <section className="space-y-3 pt-2">
        <h2 className="text-lg font-semibold">En un coup d'œil</h2>

        {safePets.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("animaux")}
            className="w-full text-left rounded-2xl border border-border bg-card p-4 md:p-5 hover:border-primary/40 hover:bg-accent/30 transition group"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <PawPrint className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold">
                    {safePets.length} pensionnaire{safePets.length > 1 ? "s" : ""}
                  </p>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {safePets.slice(0, 4).map((p, i) => {
                    const photo =
                      (Array.isArray(p?.photos) && p.photos[0]) || p?.photo_url || null;
                    const initial = (p?.name?.[0] || "?").toUpperCase();
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center gap-2 rounded-full bg-muted/60 border border-border pl-1 pr-3 py-0.5 text-xs"
                      >
                        {photo ? (
                          <img
                            src={photo}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-background flex items-center justify-center text-[11px] text-muted-foreground/70 font-serif">
                            {initial}
                          </span>
                        )}
                        <span className="font-medium">{p?.name || "Animal"}</span>
                        {p?.breed && (
                          <span className="text-muted-foreground">· {p.breed}</span>
                        )}
                      </span>
                    );
                  })}
                  {safePets.length > 4 && (
                    <span className="text-xs text-muted-foreground self-center">
                      +{safePets.length - 4}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        )}

        {(propertyDescription || amenities.length > 0 || cityName) && (
          <button
            type="button"
            onClick={() => setActiveTab("logement")}
            className="w-full text-left rounded-2xl border border-border bg-card p-4 md:p-5 hover:border-primary/40 hover:bg-accent/30 transition group"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Home className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold">Logement & quartier</p>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {[
                    property?.type === "house"
                      ? "Maison"
                      : property?.type === "apartment"
                        ? "Appartement"
                        : property?.type,
                    property?.surface_m2 && `${property.surface_m2} m²`,
                    property?.rooms_count && `${property.rooms_count} pièces`,
                    cityName && `à ${cityName}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {propertyDescription && (
                  <p className="text-sm text-foreground/80 mt-2 line-clamp-2">
                    {propertyDescription}
                  </p>
                )}
                {amenities.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {amenities.length} équipement{amenities.length > 1 ? "s" : ""}
                    {hasLocalGuide && " · guide local dispo"}
                  </p>
                )}
              </div>
            </div>
          </button>
        )}

        {(expectations || environments.length > 0) && (
          <button
            type="button"
            onClick={() => setActiveTab("attentes")}
            className="w-full text-left rounded-2xl border border-border bg-card p-4 md:p-5 hover:border-primary/40 hover:bg-accent/30 transition group"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold">Attentes de {ownerName}</p>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
                </div>
                {expectations ? (
                  <p className="text-sm text-foreground/80 line-clamp-2">{expectations}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {environments.length} repère{environments.length > 1 ? "s" : ""} sur le cadre de vie
                  </p>
                )}
              </div>
            </div>
          </button>
        )}
      </section>
    </>
  );
};

export default TabGarde;
