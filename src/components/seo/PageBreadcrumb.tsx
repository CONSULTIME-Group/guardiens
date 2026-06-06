import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageBreadcrumbProps {
  items: BreadcrumbItem[];
}

const BASE_URL = "https://guardiens.fr";

/**
 * Unified breadcrumb component:
 * 1. Visible HTML breadcrumb trail (semantic <nav>)
 * 2. Schema.org BreadcrumbList JSON-LD in <head>
 */
const PageBreadcrumb = ({ items }: PageBreadcrumbProps) => {
  const location = useLocation();

  // Always prepend "Accueil"
  const allItems: BreadcrumbItem[] = [
    { label: "Accueil", href: "/" },
    ...items,
  ];

  // Current page absolute URL (used as fallback for the last crumb)
  const currentPath = location.pathname.replace(/\/+$/, "") || "/";
  const currentUrl = `${BASE_URL}${currentPath}`;

  // Schema.org BreadcrumbList, every ListItem MUST have an `item` URL
  // (Google now flags missing URLs on the last item as invalid).
  const schemaItems = allItems.map((item, i) => {
    const isLast = i === allItems.length - 1;
    const href = item.href
      ? `${BASE_URL}${item.href}`
      : isLast
        ? currentUrl
        : undefined;
    const entry: Record<string, any> = {
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
    };
    if (href) entry.item = href;
    return entry;
  });

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: schemaItems,
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <nav
        aria-label="Fil d'Ariane"
        className="max-w-5xl mx-auto px-4 pt-4 pb-2"
      >
        <ol className="flex items-center flex-wrap gap-0 text-sm text-muted-foreground">
          {allItems.map((item, i) => {
            const isLast = i === allItems.length - 1;
            return (
              <li key={i} className="flex items-center">
                {i > 0 && (
                  <span className="mx-1.5 text-muted-foreground/50 select-none" aria-hidden>›</span>
                )}
                {isLast ? (
                  <span
                    className="text-foreground font-medium truncate max-w-[220px]"
                    aria-current="page"
                  >
                    {item.label}
                  </span>
                ) : item.href ? (
                  <Link
                    to={item.href}
                    className="hover:underline hover:text-foreground transition-colors truncate max-w-[180px]"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="truncate max-w-[180px]">{item.label}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
};

export default PageBreadcrumb;
