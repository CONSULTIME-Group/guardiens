import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MapPin, Activity, Clock, Award, Moon, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MassEmailFilters, Segment } from "./filters.types";
import { SEGMENT_OPTIONS, countActiveFilters, DORMANT_PRESETS } from "./filters.types";

interface Props {
  segment: Segment;
  setSegment: (s: Segment) => void;
  filters: MassEmailFilters;
  setFilters: (f: MassEmailFilters) => void;
}

export const MassEmailFiltersPanel = ({ segment, setSegment, filters, setFilters }: Props) => {
  const update = (patch: Partial<MassEmailFilters>) => setFilters({ ...filters, ...patch });
  const activeCount = countActiveFilters(filters);

  const applyPreset = (preset: typeof DORMANT_PRESETS[number]) => {
    setSegment(preset.segment);
    setFilters(preset.filters);
  };

  return (
    <div className="space-y-4">
      {/* Présets rapides — Dormants */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Présets : réveiller les dormants
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {DORMANT_PRESETS.map((preset) => (
            <Button
              key={preset.key}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset)}
              className="h-auto py-1.5 px-3 flex flex-col items-start gap-0.5 text-left"
              title={preset.description}
            >
              <span className="text-xs font-medium">{preset.label}</span>
              <span className="text-[10px] text-muted-foreground font-normal leading-tight">
                {preset.description}
              </span>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Segment principal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Segment principal</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={segment}
            onValueChange={(v) => setSegment(v as Segment)}
            className="grid grid-cols-2 gap-2"
          >
            {SEGMENT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                htmlFor={`seg-${opt.value}`}
                className="flex items-start gap-2 p-3 rounded-lg border border-border cursor-pointer hover:bg-accent/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <RadioGroupItem value={opt.value} id={`seg-${opt.value}`} className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.description}</div>
                </div>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Filtres avancés repliables */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Filtres avancés</CardTitle>
            {activeCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {activeCount} actif{activeCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Accordion type="multiple" defaultValue={["geo"]} className="space-y-1">
            {/* ── GÉO ── */}
            <AccordionItem value="geo" className="border-b-0">
              <AccordionTrigger className="hover:no-underline py-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Géographie
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="postal" className="text-xs">Code postal / département</Label>
                  <Input
                    id="postal"
                    placeholder="Ex : 69 (Rhône) ou 75001 (Paris 1er)"
                    value={filters.postal_prefix || ""}
                    onChange={(e) => update({ postal_prefix: e.target.value.replace(/\D/g, "").slice(0, 5) || undefined })}
                    className="h-9"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Préfixe : 2 chiffres = département, 5 chiffres = code postal exact
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs">Ville</Label>
                  <Input
                    id="city"
                    placeholder="Ex : Lyon"
                    value={filters.city || ""}
                    onChange={(e) => update({ city: e.target.value || undefined })}
                    className="h-9"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ── ACTIVITÉ ── */}
            <AccordionItem value="activity" className="border-b-0">
              <AccordionTrigger className="hover:no-underline py-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  Activité
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <CheckboxRow
                  id="abonnes" label="Abonnés actifs uniquement"
                  checked={!!filters.abonnes_actifs}
                  onChange={(c) => update({ abonnes_actifs: c })}
                />
                <CheckboxRow
                  id="verified" label="Identité vérifiée uniquement"
                  checked={!!filters.id_verifiee}
                  onChange={(c) => update({ id_verifiee: c })}
                />
                <CheckboxRow
                  id="onboarding" label="Onboarding complété"
                  checked={!!filters.onboarding_complete}
                  onChange={(c) => update({ onboarding_complete: c })}
                />

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Complétion du profil ≥ {filters.profile_completion_min || 0}%</Label>
                  </div>
                  <Slider
                    value={[filters.profile_completion_min || 0]}
                    onValueChange={([v]) => update({ profile_completion_min: v || undefined })}
                    min={0} max={100} step={10}
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">
                      Complétion du profil ≤ {filters.profile_completion_max ?? 100}%
                      {filters.profile_completion_max !== undefined && filters.profile_completion_max < 100 && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">actif</span>
                      )}
                    </Label>
                    {filters.profile_completion_max !== undefined && filters.profile_completion_max < 100 && (
                      <button
                        type="button"
                        onClick={() => update({ profile_completion_max: undefined })}
                        className="text-[11px] text-muted-foreground hover:text-foreground underline"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>
                  <Slider
                    value={[filters.profile_completion_max ?? 100]}
                    onValueChange={([v]) => update({ profile_completion_max: v < 100 ? v : undefined })}
                    min={0} max={100} step={5}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Cibler les profils peu remplis (ex : ≤ 60% pour relancer ceux qui ont commencé sans finir)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">A déjà effectué une garde</Label>
                  <Select
                    value={filters.has_completed_sits || "any"}
                    onValueChange={(v) => update({ has_completed_sits: v as any })}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Peu importe</SelectItem>
                      <SelectItem value="yes">Oui — au moins 1 garde</SelectItem>
                      <SelectItem value="no">Non — jamais de garde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ── CYCLE DE VIE ── */}
            <AccordionItem value="lifecycle" className="border-b-0">
              <AccordionTrigger className="hover:no-underline py-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Ancienneté
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="depuis" className="text-xs">Inscrits depuis moins de … jours</Label>
                  <Input
                    id="depuis" type="number" min={1} max={365}
                    placeholder="Ex : 7 (nouveaux)"
                    value={filters.inscrits_depuis_jours || ""}
                    onChange={(e) => update({ inscrits_depuis_jours: e.target.value ? Number(e.target.value) : undefined })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="avant" className="text-xs">Inscrits depuis plus de … jours</Label>
                  <Input
                    id="avant" type="number" min={1} max={3650}
                    placeholder="Ex : 30 (anciens)"
                    value={filters.inscrits_avant_jours || ""}
                    onChange={(e) => update({ inscrits_avant_jours: e.target.value ? Number(e.target.value) : undefined })}
                    className="h-9"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ── RÉPUTATION ── */}
            <AccordionItem value="reputation" className="border-b-0">
              <AccordionTrigger className="hover:no-underline py-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  Réputation
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <CheckboxRow
                  id="founder" label="Fondateurs uniquement"
                  checked={!!filters.fondateur_only}
                  onChange={(c) => update({ fondateur_only: c })}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="min-sits" className="text-xs">Nombre de gardes terminées ≥</Label>
                  <Input
                    id="min-sits" type="number" min={1} max={100}
                    placeholder="Ex : 3 (gardiens expérimentés)"
                    value={filters.min_completed_sits || ""}
                    onChange={(e) => update({ min_completed_sits: e.target.value ? Number(e.target.value) : undefined })}
                    className="h-9"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ── DORMANTS / INACTIFS ── */}
            <AccordionItem value="dormants" className="border-b-0">
              <AccordionTrigger className="hover:no-underline py-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Moon className="h-4 w-4 text-muted-foreground" />
                  Dormants / inactifs
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="no-signin" className="text-xs">
                    Pas connectés depuis plus de … jours
                  </Label>
                  <Input
                    id="no-signin" type="number" min={1} max={365}
                    placeholder="Ex : 30 (inactifs 1 mois)"
                    value={filters.no_signin_since_days || ""}
                    onChange={(e) => update({ no_signin_since_days: e.target.value ? Number(e.target.value) : undefined })}
                    className="h-9"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Inclut ceux qui ne se sont jamais connectés
                  </p>
                </div>
                <CheckboxRow
                  id="no-app" label="Gardiens n'ayant jamais postulé"
                  checked={!!filters.no_application_ever}
                  onChange={(c) => update({ no_application_ever: c })}
                />
                <CheckboxRow
                  id="no-sit" label="Proprios n'ayant jamais publié d'annonce"
                  checked={!!filters.no_sit_published_ever}
                  onChange={(c) => update({ no_sit_published_ever: c })}
                />
                <CheckboxRow
                  id="no-conv" label="Aucune conversation initiée ou reçue"
                  checked={!!filters.no_conversation_ever}
                  onChange={(c) => update({ no_conversation_ever: c })}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="exclusions">
              <AccordionTrigger className="text-sm">Exclusions</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div>
                  <Label htmlFor="exclude-ids" className="text-xs">
                    Exclure des user IDs (un par ligne ou séparés par virgule)
                  </Label>
                  <textarea
                    id="exclude-ids"
                    className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                    placeholder="a39281eb-86ef-4d98-8733-082d243df3f5"
                    value={(filters.exclude_user_ids || []).join("\n")}
                    onChange={(e) => {
                      const ids = e.target.value
                        .split(/[\s,]+/)
                        .map((s) => s.trim())
                        .filter(Boolean);
                      update({ exclude_user_ids: ids.length ? ids : undefined });
                    }}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pratique pour exclure le propriétaire d'une annonce mise en avant.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

const CheckboxRow = ({ id, label, checked, onChange }: {
  id: string; label: string; checked: boolean; onChange: (c: boolean) => void;
}) => (
  <div className="flex items-center space-x-2">
    <Checkbox id={id} checked={checked} onCheckedChange={(c) => onChange(!!c)} />
    <Label htmlFor={id} className="text-sm cursor-pointer leading-tight">{label}</Label>
  </div>
);
