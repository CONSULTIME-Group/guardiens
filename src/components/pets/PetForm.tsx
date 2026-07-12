import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { safeUUID } from "@/lib/uuid";

export type PetFormValues = {
  name: string;
  species: string;
  breed?: string;
  age?: number | null;
  character?: string;
  special_needs?: string;
  photo_url?: string | null;
};

const petSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(30, "Nom trop long"),
  species: z.enum(["dog", "cat", "horse", "bird", "rodent", "fish", "reptile", "farm_animal", "nac"], {
    errorMap: () => ({ message: "Espèce requise" }),
  }),
  breed: z.string().trim().max(50).optional().or(z.literal("")),
  age: z.coerce.number().int().min(0).max(60).optional().nullable(),
  character: z.string().trim().max(300).optional().or(z.literal("")),
  special_needs: z.string().trim().max(500).optional().or(z.literal("")),
  photo_url: z.string().nullable().optional(),
});

const SPECIES_OPTIONS: { value: string; label: string }[] = [
  { value: "dog", label: "Chien" },
  { value: "cat", label: "Chat" },
  { value: "horse", label: "Cheval" },
  { value: "bird", label: "Oiseau" },
  { value: "rodent", label: "Rongeur" },
  { value: "fish", label: "Poisson" },
  { value: "reptile", label: "Reptile" },
  { value: "farm_animal", label: "Animal de ferme" },
  { value: "nac", label: "NAC" },
];

interface Props {
  initialValues?: Partial<PetFormValues>;
  onSubmit: (values: PetFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

const PetForm = ({ initialValues, onSubmit, onCancel, submitLabel = "Enregistrer" }: Props) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<PetFormValues>({
    resolver: zodResolver(petSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      species: (initialValues?.species as any) ?? "dog",
      breed: initialValues?.breed ?? "",
      age: initialValues?.age ?? null,
      character: initialValues?.character ?? "",
      special_needs: initialValues?.special_needs ?? "",
      photo_url: initialValues?.photo_url ?? null,
    },
  });

  useEffect(() => {
    reset({
      name: initialValues?.name ?? "",
      species: (initialValues?.species as any) ?? "dog",
      breed: initialValues?.breed ?? "",
      age: initialValues?.age ?? null,
      character: initialValues?.character ?? "",
      special_needs: initialValues?.special_needs ?? "",
      photo_url: initialValues?.photo_url ?? null,
    });
  }, [initialValues, reset]);

  const photoUrl = watch("photo_url");
  const species = watch("species");
  const name = watch("name");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La photo ne doit pas dépasser 5 Mo");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/pets/${safeUUID()}.${ext}`;
    const { error } = await supabase.storage.from("property-photos").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Impossible d'uploader la photo");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("property-photos").getPublicUrl(path);
    setValue("photo_url", urlData.publicUrl, { shouldDirty: true });
    setUploading(false);
  };

  const submit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          {photoUrl ? <AvatarImage src={photoUrl} alt={name || "Animal"} className="object-cover" /> : null}
          <AvatarFallback>{(name || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} aria-label="Photo de l'animal" />
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            <span className="ml-2">{photoUrl ? "Changer la photo" : "Ajouter une photo"}</span>
          </Button>
          {!photoUrl && (
            <Badge variant="secondary" className="text-xs">Photo recommandée</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pet-name">Nom<span className="text-destructive">*</span></Label>
          <Input id="pet-name" {...register("name")} maxLength={30} aria-invalid={!!errors.name} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pet-species">Espèce<span className="text-destructive">*</span></Label>
          <Select value={species} onValueChange={(v) => setValue("species", v as any, { shouldDirty: true })}>
            <SelectTrigger id="pet-species" aria-label="Espèce"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SPECIES_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.species && <p className="text-xs text-destructive">{errors.species.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pet-breed">Race</Label>
          <Input id="pet-breed" {...register("breed")} maxLength={50} placeholder="Optionnel" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pet-age">Âge (années)</Label>
          <Input id="pet-age" type="number" min={0} max={60} {...register("age")} placeholder="Optionnel" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pet-character">Tempérament</Label>
        <Textarea id="pet-character" {...register("character")} maxLength={300} rows={2} placeholder="Doux, joueur, sociable…" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pet-special">Besoins spéciaux</Label>
        <Textarea id="pet-special" {...register("special_needs")} maxLength={500} rows={2} placeholder="Traitement, allergies, régime…" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>Annuler</Button>
        <Button type="submit" disabled={submitting || uploading}>
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default PetForm;
