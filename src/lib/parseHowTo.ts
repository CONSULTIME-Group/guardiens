/**
 * Parse a "How-To" section from a markdown article.
 *
 * Convention: the section is introduced by an H2 whose title contains
 * « étapes » (e.g. « Comment ça marche concrètement : les 7 étapes d'une garde »).
 * Each step is an H3 (numbered or not) followed by descriptive paragraphs,
 * up to the next H3 or H2.
 *
 * The parser stops at the next H2 to avoid bleeding into the next section.
 */

export interface HowToStep {
  name: string;
  text: string;
}

const STRIP_LEADING_NUM = /^\s*\d+[\.\)]\s*/;

/** Strip markdown emphasis/links and HTML for clean Schema.org text. */
function stripMarkdown(s: string): string {
  return s
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseHowToFromMarkdown(markdown: string): HowToStep[] {
  // Find an H2 line that contains "étapes" (case-insensitive, accent-tolerant)
  const lines = markdown.split("\n");
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+(.+)$/);
    if (m && /étapes?|etapes?/i.test(m[1])) {
      startIdx = i + 1;
      break;
    }
  }
  if (startIdx === -1) return [];

  const steps: HowToStep[] = [];
  let currentName = "";
  let currentBuf: string[] = [];

  const flush = () => {
    if (currentName) {
      const text = stripMarkdown(currentBuf.join(" "));
      if (text) steps.push({ name: currentName, text });
    }
    currentName = "";
    currentBuf = [];
  };

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s+/.test(line)) {
      flush();
      break;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      flush();
      currentName = stripMarkdown(h3[1].replace(STRIP_LEADING_NUM, ""));
      continue;
    }
    if (currentName && line.trim()) {
      // Skip fenced/blockquote/HTML/CTA noise
      if (/^[>`|]/.test(line.trim())) continue;
      if (/^<!--/.test(line.trim())) continue;
      currentBuf.push(line);
    }
  }
  flush();

  return steps;
}

export function buildHowToSchema(
  steps: HowToStep[],
  opts: { name: string; description?: string },
): object | null {
  if (steps.length < 2) return null;
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}
