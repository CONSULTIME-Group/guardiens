import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
import { toast } from "sonner";
import PetForm, { type PetFormValues } from "./PetForm";

const SPECIES_LABEL: Record<string, string> = {
  dog: "Chien", cat: "Chat", horse: "Cheval", bird: "Oiseau",
  rodent: "Rongeur", fish: "Poisson", reptile: "Reptile",
  farm_animal: "Animal de ferme", nac: "NAC",
};

interface Pet {
  id: string;
  property_id: string;
  name: string;
  species: string;
  breed: string | null;
  age: number | null;
  photo_url: string | null;
  character: string | null;
  special_needs: string | null;
}

interface Props {
  propertyId: string;
  onChange?: (pets: Pet[]) => void;
}

const PetsEditor = ({ propertyId, onChange }: Props) => {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Pet | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Pet | null>(null);

  const petsQuery = useQuery({
    queryKey: ["pets-editor", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .eq("property_id", propertyId)
        .order("name");
      if (error) throw error;
      const pets = (data ?? []) as Pet[];
      onChange?.(pets);
      return pets;
    },
    enabled: !!propertyId,
  });

  const pets = petsQuery.data ?? [];

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p: Pet) => { setEditing(p); setDialogOpen(true); };

  const handleSubmit = async (values: PetFormValues) => {
    const payload = {
      property_id: propertyId,
      name: values.name.trim(),
      species: values.species as any,
      breed: values.breed?.trim() || "",
      age: values.age ?? null,
      character: values.character?.trim() || "",
      special_needs: values.special_needs?.trim() || "",
      photo_url: values.photo_url ?? null,
    };
    if (editing) {
      const { error } = await supabase.from("pets").update(payload).eq("id", editing.id);
      if (error) { toast.error("Impossible de mettre à jour l'animal"); return; }
      toast.success("Animal mis à jour");
    } else {
      const { error } = await supabase.from("pets").insert(payload as any);
      if (error) { toast.error("Impossible d'ajouter l'animal"); return; }
      toast.success("Animal ajouté");
    }
    setDialogOpen(false);
    setEditing(null);
    await qc.invalidateQueries({ queryKey: ["pets-editor", propertyId] });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from("pets").delete().eq("id", confirmDelete.id);
    if (error) { toast.error("Impossible de retirer l'animal"); return; }
    toast.success("Animal retiré");
    setConfirmDelete(null);
    await qc.invalidateQueries({ queryKey: ["pets-editor", propertyId] });
  };

  return (
    <div className="space-y-3">
      {pets.length === 0 && !petsQuery.isLoading && (
        <div className="rounded-xl border border-dashed border-border p-4 text-center">
          <PawPrint className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aucun animal renseigné pour ce logement.</p>
        </div>
      )}

      {pets.map((pet) => (
        <div key={pet.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
          <Avatar className="h-11 w-11">
            {pet.photo_url ? <AvatarImage src={pet.photo_url} alt={pet.name} className="object-cover" /> : null}
            <AvatarFallback>{pet.name.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {pet.name}
              <span className="text-muted-foreground font-normal"> · {SPECIES_LABEL[pet.species] ?? pet.species}</span>
              {pet.breed ? <span className="text-muted-foreground font-normal">, {pet.breed}</span> : null}
            </p>
            {(pet.age || pet.character) && (
              <p className="text-xs text-muted-foreground truncate">
                {[pet.age ? `${pet.age} an${pet.age > 1 ? "s" : ""}` : null, pet.character].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => openEdit(pet)} aria-label={`Modifier ${pet.name}`}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(pet)} aria-label={`Retirer ${pet.name}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={openAdd} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Ajouter un animal
      </Button>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'animal" : "Ajouter un animal"}</DialogTitle>
            <DialogDescription>
              Ces informations aideront les gardiens à mieux préparer leur venue.
            </DialogDescription>
          </DialogHeader>
          <PetForm
            initialValues={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => { setDialogOpen(false); setEditing(null); }}
            submitLabel={editing ? "Enregistrer" : "Ajouter"}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer cet animal ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'animal sera retiré de votre liste. Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Retirer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PetsEditor;
