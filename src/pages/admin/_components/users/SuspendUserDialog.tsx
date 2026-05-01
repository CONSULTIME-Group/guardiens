import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  reason: string;
  onReasonChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const SuspendUserDialog = ({ open, reason, onReasonChange, onClose, onConfirm }: Props) => (
  <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
    <DialogContent>
      <DialogHeader><DialogTitle>Suspendre le compte</DialogTitle></DialogHeader>
      <Textarea placeholder="Motif de suspension…" value={reason} onChange={(e) => onReasonChange(e.target.value)} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button variant="destructive" onClick={onConfirm}>Suspendre</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
