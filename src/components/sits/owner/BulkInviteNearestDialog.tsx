/**
 * Dialogue d'envoi groupé : invite en un clic les N gardiens disponibles
 * les plus proches du propriétaire.
 *
 * - Filtre : role=sitter, sitter_profiles.is_available=true, hors propriétaire,
 *   hors gardiens déjà invités sur cette annonce.
 * - Distance : géocodage des villes candidates + filtre Haversine, tri croissant.
 * - Quota : respect de la limite 20 invitations / 24 h (cap = 20 - déjà envoyé).
 * - Vouvoiement strict.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send, Crosshair, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { geocodeCity, haversineDistance } from "@/lib/geocode";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatSitPeriod } from "@/lib/dateRange";

interface Candidate {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  city: string | null;
  distance_km: number;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sitId: string;
  ownerId: string;
  sitTitle: string;
  sitCity: string | null;
  startDate: string | null;
  endDate: string | null;
  ownerCoords: { lat: number; lng: number };
  alreadyInvitedIds: string[];
  /** Nombre d'invitations restantes sur le quota 24 h. */
  remainingQuota: number;
  /** Cible par défaut (max 20). */
  targetCount?: number;
}

const MAX_MESSAGE = 500;
const DEFAULT_TARGET = 20;

const BulkInviteNearestDialog = ({
  open,
  onOpenChange,
  sitId,
  ownerId,
  sitTitle,
  sitCity,
  startDate,
  endDate,
  ownerCoords,
  alreadyInvitedIds,
  remainingQuota,
  targetCount = DEFAULT_TARGET,
}: Props) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const cache = useRef<Map<string, { lat: number; lng: number } | null>>(new Map());

  const cap = Math.max(0, Math.min(targetCount, remainingQuota));

  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  // Pré-remplit le message
  useEffect(() => {
    if (!open) return;
    const period = formatSitPeriod(startDate, endDate);
    const lieu = sitCity ? ` à ${sitCity}` : "";
    const dates = period ? ` du ${period}` : "";
    setMessage(
      `Bonjour,\n\nJe publie une garde${lieu}${dates}. Votre profil correspond à ce que je recherche et je serais ravi(e) que vous y candidatiez si cela vous intéresse.\n\nÀ très vite !`,
    );
    setProgress(0);
    setDone(false);
  }, [open, sitCity, startDate, endDate]);

  // Charge & calcule les plus proches dispos
  useEffect(() => {
    if (!open) return;
    let cancel = false;
    setLoading(true);
    (async () => {
      const excluded = new Set(alreadyInvitedIds);

      const { data: availRows } = await supabase
        .from("sitter_profiles")
        .select("user_id")
        .eq("is_available", true);
      const availableIds = ((availRows as any[]) || [])
        .map((r) => r.user_id)
        .filter((id) => id && id !== ownerId && !excluded.has(id));

      if (availableIds.length === 0) {
        if (!cancel) {
          setCandidates([]);
          setLoading(false);
        }
        return;
      }

      const { data } = await supabase
        .from("public_profiles")
        .select("id, first_name, avatar_url, city")
        .in("id", availableIds)
        .neq("id", ownerId)
        .not("city", "is", null)
        .limit(300);

      const rows = ((data as any[]) || []).filter(
        (r) => !excluded.has(r.id) && (r.city || "").trim().length > 0,
      );

      const uniqueCities = Array.from(
        new Set(rows.map((r) => (r.city || "").trim())),
      );
      await Promise.all(
        uniqueCities.map(async (c) => {
          if (cache.current.has(c)) return;
          const g = await geocodeCity(c);
          cache.current.set(c, g ? { lat: g.lat, lng: g.lng } : null);
        }),
      );

      const enriched: Candidate[] = rows
        .map((r) => {
          const g = cache.current.get((r.city || "").trim());
          if (!g) return null;
          const d = haversineDistance(
            ownerCoords.lat,
            ownerCoords.lng,
            g.lat,
            g.lng,
          );
          return {
            id: r.id,
            first_name: r.first_name,
            avatar_url: r.avatar_url,
            city: r.city,
            distance_km: Math.round(d),
          } as Candidate;
        })
        .filter((c): c is Candidate => !!c)
        .sort((a, b) => a.distance_km - b.distance_km)
        .slice(0, cap);

      if (!cancel) {
        setCandidates(enriched);
        setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSendAll = async () => {
    if (candidates.length === 0) return;
    setSending(true);
    setProgress(0);
    let ok = 0;
    let fail = 0;
    const trimmed = message.trim() || null;
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const { error } = await (supabase as any).from("sit_invitations").insert({
        sit_id: sitId,
        owner_id: ownerId,
        sitter_id: c.id,
        message: trimmed,
      });
      if (error) {
        fail++;
        // Si quota atteint côté serveur, on arrête
        if (
          String(error.message || "").includes("row-level security") ||
          String(error.message || "").includes("policy")
        ) {
          break;
        }
      } else {
        ok++;
      }
      setProgress(i + 1);
    }
    setSending(false);
    setDone(true);
    qc.invalidateQueries({ queryKey: ["sit_invitations", sitId] });
    toast({
      title: ok > 0 ? `${ok} invitation${ok > 1 ? "s" : ""} envoyée${ok > 1 ? "s" : ""}` : "Aucune invitation envoyée",
      description: fail > 0 ? `${fail} échec${fail > 1 ? "s" : ""} (déjà invité ou quota atteint).` : "Les gardiens ont reçu une notification.",
      variant: ok > 0 ? "default" : "destructive",
    });
    if (ok > 0) {
      setTimeout(() => onOpenChange(false), 800);
    }
  };

  const subtitle = useMemo(() => {
    if (cap === 0) return "Quota atteint (20 invitations / 24 h).";
    if (loading) return "Recherche des gardiens disponibles les plus proches…";
    if (candidates.length === 0) return "Aucun gardien disponible trouvé à proximité.";
    const max = candidates[candidates.length - 1]?.distance_km ?? 0;
    return `${candidates.length} gardien${candidates.length > 1 ? "s" : ""} disponible${candidates.length > 1 ? "s" : ""} dans un rayon de ${max} km.`;
  }, [loading, candidates, cap]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crosshair className="h-5 w-5 text-primary" />
            Inviter les {cap || targetCount} gardiens disponibles les plus proches
          </DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Calcul des distances…</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {cap === 0
              ? "Vous avez déjà envoyé 20 invitations dans les dernières 24 h. Réessayez plus tard."
              : "Aucun gardien disponible n'a pu être localisé. Élargissez votre recherche manuellement."}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/30 p-2 space-y-1.5">
              {candidates.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-sm">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={c.avatar_url || undefined} alt={c.first_name || "Gardien"} />
                    <AvatarFallback className="text-[10px]">
                      {(c.first_name || "?").slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium truncate flex-1">{c.first_name || "Gardien"}</span>
                  <span className="text-xs text-muted-foreground truncate">{c.city}</span>
                  <span className="text-xs font-medium text-primary tabular-nums shrink-0">{c.distance_km} km</span>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                Message commun envoyé à chaque gardien
              </p>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
                rows={5}
                className="resize-none text-sm"
                disabled={sending}
              />
              <p className="text-[11px] text-muted-foreground text-right mt-1">
                {message.length}/{MAX_MESSAGE}
              </p>
            </div>

            {sending && (
              <div className="text-xs text-center text-muted-foreground">
                Envoi en cours… {progress}/{candidates.length}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            {done ? "Fermer" : "Annuler"}
          </Button>
          <Button
            onClick={handleSendAll}
            disabled={sending || loading || candidates.length === 0 || message.trim().length < 10}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Envoi…
              </>
            ) : done ? (
              <>
                <Check className="h-4 w-4 mr-1.5" /> Terminé
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1.5" /> Envoyer aux {candidates.length} gardiens
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkInviteNearestDialog;
