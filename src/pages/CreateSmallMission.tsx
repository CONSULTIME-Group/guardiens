import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dog, Flower2, Home, Handshake, Heart, ChevronLeft, Lock, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import PageMeta from "@/components/PageMeta";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import MissionPhotoUpload from "@/components/missions/MissionPhotoUpload";
import { geocodeCity } from "@/lib/geocode";
import { trackFirstAction } from "@/lib/analytics";
import { recordMissionCreatedAttribution } from "@/lib/campaignAttribution";
import { templatesFor, MISSION_TEMPLATES, type MissionTemplate } from "@/data/missionTemplates";

const EURO_REGEX = /\d+\s*[€]|[€]\s*\d+|\d+\s*euro/i;

const CATEGORIES = [
 { value: "animals", label: "Animaux", icon: Dog },
 { value: "garden", label: "Jardin", icon: Flower2 },
 { value: "house", label: "Maison", icon: Home },
 { value: "skills", label: "Échange de compétences", icon: Handshake },
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
 const [searchParams] = useSearchParams();
 const { toast } = useToast();
 const queryClient = useQueryClient();
 const { level: accessLevel, profileCompletion, canApplyMissions, loading: accessLoading } = useAccessLevel();

 const typeParam = searchParams.get("type"); // "besoin" or "offre"
 const [missionType, setMissionType] = useState<"besoin" | "offre">(typeParam === "offre" ? "offre" : "besoin");
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
 const [photos, setPhotos] = useState<string[]>([]);
 const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null);

 const applyTemplate = (t: MissionTemplate) => {
 setMissionType(t.type);
 setCategory(t.category);
 setTitle(t.title);
 setDescription(t.description);
 setExchangeOffer(t.exchange);
 setExchangeError("");
 setDuration(t.duration);
 setAppliedTemplateId(t.id);
 };

 const clearTemplate = () => {
 setAppliedTemplateId(null);
 setTitle("");
 setDescription("");
 setExchangeOffer("");
 setDuration("");
 };

 const visibleTemplates = templatesFor(missionType);

 // Effet ?type=, synchronise le type de mission depuis l'URL.
 // (Doit s'exécuter AVANT l'effet ?template= pour qu'un éventuel template applique la dernière source de vérité.)
 useEffect(() => {
   const t = searchParams.get("type");
   if (t === "besoin" || t === "offre") setMissionType(t);
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 // Effet ?template=, pré-applique un modèle si le formulaire est vierge.
 // Garde-fou : ne JAMAIS écraser une saisie en cours (titre ou description non vides).
 useEffect(() => {
   const templateId = searchParams.get("template");
   if (!templateId) return;
   if (title.trim() || description.trim()) return;
   const tpl = MISSION_TEMPLATES.find((t) => t.id === templateId);
   if (tpl) applyTemplate(tpl);
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const handleExchangeChange = (val: string) => {
 setExchangeOffer(val);
 if (EURO_REGEX.test(val)) {
 setExchangeError("Ici on s'échange des coups de main et des bons repas, pas des euros.");
 } else {
 setExchangeError("");
 }
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!user) return;
 if (EURO_REGEX.test(exchangeOffer)) return;
 if (submitting) return;
 if (!title.trim() || !description.trim() || !exchangeOffer.trim() || !city.trim() || !duration) {
 toast({ title: "Champs requis", description: "Remplissez tous les champs obligatoires.", variant: "destructive" });
 return;
 }

 setSubmitting(true);

 // Pre-geocode (best effort) so the list filters by distance immediately
 let coords: { lat: number; lng: number } | null = null;
 try {
 coords = await geocodeCity(city.trim());
 } catch {
 coords = null;
 }

 const { data: inserted, error } = await supabase.from("small_missions").insert({
 user_id: user.id,
 title: title.trim(),
 description: description.trim(),
 category: category as any,
 mission_type: missionType,
 exchange_offer: exchangeOffer.trim(),
 city: city.trim(),
 postal_code: postalCode.trim(),
 date_needed: dateNeeded || null,
 duration_estimate: duration,
 photos,
 latitude: coords?.lat ?? null,
 longitude: coords?.lng ?? null,
 } as any).select("id").maybeSingle();

 setSubmitting(false);
 if (error) {
 toast({ title: "Erreur", description: error.message, variant: "destructive" });
 return;
 }

 try { await trackFirstAction("mission_created", { category, mission_type: missionType }); } catch {}
 if (inserted?.id) { try { await recordMissionCreatedAttribution(inserted.id); } catch {} }
 await queryClient.invalidateQueries({ queryKey: ["small-missions-all"] });

 const insertedId = inserted?.id;
 if (!insertedId) {
 // Fallback : re-select bloqué (RLS) ou réponse vide. Publication OK, pas de bandeau.
 toast({ title: "Mission publiée.", description: "On vous emmène la voir.", duration: 3000 });
 navigate("/petites-missions");
 return;
 }

 toast({ title: "Mission publiée.", description: "On vous emmène la voir.", duration: 3000 });
 navigate(`/petites-missions/${insertedId}?published=1`);
 };

 return (
 <>
 <PageMeta
 title={missionType === "offre" ? "J'ai du temps à offrir | Guardiens" : "J'ose demander un coup de main | Guardiens"}
 description="Publiez une demande ou une offre d'entraide. Coups de main entre gens du coin, sans argent qui circule."
 />

 <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 pb-40">
 <button
 onClick={() => navigate("/petites-missions")}
 className="flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground transition-colors -ml-2"
 >
 <ChevronLeft className="h-4 w-4" />
 Retour
 </button>
 {/* Access gate */}
 {!accessLoading && !canApplyMissions && (
 <AccessGateBanner level={accessLevel} profileCompletion={profileCompletion} context="mission" />
 )}

 {(accessLoading || canApplyMissions) && <>
 {/* Encouragement OSER */}
 <div className="rounded-xl p-5 border border-primary/20 bg-primary/5 space-y-2">
 <h2 className="font-heading font-bold text-foreground">
 Vous hésitez ? C'est normal. Personne ne vous jugera.
 </h2>
 <p className="text-sm text-muted-foreground">
 {missionType === "offre"
 ? "Décrivez ce que vous savez faire, même modestement. Quelqu'un du coin a peut-être besoin exactement de ça."
 : "Décrivez votre besoin, même petit. Vous ne dérangez personne, vous offrez une occasion de rendre service."}
 </p>
 <p className="text-xs text-muted-foreground">
 <span className="font-medium text-foreground">À noter :</span> les petites missions sont des coups de main ponctuels, sans nuitée chez la personne.
 </p>
 <p className="inline-block text-xs font-medium bg-badge-success text-badge-success-foreground px-3 py-1 rounded-full mt-1">
 Gratuit, pour tout le monde.
 </p>
 </div>

 <Card>
 <CardHeader>
 <CardTitle className="font-heading">
 {missionType === "offre" ? "J'ai du temps à offrir" : "J'ose demander"}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <form onSubmit={handleSubmit} className="space-y-5 pb-32">
 {/* Type toggle */}
 <div className="space-y-2">
 <Label>Vous publiez… *</Label>
 <div className="flex gap-2">
 <Button type="button" variant={missionType === "besoin" ? "default" : "outline"} size="sm" className="flex-1"
 onClick={() => setMissionType("besoin")}>
 Une demande
 </Button>
 <Button type="button" variant={missionType === "offre" ? "default" : "outline"} size="sm" className="flex-1"
 onClick={() => setMissionType("offre")}>
 Une offre d'aide
 </Button>
 </div>
 </div>

 {/* Modèles tout prêts, lèvent la friction de la page blanche */}
 <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
 <div className="flex items-center justify-between gap-2">
 <div>
 <p className="text-sm font-semibold text-foreground">
 {missionType === "offre" ? "Inspirez-vous d'un exemple" : "Pas sûr·e quoi écrire ?"}
 </p>
 <p className="text-xs text-muted-foreground">
 Cliquez un modèle pour pré-remplir le formulaire, vous pourrez tout ajuster ensuite.
 </p>
 </div>
 {appliedTemplateId && (
 <button
 type="button"
 onClick={clearTemplate}
 className="text-xs text-primary hover:underline whitespace-nowrap"
 >
 Repartir de zéro
 </button>
 )}
 </div>
 <div className="flex flex-wrap gap-2">
 {visibleTemplates.map((t) => {
 const isActive = appliedTemplateId === t.id;
 return (
 <button
 key={t.id}
 type="button"
 onClick={() => applyTemplate(t)}
 className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
 isActive
 ? "bg-primary text-primary-foreground border-primary"
 : "bg-background text-foreground border-border hover:border-primary/40"
 }`}
 >
 {t.label}
 </button>
 );
 })}
 </div>
 </div>
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
 placeholder={
 missionType === "offre"
 ? "Ex : Je peux promener un chien le week-end"
 : "Ex : Promener mon chien 3 fois cette semaine"
 }
 maxLength={120}
 />
 </div>

 {/* Description */}
 <div className="space-y-2">
 <Label>{missionType === "offre" ? "Ce que vous proposez *" : "Description *"}</Label>
 <Textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder={
 missionType === "offre"
 ? "Décrivez ce que vous savez faire. Soyez concret : quand êtes-vous dispo, à quelle fréquence, ce qu'il faut savoir."
 : "Décrivez ce dont vous avez besoin. Soyez précis : quand, combien de temps, ce qu'il faut savoir."
 }
 rows={4}
 />
 </div>

 {/* Échange */}
 <div className="space-y-2">
 <Label>{missionType === "offre" ? "Ce que vous aimeriez en échange *" : "En échange *"}</Label>
 <Input
 value={exchangeOffer}
 onChange={(e) => handleExchangeChange(e.target.value)}
 placeholder={
 missionType === "offre"
 ? "Ex : Un bon repas partagé, des légumes, ou « à voir ensemble »"
 : "Ex : Un bon repas, des légumes du jardin, un panier de fruits..."
 }
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
 <Popover>
 <PopoverTrigger asChild>
 <Button
 type="button"
 variant="outline"
 className={cn("w-full justify-start text-left font-normal", !dateNeeded && "text-muted-foreground")}
 >
 <CalendarIcon className="mr-2 h-4 w-4" />
 {dateNeeded ? format(parseISO(dateNeeded), "EEEE d MMMM yyyy", { locale: fr }) : <span>Choisir une date</span>}
 </Button>
 </PopoverTrigger>
 <PopoverContent className="w-auto p-0" align="start">
 <Calendar
 mode="single"
 locale={fr}
 selected={dateNeeded ? parseISO(dateNeeded) : undefined}
 onSelect={(d) => setDateNeeded(d ? format(d, "yyyy-MM-dd") : "")}
 disabled={(d) => d < startOfDay(new Date())}
 initialFocus
 className={cn("p-3 pointer-events-auto")}
 />
 {dateNeeded && (
 <div className="border-t border-border p-2">
 <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setDateNeeded("")}>Effacer</Button>
 </div>
 )}
 </PopoverContent>
 </Popover>
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

 {/* Photos */}
 <div className="space-y-2">
 <Label>Photos (optionnel)</Label>
 <MissionPhotoUpload userId={user!.id} photos={photos} onChange={setPhotos} />
 </div>

 <Button type="submit" className="w-full" size="lg" disabled={submitting || !!exchangeError}>
 {submitting
 ? "Publication..."
 : missionType === "offre" ? "J'ai du temps à offrir" : "J'ose, je publie"}
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
