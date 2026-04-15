/**
 * Parse :::faq ... ::: blocks from markdown content.
 *
 * Expected format:
 * ```
 * :::faq
 * **Question 1 ?**
 *
 * Réponse 1.
 *
 * **Question 2 ?**
 *
 * Réponse 2.
 * :::
 * ```
 */

export interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_BLOCK_RE = /:::faq\s*\n([\s\S]*?):::/g;
const BOLD_Q_RE = /^\*\*(.+?)\*\*\s*$/;

/**
 * Extract all Q/A pairs from :::faq blocks in raw markdown.
 * Returns an empty array when no :::faq block is found.
 */
export function parseFaqFromMarkdown(markdown: string): FaqItem[] {
  const items: FaqItem[] = [];

  let match: RegExpExecArray | null;
  while ((match = FAQ_BLOCK_RE.exec(markdown)) !== null) {
    const blockContent = match[1];
    const lines = blockContent.split("\n");

    let currentQ = "";
    let currentALines: string[] = [];

    const flush = () => {
      if (currentQ && currentALines.length > 0) {
        const answer = currentALines.join("\n").trim();
        if (answer) {
          items.push({ question: currentQ, answer });
        }
      }
      currentQ = "";
      currentALines = [];
    };

    for (const line of lines) {
      const qMatch = line.trim().match(BOLD_Q_RE);
      if (qMatch) {
        flush();
        currentQ = qMatch[1].trim();
      } else if (currentQ) {
        currentALines.push(line);
      }
    }
    flush();
  }

  return items;
}

/**
 * Build a Schema.org FAQPage JSON-LD object from parsed FAQ items.
 * Returns null when items is empty.
 */
export function buildFaqSchema(items: FaqItem[]): object | null {
  if (items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
          .replace(/\*\*/g, "")
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
          .trim(),
      },
    })),
  };
}
