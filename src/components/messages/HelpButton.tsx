import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, PawPrint, Home, Phone, Zap, CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface HelpButtonProps {
  propertyId: string;
  ownerId: string;
  ownerName: string;
  sitId?: string;
  sitCity?: string;
}

const HelpButton = ({ propertyId, ownerId, ownerName, sitId, sitCity }: HelpButtonProps) => {
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState<any>(null);
  const [alerting, setAlerting] = useState(false);
  const [alerted, setAlerted] = useState(false);

  useEffect(() => {
    if (!open || !propertyId) return;
    supabase
      .from("house_guides")
      .select("vet_name, vet_phone, vet_address, emergency_contact_name, emergency_contact_phone, plumber_phone, electrician_phone")
      .eq("property_id", propertyId)
      .maybeSingle()
      .then(({ data }) => setGuide(data));
  }, [open, propertyId]);

  const handleAlertEmergencySitters = async () => {
    if (!sitId || !sitCity || alerting || alerted) return;
    setAlerting(true);
    try {
      const { data, error } = await supabase.functions.invoke("alert-emergency-sitters", {
        body: { sitId, sitCity },
      });
      if (error) throw error;
      const count = data?.alerted || 0;
      setAlerted(true);
      toast({
        title: count > 0
          ? `${count} gardien${count > 1 ? "s" : ""} d'urgence alerté${count > 1 ? "s" : ""} ⚡`
          : "Aucun gardien d'urgence disponible dans votre zone",
        description: count > 0
          ? "Ils recevront une notification et pourront vous contacter."
          : "Essayez la recherche manuelle pour élargir le périmètre.",
      });
    } catch {
      toast({ title: "Erreur", description: "Impossible d'alerter les gardiens.", variant: "destructive" });
    } finally {
      setAlerting(false);
    }
  };

  const options = [
    {
      icon: PawPrint,
      label: "Problème avec un animal",
      color: "text-amber-600",
      content: guide && (
        <div className="space-y-2 text-sm">
          {guide.vet_name && <p className="font-medium">🩺 Vétérinaire : {guide.vet_name}</p>}
          {guide.vet_phone && (
            <a href={`tel:${guide.vet_phone}`} className="flex items-center gap-2 text-primary hover:underline">
              <Phone className="h-3.5 w-3.5" /> {guide.vet_phone}
            </a>
          )}
          {guide.vet_address && <p className="text-muted-foreground">{guide.vet_address}</p>}
          {!guide.vet_name && !guide.vet_phone && (
            <p className="text-muted-foreground italic">Aucun vétérinaire renseigné dans le guide.</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            En cas d'urgence animale, appelez d'abord le vétérinaire puis contactez {ownerName}.
          </p>
        </div>
      ),
    },
    {
      icon: Home,
      label: "Problème avec le logement",
      color: "text-blue-600",
      content: guide && (
        <div className="space-y-2 text-sm">
          {guide.plumber_phone && (
            <div className="flex items-center gap-2">
              <span>🔧 Plombier :</span>
              <a href={`tel:${guide.plumber_phone}`} className="text-primary hover:underline">{guide.plumber_phone}</a>
            </div>
          )}
          {guide.electrician_phone && (
            <div className="flex items-center gap-2">
              <span>⚡ Électricien :</span>
              <a href={`tel:${guide.electrician_phone}`} className="text-primary hover:underline">{guide.electrician_phone}</a>
            </div>
          )}
          {guide.emergency_contact_name && (
            <div className="flex items-center gap-2">
              <span>📞 {guide.emergency_contact_name} :</span>
              {guide.emergency_contact_phone && (
                <a href={`tel:${guide.emergency_contact_phone}`} className="text-primary hover:underline">{guide.emergency_contact_phone}</a>
              )}
            </div>
          )}
          {!guide.plumber_phone && !guide.electrician_phone && !guide.emergency_contact_name && (
            <p className="text-muted-foreground italic">Aucun contact d'urgence renseigné.</p>
          )}
        </div>
      ),
    },
    {
      icon: AlertTriangle,
      label: "Urgence",
      color: "text-destructive",
      content: (
        <div className="space-y-2 text-sm">
          <p className="font-medium">Appelez immédiatement {ownerName}</p>
          {guide?.emergency_contact_phone && (
            <a href={`tel:${guide.emergency_contact_phone}`} className="flex items-center gap-2 text-destructive font-medium hover:underline">
              <Phone className="h-4 w-4" /> {guide.emergency_contact_phone}
            </a>
          )}
          <p className="text-xs text-muted-foreground">
            En cas d'urgence grave (incendie, accident), appelez d'abord les secours (15, 18 ou 112).
          </p>
        </div>
      ),
    },
    {
      icon: Zap,
      label: "Trouver un gardien d'urgence",
      color: "text-amber-600",
      content: (
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Besoin d'un remplaçant rapidement ? Les gardiens d'urgence sont des membres expérimentés mobilisables en quelques heures dans un rayon de 35 km.
          </p>

          {sitId && sitCity && (
            <Button
              size="sm"
              variant={alerted ? "outline" : "default"}
              className="gap-1.5 w-full"
              disabled={alerting || alerted}
              onClick={handleAlertEmergencySitters}
            >
              {alerting ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Envoi en cours…</>
              ) : alerted ? (
                <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Gardiens alertés ✓</>
              ) : (
                <><Zap className="h-3.5 w-3.5" /> Alerter les gardiens d'urgence à proximité</>
              )}
            </Button>
          )}

          <Link to="/search?emergency=true" onClick={() => setOpen(false)}>
            <Button size="sm" variant="outline" className="gap-1.5 w-full">
              <Zap className="h-3.5 w-3.5" /> Rechercher manuellement
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const [activeOption, setActiveOption] = useState<number | null>(null);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => { setOpen(true); setActiveOption(null); setAlerted(false); }}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Besoin d'aide
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Besoin d'aide ?</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i}>
                <button
                  onClick={() => setActiveOption(activeOption === i ? null : i)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    activeOption === i ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"
                  }`}
                >
                  <opt.icon className={`h-5 w-5 ${opt.color}`} />
                  <span className="font-medium text-sm">{opt.label}</span>
                </button>
                {activeOption === i && (
                  <div className="mt-2 ml-8 p-3 bg-accent/30 rounded-lg">
                    {opt.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HelpButton;
