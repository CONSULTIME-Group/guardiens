/**
 * Lot X3a (A-04) : encart de l'auteur sur sa fiche d'annonce expirée ou
 * annulée. Les candidatures restent lisibles plus bas ; « Republier » ouvre
 * la même boîte que dans Mes annonces.
 */
import { useState } from "react";
import { Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RepublishAlmaDialog } from "@/components/ai/alma/RepublishAlmaDialog";
import { closedSitNotice } from "@/lib/ownSitAccess";

interface ClosedSitOwnerNoticeProps {
  sitId: string;
  sitTitle?: string | null;
  status: string;
}

const ClosedSitOwnerNotice = ({ sitId, sitTitle, status }: ClosedSitOwnerNoticeProps) => {
  const [open, setOpen] = useState(false);
  const notice = closedSitNotice(status);
  if (!notice) return null;
  return (
    <section
      data-testid="closed-sit-owner-notice"
      role="status"
      className="mb-6 rounded-xl border border-border bg-muted/40 p-4 md:p-5"
    >
      <div className="flex items-start gap-3">
        <Clock className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="font-heading text-base font-semibold text-foreground">{notice.title}</p>
          <p className="text-sm text-muted-foreground mt-1">{notice.body}</p>
          {notice.canRepublish && (
            <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => setOpen(true)}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Republier
            </Button>
          )}
        </div>
      </div>
      {open && (
        <RepublishAlmaDialog open={open} onOpenChange={setOpen} sitId={sitId} sourceTitle={sitTitle ?? null} />
      )}
    </section>
  );
};

export default ClosedSitOwnerNotice;
