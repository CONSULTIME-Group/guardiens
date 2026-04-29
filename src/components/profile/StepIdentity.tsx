import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera } from "lucide-react";
import HintBubble from "./HintBubble";
import PostalCodeCityFields from "./PostalCodeCityFields";
import { cn } from "@/lib/utils";
import type { SitterProfileData } from "@/hooks/useSitterProfile";

interface Props {
  data: SitterProfileData;
  onChange: (partial: Partial<SitterProfileData>) => void;
  onUploadAvatar: (file: File) => Promise<string | null>;
}

const StepIdentity = ({ data, onChange, onUploadAvatar }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUploadAvatar(file);
    } finally {
      input.value = "";
      setUploading(false);
    }
  };

  const motivationLen = (data.motivation || "").length;

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
          {uploading ? "Envoi en cours..." : "Ajouter une photo de profil"}
        </span>
        <HintBubble>C'est la première chose que les propriétaires regardent.</HintBubble>
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
      <PostalCodeCityFields
        city={data.city}
        postalCode={data.postal_code}
        onChange={onChange}
      />

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
      <div className="space-y-1">
        <Label htmlFor="motivation" className="text-sm font-medium text-foreground">Votre motivation</Label>
        <p className="text-xs text-muted-foreground mb-2">
          C'est la première chose que les propriétaires lisent. Soyez concret : parlez de votre rapport aux animaux, d'une garde mémorable, de ce que vous aimez dans le house-sitting.
        </p>
        <Textarea
          id="motivation"
          value={data.motivation}
          onChange={e => onChange({ motivation: e.target.value })}
          placeholder="Ex : J'ai grandi avec des chiens et des chats. Depuis 3 ans je garde des maisons près de chez moi — ma meilleure garde était chez une famille avec deux golden retrievers. Je donne des nouvelles chaque soir avec photos."
          className="rounded-lg min-h-[150px]"
          maxLength={2000}
        />
        <p className={cn(
          "text-xs text-right",
          motivationLen < 50 && "text-destructive",
          motivationLen >= 50 && motivationLen <= 200 && "text-amber-600",
          motivationLen > 200 && "text-primary",
        )}>
          {motivationLen < 50
            ? `${motivationLen}/50 minimum`
            : motivationLen <= 200
              ? `${motivationLen} car. — Bien, mais un peu plus serait idéal`
              : `${motivationLen} caractères`}
        </p>
        {motivationLen > 0 && motivationLen < 50 && (
          <p className="text-xs text-destructive">
            Ce champ doit contenir au moins 50 caractères pour rassurer les proprios.
          </p>
        )}
      </div>
    </div>
  );
};

export default StepIdentity;
