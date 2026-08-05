import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useInAppShell } from "./AppShellContext";
import { useAuth } from "@/contexts/AuthContext";

const PublicFooter = React.forwardRef<HTMLElement>((_props, ref) => {
  const { t } = useTranslation();
  // Garde alignée sur PublicHeader : le pied de page public n'est retiré que
  // pour un utilisateur porteur d'une session dans la coquille applicative.
  // Un visiteur non connecté le conserve partout, Prerender.io compris.
  const inAppShell = useInAppShell();
  const { hasSession } = useAuth();
  if (hasSession && inAppShell) return null;
  return (
    <footer ref={ref} className="public-footer bg-footer border-t border-white/10">
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 mb-12">
          <div>
            <h3 className="font-body text-xs uppercase tracking-widest text-white/80 mb-4">{t("footer.sections.by_city")}</h3>
            <ul className="space-y-2">
              <li><Link to="/house-sitting" className="font-body text-sm text-white/75 hover:text-white transition-colors">Toutes les villes couvertes</Link></li>
              <li><Link to="/house-sitting/lyon" className="font-body text-sm text-white/75 hover:text-white transition-colors">House-sitting Lyon</Link></li>
              <li><Link to="/house-sitting/annecy" className="font-body text-sm text-white/75 hover:text-white transition-colors">House-sitting Annecy</Link></li>
              <li><Link to="/house-sitting/grenoble" className="font-body text-sm text-white/75 hover:text-white transition-colors">House-sitting Grenoble</Link></li>
              <li><Link to="/house-sitting/chambery" className="font-body text-sm text-white/75 hover:text-white transition-colors">House-sitting Chambéry</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-body text-xs uppercase tracking-widest text-white/80 mb-4">{t("footer.sections.by_department")}</h3>
            <ul className="space-y-2">
              <li><Link to="/departement" className="font-body text-sm text-white/75 hover:text-white transition-colors">Les 101 départements</Link></li>
              <li><Link to="/departement/rhone" className="font-body text-sm text-white/75 hover:text-white transition-colors">Rhône (69)</Link></li>
              <li><Link to="/departement/haute-savoie" className="font-body text-sm text-white/75 hover:text-white transition-colors">Haute-Savoie (74)</Link></li>
              <li><Link to="/departement/gironde" className="font-body text-sm text-white/75 hover:text-white transition-colors">Gironde (33)</Link></li>
              <li><Link to="/departement/herault" className="font-body text-sm text-white/75 hover:text-white transition-colors">Hérault (34)</Link></li>
              <li><Link to="/departement/loire-atlantique" className="font-body text-sm text-white/75 hover:text-white transition-colors">Loire-Atlantique (44)</Link></li>
              <li><Link to="/departement/bouches-du-rhone" className="font-body text-sm text-white/75 hover:text-white transition-colors">Bouches-du-Rhône (13)</Link></li>
              <li><Link to="/departement/paris" className="font-body text-sm text-white/75 hover:text-white transition-colors">Paris (75)</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-body text-xs uppercase tracking-widest text-white/80 mb-4">{t("footer.sections.local_guides")}</h3>
            <ul className="space-y-2">
              <li><Link to="/guides" className="font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.all_guides")}</Link></li>
              <li><Link to="/guides/lyon" className="font-body text-sm text-white/75 hover:text-white transition-colors">Guide Lyon</Link></li>
              <li><Link to="/guides/annecy" className="font-body text-sm text-white/75 hover:text-white transition-colors">Guide Annecy</Link></li>
              <li><Link to="/guides/grenoble" className="font-body text-sm text-white/75 hover:text-white transition-colors">Guide Grenoble</Link></li>
              <li><Link to="/guides/chambery" className="font-body text-sm text-white/75 hover:text-white transition-colors">Guide Chambéry</Link></li>
              <li><Link to="/guides/aix-les-bains" className="font-body text-sm text-white/75 hover:text-white transition-colors">Guide Aix-les-Bains</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-body text-xs uppercase tracking-widest text-white/80 mb-4">{t("footer.sections.resources")}</h3>
            <ul className="space-y-2">
              <li><Link to="/actualites" className="font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.articles")}</Link></li>
              <li><Link to="/actualites/house-sitting-aura-guide-complet" className="font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.house_sitting_guide")}</Link></li>
              <li><Link to="/faq" className="font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.faq")}</Link></li>
              <li><Link to="/tarifs" className="font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.pricing")}</Link></li>
              <li><Link to="/observatoire-garde-animaux" className="font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.observatory")}</Link></li>
              <li><Link to="/actualites/c-est-quoi-le-house-sitting" className="font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.what_is_house_sitting")}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-body text-xs uppercase tracking-widest text-white/80 mb-4">{t("footer.sections.guardiens")}</h3>
            <ul className="space-y-2">
              <li><Link to="/a-propos" className="font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.about")}</Link></li>
              <li><Link to="/contact" className="font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.contact")}</Link></li>
              <li><Link to="/inscription" className="font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.register")}</Link></li>
              <li><Link to="/devenir-home-sitter" className="font-body text-sm text-white/75 hover:text-white transition-colors">Devenir home-sitter</Link></li>
              <li><Link to="/petites-missions" className="font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.small_missions")}</Link></li>

              <li><Link to="/gardien-urgence" className="font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.emergency_sitter")}</Link></li>
              <li><Link to="/pros" className="font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.pet_pros")} <span className="ml-1 text-[9px] uppercase tracking-wider font-bold bg-amber-200/90 text-amber-900 px-1.5 py-0.5 rounded">{t("nav.beta")}</span></Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10">
          <div>
            <h3 className="font-heading text-lg font-semibold text-white/90">
              <Link to="/" aria-label="Guardiens, accueil" className="hover:opacity-80 transition-opacity">
                <span className="text-primary">g</span>uardiens
              </Link>
            </h3>
            <p className="font-body text-sm text-white/70">
              {t("footer.tagline")}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-white/75 font-body">
            <span className="text-xs text-white/80 font-body">{t("footer.version", { year: new Date().getFullYear() })}</span>
            <span aria-hidden="true" className="text-white/40">·</span>
            <Link to="/cgu" className="hover:text-white transition-colors">{t("footer.legal.cgu")}</Link>
            <span aria-hidden="true" className="text-white/40">·</span>
            <Link to="/confidentialite" className="hover:text-white transition-colors">{t("footer.legal.privacy")}</Link>
            <span aria-hidden="true" className="text-white/40">·</span>
            <Link to="/cgs" className="hover:text-white transition-colors">{t("footer.legal.cgs")}</Link>
            <span aria-hidden="true" className="text-white/40">·</span>
            <Link to="/cookies" className="hover:text-white transition-colors">{t("footer.legal.cookies")}</Link>
            <span aria-hidden="true" className="text-white/40">·</span>
            <Link to="/mentions-legales" className="hover:text-white transition-colors">{t("footer.legal.legal_notice")}</Link>
            <span aria-hidden="true" className="text-white/40">·</span>
            <Link to="/contact" className="hover:text-white transition-colors">{t("footer.legal.contact")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
});
PublicFooter.displayName = "PublicFooter";

export default PublicFooter;
