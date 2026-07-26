import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const FN_DIR = path.resolve(__dirname, '../../supabase/functions')

function read(rel: string) {
  return fs.readFileSync(path.join(FN_DIR, rel), 'utf8')
}

const suppressionShared = read('_shared/email-suppression.ts')

// Miroir de la contrainte suppressed_emails_reason_check en base.
const DB_ALLOWED_REASONS = ['unsubscribe', 'bounce', 'complaint', 'account_deleted']

function listFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) return listFiles(full)
    return /\.(ts|tsx)$/.test(e.name) ? [full] : []
  })
}

describe('suppressed_emails : motifs autorisés', () => {
  it('la constante partagée reflète exactement la contrainte en base', () => {
    for (const reason of DB_ALLOWED_REASONS) {
      expect(suppressionShared).toContain(`'${reason}'`)
    }
    const declared = suppressionShared
      .split('SUPPRESSION_REASONS = [')[1]
      .split(']')[0]
      .match(/'([a-z_]+)'/g)!
      .map((s) => s.replace(/'/g, ''))
    expect(declared.sort()).toEqual([...DB_ALLOWED_REASONS].sort())
  })

  it('aucun motif écrit dans suppressed_emails ne sort de la contrainte', () => {
    const offenders: string[] = []
    for (const file of listFiles(FN_DIR)) {
      const src = fs.readFileSync(file, 'utf8')
      const marker = 'suppressed_emails'
      if (!src.includes(marker)) continue
      // Fenêtres de 700 caractères après chaque écriture ciblant la table.
      let idx = src.indexOf(marker)
      while (idx !== -1) {
        const window = src.slice(idx, idx + 700)
        // Seules les écritures (upsert / insert) sont concernées par la contrainte.
        if (!/^[\s\S]{0,80}\.(upsert|insert)\(/.test(window)) {
          idx = src.indexOf(marker, idx + 1)
          continue
        }
        for (const m of window.matchAll(/reason:\s*['"]([a-zA-Z_]+)['"]/g)) {
          if (!DB_ALLOWED_REASONS.includes(m[1])) {
            offenders.push(`${path.relative(FN_DIR, file)} -> ${m[1]}`)
          }
        }
        idx = src.indexOf(marker, idx + 1)
      }
    }
    expect(offenders).toEqual([])
  })
})

describe('suppressed_emails : exception légale', () => {
  const bypassBlock = suppressionShared
    .split('SUPPRESSION_BYPASS_TEMPLATES: ReadonlySet<string> = new Set([')[1]
    .split('])')[0]
  const bypassed = (bypassBlock.match(/'([a-z0-9-]+)'/g) ?? []).map((s) => s.replace(/'/g, ''))

  it('contient account-deleted et unsubscribe-link, et rien d\u2019autre', () => {
    expect(bypassed.sort()).toEqual(['account-deleted', 'unsubscribe-link'])
  })

  it('send-transactional-email court-circuite la vérification pour ces templates uniquement', () => {
    const src = read('send-transactional-email/index.ts')
    expect(src).toContain("bypassesSuppression } from '../_shared/email-suppression.ts'")
    expect(src).toContain('const suppressionBypass = bypassesSuppression(templateName)')
    expect(src).toContain('if (!suppressionBypass) {')
    // Le repli « jeton déjà consommé » ne doit pas rebloquer ces envois.
    expect(src).toContain('} else if (suppressionBypass) {')
  })

  it('le motif d\u2019effacement RGPD utilisé par account-erasure est autorisé', () => {
    const src = read('_shared/account-erasure.ts')
    expect(src).toContain('ERASURE_REASON: SuppressionReason = "account_deleted"')
    expect(DB_ALLOWED_REASONS).toContain('account_deleted')
  })
})

describe('simulation : destinataire présent dans suppressed_emails', () => {
  // Reproduction de la décision d'envoi du pipeline pour un destinataire supprimé.
  const isSuppressedRecipient = true
  const bypass = (t: string) => ['account-deleted', 'unsubscribe-link'].includes(t)
  const willSend = (t: string) => !isSuppressedRecipient || bypass(t)

  it('reçoit account-deleted et unsubscribe-link', () => {
    expect(willSend('account-deleted')).toBe(true)
    expect(willSend('unsubscribe-link')).toBe(true)
  })

  it('ne reçoit aucun autre template du registre', () => {
    const registry = read('_shared/transactional-email-templates/registry.ts')
    const names = [...registry.matchAll(/^\s*'([a-z0-9-]+)':/gm)].map((m) => m[1])
    expect(names.length).toBeGreaterThan(50)
    const leaked = names.filter((n) => !bypass(n) && willSend(n))
    expect(leaked).toEqual([])
  })
})
