import type { ComponentType } from "react";
import { useSearchParams } from "react-router-dom";
import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import LegalVersionNotice from "@/components/legal/LegalVersionNotice";
import TermsV8 from "@/components/legal/TermsV8";
import TermsV9 from "@/components/legal/TermsV9";
import { selectLegalPageVersion } from "@/lib/legalPageVersion";

/** Texte de chaque version publiée des CGU (calendrier : src/config/legalVersions.ts). */
const TERMS_BY_VERSION: Record<string, ComponentType> = { "8": TermsV8, "9": TermsV9 };

const Terms = () => {
  const [params] = useSearchParams();
  const selection = selectLegalPageVersion("cgu", params.get("version"));
  const Text = TERMS_BY_VERSION[selection.shown.version] ?? TermsV9;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Conditions générales d'utilisation | Guardiens"
        description="Consultez les conditions générales d'utilisation de la plateforme Guardiens : engagements, responsabilités, droits et obligations des membres."
        path="/cgu"
      />
      <PublicHeader />

      <main id="main-content" className="px-6 md:px-12 py-16 max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">
          Conditions Générales d'Utilisation
        </h1>
        <LegalVersionNotice label="CGU" path="/cgu" selection={selection} />
        <Text />
      </main>

      <PublicFooter />
    </div>
  );
};

export default Terms;
