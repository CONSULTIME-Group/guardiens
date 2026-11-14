import { useLayoutEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import Head from "@/components/seo/Head";
import { buildShortLinkTarget } from "@/lib/shortLinks";
import { captureSignupSource } from "@/lib/signupSource";

/**
 * Lot SRC3 : lien court d'un réseau social (/ig, /tiktok, /yt, /fb).
 * La source est enregistrée avant la redirection : le suivi des pages vues
 * retient la première arrivée de la visite, et celle-ci doit porter les UTM
 * du canal, pas l'adresse courte sans paramètres.
 */
export default function ShortLinkRedirect({ slug }: { slug: string }) {
  const location = useLocation();
  const target = buildShortLinkTarget(slug, location.search, location.hash) ?? "/";

  useLayoutEffect(() => {
    const [, query = ""] = target.split("#")[0].split("?");
    captureSignupSource({
      search: `?${query}`,
      pathname: "/",
      referrer: typeof document !== "undefined" ? document.referrer : null,
    });
  }, [target]);

  return (
    <>
      <Head>
        <meta name="robots" content="noindex, follow" />
      </Head>
      <Navigate to={target} replace />
    </>
  );
}
