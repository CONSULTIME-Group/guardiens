/**
 * Garde-fou : tout template transactionnel DOIT importer ET utiliser
 * <LegalFooter />, et NE PEUT PAS contenir de bloc légal inline (SIRET ou
 * phrase « Cet e-mail vous est envoyé… ») — la mention RGPD/SIRET doit
 * provenir du composant partagé pour garantir une formulation identique.
 *
 * Règle source : conformité RGPD art. 13 (information uniforme) +
 * mem://security/legal-compliance.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'

const TEMPLATES_DIR = new URL('./', import.meta.url)
const SIRET = '894 864 040 00015'
const INLINE_HINT = 'Email envoyé par'

Deno.test('every transactional template uses shared <LegalFooter />', async () => {
  const missing: string[] = []
  const leftover: string[] = []
  for await (const entry of Deno.readDir(TEMPLATES_DIR)) {
    if (!entry.isFile) continue
    if (!entry.name.endsWith('.tsx')) continue
    if (entry.name.startsWith('_')) continue // helpers
    const src = await Deno.readTextFile(new URL(entry.name, TEMPLATES_DIR))
    const hasImport = src.includes("from './_legal-footer.tsx'")
    const hasUsage = /<LegalFooter[\s/>]/.test(src)
    if (!hasImport || !hasUsage) {
      missing.push(`${entry.name} (import:${hasImport}, usage:${hasUsage})`)
    }
    if (src.includes(SIRET) || src.includes(INLINE_HINT)) {
      leftover.push(entry.name)
    }
  }
  assertEquals(missing.length, 0, `Templates sans <LegalFooter /> :\n${missing.join('\n')}`)
  assertEquals(
    leftover.length, 0,
    `Bloc légal inline encore présent (doit venir du helper) :\n${leftover.join('\n')}`,
  )
})

Deno.test('shared LegalFooter contains canonical SIRET and rights mention', async () => {
  const src = await Deno.readTextFile(new URL('_legal-footer.tsx', TEMPLATES_DIR))
  // SIRET canonique (identifie sans ambiguïté le responsable de traitement)
  assertEquals(src.includes(SIRET), true, 'SIRET canonique manquant dans _legal-footer.tsx')
  // Droits RGPD complets (art. 13)
  assertEquals(
    src.includes("droit d'accès") && src.includes('rectification') &&
      src.includes("d'effacement") && src.includes("d'opposition"),
    true,
    'Mention complète des droits RGPD manquante',
  )
  // Contact pour exercice des droits
  assertEquals(src.includes('contact@guardiens.fr'), true, 'Email contact manquant')
})

