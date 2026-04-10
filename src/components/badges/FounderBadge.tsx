import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface FounderBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-5 w-auto object-contain',
  md: 'h-8 w-auto object-contain',
  lg: 'h-14 w-auto object-contain',
} as const;

const BADGE_URL = "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/badges/fondateur.png";

export default function FounderBadge({ size = 'md', className = '' }: FounderBadgeProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="relative group cursor-pointer" onClick={() => setOpen(true)}>
        <img
          src={BADGE_URL}
          alt="Badge Fondateur"
          className={`${sizeClasses[size]} ${className}`}
        />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          Membre Fondateur — inscrit avant le 13 mai 2026
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm text-center p-6 space-y-4">
          <img
            src={BADGE_URL}
            alt="Badge Fondateur"
            className="h-28 w-auto object-contain mx-auto"
          />
          <h3 className="font-heading font-bold text-lg">Membre Fondateur 🎉</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Merci d'avoir fait partie des premiers à rejoindre Guardiens&nbsp;!
            Votre confiance dès le début compte énormément pour nous.
            Ce badge restera affiché sur votre profil pour toujours.
          </p>
          <p className="text-xs text-muted-foreground/60 italic">
            Inscrit avant le 13 mai 2026
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
