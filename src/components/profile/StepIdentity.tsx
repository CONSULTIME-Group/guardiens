import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera } from "lucide-react";
import HintBubble from "./HintBubble";
import PostalCodeCityFields from "./PostalCodeCityFields";
import type { SitterProfileData } from "@/hooks/useSitterProfile";

interface Props {
  data: SitterProfileData;
  onChange: (partial: Partial<SitterProfileData>) => void;
  onUploadAvatar: (file: File) => Promise<string | null>;
}

const StepIdentity = ({ data, onChange, onUploadAvatar }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { handlePostalCodeChange } = usePostalCodeCity(onChange);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await onUploadAvatar(file);
    if (url) onChange({ avatar_url: url });
    setUploading(false);
  };

  return (
    <div className="space-y-6">

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-28 h-28 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary transition-colors"
        >
          {data.avatar_url ? (
            <img src={data.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-8 h-8 text-muted-foreground" />
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        <span className="text-sm text-muted-foreground">
          {uploading ? "Envoi en cours..." : "Cliquez pour ajouter une photo"}
        </span>
        <HintBubble>Les gardiens avec une photo de profil reçoivent 3x plus de réponses.</HintBubble>
      </div>

      {/* Name fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">Prénom</Label>
          <Input id="first_name" value={data.first_name} onChange={e => onChange({ first_name: e.target.value })} className="rounded-lg h-12" maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Nom</Label>
          <Input id="last_name" value={data.last_name} onChange={e => onChange({ last_name: e.target.value })} className="rounded-lg h-12" maxLength={100} />
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">Ville</Label>
          <Input id="city" value={data.city} onChange={e => onChange({ city: e.target.value })} className="rounded-lg h-12" maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postal_code">Code postal</Label>
          <Input id="postal_code" value={data.postal_code} onChange={e => handlePostalCodeChange(e.target.value)} className="rounded-lg h-12" maxLength={10} />
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={data.bio}
          onChange={e => onChange({ bio: e.target.value })}
          placeholder="Parlez de vous, de votre parcours, de ce qui vous passionne..."
          className="rounded-lg min-h-[120px]"
          maxLength={2000}
        />
      </div>

      {/* Motivation */}
      <div className="space-y-2">
        <Label htmlFor="motivation">Pourquoi je veux garder</Label>
        <Textarea
          id="motivation"
          value={data.motivation}
          onChange={e => onChange({ motivation: e.target.value })}
          placeholder="Qu'est-ce qui vous attire dans le house-sitting ? Racontez votre motivation..."
          className="rounded-lg min-h-[120px]"
          maxLength={2000}
        />
        <HintBubble>C'est la première chose que les propriétaires liront. Une anecdote vaut mieux qu'une liste de compétences.</HintBubble>
      </div>
    </div>
  );
};

export default StepIdentity;
