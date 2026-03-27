import { useEffect, useState } from "react";
import { List } from "lucide-react";

interface TOCItem {
  id: string;
  title: string;
}

interface CityTableOfContentsProps {
  items: TOCItem[];
}

export default function CityTableOfContents({ items }: CityTableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  return (
    <nav className="hidden xl:block fixed left-4 2xl:left-8 top-1/3 w-48 z-30">
      <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <List className="h-3.5 w-3.5" />
        Sommaire
      </div>
      <ul className="space-y-1.5 border-l-2 border-border pl-3">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`block text-xs leading-snug py-1 transition-colors ${
                activeId === item.id
                  ? "text-primary font-semibold border-l-2 border-primary -ml-[calc(0.75rem+2px)] pl-3"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
