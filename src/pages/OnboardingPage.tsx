import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";

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

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, avatar_url, postal_code, city, bio, onboarding_completed")
        .eq("id", user.id)
        .single();
      if (data) {
        setFirstName(data.first_name ?? "");
        setAvatarUrl(data.avatar_url ?? null);
        setPostalCode(data.postal_code ?? "");
        setCity(data.city ?? "");
        setBio(data.bio ?? "");
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

      const path = `${user.id}.jpg`;
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

  const canSubmit =
    firstName.trim().length > 0 &&
    avatarUrl !== null &&
    postalCode.length === 5 &&
    city.trim().length > 0 &&
    bio.length <= 200 &&
    !isSubmitting &&
    !isUploadingPhoto;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("complete_onboarding", {
        p_first_name: firstName.trim(),
        p_avatar_url: avatarUrl!,
        p_postal_code: postalCode.trim(),
        p_city: city.trim(),
        p_bio: bio.trim() || null,
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
          Avant de continuer, complétez ces quelques informations essentielles. Ça prend 90 secondes.
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

          {/* ── Champ 3 : Code postal / Ville ── */}
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

          {/* ── Champ 4 : Bio ── */}
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
              placeholder="Lyonnaise, 30 ans, j'aime les chats et les longues balades. Disponible les week-ends."
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
