/**
 * Onglet "Attentes" : attentes spécifiques de l'hôte + cadre de vie.
 * Aucune icône Lucide décorative — texte pur.
 */
import { getEnvMeta } from "./sitMeta";

interface TabAttentesProps {
  ownerName: string;
  expectations: string;
  environments: string[];
}

const TabAttentes = ({ ownerName, expectations, environments }: TabAttentesProps) => {
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
