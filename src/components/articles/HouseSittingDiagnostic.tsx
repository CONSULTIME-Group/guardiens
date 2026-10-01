import { useId, useState } from "react";

/**
 * Mini diagnostic de l'article « House-sitting : définition, fonctionnement
 * et coûts ». Purement local : aucune donnée enregistrée, aucun appel réseau,
 * aucun score. Les mêmes conseils figurent en clair dans le texte de l'article.
 */
type Answer = "oui" | "non" | null;

const QUESTIONS = [
  {
    key: "presence",
    label: "Votre animal ou votre logement a-t-il besoin d'une présence presque continue ?",
  },
  {
    key: "soins",
    label: "Votre animal a-t-il des soins particuliers ou un comportement délicat ?",
  },
  {
    key: "relais",
    label: "Avez-vous de la souplesse sur les dates et une personne relais en cas d'imprévu ?",
  },
] as const;

type Key = (typeof QUESTIONS)[number]["key"];

export function adviceFor(answers: Record<Key, Answer>): string[] {
  const out: string[] = [];
  if (answers.presence === "oui") {
    out.push(
      "Indiquez dans l'annonce une durée maximale d'absence et vérifiez-la avec chaque gardien. Une présence 24 h sur 24 n'est jamais garantie : si elle est indispensable, une solution encadrée par des professionnels peut mieux convenir.",
    );
  } else if (answers.presence === "non") {
    out.push("Un gardien qui vit sa journée normalement, avec des absences, peut convenir. Précisez tout de même vos attentes.");
  }
  if (answers.soins === "oui") {
    out.push(
      "Décrivez les soins ou le comportement précisément et demandez au gardien s'il a déjà géré une situation semblable. Laissez les consignes du vétérinaire par écrit.",
    );
  } else if (answers.soins === "non") {
    out.push("Un guide de la maison avec les routines de repas et de sortie suffit en général.");
  }
  if (answers.relais === "non") {
    out.push(
      "Prévoyez une solution de repli (proche, pension, pet-sitter) et publiez votre annonce tôt : aucun gardien ni remplaçant n'est garanti.",
    );
  } else if (answers.relais === "oui") {
    out.push("Notez les coordonnées de votre personne relais dans l'accord écrit, avec un double des clés.");
  }
  return out;
}

export default function HouseSittingDiagnostic() {
  const baseId = useId();
  const [answers, setAnswers] = useState<Record<Key, Answer>>({ presence: null, soins: null, relais: null });
  const advice = adviceFor(answers);
  const answeredAll = Object.values(answers).every((a) => a !== null);

  return (
    <section
      aria-labelledby={`${baseId}-title`}
      className="mt-10 rounded-xl border border-border bg-muted/40 p-5 sm:p-6"
      data-testid="house-sitting-diagnostic"
    >
      <h2 id={`${baseId}-title`} className="font-heading text-xl font-semibold text-foreground">
        Mini diagnostic : le house-sitting vous convient-il ?
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Trois questions pour préparer votre annonce. Rien n'est enregistré, ce n'est ni un avis vétérinaire ni une garantie.
      </p>

      <div className="mt-4 space-y-4">
        {QUESTIONS.map((q) => (
          <fieldset key={q.key}>
            <legend className="text-sm font-medium text-foreground">{q.label}</legend>
            <div className="mt-2 flex gap-2">
              {(["oui", "non"] as const).map((v) => {
                const id = `${baseId}-${q.key}-${v}`;
                const checked = answers[q.key] === v;
                return (
                  <label
                    key={v}
                    htmlFor={id}
                    className={`cursor-pointer rounded-lg border px-4 py-1.5 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/40"
                    }`}
                  >
                    <input
                      id={id}
                      type="radio"
                      name={`${baseId}-${q.key}`}
                      value={v}
                      checked={checked}
                      onChange={() => setAnswers((a) => ({ ...a, [q.key]: v }))}
                      className="sr-only"
                    />
                    {v === "oui" ? "Oui" : "Non"}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div aria-live="polite" className="mt-5">
        {advice.length > 0 && (
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-sm font-semibold text-foreground">
              {answeredAll ? "Nos conseils pour votre situation" : "Premiers conseils"}
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-foreground/85">
              {advice.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
