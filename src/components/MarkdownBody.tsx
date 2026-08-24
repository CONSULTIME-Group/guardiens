import type { ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownBodyProps {
  children: string;
  components?: ComponentProps<typeof ReactMarkdown>["components"];
}

/**
 * Rendu markdown enrichi, avec support des tableaux, listes de tâches et
 * liens automatiques (GitHub Flavored Markdown). Les tableaux larges sont
 * encapsulés dans un conteneur défilant horizontalement pour rester lisibles
 * sur mobile sans faire déborder la page.
 */
export function MarkdownBody({ children, components }: MarkdownBodyProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm as any]}
      components={{
        table: ({ children }) => (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full border-collapse text-sm min-w-[480px]">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
        th: ({ children }) => (
          <th className="border-b border-border p-3 text-left font-semibold align-bottom">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-border p-3 align-top">{children}</td>
        ),
        tr: ({ children }) => <tr className="border-b border-border last:border-b-0">{children}</tr>,
        ...components,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
