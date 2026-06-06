/**
 * Bouton "Proposer une annonce" affichable n'importe où (carte gardien dans la
 * recherche, profil public, etc.). Géré côté propriétaire :
 *  - Charge les annonces publiées du user (rôle actif = owner)
 *  - Si 0 annonce → CTA "Créer une annonce"
 *  - Si 1 → ouvre directement le dialog d'invitation
 *  - Si N → étape de sélection puis dialog d'invitation
 *
 * N'apparaît PAS si l'utilisateur n'est pas connecté ou n'est pas en mode
 * propriétaire. Sinon, on affiche aussi un état "déjà invité" basé sur
 * `sit_invitations` (coup d'œil rapide pour ne pas spammer).
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Send, ArrowRight, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import InviteSitterDialog from "./InviteSitterDialog";
import { formatSitPeriod } from "@/lib/dateRange";
import { Calendar, MapPin } from "lucide-react";

interface PublishedSit {
  id: string;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  city: string | null;
}

interface InvitationLite {
  sit_id: string;
  status: "sent" | "viewed" | "applied" | "declined";
}

interface Props {
  sitter: { id: string; first_name: string | null } | null;
  /** Variante visuelle */
  variant?: "outline" | "default" | "ghost";
  size?: "sm" | "default";
  /** Texte du bouton (défaut : "Proposer mon annonce") */
  label?: string;
  className?: string;
  /** Si vrai, ne rend rien tant qu'on n'a pas confirmé qu'au moins une annonce publiée existe. */
  hideIfNoSits?: boolean;
  /** Callback déclenché après le préchargement quand hideIfNoSits=true. */
  onPublishedSitsResolved?: (count: number) => void;
}

const InviteToMySitButton = ({
  sitter,
  variant = "outline",
  size = "sm",
  label = "Proposer mon annonce",
  className,
  hideIfNoSits = false,
  onPublishedSitsResolved,
}: Props) => {
  const { user, activeRole } = useAuth();
  const ownerId = user?.id ?? null;
  const isOwnerMode =
    !!user &&
    (user.role === "owner" ||
      (user.role === "both" && activeRole === "owner"));
  const isSelf = ownerId && sitter?.id === ownerId;

  const [open, setOpen] = useState(false);
  // null = inconnu (préflight en cours), number = compté
  const [publishedCount, setPublishedCount] = useState<number | null>(
    hideIfNoSits ? null : 1,
  );

  // Préflight : compter les annonces publiées si on doit masquer le bouton sinon.
  useEffect(() => {
    if (!hideIfNoSits) return;
    if (!isOwnerMode || !ownerId || isSelf) {
      setPublishedCount(0);
      return;
    }
    let cancel = false;
    (async () => {
      const { count } = await supabase
        .from("sits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", ownerId)
        .eq("status", "published");
      if (cancel) return;
      const c = count ?? 0;
      setPublishedCount(c);
      onPublishedSitsResolved?.(c);
    })();
    return () => {
      cancel = true;
    };
  }, [hideIfNoSits, isOwnerMode, ownerId, isSelf, onPublishedSitsResolved]);
  const [sits, setSits] = useState<PublishedSit[] | null>(null);
  const [invitations, setInvitations] = useState<InvitationLite[]>([]);
  const [chosenSit, setChosenSit] = useState<PublishedSit | null>(null);

  // Chargement à l'ouverture du dialog
  useEffect(() => {
    if (!open || !ownerId || !sitter?.id) return;
    let cancel = false;
    (async () => {
      const [{ data: sitRows }, { data: invRows }] = await Promise.all([
        supabase
          .from("sits")
          .select("id, title, start_date, end_date")
          .eq("user_id", ownerId)
          .eq("status", "published")
          .order("start_date", { ascending: true }),
        (supabase as any)
          .from("sit_invitations")
          .select("sit_id, status")
          .eq("owner_id", ownerId)
          .eq("sitter_id", sitter.id),
      ]);
      if (cancel) return;
      // city via profile (les sits n'ont pas city directement → on prend la ville du proprio)
      const { data: prof } = await supabase
        .from("profiles")
        .select("city")
        .eq("id", ownerId)
        .maybeSingle();
      setSits(
        ((sitRows as any[]) || []).map((s) => ({
          id: s.id,
          title: s.title,
          start_date: s.start_date,
          end_date: s.end_date,
          city: (prof as any)?.city ?? null,
        })),
      );
      setInvitations((invRows as InvitationLite[]) || []);
    })();
    return () => {
      cancel = true;
    };
  }, [open, ownerId, sitter?.id]);

  const invitedSitIds = useMemo(
    () => new Set(invitations.map((i) => i.sit_id)),
    [invitations],
  );

  // Si une seule annonce non encore proposée → on auto-saute la sélection
  useEffect(() => {
    if (!sits) return;
    const eligible = sits.filter((s) => !invitedSitIds.has(s.id));
    if (eligible.length === 1 && !chosenSit) {
      setChosenSit(eligible[0]);
    }
  }, [sits, invitedSitIds, chosenSit]);

  if (!isOwnerMode || !sitter || isSelf) return null;
  if (hideIfNoSits && (publishedCount === null || publishedCount === 0)) return null;


  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setChosenSit(null);
          setOpen(true);
        }}
      >
        <Send className="h-3.5 w-3.5 mr-1.5" />
        {label}
      </Button>

      {/* Dialog de sélection d'annonce, uniquement quand on n'a pas auto-choisi */}
      <Dialog
        open={open && !chosenSit}
        onOpenChange={(o) => {
          if (!o) {
            setOpen(false);
            setChosenSit(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Proposer une annonce à {sitter.first_name || "ce gardien"}
            </DialogTitle>
            <DialogDescription>
              Choisissez l'annonce que vous souhaitez lui proposer. Le gardien
              recevra une notification et pourra candidater en un clic.
            </DialogDescription>
          </DialogHeader>

          {sits === null ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Chargement…</p>
          ) : sits.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
              <p className="text-sm text-foreground font-medium mb-1">
                Vous n'avez aucune annonce publiée.
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Pour proposer une garde à ce gardien, créez d'abord une annonce.
              </p>
              <Link to="/sits/new" onClick={() => setOpen(false)}>
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Créer mon annonce
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {sits.map((s) => {
                const already = invitedSitIds.has(s.id);
                const period = formatSitPeriod(s.start_date, s.end_date);
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={already}
                    onClick={() => setChosenSit(s)}
                    className={`w-full text-left rounded-xl border p-3 transition ${
                      already
                        ? "border-border bg-muted/40 cursor-not-allowed opacity-70"
                        : "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.03]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {s.title || "Annonce sans titre"}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                          {period && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {period}
                            </span>
                          )}
                          {s.city && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {s.city}
                            </span>
                          )}
                        </div>
                      </div>
                      {already ? (
                        <span className="text-xs text-success font-medium inline-flex items-center gap-1 shrink-0">
                          <Check className="h-3.5 w-3.5" /> Déjà proposée
                        </span>
                      ) : (
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog d'invitation (message éditable) */}
      {chosenSit && ownerId && (
        <InviteSitterDialog
          open={open && !!chosenSit}
          onOpenChange={(o) => {
            if (!o) {
              setOpen(false);
              setChosenSit(null);
            }
          }}
          sitter={sitter}
          sitId={chosenSit.id}
          ownerId={ownerId}
          sitTitle={chosenSit.title || ""}
          sitCity={chosenSit.city}
          startDate={chosenSit.start_date}
          endDate={chosenSit.end_date}
        />
      )}
    </>
  );
};

export default InviteToMySitButton;
