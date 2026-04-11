import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Camera, User } from "lucide-react";
import { toast } from "sonner";
import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";
import { compressImageFile } from "@/lib/compressImage";

const OnboardingPage = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [animalExperience, setAnimalExperience] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, postal_code, city, avatar_url, bio, date_of_birth, animal_experience")
        .eq("id", user.id)
        .single();
      if (data) {
        setFirstName(data.first_name ?? "");
        setPostalCode(data.postal_code ?? "");
        setCity(data.city ?? "");
        setAvatarUrl(data.avatar_url ?? "");
        setBio(data.bio ?? "");
        setDateOfBirth(data.date_of_birth ?? "");
        setAnimalExperience(data.animal_experience ?? "");
      }
      setLoaded(true);
    })();
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const compressed = await compressImageFile(file);
      const ext = compressed.name.split(".").pop() || "webp";
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const url = `${urlData.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(url);
    } catch {
      toast.error("Erreur photo", {
        description: "Impossible de télécharger la photo. Réessayez.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const canSubmit =
    firstName.trim().length > 0 &&
    city.trim().length > 0 &&
    postalCode.length === 5 &&
    avatarUrl.length > 0 &&
    dateOfBirth.length > 0 &&
    animalExperience.trim().length >= 10 &&
    !isSubmitting &&
    !isUploading;

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const { data, error } = await supabase.rpc("complete_onboarding", {
      p_first_name: firstName.trim(),
      p_avatar_url: avatarUrl,
      p_postal_code: postalCode,
      p_city: city.trim(),
      p_bio: bio.trim() || null,
      p_date_of_birth: dateOfBirth,
      p_animal_experience: animalExperience.trim(),
    });

    setIsSubmitting(false);

    if (error) {
      const msg = error.message;
      if (msg.includes("INVALID_FIRST_NAME")) {
        toast.error("Prénom requis", { description: "Veuillez renseigner votre prénom." });
      } else if (msg.includes("INVALID_AVATAR")) {
        toast.error("Photo requise", { description: "Ajoutez une photo de profil." });
      } else if (msg.includes("INVALID_POSTAL_CODE")) {
        toast.error("Code postal requis", { description: "Veuillez renseigner votre code postal." });
      } else if (msg.includes("INVALID_CITY")) {
        toast.error("Ville requise", { description: "Sélectionnez votre ville dans la liste." });
      } else if (msg.includes("INVALID_DATE_OF_BIRTH")) {
        toast.error("Date de naissance requise", { description: "Veuillez renseigner votre date de naissance." });
      } else if (msg.includes("UNDERAGE_USER")) {
        toast.error("Âge minimum", { description: "Vous devez avoir au moins 18 ans." });
      } else if (msg.includes("INVALID_ANIMAL_EXPERIENCE")) {
        toast.error("Expérience trop courte", { description: "Décrivez votre expérience en au moins 10 caractères." });
      } else if (msg.includes("ANIMAL_EXPERIENCE_TOO_LONG")) {
        toast.error("Expérience trop longue", { description: "300 caractères maximum." });
      } else {
        toast.error("Erreur", { description: "Une erreur est survenue. Veuillez réessayer." });
      }
      return;
    }

    if (data === true) {
      await refreshProfile();
      toast.success("C'est parti", { description: "Bienvenue dans la communauté Guardiens." });
      navigate("/dashboard", { replace: true });
    }
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-xl">
        <h2 className="font-heading text-xl md:text-2xl font-bold text-center">
          <span className="text-primary">g</span>uardiens
        </h2>

        <h1 className="text-2xl font-semibold text-center mt-6 text-foreground">
          Bienvenue chez Guardiens
        </h1>
        <p className="text-center text-muted-foreground mt-2 mb-8">
          Quelques informations pour démarrer. 2 minutes.
        </p>

        <div className="space-y-6">
          {/* Photo de profil */}
          <div className="flex flex-col items-center gap-3">
            <label className="block text-sm font-medium">Votre photo de profil *</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group"
              disabled={isUploading}
            >
              <Avatar className="h-24 w-24 border-2 border-border group-hover:border-primary transition-colors">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Photo de profil" />
                ) : (
                  <AvatarFallback className="bg-muted">
                    <User className="h-10 w-10 text-muted-foreground" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <p className="text-xs text-muted-foreground">
              Indispensable pour inspirer confiance
            </p>
          </div>

          {/* Prénom */}
          <div>
            <label className="block text-sm font-medium mb-2">Votre prénom *</label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Marie"
              maxLength={50}
            />
          </div>

          {/* Date de naissance */}
          <div>
            <label className="block text-sm font-medium mb-2">Date de naissance *</label>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Vous devez avoir au moins 18 ans
            </p>
          </div>

          {/* Code postal / Ville */}
          <div>
            <label className="block text-sm font-medium mb-2">Votre code postal *</label>
            <p className="text-sm text-muted-foreground mb-3">
              Pour vous proposer des annonces près de chez vous.
            </p>
            <PostalCodeCityFields
              city={city}
              postalCode={postalCode}
              onChange={(partial) => {
                if (partial.city !== undefined) setCity(partial.city);
                if (partial.postal_code !== undefined) setPostalCode(partial.postal_code);
              }}
              required
            />
          </div>

          {/* Expérience animaux */}
          <div>
            <label className="block text-sm font-medium mb-2">Votre expérience avec les animaux *</label>
            <Textarea
              value={animalExperience}
              onChange={(e) => setAnimalExperience(e.target.value)}
              placeholder="J'ai grandi avec des chiens et des chats. Je promène régulièrement le labrador de ma voisine..."
              maxLength={300}
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {animalExperience.length}/300 — minimum 10 caractères
            </p>
          </div>

          {/* Bio (optionnelle) */}
          <div>
            <label className="block text-sm font-medium mb-2">Quelques mots sur vous</label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Parlez de vous, de votre mode de vie, de ce qui vous motive..."
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Submit */}
          <div className="pt-6 sticky bottom-0 bg-background pb-4 border-t border-border md:static md:pb-0 md:border-t-0">
            <Button
              className="w-full"
              size="lg"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Validation...
                </>
              ) : (
                "C'est parti"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
