import { useState, useEffect, useRef, useCallback } from "react";
import { Check, Clock, X, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Suggestion {
  label: string;
  source: "validated" | "community" | "free";
}

interface CompetenceAutocompleteProps {
  competences: string[];
  validatedLabels: string[];
  activeCategory: string | null;
  onAdd: (label: string) => void;
  onRemove: (label: string) => void;
  maxItems?: number;
}

const FORBIDDEN_WORDS = [
  'sérieux', 'ponctuel', 'disponible', 'sympathique',
  'sympa', 'motivé', 'dynamique', 'bonne humeur',
  'amour des animaux', 'passion', 'gentil',
];

const CompetenceAutocomplete = ({
  competences,
  validatedLabels,
  activeCategory,
  onAdd,
  onRemove,
  maxItems = 10,
}: CompetenceAutocompleteProps) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [focused, setFocused] = useState(false);
  const [validationError, setValidationError] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const atLimit = competences.length >= maxItems;

  // Validate input
  const validateInput = (value: string): string => {
    const trimmed = value.trim();
    if (trimmed.length < 10) {
      return "Soyez plus précis : décrivez ce que vous savez faire concrètement (ex: Soins vétérinaires de base).";
    }
    if (!trimmed.includes(" ")) {
      return "Soyez plus précis : décrivez ce que vous savez faire concrètement (ex: Soins vétérinaires de base).";
    }
    const lower = trimmed.toLowerCase();
    for (const word of FORBIDDEN_WORDS) {
      if (lower.includes(word)) {
        return "Cette compétence est trop générale. Décrivez une action concrète que vous savez faire.";
      }
    }
    return "";
  };

  // Clear validation error when query changes and becomes valid
  useEffect(() => {
    if (query.trim().length > 0) {
      const error = validateInput(query);
      if (!error && validationError) {
        setValidationError("");
      }
    } else {
      setValidationError("");
    }
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch top suggestions on focus (no query)
  const fetchTopSuggestions = useCallback(async () => {
    let q = supabase
      .from("competences_validees")
      .select("label")
      .order("usage_count", { ascending: false })
      .limit(5);

    if (activeCategory) {
      q = q.eq("categorie", activeCategory === "competences" ? "competences_savoirs" : activeCategory);
    }

    const { data } = await q;
    const results: Suggestion[] = (data || [])
      .filter((d: any) => !competences.includes(d.label))
      .map((d: any) => ({ label: d.label, source: "validated" as const }));

    setSuggestions(results);
    setShowDropdown(results.length > 0);
  }, [activeCategory, competences]);

  // Search suggestions with debounce
  const searchSuggestions = useCallback(async (search: string) => {
    if (search.trim().length < 2) {
      fetchTopSuggestions();
      return;
    }

    const [validatedRes, communityRes] = await Promise.all([
      supabase
        .from("competences_validees")
        .select("label")
        .ilike("label", `%${search}%`)
        .order("usage_count", { ascending: false })
        .limit(5),
      supabase
        .from("sitter_profiles")
        .select("competences")
        .not("competences", "eq", "{}")
        .limit(50),
    ]);

    const validated: Suggestion[] = (validatedRes.data || [])
      .filter((d: any) => !competences.includes(d.label))
      .map((d: any) => ({ label: d.label, source: "validated" as const }));

    const communityLabels = new Set<string>();
    (communityRes.data || []).forEach((p: any) => {
      (p.competences || []).forEach((c: string) => {
        if (c.toLowerCase().includes(search.toLowerCase()) && !competences.includes(c)) {
          communityLabels.add(c);
        }
      });
    });
    const validatedSet = new Set(validated.map(v => v.label));
    const community: Suggestion[] = Array.from(communityLabels)
      .filter(l => !validatedSet.has(l))
      .slice(0, 3)
      .map(l => ({ label: l, source: "community" as const }));

    const results = [...validated, ...community];

    if (results.length === 0 && search.trim().length >= 3) {
      results.push({ label: search.trim(), source: "free" });
    }

    setSuggestions(results);
    setShowDropdown(true);
  }, [competences, fetchTopSuggestions]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchSuggestions(value), 300);
  };

  const handleFocus = () => {
    setFocused(true);
    if (query.trim().length < 2) {
      fetchTopSuggestions();
    } else {
      searchSuggestions(query);
    }
  };

  const tryAdd = (label: string) => {
    if (competences.length >= maxItems) return;
    // Validated/community suggestions bypass length/word checks
    const isFromDb = validatedLabels.includes(label);
    if (!isFromDb) {
      const error = validateInput(label);
      if (error) {
        setValidationError(error);
        return;
      }
    }
    setValidationError("");
    onAdd(label);
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
  };

  const handleSelect = (suggestion: Suggestion) => {
    if (competences.length >= maxItems) return;
    if (suggestion.source === "free") {
      tryAdd(suggestion.label);
    } else {
      // Validated/community: skip front validation
      setValidationError("");
      onAdd(suggestion.label);
      setQuery("");
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const isValidated = (label: string) => validatedLabels.includes(label);

  return (
    <div className="space-y-3">
      {/* Pedagogical banner */}
      <div className="bg-muted/40 border border-border rounded-xl p-4 text-sm text-foreground/70 space-y-2">
        <p className="font-medium text-foreground/90">
          Qu'est-ce qu'une bonne compétence ?
        </p>
        <p>
          Une compétence utile répond à la question :
          "Qu'est-ce que vous savez faire concrètement ?"
        </p>
        <div className="flex gap-4 mt-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary mb-1">Exemples valides</p>
            <ul className="text-xs space-y-0.5 text-foreground/70">
              <li>Soins vétérinaires de base</li>
              <li>Tonte et entretien jardin</li>
              <li>Dressage canin</li>
              <li>Cuisine végétarienne</li>
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-destructive mb-1">Non acceptés</p>
            <ul className="text-xs space-y-0.5 text-foreground/70">
              <li>Amour des animaux</li>
              <li>Sérieux et ponctuel</li>
              <li>Bonne humeur</li>
              <li>Disponible</li>
            </ul>
          </div>
        </div>
      </div>

      {atLimit ? (
        <p className="text-sm text-muted-foreground">
          Vous avez atteint la limite de 10 compétences.
        </p>
      ) : (
        <>
          <div>
            <p className="text-sm text-muted-foreground mt-2">
              Une compétence plus précise ?
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Jusqu'à {maxItems} compétences. Les compétences validées apparaissent immédiatement.
            </p>
          </div>

          {/* Input with autocomplete */}
          <div ref={wrapperRef} className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={e => handleInputChange(e.target.value)}
                  onFocus={handleFocus}
                  placeholder="Ex : Soins chats, cuisine végétarienne, promenade chiens en montagne..."
                  maxLength={40}
                  className="pl-9"
                  onKeyDown={e => {
                    if (e.key === "Enter" && query.trim().length >= 3 && competences.length < maxItems) {
                      e.preventDefault();
                      if (suggestions.length > 0) {
                        handleSelect(suggestions[0]);
                      } else {
                        tryAdd(query.trim());
                      }
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (suggestions.length > 0) {
                    handleSelect(suggestions[0]);
                  } else if (query.trim().length >= 3) {
                    tryAdd(query.trim());
                  }
                }}
                disabled={query.trim().length < 3 || competences.length >= maxItems}
                className="shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </div>

            {/* Validation error */}
            {validationError && (
              <p className="text-sm text-destructive mt-1">{validationError}</p>
            )}

            {/* Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-md z-10 max-h-48 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.label}-${i}`}
                    type="button"
                    onClick={() => handleSelect(s)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer text-sm w-full text-left transition-colors"
                  >
                    <span className="flex-1 truncate">
                      {s.source === "free" ? (
                        <span className="text-muted-foreground italic">Ajouter « {s.label} »</span>
                      ) : (
                        s.label
                      )}
                    </span>
                    {s.source === "validated" && (
                      <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs shrink-0">
                        ✓ Validée
                      </span>
                    )}
                    {s.source === "community" && (
                      <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs shrink-0">
                        Utilisée
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Counter */}
      <p className={`text-xs text-right ${atLimit ? "text-destructive" : "text-muted-foreground"}`}>
        {competences.length}/{maxItems} compétences
      </p>

      {/* Pills */}
      {competences.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {competences.map(label => {
            const validated = isValidated(label);
            return (
              <span
                key={label}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                  validated
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {validated ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {label}
                {!validated && <span className="text-xs">· en validation</span>}
                <button
                  type="button"
                  onClick={() => onRemove(label)}
                  className="ml-1 hover:text-destructive transition-colors"
                  aria-label={`Supprimer ${label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground italic mt-2">
        Les compétences validées apparaissent immédiatement sur votre profil.
      </p>
    </div>
  );
};

export default CompetenceAutocomplete;
