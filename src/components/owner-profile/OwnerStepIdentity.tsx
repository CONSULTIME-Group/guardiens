import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera } from "lucide-react";
import HintBubble from "../profile/HintBubble";
import AiSuggestButton from "../profile/AiSuggestButton";
import PostalCodeCityFields from "../profile/PostalCodeCityFields";
import type { OwnerProfileData } from "@/hooks/useOwnerProfile";

interface Props {
  data: OwnerProfileData;
  onChange: (partial: Partial<OwnerProfileData>) => void;
  onUploadPhoto: (file: File, bucket: string) => Promise<string | null>;
}

const OwnerStepIdentity = ({ data, onChange, onUploadPhoto }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { handlePostalCodeChange } = usePostalCodeCity(onChange);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await onUploadPhoto(file, "avatars");
    if (url) onChange({ avatar_url: url });
    setUploading(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold">Identité & vérification</h2>

      <div className="flex flex-col items-center gap-3">
        <button type="button" onClick={() => fileRef.current?.click()}
          className="w-28 h-28 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden hover:border-primary transition-colors">
          {data.avatar_url ? <img src={data.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <Camera className="w-8 h-8 text-muted-foreground" />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
        <span className="text-sm text-muted-foreground">{uploading ? "Envoi..." : "Cliquez pour ajouter une photo"}</span>
        <HintBubble>Les propriétaires avec une photo inspirent davantage confiance aux gardiens.</HintBubble>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="o_first">Prénom</Label>
          <Input id="o_first" value={data.first_name} onChange={e => onChange({ first_name: e.target.value })} className="rounded-lg h-12" maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="o_last">Nom</Label>
          <Input id="o_last" value={data.last_name} onChange={e => onChange({ last_name: e.target.value })} className="rounded-lg h-12" maxLength={100} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="o_city">Ville</Label>
          <Input id="o_city" value={data.city} onChange={e => onChange({ city: e.target.value })} className="rounded-lg h-12" maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="o_postal">Code postal</Label>
          <Input id="o_postal" value={data.postal_code} onChange={e => handlePostalCodeChange(e.target.value)} className="rounded-lg h-12" maxLength={10} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="o_bio">Bio</Label>
          <AiSuggestButton field="bio" currentValue={data.bio} context={{ first_name: data.first_name, city: data.city }} onSuggestion={text => onChange({ bio: text })} />
        </div>
        <Textarea id="o_bio" value={data.bio} onChange={e => onChange({ bio: e.target.value })}
          placeholder="Parlez de vous, de votre famille, de ce qui fait votre quotidien..."
          className="rounded-lg min-h-[120px]" maxLength={2000} />
        <HintBubble>Racontez votre quotidien : les gardiens veulent savoir dans quel univers ils vont s'installer.</HintBubble>
      </div>
    </div>
  );
};

export default OwnerStepIdentity;
