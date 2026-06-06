/**
 * Bloc d'invitation directe affiché au propriétaire d'une mission fraîchement
 * publiée. Liste jusqu'à 5 aidants dont les compétences correspondent à la
 * catégorie de la mission, classés par proximité si géoloc disponible.
 *
 * Chaque invitation déclenche la RPC `invite_helper_to_mission` qui crée une
 * notification côté aidant (dédup 7 jours, vérification ownership).
 *
 * Affiché uniquement si :
 *   - l'utilisateur courant est l'auteur de la mission
 *   - la mission est encore ouverte
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MISSION_TO_SKILL } from "@/components/missions/connected/constants";
import { haversineDistance } from "@/lib/geocode";

interface Props {
  missionId: string;
  missionCategory: string;
  ownerId: string;
  ownerLat?: number | null;
  ownerLng?: number | null;
}

type Helper = {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  distance?: number | null;
};

const MAX_HELPERS = 5;
const SEARCH_RADIUS_KM = 50;

export default function MatchedHelpersInviteBlock({
  missionId,
  missionCategory,
  ownerId,
  ownerLat,
  ownerLng,
}: Props) {
  const { toast } = useToast();
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [loading, setLoading] = useState(true);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());

  const skillKey = useMemo(() => MISSION_TO_SKILL[missionCategory], [missionCategory]);

  useEffect(() => {
    if (!skillKey) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, avatar_url, city, latitude, longitude, skill_categories, available_for_help")
        .eq("available_for_help", true)
        .contains("skill_categories", [skillKey])
        .neq("id", ownerId)
        .limit(30);

      if (cancelled || !data) return;

      const enriched: Helper[] = data.map((h: any) => {
        let distance: number | null = null;
        if (ownerLat != null && ownerLng != null && h.latitude != null && h.longitude != null) {
          distance = haversineDistance(ownerLat, ownerLng, h.latitude, h.longitude);
        }
        return { ...h, distance };
      });

      // Filtre proximité si on a les coords des deux côtés ; sinon, on garde tout.
      const filtered = enriched.filter((h) => h.distance == null || h.distance <= SEARCH_RADIUS_KM);

      // Tri : distance croissante en premier, sans distance ensuite.
      filtered.sort((a, b) => {
        if (a.distance != null && b.distance != null) return a.distance - b.distance;
        if (a.distance != null) return -1;
        if (b.distance != null) return 1;
        return 0;
      });

      setHelpers(filtered.slice(0, MAX_HELPERS));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [skillKey, ownerId, ownerLat, ownerLng]);

  const handleInvite = async (helperId: string, firstName: string | null) => {
    setPending((p) => new Set(p).add(helperId));
    const { data: notifId, error } = await supabase.rpc("invite_helper_to_mission", {
      p_mission_id: missionId,
      p_helper_id: helperId,
    });
    setPending((p) => { const n = new Set(p); n.delete(helperId); return n; });

    if (error) {
      toast({
        title: "Invitation impossible",
        description: "Réessayez dans un instant.",
        variant: "destructive",
      });
      return;
    }
    setInvited((p) => new Set(p).add(helperId));

    // Si la RPC a effectivement créé la notif (non null = pas de dédup 7j),
    // on déclenche l'email transactionnel en best-effort (silencieux si erreur).
    if (notifId) {
      supabase.functions.invoke("notify-mission-invitation", {
        body: { mission_id: missionId, helper_id: helperId },
      }).catch(() => {});
    }

    toast({
      title: "Invitation envoyée",
      description: `${firstName || "Ce membre"} recevra une notification.`,
    });
  };

  if (loading || helpers.length === 0) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-card p-5 mb-6">
      <h3 className="font-heading text-base font-semibold text-foreground">
        Invitez directement des aidants qui correspondent
      </h3>
      <p className="text-sm text-muted-foreground mt-1">
        Ces membres ont déclaré la compétence qui colle à votre demande, et se sont rendus disponibles.
      </p>
      <ul className="mt-4 divide-y divide-border">
        {helpers.map((h) => {
          const isInvited = invited.has(h.id);
          const isPending = pending.has(h.id);
          return (
            <li key={h.id} className="flex items-center gap-3 py-3">
              {h.avatar_url ? (
                <img
                  src={h.avatar_url}
                  alt=""
                  loading="lazy"
                  className="h-10 w-10 rounded-full object-cover border border-border shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                  {h.first_name?.charAt(0) || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <Link
                  to={`/gardiens/${h.id}`}
                  className="text-sm font-medium text-foreground hover:underline truncate inline-block max-w-full"
                >
                  {h.first_name || "Membre"}
                </Link>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {h.city && (
                    <>
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{h.city}</span>
                    </>
                  )}
                  {h.distance != null && (
                    <span className="shrink-0">· {Math.round(h.distance)} km</span>
                  )}
                </div>
              </div>
              {isInvited ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-success shrink-0">
                  <Check className="h-3.5 w-3.5" />
                  Invité
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => handleInvite(h.id, h.first_name)}
                  className="shrink-0"
                >
                  {isPending ? "..." : "Inviter"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
