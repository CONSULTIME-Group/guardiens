import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="flex items-center justify-between px-[5%] md:px-[8%] py-4">
        <Link to="/" className="font-heading text-xl md:text-2xl font-bold">
          <span className="text-primary">g</span>uardiens
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex gap-1 items-center">
          {NAV_LINKS.map((l) => (
            <Button
              key={l.to}
              variant="ghost"
              size="sm"
              onClick={() => navigate(l.to)}
              className={isActive(l.to) ? "text-primary font-semibold" : ""}
              aria-current={isActive(l.to) ? "page" : undefined}
            >
              {l.label}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
            Connexion
          </Button>
          <Button size="sm" onClick={() => navigate("/inscription")}>
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
              aria-current={isActive(l.to) ? "page" : undefined}
              className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                isActive(l.to)
                  ? "text-primary bg-primary/5 font-semibold"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-border">
            <Button className="w-full" size="sm" onClick={() => { setOpen(false); navigate("/inscription"); }}>
              S'inscrire — 0 € pour les propriétaires
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
