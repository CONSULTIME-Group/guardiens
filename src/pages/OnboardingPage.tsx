import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { compressImageFile } from "@/lib/compressImage";
import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";

const OnboardingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load existing profile data
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, avatar_url, postal_code, city, bio, onboarding_completed")
        .eq("id", user.id)
        .single();
      if (data) {
        if (data.onboarding_completed) {
          navigate("/dashboard", { replace: true });
          return;
        }
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

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Photo trop lourde", description: "5 Mo maximum.", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Format non supporté", description: "Choisissez une image.", variant: "destructive" });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const compressed = await compressImageFile(file, 5, 2048);
      const ext = compressed.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(urlData.publicUrl);
    } catch (err: any) {
      toast({ title: "Erreur d'upload", description: err.message || "Réessayez.", variant: "destructive" });
    } finally {
      setIsUploadingPhoto(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const canSubmit =
    firstName.trim().length > 0 &&
    avatarUrl !== null &&
    postalCode.length === 5 &&
    city.trim().length > 0 &&
    !isSubmitting &&
    !isUploadingPhoto;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc("complete_onboarding", {
        p_first_name: firstName.trim(),
        p_avatar_url: avatarUrl!,
        p_postal_code: postalCode.trim(),
        p_city: city.trim(),
        p_bio: bio.trim() || null,
      });
      if (error) throw error;
      toast({ title: "Profil complété !", description: "Bienvenue chez Guardiens." });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Réessayez.", variant: "destructive" });
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
            <label className="block text-sm font-medium mb-2">Votre prénom *</label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Marie"
              maxLength={50}
            />
          </div>

          {/* ── Champ 2 : Photo ── */}
          <div>
            <label className="block text-sm font-medium mb-2">Votre photo *</label>
            <p className="text-sm text-muted-foreground mb-3">
              Une photo authentique inspire confiance. Pas de selfie flou, pas de logo.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center gap-3">
              {isUploadingPhoto ? (
                <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Photo de profil"
                  className="w-32 h-32 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                  <Camera className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={isUploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarUrl ? "Modifier la photo" : "Choisir une photo"}
              </Button>
            </div>
          </div>

          {/* ── Champ 3 : Code postal / Ville ── */}
          <div>
            <label className="block text-sm font-medium mb-2">Votre localisation *</label>
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
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              placeholder="Lyonnaise, 30 ans, j'aime les chats et les longues balades. Disponible les week-ends."
              maxLength={200}
              rows={3}
            />
            <p className={`text-xs text-right mt-1 ${bio.length > 200 ? "text-destructive" : "text-muted-foreground"}`}>
              {bio.length}/200
            </p>
          </div>

          {/* ── Bouton final ── */}
          <div className="pt-6 sticky bottom-0 bg-background pb-4 md:static md:pb-0">
            <Button
              className="w-full"
              size="lg"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
