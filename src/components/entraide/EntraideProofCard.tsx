import { proofSentence, weekLabel, type EntraideProof } from "@/lib/entraideProofs";

/**
 * Une rencontre confirmée près de chez vous. Prénoms, ville, mot laissé, date
 * en semaine. Aucune adresse, aucun nom de famille, aucune photo du lieu.
 */
const EntraideProofCard = ({ proof, now }: { proof: EntraideProof; now?: Date }) => (
  <article className="rounded-lg border border-border bg-card p-4 sm:p-5">
    <p className="text-xs font-semibold text-primary">{weekLabel(proof.happened_at, now)}</p>
    <p className="mt-2 text-sm leading-relaxed text-foreground">{proofSentence(proof)}</p>
    {proof.word && (
      <p className="mt-3 border-l-2 border-primary/40 pl-3 text-sm italic leading-relaxed text-muted-foreground">
        « {proof.word} »
      </p>
    )}
  </article>
);

export default EntraideProofCard;
