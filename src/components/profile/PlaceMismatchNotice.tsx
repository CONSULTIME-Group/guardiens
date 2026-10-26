import { useQuery } from "@tanstack/react-query";
import { MapPinOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyProfile } from "@/lib/myProfile";
import { placeStatusMessage } from "@/lib/placeStatus";

/**
 * Lot G2 : bandeau au-dessus des champs de lieu quand geocode-profile a relevé
 * un lieu incohérent (profiles.place_status). Lecture par le cache du profil
 * (src/lib/myProfile.ts), aucune lecture de plus.
 */
const PlaceMismatchNotice = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { data: status } = useQuery({
    queryKey: ["place-status", userId],
    enabled: !!userId,
    queryFn: async () => (userId ? ((await fetchMyProfile(userId)).data?.place_status ?? null) : null),
  });
  const message = placeStatusMessage(status);
  if (!message) return null;
  return (
    <div role="status" data-testid="place-mismatch-notice" className="flex gap-3 rounded-card border border-field bg-muted/40 p-4">
      <MapPinOff className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{message.title}</p>
        <p className="text-sm text-muted-foreground">{message.body}</p>
      </div>
    </div>
  );
};

export default PlaceMismatchNotice;
