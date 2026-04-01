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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

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

    // Extract unique competences from sitter profiles matching query
    const communityLabels = new Set<string>();
    (communityRes.data || []).forEach((p: any) => {
      (p.competences || []).forEach((c: string) => {
        if (c.toLowerCase().includes(search.toLowerCase()) && !competences.includes(c)) {
          communityLabels.add(c);
        }
      });
    });
    // Remove duplicates with validated
    const validatedSet = new Set(validated.map(v => v.label));
    const community: Suggestion[] = Array.from(communityLabels)
      .filter(l => !validatedSet.has(l))
      .slice(0, 3)
      .map(l => ({ label: l, source: "community" as const }));

    const results = [...validated, ...community];

    // If no match, offer free text
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

  const handleSelect = (suggestion: Suggestion) => {
    if (competences.length >= maxItems) return;
    onAdd(suggestion.label);
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
  };

  const isValidated = (label: string) => validatedLabels.includes(label);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm text-muted-foreground mt-6">
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
                  // If there's a top suggestion, use it
                  if (suggestions.length > 0) {
                    handleSelect(suggestions[0]);
                  } else {
                    onAdd(query.trim());
                    setQuery("");
                    setShowDropdown(false);
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
                onAdd(query.trim());
                setQuery("");
                setShowDropdown(false);
              }
            }}
            disabled={query.trim().length < 3 || competences.length >= maxItems}
            className="shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </div>

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
