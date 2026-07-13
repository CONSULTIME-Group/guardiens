/**
 * Garde-fou : tous les subjects des emails transactionnels doivent respecter
 * la même charte que l'auth :
 * - Pas d'emoji ni d'icône
 * - Pas de point d'exclamation « ! »
 * - Apostrophe typographique « ’ » (pas « ' »)
 * - Pas de tiret cadratin ni demi-cadratin (ponctuation projet)
 */
import { assert } from 'jsr:@std/assert@1'
import { TEMPLATES } from './registry.ts'

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u2705\u2713\u2714\u270C\u2B50\u2B55\uFE0F]/u

function resolveSubject(entry: any, sample: Record<string, any>): string {
  const s = entry.subject
  if (typeof s === 'function') return s(sample || {})
  return String(s)
}

// Quelques jeux de données pour exercer les branches
const SAMPLES: Record<string, Record<string, any>[]> = {
  'new-message': [
    { senderFirstName: 'Marie', contextType: 'sit_application', recipientRole: 'sitter' },
    { senderFirstName: 'Marie', contextType: 'sit_application', recipientRole: 'owner' },
    { senderFirstName: 'Marie', contextType: 'sitter_inquiry', recipientRole: 'sitter' },
    { senderFirstName: 'Marie', contextType: 'sitter_inquiry', recipientRole: 'owner' },
    { senderFirstName: 'Marie', contextType: 'mission_help', recipientRole: 'owner' },
    { senderFirstName: 'Marie', contextType: 'mission_help', recipientRole: 'sitter' },
    { senderFirstName: 'Marie', contextType: 'helper_inquiry' },
    { senderFirstName: 'Marie', contextType: 'owner_pitch', recipientRole: 'owner' },
    { senderFirstName: 'Marie', contextType: 'owner_pitch', recipientRole: 'sitter' },
    { senderFirstName: 'Marie', contextType: 'unknown' },
  ],
  'dispute-resolved': [{ decision: 'accepted' }, { decision: 'rejected' }],
  'review-received': [{ reviewerName: 'Marie' }, {}],
  'review-reminder': [{ revieweeName: 'Marie' }, {}],
  'sit-confirmed': [{ sitterFirstName: 'Marie' }, {}],
  'nearby-sit-alert': [{ city: 'Lyon' }, {}],
  'availability-nudge': [{ city: 'Lyon' }, {}],
}

Deno.test('subjects respectent la charte', () => {
  const violations: string[] = []
  for (const [name, entry] of Object.entries(TEMPLATES)) {
    const samples = SAMPLES[name] || [entry.previewData || {}]
    for (const data of samples) {
      let subject = ''
      try {
        subject = resolveSubject(entry, data)
      } catch (e) {
        violations.push(`${name}: erreur subject(${JSON.stringify(data)}) -> ${e}`)
        continue
      }
      if (EMOJI_RE.test(subject)) violations.push(`${name}: emoji détecté -> "${subject}"`)
      if (subject.includes('!')) violations.push(`${name}: « ! » interdit -> "${subject}"`)
      if (/(^|[^A-Za-z])'/.test(subject) || /'[A-Za-zÀ-ÿ]/.test(subject)) {
        // détecter apostrophe droite entre lettres ou en début de mot
        if (subject.includes("'")) violations.push(`${name}: apostrophe droite -> "${subject}"`)
      }
      // Interdiction du tiret cadratin dans les subjects (règle de ponctuation projet)
      if (subject.includes('\u2014') || subject.includes('\u2013')) {
        violations.push(`${name}: tiret cadratin/demi-cadratin interdit -> "${subject}"`)
      }
    }
  }
  assert(violations.length === 0, '\n' + violations.join('\n'))
})
