import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Entraide", to: "/petites-missions" },
  { label: "Guides locaux", to: "/guides" },
  { label: "Tarifs", to: "/tarifs" },
  { label: "FAQ", to: "/faq" },
  { label: "Articles", to: "/actualites" },
];

export default function PublicHeader() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="flex items-center justify-between px-[5%] md:px-[8%] py-4">
        <Link to="/" className="font-heading text-xl md:text-2xl font-bold">
          <span className="text-primary">g</span>uardiens
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex gap-1 items-center">
          {NAV_LINKS.map((l) => (
            <Button key={l.to} variant="ghost" size="sm" onClick={() => navigate(l.to)}>
              {l.label}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
            Connexion
          </Button>
          <Button size="sm" onClick={() => navigate("/register")}>
            S'inscrire
          </Button>
        </nav>

        {/* Mobile: auth + burger */}
        <div className="flex sm:hidden items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
            Connexion
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav className="sm:hidden border-t border-border bg-background px-[5%] py-4 space-y-1 animate-in slide-in-from-top-2 duration-200">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="block py-2.5 px-3 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-border">
            <Button className="w-full" size="sm" onClick={() => { setOpen(false); navigate("/register"); }}>
              S'inscrire gratuitement
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
