import React from "react";
import { Link } from "react-router-dom";

const PublicFooter = React.forwardRef<HTMLElement>((_props, ref) => {
  return (
    <footer ref={ref} className="bg-foreground border-t border-white/10">
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div>
            <h4 className="font-body text-xs uppercase tracking-widest text-white/30 mb-4">House-sitting par ville</h4>
            <ul className="space-y-2">
              <li><Link to="/house-sitting/lyon" className="font-body text-sm text-white/50 hover:text-white transition-colors">House-sitting Lyon</Link></li>
              <li><Link to="/house-sitting/annecy" className="font-body text-sm text-white/50 hover:text-white transition-colors">House-sitting Annecy</Link></li>
              <li><Link to="/house-sitting/grenoble" className="font-body text-sm text-white/50 hover:text-white transition-colors">House-sitting Grenoble</Link></li>
              <li><Link to="/house-sitting/chambery" className="font-body text-sm text-white/50 hover:text-white transition-colors">House-sitting Chambéry</Link></li>
              <li><Link to="/house-sitting/caluire-et-cuire" className="font-body text-sm text-white/50 hover:text-white transition-colors">House-sitting Caluire</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-body text-xs uppercase tracking-widest text-white/30 mb-4">House-sitting AURA</h4>
            <ul className="space-y-2">
              <li><Link to="/actualites/house-sitting-aura-guide-complet" className="font-body text-sm text-white/50 hover:text-white transition-colors">House-sitting en AURA</Link></li>
              <li><Link to="/actualites/parcs-chiens-lyon-guide-complet" className="font-body text-sm text-white/50 hover:text-white transition-colors">Parcs chiens Lyon</Link></li>
              <li><Link to="/actualites/parcs-balades-chiens-annecy-guide" className="font-body text-sm text-white/50 hover:text-white transition-colors">Parcs chiens Annecy</Link></li>
              <li><Link to="/actualites/parcs-balades-chiens-grenoble-guide" className="font-body text-sm text-white/50 hover:text-white transition-colors">Parcs chiens Grenoble</Link></li>
              <li><Link to="/actualites/gardes-longue-duree-guide" className="font-body text-sm text-white/50 hover:text-white transition-colors">Gardes longue durée</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-body text-xs uppercase tracking-widest text-white/30 mb-4">Ressources</h4>
            <ul className="space-y-2">
              <li><Link to="/actualites" className="font-body text-sm text-white/50 hover:text-white transition-colors">Articles</Link></li>
              <li><Link to="/guides" className="font-body text-sm text-white/50 hover:text-white transition-colors">Guides locaux</Link></li>
              <li><Link to="/faq" className="font-body text-sm text-white/50 hover:text-white transition-colors">FAQ</Link></li>
              <li><Link to="/tarifs" className="font-body text-sm text-white/50 hover:text-white transition-colors">Tarifs</Link></li>
              <li><Link to="/actualites/nouveaux-tarifs-2026" className="font-body text-sm text-white/50 hover:text-white transition-colors">Tarifs 2026 en détail</Link></li>
              <li><Link to="/actualites/c-est-quoi-le-house-sitting" className="font-body text-sm text-white/50 hover:text-white transition-colors">C'est quoi le house-sitting</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-body text-xs uppercase tracking-widest text-white/30 mb-4">Guardiens</h4>
            <ul className="space-y-2">
              <li><Link to="/a-propos" className="font-body text-sm text-white/50 hover:text-white transition-colors">À propos</Link></li>
              <li><Link to="/contact" className="font-body text-sm text-white/50 hover:text-white transition-colors">Contact</Link></li>
              <li><Link to="/register" className="font-body text-sm text-white/50 hover:text-white transition-colors">Inscription</Link></li>
              <li><Link to="/petites-missions" className="font-body text-sm text-white/50 hover:text-white transition-colors">Petites missions</Link></li>
              <li><Link to="/gardien-urgence" className="font-body text-sm text-white/50 hover:text-white transition-colors">Gardien d'urgence</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10">
          <div>
            <h3 className="font-heading text-lg font-semibold text-white/90">
              <span className="text-primary">g</span>uardiens
            </h3>
            <p className="font-body text-sm text-white/40">
              House-sitting de proximité en AURA
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-white/40 font-body">
            <span className="text-xs text-white/40 font-body">Guardiens · Version bêta · 2026</span>
            <span className="text-white/20">·</span>
            <Link to="/cgu" className="hover:text-white transition-colors">CGU</Link>
            <span className="text-white/20">·</span>
            <Link to="/confidentialite" className="hover:text-white transition-colors">Politique de confidentialité</Link>
            <span className="text-white/20">·</span>
            <Link to="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link>
            <span className="text-white/20">·</span>
            <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
});
PublicFooter.displayName = "PublicFooter";

export default PublicFooter;
