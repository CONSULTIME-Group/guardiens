import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dog, Flower2, Home, Handshake, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PageMeta from "@/components/PageMeta";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import { Lock } from "lucide-react";

const EURO_REGEX = /\d+\s*[€]|[€]\s*\d+|\d+\s*euro/i;

const CATEGORIES = [
  { value: "animals", label: "🐕 Animaux", icon: Dog },
  { value: "garden", label: "🌱 Jardin", icon: Flower2 },
  { value: "house", label: "🏠 Maison", icon: Home },
  { value: "skills", label: "🤝 Échange de compétences", icon: Handshake },
];

const DURATIONS = [
  { value: "1-2h", label: "1-2 heures" },
  { value: "half_day", label: "Une demi-journée" },
  { value: "several", label: "Plusieurs passages" },
  { value: "weekend", label: "Un week-end" },
];

const CreateSmallMission = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { level: accessLevel, profileCompletion, canApplyMissions, loading: accessLoading } = useAccessLevel();

  const [category, setCategory] = useState("animals");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [exchangeOffer, setExchangeOffer] = useState("");
  const [exchangeError, setExchangeError] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [dateNeeded, setDateNeeded] = useState("");
  const [duration, setDuration] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleExchangeChange = (val: string) => {
    setExchangeOffer(val);
    if (EURO_REGEX.test(val)) {
      setExchangeError("Ici on s'échange des coups de main et des bons repas, pas des euros 😊");
    } else {
      setExchangeError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (EURO_REGEX.test(exchangeOffer)) return;
    if (!title.trim() || !description.trim() || !exchangeOffer.trim() || !city.trim() || !duration) {
      toast({ title: "Champs requis", description: "Remplissez tous les champs obligatoires.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("small_missions").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      category: category as any,
      exchange_offer: exchangeOffer.trim(),
      city: city.trim(),
      postal_code: postalCode.trim(),
      date_needed: dateNeeded || null,
      duration_estimate: duration,
    });

    setSubmitting(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Mission publiée !", description: "Votre petite mission est en ligne." });
      navigate("/petites-missions");
    }
  };

  return (
    <>
      <PageMeta title="Poster une petite mission | Guardiens" description="Proposez une mission d'entraide à la communauté Guardiens." />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Access gate */}
        {!accessLoading && !canApplyMissions && (
          <AccessGateBanner level={accessLevel} profileCompletion={profileCompletion} context="mission" />
        )}

        {(subLoading || hasAccess) && <>
        {/* Encart pédagogique */}
        <div
          className="rounded-xl p-5 border space-y-2"
          style={{ backgroundColor: "hsl(45 30% 96%)", borderColor: "hsl(40 20% 85%)" }}
        >
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            <h2 className="font-heading font-bold text-foreground">L'entraide, c'est l'esprit Guardiens</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Les petites missions, c'est l'entraide entre voisins. Pas de l'argent, pas du travail — du lien.
            Vous proposez un coup de main, l'autre vous offre un bon repas, des légumes du jardin, ou simplement sa gratitude.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Proposer une petite mission</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Catégorie */}
              <div className="space-y-2">
                <Label>Catégorie *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Titre */}
              <div className="space-y-2">
                <Label>Titre *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Promener mon chien 3 fois cette semaine"
                  maxLength={120}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez ce dont vous avez besoin. Soyez précis : quand, combien de temps, ce qu'il faut savoir."
                  rows={4}
                />
              </div>

              {/* Échange */}
              <div className="space-y-2">
                <Label>En échange *</Label>
                <Input
                  value={exchangeOffer}
                  onChange={(e) => handleExchangeChange(e.target.value)}
                  placeholder="Ex : Un bon repas, des légumes du jardin, un panier de fruits..."
                />
                {exchangeError && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                    {exchangeError}
                  </p>
                )}
              </div>

              {/* Ville + CP */}
              <PostalCodeCityFields
                city={city}
                postalCode={postalCode}
                onChange={(partial) => {
                  if (partial.city !== undefined) setCity(partial.city);
                  if (partial.postal_code !== undefined) setPostalCode(partial.postal_code);
                }}
                required
                inputClassName=""
              />

              {/* Date */}
              <div className="space-y-2">
                <Label>Date (optionnel)</Label>
                <Input type="date" value={dateNeeded} onChange={(e) => setDateNeeded(e.target.value)} />
              </div>

              {/* Durée */}
              <div className="space-y-2">
                <Label>Durée estimée *</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={submitting || !!exchangeError}>
                {submitting ? "Publication..." : "Publier la mission"}
              </Button>
            </form>
          </CardContent>
        </Card>
        </>}
      </div>
    </>
  );
};

export default CreateSmallMission;
