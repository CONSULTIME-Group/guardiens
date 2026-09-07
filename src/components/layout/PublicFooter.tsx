import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useInAppShell } from "./AppShellContext";
import { useAuth } from "@/contexts/AuthContext";
import { PRESS_ARTICLE_URL } from "@/components/shared/PressQuote";
import { LE_PROGRES_LOGO } from "@/assets/pressLogos";

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
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          <div>
            <h3 className="font-body text-xs uppercase tracking-widest text-white/80 mb-4">{t("footer.sections.by_city")}</h3>
            <ul className="space-y-0">
              <li><Link to="/house-sitting" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.all_cities")}</Link></li>
              <li><Link to="/house-sitting/lyon" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.house_sitting_city", { city: "Lyon" })}</Link></li>
              <li><Link to="/house-sitting/annecy" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.house_sitting_city", { city: "Annecy" })}</Link></li>
              <li><Link to="/house-sitting/grenoble" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.house_sitting_city", { city: "Grenoble" })}</Link></li>
              <li><Link to="/house-sitting/chambery" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.house_sitting_city", { city: "Chambéry" })}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-body text-xs uppercase tracking-widest text-white/80 mb-4">{t("footer.sections.by_department")}</h3>
            <ul className="space-y-0">
              <li><Link to="/departement" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.all_departments")}</Link></li>
              <li><Link to="/departement/rhone" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">Rhône (69)</Link></li>
              <li><Link to="/departement/haute-savoie" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">Haute-Savoie (74)</Link></li>
              <li><Link to="/departement/gironde" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">Gironde (33)</Link></li>
              <li><Link to="/departement/herault" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">Hérault (34)</Link></li>
              <li><Link to="/departement/loire-atlantique" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">Loire-Atlantique (44)</Link></li>
              <li><Link to="/departement/bouches-du-rhone" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">Bouches-du-Rhône (13)</Link></li>
              <li><Link to="/departement/paris" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">Paris (75)</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-body text-xs uppercase tracking-widest text-white/80 mb-4">{t("footer.sections.local_guides")}</h3>
            <ul className="space-y-0">
              <li><Link to="/guides" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.all_guides")}</Link></li>
              <li><Link to="/guides/lyon" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.guide_city", { city: "Lyon" })}</Link></li>
              <li><Link to="/guides/annecy" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.guide_city", { city: "Annecy" })}</Link></li>
              <li><Link to="/guides/grenoble" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.guide_city", { city: "Grenoble" })}</Link></li>
              <li><Link to="/guides/chambery" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.guide_city", { city: "Chambéry" })}</Link></li>
              <li><Link to="/guides/aix-les-bains" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.guide_city", { city: "Aix-les-Bains" })}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-body text-xs uppercase tracking-widest text-white/80 mb-4">{t("footer.sections.resources")}</h3>
            <ul className="space-y-0">
              <li><Link to="/actualites" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.articles")}</Link></li>
              <li><Link to="/actualites/house-sitting-aura-guide-complet" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.house_sitting_guide")}</Link></li>
              <li><Link to="/faq" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.faq")}</Link></li>
              <li><Link to="/tarifs" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.pricing")}</Link></li>
              <li><Link to="/observatoire-garde-animaux" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.observatory")}</Link></li>
              <li><Link to="/actualites/c-est-quoi-le-house-sitting" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.what_is_house_sitting")}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-body text-xs uppercase tracking-widest text-white/80 mb-4">{t("footer.sections.guardiens")}</h3>
            <ul className="space-y-0">
              <li><Link to="/a-propos" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.about")}</Link></li>
              <li><Link to="/contact" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.contact")}</Link></li>
              <li><Link to="/inscription" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.register")}</Link></li>
              <li><Link to="/devenir-home-sitter" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.become_home_sitter")}</Link></li>
              <li><Link to="/petites-missions" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.small_missions")}</Link></li>

              <li><Link to="/gardien-urgence" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.emergency_sitter")}</Link></li>
              <li><Link to="/pros" className="inline-flex items-center min-h-[44px] font-body text-sm text-white/75 hover:text-white transition-colors">{t("footer.links.pet_pros")} <span className="ml-1 text-[11px] leading-none uppercase tracking-wider font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">{t("nav.beta")}</span></Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10">
          <div>
            <h3 className="font-heading text-lg font-semibold text-white/90">
              <Link to="/" aria-label="Guardiens, accueil" className="hover:opacity-80 transition-opacity">
                <span className="text-primary-on-dark">g</span>uardiens
              </Link>
            </h3>
            <p className="font-body text-sm text-white/70">
              {t("footer.tagline")}
            </p>
          </div>
          {/* Mobile : pile verticale, une entrée par ligne, cible 44 px, aucun
              séparateur. Desktop : ligne unique avec séparateurs. */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 text-sm text-white/75 font-body">
            <span className="text-xs text-white/80 font-body py-2 sm:py-0">{t("footer.version", { year: new Date().getFullYear() })}</span>
            <span aria-hidden="true" className="hidden sm:inline text-white/55">·</span>
            <Link to="/cgu" className="inline-flex min-h-[44px] min-w-[44px] items-center hover:text-white transition-colors">{t("footer.legal.cgu")}</Link>
            <span aria-hidden="true" className="hidden sm:inline text-white/55">·</span>
            <Link to="/confidentialite" className="inline-flex min-h-[44px] min-w-[44px] items-center hover:text-white transition-colors">{t("footer.legal.privacy")}</Link>
            <span aria-hidden="true" className="hidden sm:inline text-white/55">·</span>
            <Link to="/cgs" className="inline-flex min-h-[44px] min-w-[44px] items-center hover:text-white transition-colors">{t("footer.legal.cgs")}</Link>
            <span aria-hidden="true" className="hidden sm:inline text-white/55">·</span>
            <Link to="/cookies" className="inline-flex min-h-[44px] min-w-[44px] items-center hover:text-white transition-colors">{t("footer.legal.cookies")}</Link>
            <span aria-hidden="true" className="hidden sm:inline text-white/55">·</span>
            <Link to="/mentions-legales" className="inline-flex min-h-[44px] min-w-[44px] items-center hover:text-white transition-colors">{t("footer.legal.legal_notice")}</Link>
            <span aria-hidden="true" className="hidden sm:inline text-white/55">·</span>
            <Link to="/contact" className="inline-flex min-h-[44px] min-w-[44px] items-center hover:text-white transition-colors">{t("footer.legal.contact")}</Link>
          </div>
        </div>

        {/* Mention presse permanente : ligne discrète, sans cadre ni fond.
            Le lettrage du logo est blanc d'origine, il reste tel quel sur ce
            pied de page sombre (pas d'inversion, il deviendrait invisible).
            Après l'expiration de la ligne « Vu dans » du hero d'accueil
            (6 octobre 2026), cette ligne est la seule mention presse du site. */}
        <div className="mt-6 flex justify-center">
          <a
            href={PRESS_ARTICLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
          >
            <span className="font-body text-[11px] uppercase tracking-[0.16em] text-white/50">Vu dans</span>
            <img
              src={LE_PROGRES_LOGO}
              alt="Le Progrès"
              width={300}
              height={40}
              className="h-4 w-auto object-contain"
              style={{ opacity: 0.6 }}
              loading="lazy"
              decoding="async"
            />
            <span className="font-body text-[11px] text-white/50">6 septembre 2026</span>
          </a>
        </div>
      </div>
    </footer>
  );
});
PublicFooter.displayName = "PublicFooter";

export default PublicFooter;
