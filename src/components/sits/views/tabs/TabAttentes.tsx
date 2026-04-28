/**
 * Onglet "Attentes" : attentes spécifiques de l'hôte + cadre de vie.
 */
import { ShieldCheck, Trees } from "lucide-react";
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
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
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
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Trees className="h-5 w-5 text-primary" /> Cadre de vie
          </h2>
          <div className="flex flex-wrap gap-2">
            {environments.map((e) => {
              const meta = getEnvMeta(e);
              const Ico = meta.icon;
              return (
                <span
                  key={e}
                  className="inline-flex items-center gap-1.5 text-sm bg-muted rounded-full px-3 py-1.5"
                >
                  <Ico className="h-4 w-4" /> {meta.label}
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
