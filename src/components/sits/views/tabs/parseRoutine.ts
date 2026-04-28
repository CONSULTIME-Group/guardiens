/**
 * Parsing de `daily_routine` en blocs Matin / Midi / Après-midi / Soir / Nuit.
 * Voir tests : src/components/sits/views/__tests__/parseRoutine.test.ts
 */

const normalizeWhitespace = (s: string) =>
  s
    .replace(/[\u00A0\u202F\u2007\u2009\u200A\u200B\u200C\u200D\uFEFF]/g, " ")
    .replace(/\t/g, " ");

const stripBullet = (s: string) =>
  s
    .replace(/^\s*(?:[-*•–—→▪►●·★☆▶▷▸▹»>]+|[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u2600-\u27BF])+\s*/u, "")
    .replace(/^\s*\d+\s*[)°.\-/:]\s*/, "")
    .replace(/^[\s*_`~]+/, "")
    .replace(/[\s*_`~]+$/, "")
    .trim();

const normalizeLabel = (k: string): "Matin" | "Midi" | "Après-midi" | "Soir" | "Nuit" => {
  const low = k
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
  if (low.startsWith("matin")) return "Matin";
  if (low.startsWith("midi")) return "Midi";
  if (low.startsWith("apres") || low.startsWith("aprem")) return "Après-midi";
  if (low.startsWith("nuit")) return "Nuit";
  return "Soir";
};

export const cleanFreeText = (raw: string): string => {
  return raw
    .trim()
    .split(/\r?\n/)
    .map((line) =>
      stripBullet(line)
        .replace(/[ \t]+/g, " ")
        .trim()
        .replace(/[.;,\s]+$/u, ""),
    )
    .filter((line, idx, arr) => {
      if (line.length > 0) return true;
      if (idx === 0 || idx === arr.length - 1) return false;
      return arr[idx - 1].length > 0;
    })
    .join("\n");
};

export const parseRoutine = (raw: string | null) => {
  if (!raw) return null;
  const cleaned = normalizeWhitespace(raw);

  const segments = cleaned
    .split(/\r?\n+|\s*[•|]\s*|\s+\/\s+|\s+[—–]\s+(?=(?:matin|midi|soir|nuit|apr|aprem|apr[èeé]m)\b)|\s*[,;]\s+(?=(?:matin|midi|soir|nuit|apr|aprem|apr[èeé]m)\b)|\s+(?=\d+\s*[)°.\-/:]\s*(?:matin|midi|soir|nuit|apr|aprem|apr[èeé]m)\b)/i)
    .map((l) => stripBullet(l))
    .filter(Boolean);

  const re =
    /^[\s«»"'(\[\{*_`~]*\s*(matin|midi|soir|nuit|apr[èeé]s?[- ]?midi|apr[èeé]m(?:[- ]?midi)?|aprem(?:[- ]?midi)?)\s*[»"'\]\)\}*_`~]*\s*(?:(?:\([^)]*\)|\[[^\]]*\]|\{[^}]*\})\s*)*[—–\-:.\)=→»]?\s*(.*)$/i;

  const blocks: { key: string; label: string; text: string }[] = [];
  const leftover: string[] = [];

  for (const seg of segments) {
    const m = seg.match(re);
    if (m && m[2] && m[2].trim().length > 0) {
      const label = normalizeLabel(m[1]);
      blocks.push({ key: label.toLowerCase(), label, text: m[2].trim().replace(/[.;,]+$/, "") });
    } else if (m && (!m[2] || m[2].trim().length === 0)) {
      continue;
    } else {
      leftover.push(seg);
    }
  }

  if (blocks.length === 0) return null;

  const order = ["matin", "midi", "après-midi", "soir", "nuit"];
  blocks.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

  return { blocks, notes: leftover.join(" ").trim() };
};
