/**
 * Garde-fou : tout template transactionnel DOIT contenir <BrandHeader />
 * (wordmark « guardiens » partagé, identique à l'auth).
 *
 * Règle source : cohérence visuelle entre auth et transactionnel.
 * Voir `_brand-header.tsx`.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'

const TEMPLATES_DIR = new URL('./', import.meta.url)

Deno.test('every transactional template has <BrandHeader />', async () => {
  const missing: string[] = []
  for await (const entry of Deno.readDir(TEMPLATES_DIR)) {
    if (!entry.isFile) continue
    if (!entry.name.endsWith('.tsx')) continue
    if (entry.name.startsWith('_')) continue // helpers (_brand-header, _branded-head)
    const src = await Deno.readTextFile(new URL(entry.name, TEMPLATES_DIR))
    const hasImport = src.includes("from './_brand-header.tsx'")
    const hasUsage = /<BrandHeader\s*\/?>/.test(src)
    if (!hasImport || !hasUsage) {
      missing.push(`${entry.name} (import:${hasImport}, usage:${hasUsage})`)
    }
  }
  assertEquals(
    missing.length,
    0,
    `Templates sans <BrandHeader /> :\n${missing.join('\n')}`,
  )
})
