import { useState, useEffect, useCallback, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import CompetenceAutocomplete from "./CompetenceAutocomplete";
import {
  SKILL_CATEGORIES,
  deriveCategoriesFromCompetences,
  groupByCategory,
} from "@/lib/skills/categories";
import { CERTIFICATION_DOMAINS, MAX_CERTIFICATIONS } from "@/lib/certifications";
import { PRO_DECLARATION_OPTIONS, PRO_DECLARATION_NOTICE } from "@/lib/proDeclaration";

interface Props {
  skillCategories: string[]; // conservé pour compat, désormais dérivé auto
  availableForHelp: boolean;
  competences?: string[];
  /** Spécialité professionnelle déclarée ("" si aucune). */
  proSpecialty?: string;
  certifications?: string[];
  onChange: (partial: {
    skill_categories?: string[];
    available_for_help?: boolean;
    competences?: string[];
    pro_specialty?: string | null;
    certifications?: string[];
  }) => void;
}

/**
 * Mécanique 2026 : l'utilisateur ne déclare QUE des compétences spécifiques.
 * Les 4 catégories DB sont dérivées automatiquement à chaque modification,
 * ce qui supprime le bruit du « tout le monde coche tout » qui rendait le
 * filtre de recherche inutile.
 */
const StepSkills = ({
  availableForHelp,
  competences = [],
  proSpecialty = "",
  certifications = [],
  onChange,
}: Props) => {
  const [validatedLabels, setValidatedLabels] = useState<string[]>([]);
  const [isPro, setIsPro] = useState<boolean>(!!proSpecialty);
  const [openDomains, setOpenDomains] = useState<string[]>([]);

  useEffect(() => {
    if (proSpecialty) setIsPro(true);
  }, [proSpecialty]);

  const certCount = certifications.length;
  const certCapReached = certCount >= MAX_CERTIFICATIONS;

  const toggleCertification = useCallback(
    (value: string) => {
      const has = certifications.includes(value);
      if (!has && certifications.length >= MAX_CERTIFICATIONS) return;
      onChange({
        certifications: has
          ? certifications.filter((c) => c !== value)
          : [...certifications, value],
      });
    },
    [certifications, onChange],
  );

  const toggleDomain = useCallback((key: string) => {
    setOpenDomains((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  useEffect(() => {
    supabase
      .from("competences_validees")
      .select("label")
      .then(({ data }) => {
        setValidatedLabels((data || []).map((d: any) => d.label));
      });
  }, []);

  const pushUpdate = useCallback(
    (nextCompetences: string[]) => {
      const derived = deriveCategoriesFromCompetences(nextCompetences);
      const partial: {
        competences: string[];
        skill_categories: string[];
        available_for_help?: boolean;
      } = {
        competences: nextCompetences,
        skill_categories: derived,
      };
      // Auto-active la visibilité dans le feed d'entraide dès la 1ère compétence.
      if (nextCompetences.length > 0 && !availableForHelp) {
        partial.available_for_help = true;
      }
      onChange(partial);
    },
    [availableForHelp, onChange],
  );

  const handleAddCompetence = useCallback(
    (label: string) => {
      if (competences.includes(label)) return;
      pushUpdate([...competences, label]);
    },
    [competences, pushUpdate],
  );

  const handleRemoveCompetence = useCallback(
    (label: string) => {
      pushUpdate(competences.filter((c) => c !== label));
    },
    [competences, pushUpdate],
  );

  // Catégories dérivées affichées en lecture seule (preuve sociale visuelle).
  const grouped = useMemo(() => groupByCategory(competences), [competences]);
  const derivedKeys = useMemo(
    () => deriveCategoriesFromCompetences(competences),
    [competences],
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-heading font-semibold uppercase tracking-widest text-muted-foreground">
          Ce que vous savez faire
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Décrivez des compétences concrètes. Plus c'est précis, plus vous
          serez sollicité pour des coups de main qui vous correspondent.
        </p>
      </div>

      {/* Catégories couvertes, dérivées et affichées en lecture seule */}
      {derivedKeys.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Vous apparaissez dans
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SKILL_CATEGORIES.filter((c) => derivedKeys.includes(c.key)).map(
              (c) => (
                <span
                  key={c.key}
                  className="rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1"
                >
                  {c.label}
                  <span className="ml-1.5 opacity-60">
                    {grouped[c.key].length}
                  </span>
                </span>
              ),
            )}
          </div>
        </div>
      )}

      <CompetenceAutocomplete
        competences={competences}
        validatedLabels={validatedLabels}
        activeCategory={null}
        onAdd={handleAddCompetence}
        onRemove={handleRemoveCompetence}
      />

      <div className="flex items-center justify-between py-2 border-t border-border pt-4">
        <div className="flex-1 pr-4">
          <Label className="text-sm">Visible dans le feed d'entraide</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {availableForHelp
              ? "Vos compétences peuvent être proposées en échange."
              : "Vos compétences restent enregistrées mais masquées."}
          </p>
        </div>
        <Switch
          checked={availableForHelp}
          onCheckedChange={(v) => onChange({ available_for_help: v })}
        />
      </div>

      {/* Déclaration professionnelle : écrit pro_specialty, le statut est
          dérivé côté base par déclencheur, jamais écrit depuis ici. */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id="pro-declaration"
            checked={isPro}
            onCheckedChange={(v) => {
              const next = v === true;
              setIsPro(next);
              if (!next) onChange({ pro_specialty: null });
            }}
          />
          <div className="flex-1">
            <Label htmlFor="pro-declaration" className="text-sm">
              Je suis un professionnel de l'animalier
            </Label>
            <p className="text-xs text-muted-foreground mt-1">{PRO_DECLARATION_NOTICE}</p>
          </div>
        </div>

        {isPro && (
          <div className="space-y-1.5 sm:max-w-md">
            <Label className="text-sm">Spécialité</Label>
            <Select
              value={proSpecialty || undefined}
              onValueChange={(v) => onChange({ pro_specialty: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {PRO_DECLARATION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Formations et certifications déclarées, liste fermée, trois au plus. */}
      <div className="border-t border-border pt-4 space-y-3">
        <div>
          <h3 className="text-sm font-heading font-semibold uppercase tracking-widest text-muted-foreground">
            Formations et certifications
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Ce que vous cochez ici apparaît sur votre fiche publique, sous la mention
            « déclarées ». Vous pouvez en afficher trois au maximum.
          </p>
        </div>

        {certCapReached && (
          <p className="text-xs text-muted-foreground">
            Vous avez atteint le maximum de trois. Décochez-en une pour en choisir une autre.
          </p>
        )}

        <div className="space-y-2">
          {CERTIFICATION_DOMAINS.map((domain) => {
            const open = openDomains.includes(domain.key);
            const selectedHere = domain.options.filter((o) =>
              certifications.includes(o.value),
            ).length;
            return (
              <div key={domain.key} className="rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => toggleDomain(domain.key)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
                >
                  <span>
                    {domain.label}
                    {selectedHere > 0 && (
                      <span className="ml-2 text-xs text-primary">{selectedHere}</span>
                    )}
                  </span>
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
                    aria-hidden="true"
                  />
                </button>
                {open && (
                  <div className="space-y-2 border-t border-border px-4 py-3">
                    {domain.options.map((o) => {
                      const checked = certifications.includes(o.value);
                      const locked = !checked && certCapReached;
                      return (
                        <div key={o.value} className="flex items-start gap-3">
                          <Checkbox
                            id={`cert-${o.value}`}
                            checked={checked}
                            disabled={locked}
                            onCheckedChange={() => toggleCertification(o.value)}
                          />
                          <Label
                            htmlFor={`cert-${o.value}`}
                            className={cn(
                              "text-sm font-normal leading-snug",
                              locked && "text-muted-foreground",
                            )}
                          >
                            {o.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StepSkills;
