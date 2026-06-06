/**
 * Onglet "Attentes" : attentes spécifiques de l'hôte + cadre de vie
 * + préférences gardien (open_to, expérience minimum).
 * Aucune icône Lucide décorative, texte pur.
 */
import { getEnvMeta } from "./sitMeta";

interface TabAttentesProps {
  ownerName: string;
  expectations: string;
  environments: string[];
  openTo?: string[] | null;
  minGardienSits?: number | null;
}

const TabAttentes = ({
  ownerName,
  expectations,
  environments,
  openTo,
  minGardienSits,
}: TabAttentesProps) => {
  const cleanOpenTo = (openTo || []).filter(Boolean);
  const hasNoPreference =
    cleanOpenTo.length === 0 ||
    (cleanOpenTo.length === 1 && cleanOpenTo[0] === "Sans préférence");
  const hasMinExperience = typeof minGardienSits === "number" && minGardienSits > 0;
  const hasPreferences = !hasNoPreference || hasMinExperience;

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
        <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
          <h2 className="text-lg font-semibold mb-3">Profil de gardien recherché</h2>
          {!hasNoPreference && (
            <div className="mb-3">
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
