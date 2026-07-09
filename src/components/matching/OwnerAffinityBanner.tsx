/**
 * Bandeau d'incitation côté propriétaire : si le profil owner du visiteur
 * est incomplet, propose de le compléter pour activer le score d'affinité
 * sur la liste de gardiens. Affiché 1×/session (dédup interne du CTA).
 */
import AffinityMissingCTA from "./AffinityMissingCTA";
import { useViewerOwnerForAffinity } from "@/hooks/useViewerOwnerForAffinity";

interface Props {
  context?: string;
  editHref?: string;
  className?: string;
}

const OwnerAffinityBanner = ({
  context = "search_owner_listing",
  editHref = "/owner-profile?section=rules",
  className,
}: Props) => {
  const { owner, loading } = useViewerOwnerForAffinity();
  if (loading || !owner) return null;
  return (
    <div className={className}>
      <AffinityMissingCTA
        side="owner"
        profile={owner}
        context={context}
        scope="list"
        editHref={editHref}
      />
    </div>
  );
};

export default OwnerAffinityBanner;
