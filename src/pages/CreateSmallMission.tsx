import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { Dog, Flower2, Home, Handshake, ChevronLeft, CalendarIcon } from "lucide-react";
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

const CreateSmallMission = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const tp = (k: string, opts?: any) => t(`create_mission_page.${k}`, opts) as string;
  const { level: accessLevel, profileCompletion, canApplyMissions, loading: accessLoading } = useAccessLevel();

  const CATEGORIES = useMemo(() => [
    { value: "animals", label: tp("cat_animals"), icon: Dog },
    { value: "garden", label: tp("cat_garden"), icon: Flower2 },
    { value: "house", label: tp("cat_house"), icon: Home },
    { value: "skills", label: tp("cat_skills"), icon: Handshake },
  ], [t]);

  const DURATIONS = useMemo(() => [
    { value: "1-2h", label: tp("dur_1_2h") },
    { value: "half_day", label: tp("dur_half_day") },
    { value: "several", label: tp("dur_several") },
    { value: "weekend", label: tp("dur_weekend") },
  ], [t]);

  const typeParam = searchParams.get("type");
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

  const applyTemplate = (tpl: MissionTemplate) => {
    setMissionType(tpl.type);
    setCategory(tpl.category);
    setTitle(tpl.title);
    setDescription(tpl.description);
    setExchangeOffer(tpl.exchange);
    setExchangeError("");
    setDuration(tpl.duration);
    setAppliedTemplateId(tpl.id);
  };

  const clearTemplate = () => {
    setAppliedTemplateId(null);
    setTitle("");
    setDescription("");
    setExchangeOffer("");
    setDuration("");
  };

  const visibleTemplates = templatesFor(missionType);

  useEffect(() => {
    const tParam = searchParams.get("type");
    if (tParam === "besoin" || tParam === "offre") setMissionType(tParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const templateId = searchParams.get("template");
    if (!templateId) return;
    if (title.trim() || description.trim()) return;
    const tpl = MISSION_TEMPLATES.find((x) => x.id === templateId);
    if (tpl) applyTemplate(tpl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExchangeChange = (val: string) => {
    setExchangeOffer(val);
    if (EURO_REGEX.test(val)) {
      setExchangeError(tp("exchange_error_euros"));
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
      toast({ title: tp("toast_required_title"), description: tp("toast_required_desc"), variant: "destructive" });
      return;
    }

    setSubmitting(true);

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
      toast({ title: tp("toast_error_title"), description: error.message, variant: "destructive" });
      return;
    }

    try { await trackFirstAction("mission_created", { category, mission_type: missionType }); } catch {}
    if (inserted?.id) { try { await recordMissionCreatedAttribution(inserted.id); } catch {} }
    await queryClient.invalidateQueries({ queryKey: ["small-missions-all"] });

    const insertedId = inserted?.id;
    if (!insertedId) {
      toast({ title: tp("toast_published_title"), description: tp("toast_published_desc"), duration: 3000 });
      navigate("/petites-missions");
      return;
    }

    toast({ title: tp("toast_published_title"), description: tp("toast_published_desc"), duration: 3000 });
    navigate(`/petites-missions/${insertedId}?published=1`);
  };

  return (
    <>
      <PageMeta
        title={missionType === "offre" ? tp("meta_title_offer") : tp("meta_title_need")}
        description={tp("meta_description")}
      />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 pb-40">
        <button
          onClick={() => navigate("/petites-missions")}
          className="flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground transition-colors -ml-2"
        >
          <ChevronLeft className="h-4 w-4" />
          {tp("back")}
        </button>
        {!accessLoading && !canApplyMissions && (
          <AccessGateBanner level={accessLevel} profileCompletion={profileCompletion} context="mission" />
        )}

        {(accessLoading || canApplyMissions) && <>
          <div className="rounded-xl p-5 border border-primary/20 bg-primary/5 space-y-2">
            <h2 className="font-heading font-bold text-foreground">
              {tp("encouragement_title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {missionType === "offre" ? tp("encouragement_offer") : tp("encouragement_need")}
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{tp("note_label")}</span> {tp("note_text")}
            </p>
            <p className="inline-block text-xs font-medium bg-badge-success text-badge-success-foreground px-3 py-1 rounded-full mt-1">
              {tp("free_badge")}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading">
                {missionType === "offre" ? tp("card_title_offer") : tp("card_title_need")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5 pb-32">
                <div className="space-y-2">
                  <Label>{tp("publishing_label")}</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant={missionType === "besoin" ? "default" : "outline"} size="sm" className="flex-1"
                      onClick={() => setMissionType("besoin")}>
                      {tp("type_need")}
                    </Button>
                    <Button type="button" variant={missionType === "offre" ? "default" : "outline"} size="sm" className="flex-1"
                      onClick={() => setMissionType("offre")}>
                      {tp("type_offer")}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {missionType === "offre" ? tp("templates_title_offer") : tp("templates_title_need")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tp("templates_subtitle")}
                      </p>
                    </div>
                    {appliedTemplateId && (
                      <button
                        type="button"
                        onClick={clearTemplate}
                        className="text-xs text-primary hover:underline whitespace-nowrap"
                      >
                        {tp("templates_reset")}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {visibleTemplates.map((tpl) => {
                      const isActive = appliedTemplateId === tpl.id;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => applyTemplate(tpl)}
                          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                            isActive
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:border-primary/40"
                          }`}
                        >
                          {tpl.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{tp("category_label")}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{tp("title_label")}</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={missionType === "offre" ? tp("title_ph_offer") : tp("title_ph_need")}
                    maxLength={120}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{missionType === "offre" ? tp("desc_label_offer") : tp("desc_label_need")}</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={missionType === "offre" ? tp("desc_ph_offer") : tp("desc_ph_need")}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{missionType === "offre" ? tp("exchange_label_offer") : tp("exchange_label_need")}</Label>
                  <Input
                    value={exchangeOffer}
                    onChange={(e) => handleExchangeChange(e.target.value)}
                    placeholder={missionType === "offre" ? tp("exchange_ph_offer") : tp("exchange_ph_need")}
                  />
                  {exchangeError && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                      {exchangeError}
                    </p>
                  )}
                </div>

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

                <div className="space-y-2">
                  <Label>{tp("date_label")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !dateNeeded && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateNeeded ? format(parseISO(dateNeeded), "EEEE d MMMM yyyy", { locale: fr }) : <span>{tp("date_placeholder")}</span>}
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
                          <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setDateNeeded("")}>{tp("date_clear")}</Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>{tp("duration_label")}</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger><SelectValue placeholder={tp("duration_placeholder")} /></SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{tp("photos_label")}</Label>
                  <MissionPhotoUpload userId={user!.id} photos={photos} onChange={setPhotos} />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={submitting || !!exchangeError}>
                  {submitting
                    ? tp("submit_publishing")
                    : missionType === "offre" ? tp("submit_offer") : tp("submit_need")}
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
