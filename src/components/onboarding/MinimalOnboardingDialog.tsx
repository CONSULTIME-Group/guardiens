import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
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
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
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

          <DialogFooter className="mt-6">
            <Button
              className="w-full"
              disabled={!isValid || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? "Enregistrement…" : "C'est parti →"}
            </Button>
          </DialogFooter>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default MinimalOnboardingDialog;
