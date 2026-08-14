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
import { compressGalleryFile } from "@/lib/compressImage";
import { trackEvent } from "@/lib/analytics";
import { useTranslation } from "react-i18next";
import { readFormDraft, writeFormDraft, clearFormDraft, getFormDraftSavedAt } from "@/lib/formDraft";
import { makePlainTextPasteHandler } from "@/lib/pastePlainText";
import DraftStatus, { type DraftState } from "@/components/shared/DraftStatus";

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
  /** Clé de brouillon local, pour ne pas perdre la saisie en quittant la page. */
  draftKey?: string;
  /** Prévient le parent qu'une saisie est en cours, pour protéger la fermeture. */
  onDirtyChange?: (dirty: boolean) => void;
}

const PetForm = ({ initialValues, onSubmit, onCancel, submitLabel = "Enregistrer", draftKey, onDirtyChange }: Props) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const baseValues = (): PetFormValues => ({
    name: initialValues?.name ?? "",
    species: (initialValues?.species as any) ?? "dog",
    breed: initialValues?.breed ?? "",
    age: initialValues?.age ?? null,
    character: initialValues?.character ?? "",
    special_needs: initialValues?.special_needs ?? "",
    photo_url: initialValues?.photo_url ?? null,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<PetFormValues>({
    resolver: zodResolver(petSchema),
    defaultValues: (() => {
      const stored = draftKey ? readFormDraft<PetFormValues>(draftKey) : null;
      return stored ? { ...baseValues(), ...stored } : baseValues();
    })(),
  });

  // Une saisie en cours ne doit jamais être écrasée par une nouvelle instance
  // d'`initialValues` (re-render du parent, rafraîchissement de la liste).
  // On compare donc le contenu, pas l'identité de l'objet, et on ne réinitialise
  // jamais après la première frappe.
  const dirtyRef = useRef(false);
  const initialSignature = JSON.stringify(initialValues ?? null);
  useEffect(() => {
    if (dirtyRef.current) return;
    if (draftKey && readFormDraft<PetFormValues>(draftKey)) {
      setDraftRestored(true);
      return;
    }
    reset(baseValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSignature, reset, draftKey]);

  const photoUrl = watch("photo_url");
  const species = watch("species");
  const name = watch("name");

  // Sauvegarde locale au fil de la frappe, aucune requête réseau.
  const [draftState, setDraftState] = useState<DraftState>(
    draftKey && readFormDraft<PetFormValues>(draftKey) ? "saved" : "idle",
  );
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(
    draftKey ? getFormDraftSavedAt(draftKey) : null,
  );
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const sub = watch((values) => {
      dirtyRef.current = true;
      onDirtyChange?.(true);
      if (!draftKey) return;
      setDraftState("saving");
      clearTimeout(timer);
      timer = setTimeout(() => {
        writeFormDraft(draftKey, values);
        setDraftSavedAt(Date.now());
        setDraftState("saved");
      }, 400);
    });
    return () => { clearTimeout(timer); sub.unsubscribe(); };
  }, [watch, draftKey, onDirtyChange]);




  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La photo ne doit pas dépasser 5 Mo");
      return;
    }
    setUploading(true);
    // Plafond d'ingestion (1600 px, repli dégradé 1024 px inclus).
    // Échec définitif = mesure + formulation unique, jamais de brut.
    const fail = () => {
      void trackEvent("pet_photo_upload_failed", {
        metadata: { ext: file.name.split(".").pop()?.toLowerCase() || "unknown", size_kb: Math.round(file.size / 1024) },
      });
      toast.error(t("upload.photo_failed"));
      setUploading(false);
    };
    let toUpload: File;
    try {
      toUpload = await compressGalleryFile(file);
    } catch {
      fail();
      return;
    }
    const ext = toUpload.name.split(".").pop() || "jpg";
    const path = `${user.id}/pets/${safeUUID()}.${ext}`;
    const { error } = await supabase.storage.from("property-photos").upload(path, toUpload, { upsert: true });
    if (error) {
      fail();
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
      if (draftKey) clearFormDraft(draftKey);
      dirtyRef.current = false;
      onDirtyChange?.(false);
      setDraftRestored(false);
      setDraftState("idle");
      setDraftSavedAt(null);
    } finally {
      setSubmitting(false);
    }
  });

  const handleCancel = () => {
    if (draftKey) clearFormDraft(draftKey);
    dirtyRef.current = false;
    onDirtyChange?.(false);
    setDraftRestored(false);
    setDraftState("idle");
    setDraftSavedAt(null);
    onCancel();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {draftRestored && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2" role="status">
          Nous avons retrouvé votre saisie en cours et l'avons restaurée. Pensez à enregistrer.
        </p>
      )}
      <DraftStatus state={draftState} savedAt={draftSavedAt} />


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
          <Input id="pet-name" {...register("name")} onPaste={makePlainTextPasteHandler(v => setValue("name", v, { shouldDirty: true }), { maxLength: 30 })} maxLength={30} aria-invalid={!!errors.name} />
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
          <Input id="pet-breed" {...register("breed")} onPaste={makePlainTextPasteHandler(v => setValue("breed", v, { shouldDirty: true }), { maxLength: 50 })} maxLength={50} placeholder="Optionnel" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pet-age">Âge (années)</Label>
          <Input id="pet-age" type="number" min={0} max={60} {...register("age")} placeholder="Optionnel" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pet-character">Tempérament</Label>
        <Textarea id="pet-character" {...register("character")} onPaste={makePlainTextPasteHandler(v => setValue("character", v, { shouldDirty: true }), { maxLength: 300 })} maxLength={300} rows={2} placeholder="Doux, joueur, sociable…" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pet-special">Besoins spéciaux</Label>
        <Textarea id="pet-special" {...register("special_needs")} onPaste={makePlainTextPasteHandler(v => setValue("special_needs", v, { shouldDirty: true }), { maxLength: 500 })} maxLength={500} rows={2} placeholder="Traitement, allergies, régime…" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={handleCancel} disabled={submitting}>Annuler</Button>
        <Button type="submit" disabled={submitting || uploading}>
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default PetForm;
