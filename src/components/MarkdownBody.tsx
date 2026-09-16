import type { ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import { gfmTable } from "micromark-extension-gfm-table";
import { gfmStrikethrough } from "micromark-extension-gfm-strikethrough";
import { gfmTaskListItem } from "micromark-extension-gfm-task-list-item";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import { gfmStrikethroughFromMarkdown } from "mdast-util-gfm-strikethrough";
import { gfmTaskListItemFromMarkdown } from "mdast-util-gfm-task-list-item";

interface MarkdownBodyProps {
  children: string;
  components?: ComponentProps<typeof ReactMarkdown>["components"];
}

/**
 * Extensions GitHub Flavored Markdown, sans l'autolink littéral.
 *
 * L'autolink littéral de remark-gfm embarque une expression régulière à
 * lookbehind, que Safari iOS avant 16.4 refuse d'analyser : le module entier
 * échoue au chargement et la page reste blanche (constaté sur iOS 15.8).
 * On compose donc seulement les tableaux, le barré et les listes de tâches.
 * Les liens markdown classiques [texte](url) restent pris en charge par le
 * coeur de micromark, ils ne dépendent pas de cette extension.
 */
function remarkGfmSansAutolink(this: any) {
  const data = this.data();
  const add = (champ: string, valeurs: unknown[]) => {
    const liste = data[champ] || (data[champ] = []);
    liste.push(...valeurs);
  };
  add("micromarkExtensions", [gfmTable(), gfmStrikethrough(), gfmTaskListItem()]);
  add("fromMarkdownExtensions", [
    gfmTableFromMarkdown(),
    gfmStrikethroughFromMarkdown(),
    gfmTaskListItemFromMarkdown(),
  ]);
}

/**
 * Rendu markdown enrichi, avec support des tableaux, du texte barré et des
 * listes de tâches. Les tableaux larges sont encapsulés dans un conteneur
 * défilant horizontalement pour rester lisibles sur mobile sans faire
 * déborder la page.
 */
export function MarkdownBody({ children, components }: MarkdownBodyProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfmSansAutolink as any]}
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
