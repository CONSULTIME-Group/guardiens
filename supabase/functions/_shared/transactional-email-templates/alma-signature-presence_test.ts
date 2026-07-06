/**
 * Garde-fou Alma Pass 3 C2 :
 * Les 6 templates signés par Alma DOIVENT importer et utiliser
 * <AlmaSignature /> (header) et <AlmaSignoff /> (footer). Les 3 digests
 * (sitter-daily-digest, mission-daily-digest, sit-draft-reminder) doivent
 * en plus utiliser <AlmaIntro />.
 *
 * Règle source : mem://features/alma-persona (Pass 3 C2) + cohérence visuelle
 * cross-canal de l'assistante Guardiens.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'

const TEMPLATES_DIR = new URL('./', import.meta.url)

const ALMA_SIGNED = [
  'sitter-daily-digest.tsx',
  'mission-daily-digest.tsx',
  'sit-draft-reminder.tsx',
  'owner-no-sit-j3.tsx',
  'owner-no-sit-j10.tsx',
  'owner-no-sit-j21.tsx',
]

const ALMA_WITH_INTRO = new Set([
  'sitter-daily-digest.tsx',
  'mission-daily-digest.tsx',
  'sit-draft-reminder.tsx',
])

Deno.test('Alma-signed templates use <AlmaSignature /> and <AlmaSignoff />', async () => {
  const missing: string[] = []
  for (const name of ALMA_SIGNED) {
    const src = await Deno.readTextFile(new URL(name, TEMPLATES_DIR))
    const hasSig = src.includes("from './_alma-signature.tsx'") && /<AlmaSignature\s*\/?>/.test(src)
    const hasSignoff = src.includes("from './_alma-signoff.tsx'") && /<AlmaSignoff\s*\/?>/.test(src)
    if (!hasSig || !hasSignoff) {
      missing.push(`${name} (signature:${hasSig}, signoff:${hasSignoff})`)
    }
  }
  assertEquals(missing.length, 0, `Templates sans identité Alma :\n${missing.join('\n')}`)
})

Deno.test('Alma digest templates render <AlmaIntro />', async () => {
  const missing: string[] = []
  for (const name of ALMA_WITH_INTRO) {
    const src = await Deno.readTextFile(new URL(name, TEMPLATES_DIR))
    if (!/<AlmaIntro[\s/>]/.test(src)) missing.push(name)
  }
  assertEquals(missing.length, 0, `Digests sans <AlmaIntro /> :\n${missing.join('\n')}`)
})
