/**
 * Lot L10 (09/11/2026, arène tableau de bord v2, « un bloc entraide ») : sur
 * téléphone, la ligne entraide sous le récit (EntraideLine) est l'unique
 * entrée vers l'entraide. Ce bloc ne s'affiche que s'il reste quelque chose à
 * faire : un coup de main en cours dont on attend la réponse « Le coup de main
 * a eu lieu ? », ou des propositions d'aide à suivre. Sans gouache, sans
 * bouton plein : le récit garde l'unique bouton plein de l'écran.
 */
import { useMyHelpExchanges } from "@/components/dashboard/MesCoupsDeMain";
import { EntraideFollowUpView } from "./EntraideFollowUpView";

export default function EntraideFollowUp() {
  const { rows, proposals, busy, answer } = useMyHelpExchanges();
  return (
    <EntraideFollowUpView
      exchanges={rows}
      proposals={proposals}
      busyId={busy}
      onAnswer={(id, h, w, p, c) => void answer(id, h, w, p, c)}
    />
  );
}
