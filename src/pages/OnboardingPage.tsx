import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";
import { format, differenceInYears } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const AVATAR_BUCKET = "avatars";

const OnboardingPage = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [animalExperience, setAnimalExperience] = useState("");

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, avatar_url, postal_code, city, bio, onboarding_completed, date_of_birth, animal_experience")
        .eq("id", user.id)
        .single();
      if (data) {
        setFirstName(data.first_name ?? "");
        setAvatarUrl(data.avatar_url ?? null);
        setPostalCode(data.postal_code ?? "");
        setCity(data.city ?? "");
        setBio(data.bio ?? "");
        if (data.date_of_birth) {
          setDateOfBirth(new Date(data.date_of_birth + "T00:00:00"));
        }
        setAnimalExperience(data.animal_experience ?? "");
      }
      setLoaded(true);
    })();
  }, [user, navigate]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format non supporté", {
        description: "Choisissez une photo au format JPG, PNG ou HEIC.",
      });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: "image/jpeg",
      });

      const path = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, compressedFile, { upsert: true, contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      setAvatarUrl(`${urlData.publicUrl}?t=${Date.now()}`);
    } catch (err: any) {
      toast.error("Erreur d'envoi", { description: "Veuillez réessayer." });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isAdult = dateOfBirth ? differenceInYears(new Date(), dateOfBirth) >= 18 : false;

  const canSubmit =
    firstName.trim().length > 0 &&
    avatarUrl !== null &&
    postalCode.length === 5 &&
    city.trim().length > 0 &&
    bio.length <= 200 &&
    dateOfBirth !== undefined &&
    isAdult &&
    animalExperience.trim().length >= 10 &&
    animalExperience.trim().length <= 300 &&
    !isSubmitting &&
    !isUploadingPhoto;

  const handleSubmit = async () => {
    if (!canSubmit || !dateOfBirth) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("complete_onboarding", {
        p_first_name: firstName.trim(),
        p_avatar_url: avatarUrl!,
        p_postal_code: postalCode.trim(),
        p_city: city.trim(),
        p_bio: bio.trim() || null,
        p_date_of_birth: format(dateOfBirth, "yyyy-MM-dd"),
        p_animal_experience: animalExperience.trim(),
      });
      if (error) {
        const msg = error.message || "";
        if (msg.includes("INVALID_FIRST_NAME")) {
          toast.error("Prénom requis");
        } else if (msg.includes("INVALID_AVATAR")) {
          toast.error("Photo de profil requise");
        } else if (msg.includes("INVALID_POSTAL_CODE")) {
          toast.error("Code postal requis");
        } else if (msg.includes("INVALID_CITY")) {
          toast.error("Ville requise — sélectionnez votre ville dans la liste");
        } else if (msg.includes("UNDERAGE_USER")) {
          toast.error("Vous devez avoir au moins 18 ans");
        } else if (msg.includes("INVALID_DATE_OF_BIRTH")) {
          toast.error("Date de naissance requise");
        } else if (msg.includes("INVALID_ANIMAL_EXPERIENCE")) {
          toast.error("Décrivez votre expérience avec les animaux (10 caractères minimum)");
        } else if (msg.includes("ANIMAL_EXPERIENCE_TOO_LONG")) {
          toast.error("Expérience trop longue (300 caractères maximum)");
        } else {
          toast.error("Erreur", { description: "Une erreur est survenue, veuillez réessayer." });
        }
        return;
      }
      await refreshProfile();
      toast.success("Profil complété", { description: "Bienvenue dans la communauté Guardiens." });
      navigate("/dashboard", { replace: true });
    } finally {
      setIsSubmitting(false);
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
        {/* Logo */}
        <h2 className="font-heading text-xl md:text-2xl font-bold text-center">
          <span className="text-primary">g</span>uardiens
        </h2>

        <h1 className="text-2xl font-semibold text-center mt-6 text-foreground">
          Bienvenue chez Guardiens
        </h1>
        <p className="text-center text-muted-foreground mt-2 mb-8">
          Avant de continuer, complétez ces quelques informations essentielles. Ça prend 2 minutes.
        </p>

        <div className="space-y-6">
          {/* ── Champ 1 : Prénom ── */}
          <div>
            <label className="block text-sm font-medium mb-2">Votre prénom</label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Marie"
              maxLength={50}
            />
          </div>

          {/* ── Champ 2 : Photo ── */}
          <div>
            <label className="block text-sm font-medium mb-2">Votre photo</label>
            <p className="text-sm text-muted-foreground mb-3">
              Une photo authentique inspire confiance. Pas de selfie flou, pas de logo.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center gap-3">
              {isUploadingPhoto ? (
                <>
                  <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Optimisation de votre photo...
                  </p>
                </>
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-32 h-32 rounded-full object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                  <Camera className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              {!isUploadingPhoto && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarUrl ? "Modifier la photo" : "Choisir une photo"}
                </Button>
              )}
            </div>
          </div>

          {/* ── Champ 3 : Date de naissance ── */}
          <div>
            <label className="block text-sm font-medium mb-2">Votre date de naissance</label>
            <p className="text-sm text-muted-foreground mb-3">
              Pour vérifier que vous avez au moins 18 ans. Non affichée publiquement.
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateOfBirth && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateOfBirth
                    ? format(dateOfBirth, "d MMMM yyyy", { locale: fr })
                    : "Sélectionnez votre date de naissance"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateOfBirth}
                  onSelect={setDateOfBirth}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1920-01-01")
                  }
                  defaultMonth={dateOfBirth || new Date(1990, 0)}
                  captionLayout="dropdown-buttons"
                  fromYear={1920}
                  toYear={new Date().getFullYear()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {dateOfBirth && !isAdult && (
              <p className="text-xs text-destructive mt-1">
                Vous devez avoir au moins 18 ans pour utiliser Guardiens.
              </p>
            )}
          </div>

          {/* ── Champ 4 : Code postal / Ville ── */}
          <div>
            <label className="block text-sm font-medium mb-2">Votre code postal</label>
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

          {/* ── Champ 5 : Expérience animaux ── */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Votre expérience avec les animaux
            </label>
            <p className="text-sm text-muted-foreground mb-3">
              Décrivez brièvement votre relation avec les animaux. Ça aide les autres membres à vous connaître.
            </p>
            <Textarea
              value={animalExperience}
              onChange={(e) => setAnimalExperience(e.target.value)}
              placeholder="J'ai eu des chats toute mon enfance et j'ai gardé le chien de ma sœur l'été dernier. J'adore les animaux !"
              rows={3}
            />
            <p className={cn(
              "text-xs text-right mt-1",
              animalExperience.trim().length > 0 && animalExperience.trim().length < 10
                ? "text-destructive"
                : animalExperience.length > 300
                  ? "text-destructive"
                  : "text-muted-foreground"
            )}>
              {animalExperience.length}/300
              {animalExperience.trim().length > 0 && animalExperience.trim().length < 10 && (
                <span> — 10 caractères minimum</span>
              )}
            </p>
          </div>

          {/* ── Champ 6 : Bio (optionnel) ── */}
          <div>
            <label className="block text-sm font-medium mb-2">
              En quelques mots, qui êtes-vous ?
            </label>
            <p className="text-sm text-muted-foreground mb-3">
              Optionnel, mais ça aide à inspirer confiance.
            </p>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Lyonnaise, 30 ans, disponible les week-ends."
              rows={3}
            />
            <p className={`text-xs text-right mt-1 ${bio.length > 200 ? "text-destructive" : "text-muted-foreground"}`}>
              {bio.length}/200
            </p>
          </div>

          {/* ── Bouton final ── */}
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
