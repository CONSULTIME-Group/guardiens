import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";
import PageMeta from "@/components/PageMeta";

const DiggingDogSvg = () => (
  <svg viewBox="0 0 320 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-64 h-auto mx-auto">
    {/* Ground line */}
    <path d="M20 210 Q80 208 160 210 Q240 212 300 210" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    {/* Dirt particles flying */}
    <circle cx="220" cy="140" r="3" fill="hsl(var(--primary))" opacity="0.3" />
    <circle cx="240" cy="125" r="2.5" fill="hsl(var(--primary))" opacity="0.25" />
    <circle cx="230" cy="155" r="2" fill="hsl(var(--primary))" opacity="0.35" />
    <circle cx="250" cy="148" r="3.5" fill="hsl(var(--primary))" opacity="0.2" />
    <circle cx="215" cy="160" r="2" fill="hsl(var(--primary))" opacity="0.3" />
    <circle cx="245" cy="135" r="1.5" fill="hsl(var(--primary))" opacity="0.4" />
    {/* Hole */}
    <ellipse cx="160" cy="212" rx="35" ry="8" fill="hsl(var(--muted-foreground))" opacity="0.15" />
    {/* Dog body - head down in hole */}
    <path d="M160 195 Q160 175 155 160 Q150 145 145 140" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    {/* Back */}
    <path d="M160 195 Q170 180 185 175 Q200 172 210 178" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    {/* Rear/butt up in air */}
    <path d="M210 178 Q218 170 220 160 Q222 150 218 145" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    {/* Tail wagging */}
    <path d="M218 145 Q225 130 240 125 Q250 122 255 128" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    {/* Back legs */}
    <path d="M205 180 Q200 195 195 210" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M215 175 Q218 190 220 210" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    {/* Front legs (going into hole) */}
    <path d="M155 160 Q148 175 145 195" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M145 140 Q135 155 130 175" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    {/* Ears */}
    <path d="M140 138 Q132 128 128 135" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M148 136 Q145 125 150 122" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* Paws */}
    <circle cx="195" cy="210" r="4" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" />
    <circle cx="220" cy="210" r="4" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" />
    {/* Small bone near hole */}
    <g transform="translate(100, 200) rotate(-20)">
      <line x1="0" y1="0" x2="20" y2="0" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <circle cx="0" cy="-2" r="2.5" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" opacity="0.4" />
      <circle cx="0" cy="2" r="2.5" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" opacity="0.4" />
      <circle cx="20" cy="-2" r="2.5" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" opacity="0.4" />
      <circle cx="20" cy="2" r="2.5" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" opacity="0.4" />
    </g>
  </svg>
);

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <PageMeta title="Page introuvable | Guardiens" description="La page que vous cherchez n'existe pas." />
      <div className="flex min-h-screen items-center justify-center px-4 bg-background">
        <div className="text-center max-w-lg space-y-6">
          <DiggingDogSvg />

          <div className="space-y-3">
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
              On dirait que ce chien a enterré la page.
            </h1>
            <p className="text-muted-foreground text-lg">
              La page que vous cherchez n'existe pas — mais la communauté Guardiens, si.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/"><Home className="h-4 w-4" /> Retour à l'accueil</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link to="/search"><Search className="h-4 w-4" /> Chercher une garde</Link>
            </Button>
          </div>

          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Liens utiles</p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <Link to="/" className="text-primary hover:underline">Accueil</Link>
              <Link to="/search" className="text-primary hover:underline">Recherche</Link>
              <Link to="/actualites" className="text-primary hover:underline">Actualités</Link>
              <Link to="/faq" className="text-primary hover:underline">FAQ</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
