/**
 * Garde-fou : aucun emoji ni caractère décoratif (✓/✔) dans les templates
 * d'emails transactionnels (composants .tsx, sujets, previews).
 *
 * Règle source : mem://constraints/no-icons-in-content
 * Pas d'emojis dans le contenu rédactionnel ni dans les subjects.
 *
 * Exécuter via : `deno test supabase/functions/_shared/transactional-email-templates/no-emoji-in-templates_test.ts`
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'

const TEMPLATES_DIR = new URL('./', import.meta.url)

// Plage Unicode emoji + symboles décoratifs Guardiens (✓ ✔ inclus)
const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u2705\u2713\u2714\u270C\uFE0F]/u

Deno.test('no emoji in transactional email templates', async () => {
  const violations: string[] = []
  for await (const entry of Deno.readDir(TEMPLATES_DIR)) {
    if (!entry.isFile || !entry.name.endsWith('.tsx')) continue
    const path = new URL(entry.name, TEMPLATES_DIR)
    const src = await Deno.readTextFile(path)
    src.split('\n').forEach((line, i) => {
      if (EMOJI_RE.test(line)) {
        violations.push(`${entry.name}:${i + 1}: ${line.trim()}`)
      }
    })
  }
  assertEquals(
    violations.length,
    0,
    `Emojis interdits trouvés (mem://constraints/no-icons-in-content):\n${violations.join('\n')}`,
  )
})
