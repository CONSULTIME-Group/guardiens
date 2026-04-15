import { Link } from "react-router-dom";
import { marked } from "marked";
import { Heart, Search, ShieldCheck, TreePine, Home, Users, MapPin, CheckCircle2, Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOptimizedImageUrl } from "@/lib/imageOptim";

// ── Supabase Storage base URL ──────────────────────────────
const SB = "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/property-photos/articles-inline";

// ── Vite imports for images NOT YET migrated ───────────────
import lyonHeroQuais from "@/assets/lyon-hero-quais.webp";
import lyonChatFenetre from "@/assets/lyon-chat-fenetre.webp";
import chamberyElephantsChien from "@/assets/chambery-elephants-chien.webp";
import chamberyChatBauges from "@/assets/chambery-chat-bauges.webp";
import chamberyConfianceRue from "@/assets/chambery-confiance-rue.webp";
import clermontJaudeChien from "@/assets/clermont-jaude-chien.webp";
import villeurbanneGrattecielChien from "@/assets/villeurbanne-gratteciel-chien.webp";
import venissieuxParillyChat from "@/assets/venissieux-parilly-chat.webp";
import aixLesBainsVillaLac from "@/assets/aix-les-bains-villa-lac.webp";
import goldenRetrieverQuaisLyon from "@/assets/golden-retriever-quais-lyon.webp";
import borderCollieInterieurCroixRousse from "@/assets/border-collie-interieur-croix-rousse.webp";
import bouledogueFrancaisInterieurLyon6 from "@/assets/bouledogue-francais-interieur-lyon6.webp";
import bergerAustralienInterieurLyon from "@/assets/berger-australien-interieur-lyon.webp";
import fondateursGuardiensQuaisLyon from "@/assets/fondateurs-guardiens-quais-lyon.webp";
import gardeAnimauxAppartementLyon from "@/assets/garde-animaux-appartement-lyon.webp";
import boomPetsittingHomeoffice from "@/assets/boom-petsitting-homeoffice-lyon.webp";
import gardienBellecour from "@/assets/gardien-bellecour-lyon.webp";
import profilGardienLaptop from "@/assets/profil-gardien-laptop-lyon.webp";
import gardienTeletravailOuest from "@/assets/gardien-teletravail-ouest-lyon.webp";
import pensionChienAlternativesCover from "@/assets/pension-chien-alternatives-cover.webp";
import gardeAnimalHospitalisation from "@/assets/garde-animal-hospitalisation-cover.webp";
import gardeChatDomicileLyon from "@/assets/garde-chat-domicile-lyon.webp";
import gardeChatPresquileLyon from "@/assets/garde-chat-presquile-lyon.webp";
import sAbsenterAnimalGuideCover from "@/assets/s-absenter-animal-guide-cover.webp";
import grenobleBasilleChien from "@/assets/grenoble-bastille-chien.webp";
import grenobleChatChartreuse from "@/assets/grenoble-chat-chartreuse.webp";
import saintEtienneParcChien from "@/assets/saint-etienne-parc-chien.webp";
import saintEtienneChatForez from "@/assets/saint-etienne-chat-forez.webp";
import valenceParcChien from "@/assets/valence-parc-chien.webp";
import valenceChatDrome from "@/assets/valence-chat-drome.webp";
import valenceConfianceCafe from "@/assets/valence-confiance-cafe.webp";
import bouledogueFrancaisVieuxLyon from "@/assets/bouledogue-francais-vieux-lyon.webp";

const ARTICLE_IMAGES: Record<string, string> = {
  // ── LOT 1 – migrated to Supabase Storage ──────────────────
  "/images/parc-tete-dor-chiens-lyon.jpg": `${SB}/parc-tete-dor-chiens-lyon.webp`,
  "/images/golden-retriever-tete-dor-lyon.jpg": `${SB}/golden-retriever-tete-dor-lyon.webp`,
  "/images/parc-parilly-labrador-lyon.jpg": `${SB}/parc-parilly-labrador-lyon.webp`,
  "/images/grenoble-confiance-cafe.jpg": `${SB}/grenoble-confiance-cafe.webp`,
  "/images/border-collie-feyssine-lyon.jpg": `${SB}/border-collie-feyssine-lyon.webp`,
  "/images/lyon-confiance-cafe.jpg": `${SB}/lyon-confiance-cafe.webp`,
  "/images/boom-petsitting-confluence-lyon.jpg": `${SB}/boom-petsitting-confluence-lyon.webp`,
  "/images/golden-retriever-interieur-vieux-lyon.jpg": `${SB}/golden-retriever-interieur-vieux-lyon.webp`,
  "/images/villa-ouest-lyonnais-vide.jpg": `${SB}/villa-ouest-lyonnais-vide.webp`,
  "/images/berger-australien-feyssine-lyon.jpg": `${SB}/berger-australien-feyssine-lyon.webp`,
  "/images/saint-etienne-confiance-cafe.jpg": `${SB}/saint-etienne-confiance-cafe.webp`,
  "/images/garde-animaux-croix-rousse-lyon.jpg": `${SB}/garde-animaux-croix-rousse-lyon.webp`,
  // hero-lyon and hero-annecy are used by CityHero, not in article markdown

  // ── Remaining local imports (future LOT 2+) ────────────────
  "/images/lyon-hero-quais.jpg": lyonHeroQuais,
  "/images/lyon-chat-fenetre.jpg": lyonChatFenetre,
  "/images/grenoble-bastille-chien.jpg": grenobleBasilleChien,
  "/images/grenoble-chat-chartreuse.jpg": grenobleChatChartreuse,
  "/images/saint-etienne-parc-chien.jpg": saintEtienneParcChien,
  "/images/saint-etienne-chat-forez.jpg": saintEtienneChatForez,
  "/images/valence-parc-chien.jpg": valenceParcChien,
  "/images/valence-chat-drome.jpg": valenceChatDrome,
  "/images/valence-confiance-cafe.jpg": valenceConfianceCafe,
  "/images/chambery-elephants-chien.jpg": chamberyElephantsChien,
  "/images/chambery-chat-bauges.jpg": chamberyChatBauges,
  "/images/chambery-confiance-rue.jpg": chamberyConfianceRue,
  "/images/clermont-jaude-chien.jpg": clermontJaudeChien,
  "/images/villeurbanne-gratteciel-chien.jpg": villeurbanneGrattecielChien,
  "/images/venissieux-parilly-chat.jpg": venissieuxParillyChat,
  "/images/aix-les-bains-villa-lac.jpg": aixLesBainsVillaLac,
  "/images/golden-retriever-quais-lyon.jpg": goldenRetrieverQuaisLyon,
  "/images/border-collie-interieur-croix-rousse.jpg": borderCollieInterieurCroixRousse,
  "/images/bouledogue-francais-vieux-lyon.jpg": bouledogueFrancaisVieuxLyon,
  "/images/bouledogue-francais-interieur-lyon6.jpg": bouledogueFrancaisInterieurLyon6,
  "/images/berger-australien-interieur-lyon.jpg": bergerAustralienInterieurLyon,
  "/images/fondateurs-guardiens-quais-lyon.jpg": fondateursGuardiensQuaisLyon,
  "/images/garde-animaux-appartement-lyon.jpg": gardeAnimauxAppartementLyon,
  "/images/boom-petsitting-homeoffice-lyon.jpg": boomPetsittingHomeoffice,
  "/images/gardien-bellecour-lyon.jpg": gardienBellecour,
  "/images/profil-gardien-laptop-lyon.jpg": profilGardienLaptop,
  "/images/gardien-teletravail-ouest-lyon.jpg": gardienTeletravailOuest,
  "/images/pension-chien-alternatives-cover.jpg": pensionChienAlternativesCover,
  "/images/garde-animal-hospitalisation-cover.jpg": gardeAnimalHospitalisation,
  "/images/garde-chat-domicile-lyon.jpg": gardeChatDomicileLyon,
  "/images/garde-chat-presquile-lyon.jpg": gardeChatPresquileLyon,
  "/images/s-absenter-animal-guide-cover.jpg": sAbsenterAnimalGuideCover,
};

export function resolveImagePath(path: string): string {
  return ARTICLE_IMAGES[path] || path;
}

function resolveArticleImages(html: string): string {
  return html.replace(/src="(\/images\/[^"]+)"/g, (match, path) => {
    const resolved = ARTICLE_IMAGES[path];
    if (!resolved) return match;
    // Apply Supabase Image Transformations if it's a Supabase URL
    const optimized = getOptimizedImageUrl(resolved, 800, 75);
    return `src="${optimized}"`;
  });
}

/** Inject mid-article CTA after the 2nd <h2> */
function injectCTA(html: string): string {
  let h2Count = 0;
  return html.replace(/<h2/g, (match) => {
    h2Count++;
    if (h2Count === 3) {
      return `<div class="article-cta-block"><div class="article-cta-inner"><p class="article-cta-text">Vous êtes propriétaire d'animaux ou vous aimez les animaux ?</p><div class="article-cta-buttons"><a href="/register" class="article-cta-btn article-cta-btn-primary">Rejoindre la communauté</a><a href="/search" class="article-cta-btn article-cta-btn-secondary">Trouver un gardien</a></div></div></div>\n${match}`;
    }
    return match;
  });
}

/** Transform :::saviez-vous ... ::: blocks */
function transformFactBoxes(content: string): string {
  return content.replace(
    /:::saviez-vous\s*\n([\s\S]*?):::/g,
    (_, inner) => `<div class="fact-box"><div class="fact-box-icon">💡</div><div class="fact-box-content"><p class="fact-box-label">Le saviez-vous ?</p>${marked.parse(inner.trim(), { async: false })}</div></div>`
  );
}

/** Add banded backgrounds to H2 sections */
function addBandedSections(html: string): string {
  const parts = html.split(/(?=<h2)/);
  return parts.map((part, i) => {
    if (i > 0 && i % 2 === 0 && part.startsWith('<h2')) {
      return `<div class="article-banded-section">${part}</div>`;
    }
    return part;
  }).join('');
}

/** Add end-of-article CTA */
function addEndCTA(html: string): string {
  return html + `<div class="article-cta-block article-cta-end"><div class="article-cta-inner"><p class="article-cta-heading">Prêt à rejoindre la communauté ?</p><p class="article-cta-text">Créez votre profil gratuitement et rejoignez les gardiens de votre quartier.</p><div class="article-cta-buttons"><a href="/register" class="article-cta-btn article-cta-btn-primary">Créer mon profil</a></div></div></div>`;
}

interface ArticleRendererProps {
  content: string;
  userRole?: "owner" | "sitter" | "both";
}

/** Replace inscription CTAs based on user role */
function adaptCTAsForRole(html: string, role?: "owner" | "sitter" | "both"): string {
  if (!role) return html;

  const ownerPattern = /href="\/register\?role=owner"[^>]*>[^<]*/g;
  const sitterPattern = /href="\/register\?role=guardian"[^>]*>[^<]*/g;
  const genericPattern = /href="\/register"[^>]*>[^<]*/g;

  if (role === "owner") {
    html = html.replace(ownerPattern, `href="/sits/create">Publier une annonce →`);
    html = html.replace(sitterPattern, `href="/search">Trouver une garde près de chez vous →`);
    html = html.replace(genericPattern, `href="/sits/create">Publier une annonce →`);
  } else if (role === "sitter") {
    html = html.replace(sitterPattern, `href="/search">Trouver une garde près de chez vous →`);
    html = html.replace(ownerPattern, `href="/sits/create">Publier une annonce →`);
    html = html.replace(genericPattern, `href="/search">Trouver une garde près de chez vous →`);
  } else if (role === "both") {
    html = html.replace(ownerPattern, `href="/sits/create">Publier une annonce →`);
    html = html.replace(sitterPattern, `href="/search">Trouver une garde près de chez vous →`);
    html = html.replace(genericPattern, `href="/sits/create">Publier une annonce →`);
  }

  return html;
}

/** Strip leading H1 from content to avoid double-H1 */
function stripLeadingH1(md: string): string {
  return md.replace(/^#\s+.+\n+/, "");
}

export default function ArticleRenderer({ content, userRole }: ArticleRendererProps) {
  const withoutH1 = stripLeadingH1(content);
  const preprocessed = transformFactBoxes(withoutH1);
  let html = marked.parse(preprocessed, { async: false }) as string;
  
  html = resolveArticleImages(html);
  html = injectCTA(html);
  html = addBandedSections(html);
  html = addEndCTA(html);
  html = adaptCTAsForRole(html, userRole);
  
  return (
    <div
      className="article-rich-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
