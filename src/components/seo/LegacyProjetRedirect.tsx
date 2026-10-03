import { Navigate } from "react-router-dom";
import PageMeta from "@/components/PageMeta";
import { SITE_ORIGIN } from "@/lib/projetSeo";

/**
 * Ancienne adresse d'une annonce devenue projet (lot SEO-2).
 * Robots : 301 déclaré à Prerender (prerender-status-code + prerender-header),
 * même mécanisme que NavigateGuideSlug, CityPage et DepartmentPage.
 * Navigateur : remplacement côté client, ce n'est pas un 301 HTTP.
 * Les paramètres de suivi ne passent pas dans la cible permanente.
 */
const LegacyProjetRedirect = ({ target, title = "Projet participatif", description = "Ce projet participatif a changé d'adresse." }: { target: string; title?: string; description?: string }) => {
  const isPrerender =
    typeof navigator !== "undefined" && /Prerender/i.test(navigator.userAgent);
  return (
    <>
      <PageMeta
        title={title}
        description={description}
        path={target}
        canonical={`${SITE_ORIGIN}${target}`}
        statusCode={301}
        prerenderHeader={`Location: ${SITE_ORIGIN}${target}`}
      />
      {!isPrerender && <Navigate to={target} replace />}
    </>
  );
};

export default LegacyProjetRedirect;
