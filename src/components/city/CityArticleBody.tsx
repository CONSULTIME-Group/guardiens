import { marked } from "marked";
import { useMemo } from "react";

interface Section {
  id: string;
  title: string;
  content: string;
}

interface CityArticleBodyProps {
  sections: Section[];
}

export default function CityArticleBody({ sections }: CityArticleBodyProps) {
  const renderedSections = useMemo(() => {
    return sections.map((s) => ({
      ...s,
      html: marked.parse(s.content, { async: false }) as string,
    }));
  }, [sections]);

  return (
    <div className="space-y-10">
      {renderedSections.map((section) => (
        <section key={section.id} id={section.id}>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
            {section.title}
          </h2>
          <div
            className="prose prose-lg max-w-none text-foreground/90 leading-[1.85] 
              prose-headings:font-heading prose-headings:text-foreground 
              prose-strong:text-foreground prose-strong:font-semibold
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-table:text-sm prose-th:bg-muted prose-th:p-3 prose-td:p-3 prose-td:border-b prose-td:border-border"
            dangerouslySetInnerHTML={{ __html: section.html }}
          />
        </section>
      ))}
    </div>
  );
}
