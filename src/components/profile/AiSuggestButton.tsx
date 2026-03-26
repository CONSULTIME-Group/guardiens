import { useState } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AiSuggestButtonProps {
  field: string;
  currentValue: string;
  context?: Record<string, any>;
  onSuggestion: (text: string) => void;
}

const AiSuggestButton = ({ field, currentValue, context, onSuggestion }: AiSuggestButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const hasValue = currentValue.trim().length > 0;

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-profile-text", {
        body: { field, context },
      });

      if (error) throw error;
      if (data?.text) {
        onSuggestion(data.text);
      } else if (data?.error) {
        toast({ variant: "destructive", title: "Erreur", description: data.error });
      }
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de générer une suggestion." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={generate}
      disabled={loading}
      className="gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/5 h-7 px-2"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : hasValue ? (
        <RefreshCw className="h-3 w-3" />
      ) : (
        <Sparkles className="h-3 w-3" />
      )}
      {loading ? "Génération..." : hasValue ? "Re-suggérer" : "Suggérer avec l'IA"}
    </Button>
  );
};

export default AiSuggestButton;
