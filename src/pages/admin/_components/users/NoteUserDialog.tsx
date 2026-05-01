import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  note: string;
  onNoteChange: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export const NoteUserDialog = ({ open, note, onNoteChange, onClose, onSave }: Props) => (
  <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
    <DialogContent>
      <DialogHeader><DialogTitle>Note interne</DialogTitle></DialogHeader>
      <Textarea placeholder="Note visible uniquement par les admins…" value={note} onChange={(e) => onNoteChange(e.target.value)} rows={4} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={onSave}>Enregistrer</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
