import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import CompetenceAutocomplete from "@/components/profile/CompetenceAutocomplete";
import { SKILL_PILL_META } from "./constants";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  saved: boolean;
  saving: boolean;
  offerSkills: string[];
  toggleOfferSkill: (key: string) => void;
  offerCompetences: string[];
  validatedLabels: string[];
  onAddCompetence: (label: string) => void;
  onRemoveCompetence: (label: string) => void;
  offerText: string;
  setOfferText: (v: string) => void;
  onSave: () => void;
}

const OfferDialog = ({
  open, onOpenChange, saved, saving,
  offerSkills, toggleOfferSkill,
  offerCompetences, validatedLabels, onAddCompetence, onRemoveCompetence,
  offerText, setOfferText, onSave,
}: Props) => {
  const { t } = useTranslation();
  const tp = (k: string, opts?: any) => t(k, opts) as string;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">{tp("offer_dialog.title")}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {tp("offer_dialog.description")}
          </DialogDescription>
        </DialogHeader>

        {saved ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">{tp("offer_dialog.saved_title")}</p>
            <p className="text-xs text-muted-foreground">{tp("offer_dialog.saved_subtitle")}</p>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{tp("offer_dialog.skills_label")}</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(SKILL_PILL_META).map((key) => {
                  const selected = offerSkills.includes(key);
                  const labelKey = key === "competences" ? "skills" : key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleOfferSkill(key)}
                      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {tp(`mission_categories.${labelKey}`)}
                      {selected && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <CompetenceAutocomplete
              competences={offerCompetences}
              validatedLabels={validatedLabels}
              activeCategory={offerSkills.length === 1 ? offerSkills[0] : null}
              onAdd={onAddCompetence}
              onRemove={onRemoveCompetence}
            />

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{tp("offer_dialog.free_text_label")}</p>
              <Textarea
                value={offerText}
                onChange={(e) => setOfferText(e.target.value)}
                placeholder={tp("offer_dialog.free_text_placeholder")}
                rows={3}
                className="resize-none text-sm"
                maxLength={300}
              />
              <p className="text-xs text-muted-foreground text-right">{offerText.length}/300</p>
            </div>

            <Button onClick={onSave} disabled={offerSkills.length === 0 || saving} className="w-full min-h-[44px]">
              {saving ? tp("offer_dialog.saving") : tp("offer_dialog.submit")}
            </Button>
            {offerSkills.length === 0 && (
              <p className="text-xs text-destructive text-center">{tp("offer_dialog.select_one")}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OfferDialog;
