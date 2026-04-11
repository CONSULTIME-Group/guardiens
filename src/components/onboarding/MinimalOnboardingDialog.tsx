import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";

interface Props {
  open: boolean;
  onComplete: () => void;
}

const MinimalOnboardingDialog = ({ open, onComplete }: Props) => {
  const [firstName, setFirstName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid =
    firstName.trim().length > 0 &&
    postalCode.length === 5 &&
    city.trim().length > 0;

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Session expirée");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        postal_code: postalCode,
        city: city.trim(),
        onboarding_minimal_completed: true,
      } as any)
      .eq("id", user.id);

    setIsSubmitting(false);

    if (error) {
      toast.error("Erreur", { description: "Veuillez réessayer." });
      return;
    }

    toast.success("Bienvenue chez Guardiens");
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        // Hide the close button via CSS since DialogContent renders it
        style={{}}
      >
        {/* Hide the default close X */}
        <style>{`.max-w-md > button[class*="absolute right"] { display: none !important; }`}</style>
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            Encore un instant
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Pour utiliser Guardiens, nous avons besoin de 2 informations. Cela
            prend 30 secondes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="onb-firstname">Votre prénom</Label>
            <Input
              id="onb-firstname"
              placeholder="Ex : Marie"
              autoFocus
              maxLength={50}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-lg h-12"
            />
          </div>

          <div>
            <PostalCodeCityFields
              city={city}
              postalCode={postalCode}
              onChange={(partial) => {
                if (partial.city !== undefined) setCity(partial.city);
                if (partial.postal_code !== undefined)
                  setPostalCode(partial.postal_code);
              }}
              cityLabel="Votre ville"
              postalLabel="Code postal"
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              inputClassName="rounded-lg h-12"
            />
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button
            className="w-full"
            disabled={!isValid || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Enregistrement…" : "C'est parti →"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MinimalOnboardingDialog;
