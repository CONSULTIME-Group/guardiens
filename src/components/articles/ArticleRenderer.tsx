import { Link } from "react-router-dom";
import { marked } from "marked";
import { Heart, Search, ShieldCheck, TreePine, Home, Users, MapPin, CheckCircle2, Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

import lyonHeroQuais from "@/assets/lyon-hero-quais.jpg";
import lyonChatFenetre from "@/assets/lyon-chat-fenetre.jpg";
import lyonConfianceCafe from "@/assets/lyon-confiance-cafe.jpg";
import grenobleBastilleChien from "@/assets/grenoble-bastille-chien.jpg";
import grenobleChatChartreuse from "@/assets/grenoble-chat-chartreuse.jpg";
import grenobleConfianceCafe from "@/assets/grenoble-confiance-cafe.jpg";
import saintEtienneParcChien from "@/assets/saint-etienne-parc-chien.jpg";
import saintEtienneChatForez from "@/assets/saint-etienne-chat-forez.jpg";
import saintEtienneConfianceCafe from "@/assets/saint-etienne-confiance-cafe.jpg";
import valenceParcChien from "@/assets/valence-parc-chien.jpg";
import valenceChatDrome from "@/assets/valence-chat-drome.jpg";
import valenceConfianceCafe from "@/assets/valence-confiance-cafe.jpg";
import chamberyElephantsChien from "@/assets/chambery-elephants-chien.jpg";
import chamberyChatBauges from "@/assets/chambery-chat-bauges.jpg";
import chamberyConfianceRue from "@/assets/chambery-confiance-rue.jpg";
import clermontJaudeChien from "@/assets/clermont-jaude-chien.jpg";
import villeurbanneGrattecielChien from "@/assets/villeurbanne-gratteciel-chien.jpg";
import venissieuxParillyChat from "@/assets/venissieux-parilly-chat.jpg";
import aixLesBainsVillaLac from "@/assets/aix-les-bains-villa-lac.jpg";
import goldenRetrieverQuaisLyon from "@/assets/golden-retriever-quais-lyon.jpg";
import goldenRetrieverTeteDorLyon from "@/assets/golden-retriever-tete-dor-lyon.jpg";
import goldenRetrieverInterieurVieuxLyon from "@/assets/golden-retriever-interieur-vieux-lyon.jpg";
import borderCollieFeyssineLyon from "@/assets/border-collie-feyssine-lyon.jpg";
import borderCollieInterieurCroixRousse from "@/assets/border-collie-interieur-croix-rousse.jpg";
import bouledogueFrancaisVieuxLyon from "@/assets/bouledogue-francais-vieux-lyon.jpg";
import bouledogueFrancaisInterieurLyon6 from "@/assets/bouledogue-francais-interieur-lyon6.jpg";
import bergerAustralienFeyssineLyon from "@/assets/berger-australien-feyssine-lyon.jpg";
import bergerAustralienInterieurLyon from "@/assets/berger-australien-interieur-lyon.jpg";
import fondateursGuardiensQuaisLyon from "@/assets/fondateurs-guardiens-quais-lyon.jpg";
import gardeAnimauxAppartementLyon from "@/assets/garde-animaux-appartement-lyon.jpg";
import boomPetsittingConfluence from "@/assets/boom-petsitting-confluence-lyon.jpg";
import boomPetsittingHomeoffice from "@/assets/boom-petsitting-homeoffice-lyon.jpg";
import parcTeteDorChiens from "@/assets/parc-tete-dor-chiens-lyon.jpg";
import parcParillyLabrador from "@/assets/parc-parilly-labrador-lyon.jpg";
import gardienBellecour from "@/assets/gardien-bellecour-lyon.jpg";
import profilGardienLaptop from "@/assets/profil-gardien-laptop-lyon.jpg";
import villaOuestVide from "@/assets/villa-ouest-lyonnais-vide.jpg";
import gardienTeletravailOuest from "@/assets/gardien-teletravail-ouest-lyon.jpg";
import pensionChienAlternativesCover from "@/assets/pension-chien-alternatives-cover.jpg";

const ARTICLE_IMAGES: Record<string, string> = {
  "/images/lyon-hero-quais.jpg": lyonHeroQuais,
  "/images/lyon-chat-fenetre.jpg": lyonChatFenetre,
  "/images/lyon-confiance-cafe.jpg": lyonConfianceCafe,
  "/images/grenoble-bastille-chien.jpg": grenobleBastilleChien,
  "/images/grenoble-chat-chartreuse.jpg": grenobleChatChartreuse,
  "/images/grenoble-confiance-cafe.jpg": grenobleConfianceCafe,
  "/images/saint-etienne-parc-chien.jpg": saintEtienneParcChien,
  "/images/saint-etienne-chat-forez.jpg": saintEtienneChatForez,
  "/images/saint-etienne-confiance-cafe.jpg": saintEtienneConfianceCafe,
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
  "/images/golden-retriever-tete-dor-lyon.jpg": goldenRetrieverTeteDorLyon,
  "/images/golden-retriever-interieur-vieux-lyon.jpg": goldenRetrieverInterieurVieuxLyon,
  "/images/border-collie-feyssine-lyon.jpg": borderCollieFeyssineLyon,
  "/images/border-collie-interieur-croix-rousse.jpg": borderCollieInterieurCroixRousse,
  "/images/bouledogue-francais-vieux-lyon.jpg": bouledogueFrancaisVieuxLyon,
  "/images/bouledogue-francais-interieur-lyon6.jpg": bouledogueFrancaisInterieurLyon6,
  "/images/berger-australien-feyssine-lyon.jpg": bergerAustralienFeyssineLyon,
  "/images/berger-australien-interieur-lyon.jpg": bergerAustralienInterieurLyon,
  "/images/fondateurs-guardiens-quais-lyon.jpg": fondateursGuardiensQuaisLyon,
  "/images/garde-animaux-appartement-lyon.jpg": gardeAnimauxAppartementLyon,
  "/images/boom-petsitting-confluence-lyon.jpg": boomPetsittingConfluence,
  "/images/boom-petsitting-homeoffice-lyon.jpg": boomPetsittingHomeoffice,
  "/images/parc-tete-dor-chiens-lyon.jpg": parcTeteDorChiens,
  "/images/parc-parilly-labrador-lyon.jpg": parcParillyLabrador,
  "/images/gardien-bellecour-lyon.jpg": gardienBellecour,
  "/images/profil-gardien-laptop-lyon.jpg": profilGardienLaptop,
  "/images/villa-ouest-lyonnais-vide.jpg": villaOuestVide,
  "/images/gardien-teletravail-ouest-lyon.jpg": gardienTeletravailOuest,
  "/images/pension-chien-alternatives-cover.jpg": pensionChienAlternativesCover,
};

export function resolveImagePath(path: string): string {
  return ARTICLE_IMAGES[path] || path;
}

function resolveArticleImages(html: string): string {
  return html.replace(/src="(\/images\/[^"]+)"/g, (match, path) => {
    const resolved = ARTICLE_IMAGES[path];
    return resolved ? `src="${resolved}"` : match;
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
  // Wrap every other H2 section in a banded div
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
  return html + `<div class="article-cta-block article-cta-end"><div class="article-cta-inner"><p class="article-cta-heading">Prêt à rejoindre la communauté ?</p><p class="article-cta-text">Créez votre profil gratuitement et rencontrez vos voisins gardiens.</p><div class="article-cta-buttons"><a href="/register" class="article-cta-btn article-cta-btn-primary">Créer mon profil</a></div></div></div>`;
}

interface ArticleRendererProps {
  content: string;
  userRole?: "owner" | "sitter" | "both";
}

/** Replace inscription CTAs based on user role */
function adaptCTAsForRole(html: string, role?: "owner" | "sitter" | "both"): string {
  if (!role) return html;

  const ownerCTA = '<a href="/sits/create" class="article-cta-btn article-cta-btn-primary">Publier une annonce →</a>';
  const sitterCTA = '<a href="/search" class="article-cta-btn article-cta-btn-primary">Trouver une garde près de chez vous →</a>';

  // Replace inscription links with role-appropriate CTAs
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

export default function ArticleRenderer({ content, userRole }: ArticleRendererProps) {
  // Pre-process markdown for custom blocks
  const preprocessed = transformFactBoxes(content);
  
  // Parse to HTML
  let html = marked.parse(preprocessed, { async: false }) as string;
  
  // Post-process HTML
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