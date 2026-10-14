import type { ComponentType } from "react";
import { useSearchParams } from "react-router-dom";
import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import LegalVersionNotice from "@/components/legal/LegalVersionNotice";
import CgsV2 from "@/components/legal/CgsV2";
import CgsV3 from "@/components/legal/CgsV3";
import { selectLegalPageVersion } from "@/lib/legalPageVersion";

/** Texte de chaque version publiée des CGS (calendrier : src/config/legalVersions.ts). */
const CGS_BY_VERSION: Record<string, ComponentType> = { "2": CgsV2, "3": CgsV3 };

const Cgs = () => {
  const [params] = useSearchParams();
  const selection = selectLegalPageVersion("cgs", params.get("version"));
  const Text = CGS_BY_VERSION[selection.shown.version] ?? CgsV3;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Conditions Générales de Services | Guardiens"
        description="Conditions générales de services de Guardiens : service gratuit, fonctionnalités incluses, résiliation."
        path="/cgs"
      />
      <PublicHeader />

      <main id="main-content" className="px-6 md:px-12 py-16 max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">Conditions Générales de Services</h1>
        <LegalVersionNotice label="CGS" path="/cgs" selection={selection} />
        <Text />
      </main>

      <PublicFooter />
    </div>
  );
};

export default Cgs;
