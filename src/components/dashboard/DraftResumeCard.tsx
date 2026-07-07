import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { useImpressionOnce } from "@/hooks/useImpressionOnce";

interface Draft {
  id: string;
  title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  specific_expectations?: string | null;
  environments?: string[] | null;
  city?: string | null;
  owner_message?: string | null;
  daily_routine?: string | null;
  cover_photo_url?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

const FIELDS: Array<keyof Draft> = [
  "title",
  "start_date",
  "end_date",
  "specific_expectations",
  "environments",
  "city",
  "owner_message",
  "daily_routine",
];

function isFutureDate(v: unknown): boolean {
  if (typeof v !== "string" || !v) return false;
  const today = new Date().toISOString().slice(0, 10);
  return v >= today;
}

function countFilled(draft: Draft): number {
  return FIELDS.reduce((n, k) => {
    const v = draft[k];
    if (k === "start_date" || k === "end_date") return n + (isFutureDate(v) ? 1 : 0);
    if (Array.isArray(v)) return n + (v.length > 0 ? 1 : 0);
    if (typeof v === "string") return n + (v.trim().length > 0 ? 1 : 0);
    return n + (v ? 1 : 0);
  }, 0);
}

function hasStaleDate(draft: Draft): boolean {
  const hasStart = typeof draft.start_date === "string" && !!draft.start_date;
  const hasEnd = typeof draft.end_date === "string" && !!draft.end_date;
  return (hasStart && !isFutureDate(draft.start_date))
    || (hasEnd && !isFutureDate(draft.end_date));
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `il y a ${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return `il y a ${days} j`;
}

interface Props {
  draft: Draft;
  onDeleted?: () => void;
}

export default function DraftResumeCard({ draft, onDeleted }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filled = useMemo(() => countFilled(draft), [draft]);
  const total = FIELDS.length;
  const staleDate = useMemo(() => hasStaleDate(draft), [draft]);
  const modified = draft.updated_at || draft.created_at || null;

  const impressionRef = useRef<HTMLDivElement>(null);
  const onSeen = useCallback(() => {
    void trackEvent("dashboard_draft_card_seen", {
      source: "owner_dashboard",
      metadata: { sit_id: draft.id },
    });
  }, [draft.id]);
  useImpressionOnce(impressionRef, `draft_card_${draft.id}`, onSeen);

  const daysSinceCreated = useMemo(() => {
    if (!draft.created_at) return null;
    return Math.round((Date.now() - new Date(draft.created_at).getTime()) / 86_400_000);
  }, [draft.created_at]);

  const handleResume = () => {
    void trackEvent("dashboard_draft_card_resume_clicked", {
      source: "owner_dashboard",
      metadata: { sit_id: draft.id, days_since_created: daysSinceCreated },
    });
    navigate(`/sits/create?resume=${draft.id}`);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("sits")
        .delete()
        .eq("id", draft.id)
        .eq("status", "draft");
      if (error) throw error;
      try {
        localStorage.removeItem(`sit_draft_${draft.id}`);
      } catch {
        /* ignore */
      }
      void trackEvent("dashboard_draft_card_deleted", {
        source: "owner_dashboard",
        metadata: { sit_id: draft.id, days_since_created: daysSinceCreated },
      });
      toast({ title: "Brouillon supprimé" });
      setConfirmOpen(false);
      onDeleted?.();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Suppression impossible",
        description: e?.message ?? "Veuillez réessayer dans un instant.",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div
        ref={impressionRef}
        className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="font-heading font-semibold text-foreground text-base md:text-lg leading-tight">
              Vous avez une annonce en cours de rédaction
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Reprenez où vous en étiez. Vous êtes à {filled} champs sur {total} remplis.
            </p>
            {staleDate && (
              <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 mt-1.5">
                Dates à mettre à jour
              </span>
            )}
            {modified && (
              <p className="text-xs text-muted-foreground/80 mt-1">
                Modifié {relativeTime(modified)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={handleResume} className="rounded-xl">
            Reprendre ma rédaction
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Supprimer ce brouillon"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only md:not-sr-only md:ml-1.5">Supprimer</span>
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce brouillon ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce brouillon ? Vous perdrez les
              informations déjà saisies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
