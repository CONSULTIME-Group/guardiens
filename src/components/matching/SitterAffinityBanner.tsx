/**
 * Bandeau d'incitation côté gardien : si le profil sitter du visiteur
 * est incomplet (critères durs animal_types ou work_during_sit), propose
 * de le compléter pour activer le score d'affinité sur ses candidatures.
 * Symétrique de OwnerAffinityBanner.
 */
import AffinityMissingCTA from "./AffinityMissingCTA";
import { useViewerSitterForAffinity } from "@/hooks/useViewerSitterForAffinity";

interface Props {
  context?: string;
  editHref?: string;
  className?: string;
}

const SitterAffinityBanner = ({
  context = "dashboard_sitter_rail",
  editHref = "/profile?section=sitter",
  className,
}: Props) => {
  const { sitter, loading } = useViewerSitterForAffinity();
  if (loading || !sitter) return null;
  return (
    <div className={className}>
      <AffinityMissingCTA
        side="sitter"
        profile={sitter}
        context={context}
        scope="list"
        editHref={editHref}
      />
    </div>
  );
};

export default SitterAffinityBanner;
