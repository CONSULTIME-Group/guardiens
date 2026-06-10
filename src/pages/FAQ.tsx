import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import {
 Accordion,
 AccordionContent,
 AccordionItem,
 AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

// Slug stable et déterministe pour les ancres URL
const slug = (s: string): string =>
 (s || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

interface FaqEntry {
 id: string;
 question: string;
 answer: string;
 category: string;
 sort_order: number;
 published: boolean;
}

const FAQ = () => {
 const { t } = useTranslation();
 const { data: entries = [], isLoading } = useQuery({
 queryKey: ["faq-entries"],
 queryFn: async () => {
 const { data, error } = await supabase
.from("faq_entries" as any)
.select("*")
.eq("published", true)
.order("sort_order", { ascending: true });
 if (error) throw error;
 return (data || []) as unknown as FaqEntry[];
 },
  });

 const categories = [...new Set(entries.map((e) => e.category))];

 // Map slug -> entry id, pour ouvrir l'accordion ciblé via URL hash
 const slugToEntryId = useMemo(() => {
  const m = new Map<string, string>();
  for (const e of entries) m.set(slug(e.question), e.id);
  return m;
 }, [entries]);

 const location = useLocation();
 // type="single" : un seul item ouvert à la fois par catégorie
 const [openItems, setOpenItems] = useState<Record<string, string>>({});

 useEffect(() => {
  if (!entries.length) return;
  const raw = decodeURIComponent((location.hash || "").replace(/^#/, "")).trim();
  if (!raw) return;

  // 1) Ancre = slug de question : ouvre l'item ciblé (remplace l'éventuel ouvert dans sa catégorie)
  const targetEntryId = slugToEntryId.get(raw);
  if (targetEntryId) {
   const entry = entries.find((e) => e.id === targetEntryId);
   if (entry) {
    setOpenItems((prev) => ({ ...prev, [entry.category]: entry.id }));
   }
  }

  // 2) Scroll vers l'élément (slug question OU slug catégorie)
  const t = window.setTimeout(() => {
   const el = document.getElementById(raw);
   if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);
  return () => window.clearTimeout(t);
 }, [entries, location.hash, slugToEntryId]);

 const categoryLabels: Record<string, string> = {
 general: t("faq.categories.general"),
 owner: t("faq.categories.owner"),
 sitter: t("faq.categories.sitter"),
 security: t("faq.categories.security"),
 pricing: t("faq.categories.pricing"),
 "Fonctionnement": t("faq.categories.operation"),
 "Tarifs": t("faq.categories.pricing"),
 "Avant la garde": t("faq.categories.before_sit"),
 "Pendant la garde": t("faq.categories.during_sit"),
 "Confiance et sécurité": t("faq.categories.trust_safety"),
 "Gardien d'urgence": t("faq.categories.emergency_sitter"),
 "Petites missions": t("faq.categories.small_missions"),
 "Mon compte": t("faq.categories.my_account"),
 };

	// Convertit le markdown en HTML simple toléré par Schema.org/FAQPage
	// (Google accepte <p>, <br>, <ol>, <ul>, <li>, <a>, <strong>, <em>).
	const markdownToFaqHtml = (md: string): string => {
		if (!md) return "";
		let html = md.trim();
		// Liens [texte](url)
		html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
		// Gras **texte** et italique *texte*
		html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
		html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
		// Listes à puces (lignes commençant par - ou *)
		html = html.replace(/((?:^[-*] .+(?:\n|$))+)/gm, (block) => {
			const items = block
				.trim()
				.split(/\n/)
				.map((l) => l.replace(/^[-*]\s+/, "").trim())
				.filter(Boolean)
				.map((t) => `<li>${t}</li>`)
				.join("");
			return `<ul>${items}</ul>`;
		});
		// Paragraphes
		html = html
			.split(/\n{2,}/)
			.map((p) => (p.startsWith("<ul>") ? p : `<p>${p.replace(/\n/g, "<br>")}</p>`))
			.join("");
		return html;
	};

	const faqJsonLd = {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: entries.map((e) => ({
			"@type": "Question",
			name: e.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: markdownToFaqHtml(e.answer),
			},
		})),
	};

 return (
 <>
 <PageMeta
 title={t("faq.meta_title")}
 description="Toutes vos questions sur Guardiens, abonnement gardien, accès propriétaire à 0 €, parrainage et petites missions d'entraide."
 path="/faq"
 />

 {entries.length > 0 && (
 <script
 type="application/ld+json"
 dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
 />
 )}

 <div className="min-h-screen bg-background">
 <PublicHeader />
 <PageBreadcrumb items={[{ label: t("faq.title") }]} />
 <header className="bg-primary/5 border-b border-border">
 <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16 text-center">
 <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6">
 <HelpCircle className="h-7 w-7 text-primary" />
 </div>
 <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-3">
 {t("faq.title")}
 </h1>
 <p className="text-muted-foreground text-lg max-w-xl mx-auto">
 {t("faq.lede")}
 </p>
 </div>
 </header>

 <main className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
 {isLoading ? (
 <div className="space-y-4">
 {[1, 2, 3].map((i) => (
 <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
 ))}
 </div>
 ) : entries.length === 0 ? (
 <p className="text-center text-muted-foreground py-12">
 {t("faq.empty")}
 </p>
 ) : (
 <div className="space-y-10">
  {categories.map((cat) => {
  const catEntries = entries.filter((e) => e.category === cat);
  const catLabel = categoryLabels[cat] || cat;
  const catSlug = slug(catLabel);
  return (
  <section key={cat} id={catSlug} className="scroll-mt-24">
  <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
  {catLabel}
  </h2>
  <Accordion
  type="single"
  collapsible
  className="space-y-2"
  value={openItems[cat] ?? ""}
  onValueChange={(v) => setOpenItems((prev) => ({ ...prev, [cat]: v }))}
  >
  {catEntries.map((entry) => (
  <AccordionItem
  key={entry.id}
  value={entry.id}
  id={slug(entry.question)}
  className="border border-border rounded-lg px-5 scroll-mt-24 data-[state=open]:bg-accent/30"
  >
 <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-4">
 {entry.question}
 </AccordionTrigger>
 <AccordionContent className="leading-relaxed pb-5">
 <ReactMarkdown
 components={{
 p: ({ children }) => (
 <p className="mb-3 text-sm text-muted-foreground leading-relaxed last:mb-0">
 {children}
 </p>
 ),
 strong: ({ children }) => (
 <strong className="font-semibold text-foreground">{children}</strong>
 ),
 a: ({ href, children }) => {
 const isExternal = href?.startsWith("http");
 return (
 <a
 href={href}
 className="text-primary underline hover:text-primary/80 transition-colors"
 {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
 >
 {children}
 </a>
 );
 },
 ul: ({ children }) => (
 <ul className="list-disc pl-4 mb-3 space-y-1 text-sm text-muted-foreground">{children}</ul>
 ),
 li: ({ children }) => (
 <li className="leading-relaxed">{children}</li>
 ),
 }}
 >
 {entry.answer}
 </ReactMarkdown>
 </AccordionContent>
 </AccordionItem>
 ))}
 </Accordion>
 </section>
 );
 })}
 </div>
 )}

 <div className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
 <p className="font-heading font-semibold text-foreground mb-1">{t("faq.pricing_cta_title")}</p>
 <p className="text-sm text-muted-foreground mb-4">À 0 € pour les propriétaires. 6,99 €/mois pour les gardiens, sans engagement.</p>
 <Link
 to="/actualites/nouveaux-tarifs-2026"
 className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
 >
 {t("faq.pricing_cta_link")}
 </Link>
 </div>

 <div className="mt-14 text-center border-t border-border pt-10">
 <p className="text-muted-foreground mb-4">
 {t("faq.not_found_question")}
 </p>
 <Link
 to="/contact"
 className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
 >
 {t("faq.contact_us")}
 </Link>
 </div>
 </main>

 <script
 type="application/ld+json"
 dangerouslySetInnerHTML={{
 __html: JSON.stringify({
 "@context": "https://schema.org",
 "@type": "BreadcrumbList",
 itemListElement: [
 { "@type": "ListItem", position: 1, name: "Guardiens", item: "https://guardiens.fr" },
 { "@type": "ListItem", position: 2, name: "FAQ", item: "https://guardiens.fr/faq" },
 ],
 }),
 }}
 />
 <PublicFooter />
 </div>
 </>
 );
};

export default FAQ;
