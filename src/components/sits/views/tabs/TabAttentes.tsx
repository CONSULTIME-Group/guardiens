/**
 * Onglet "Attentes" : attentes spécifiques de l'hôte + cadre de vie
 * + préférences gardien (open_to, expérience minimum, accompagnants).
 * Aucune icône Lucide décorative, texte pur.
 */
import { getEnvMeta } from "./sitMeta";

interface TabAttentesProps {
  ownerName: string;
  expectations: string;
  environments: string[];
  openTo?: string[] | null;
  minGardienSits?: number | null;
  acceptsSitterPets?: "yes" | "no" | "discuss" | null;
  acceptsSitterChildren?: "yes" | "no" | "discuss" | null;
}

const ACCOMP_STYLE: Record<"yes" | "no" | "discuss", { label: string; className: string }> = {
  yes: { label: "Autorisés", className: "bg-success/10 text-success border-success/30" },
  no: { label: "Non autorisés", className: "bg-warning/10 text-warning border-warning/30" },
  discuss: { label: "À discuter", className: "bg-muted text-foreground border-border" },
};

const TabAttentes = ({
  ownerName,
  expectations,
  environments,
  openTo,
  minGardienSits,
  acceptsSitterPets,
  acceptsSitterChildren,
}: TabAttentesProps) => {
  const cleanOpenTo = (openTo || []).filter(Boolean);
  const hasOpenTo =
    cleanOpenTo.length > 0 &&
    !(cleanOpenTo.length === 1 && cleanOpenTo[0] === "Sans préférence");
  const hasMinExperience = typeof minGardienSits === "number" && minGardienSits > 0;
  const hasAccompChip =
    (acceptsSitterPets && acceptsSitterPets !== "discuss") ||
    (acceptsSitterChildren && acceptsSitterChildren !== "discuss");
  const hasPreferences = hasOpenTo || hasMinExperience || hasAccompChip;

  return (
    <>
      {expectations ? (
        <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 className="text-lg font-semibold mb-3">
            Ce que {ownerName} attend du gardien
          </h2>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
            {expectations}
          </p>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground italic text-center py-8">
          {ownerName} n'a pas formulé d'attentes spécifiques. N'hésitez pas à en discuter
          ensemble.
        </p>
      )}

      {hasPreferences && (
        <section className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-4">
          <h2 className="text-lg font-semibold">Profil de gardien recherché</h2>

          {(acceptsSitterPets || acceptsSitterChildren) && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Accompagnants du gardien
              </p>
              <div className="flex flex-wrap gap-2">
                {acceptsSitterPets && (
                  <span
                    className={`inline-flex items-center text-sm rounded-full border px-3 py-1.5 font-medium ${ACCOMP_STYLE[acceptsSitterPets].className}`}
                  >
                    Animaux du gardien : {ACCOMP_STYLE[acceptsSitterPets].label}
                  </span>
                )}
                {acceptsSitterChildren && (
                  <span
                    className={`inline-flex items-center text-sm rounded-full border px-3 py-1.5 font-medium ${ACCOMP_STYLE[acceptsSitterChildren].className}`}
                  >
                    Enfants du gardien : {ACCOMP_STYLE[acceptsSitterChildren].label}
                  </span>
                )}
              </div>
            </div>
          )}

          {hasOpenTo && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                Ouvert à
              </p>
              <div className="flex flex-wrap gap-2">
                {cleanOpenTo.map((o) => (
                  <span
                    key={o}
                    className="inline-flex items-center text-sm bg-muted rounded-full px-3 py-1.5 font-medium"
                  >
                    {o}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hasMinExperience && (
            <p className="text-sm text-foreground/90">
              Expérience souhaitée :{" "}
              <span className="font-semibold">
                {minGardienSits} garde{minGardienSits! > 1 ? "s" : ""} accomplie
                {minGardienSits! > 1 ? "s" : ""} minimum
              </span>
            </p>
          )}
        </section>
      )}

      {environments.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 className="text-lg font-semibold mb-3">Cadre de vie</h2>
          <div className="flex flex-wrap gap-2">
            {environments.map((e) => {
              const meta = getEnvMeta(e);
              return (
                <span
                  key={e}
                  className="inline-flex items-center text-sm bg-muted rounded-full px-3 py-1.5 font-medium"
                >
                  {meta.label}
                </span>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
};

export default TabAttentes;
