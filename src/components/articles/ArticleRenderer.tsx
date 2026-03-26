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
};

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
      return `<div class="article-cta-block"><div class="article-cta-inner"><p class="article-cta-text">Vous êtes propriétaire d'animaux ou vous aimez les animaux ?</p><div class="article-cta-buttons"><a href="/inscription" class="article-cta-btn article-cta-btn-primary">Rejoindre la communauté</a><a href="/recherche" class="article-cta-btn article-cta-btn-secondary">Trouver un gardien</a></div></div></div>\n${match}`;
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
  return html + `<div class="article-cta-block article-cta-end"><div class="article-cta-inner"><p class="article-cta-heading">Prêt à rejoindre la communauté ?</p><p class="article-cta-text">Créez votre profil gratuitement et rencontrez vos voisins gardiens.</p><div class="article-cta-buttons"><a href="/inscription" class="article-cta-btn article-cta-btn-primary">Créer mon profil</a></div></div></div>`;
}

interface ArticleRendererProps {
  content: string;
}

export default function ArticleRenderer({ content }: ArticleRendererProps) {
  // Pre-process markdown for custom blocks
  const preprocessed = transformFactBoxes(content);
  
  // Parse to HTML
  let html = marked.parse(preprocessed, { async: false }) as string;
  
  // Post-process HTML
  html = resolveArticleImages(html);
  html = injectCTA(html);
  html = addBandedSections(html);
  html = addEndCTA(html);
  
  return (
    <div
      className="article-rich-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}