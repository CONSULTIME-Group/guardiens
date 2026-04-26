/**
 * Tests du template `new-message` :
 * vérifie que le sujet ET le rendu HTML sont correctement inversés selon
 * le rôle du destinataire (owner vs sitter) pour chaque context_type.
 *
 * Lancé via `supabase--test_edge_functions` (Deno test runner).
 */

import { assert, assertEquals, assertStringIncludes, assertNotMatch } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { renderToStaticMarkup } from 'npm:react-dom@18.3.1/server'
import * as React from 'npm:react@18.3.1'

import { template } from '../_shared/transactional-email-templates/new-message.tsx'

type ContextType = 'sit_application' | 'sitter_inquiry' | 'mission_help' | 'helper_inquiry' | 'owner_pitch'
type RecipientRole = 'owner' | 'sitter'

interface Case {
  contextType: ContextType
  recipientRole: RecipientRole
  /** Sujet attendu (exact). */
  expectedSubject: string
  /** Fragments qui DOIVENT apparaître dans le HTML rendu. */
  htmlIncludes: string[]
  /** Fragments qui ne DOIVENT PAS apparaître (anti-régression wording inversé). */
  htmlExcludes?: string[]
}

const SENDER = 'Patricia'
const baseData = (c: Case) => ({
  senderFirstName: SENDER,
  conversationId: 'conv-123',
  contextType: c.contextType,
  recipientRole: c.recipientRole,
  contextLabel:
    c.contextType === 'sit_application'
      ? (c.recipientRole === 'owner' ? 'votre annonce « Garde de Léo »' : 'l\'annonce « Garde de Léo »')
      : c.contextType === 'mission_help'
        ? (c.recipientRole === 'owner' ? 'votre mission « Promener Rex »' : 'la mission « Promener Rex »')
        : undefined,
  contextCity: 'Lyon',
  contextDates: '14 juin → 28 juin 2026',
  messagePreview: 'Bonjour, seriez-vous disponible ?',
})

const renderSubject = (data: Record<string, any>): string => {
  const s = template.subject
  return typeof s === 'function' ? s(data) : s
}

const renderHtml = (data: Record<string, any>): string => {
  const el = React.createElement(template.component, data)
  return renderToStaticMarkup(el as any)
}

// ---------------------------------------------------------------------------
// MATRICE complète : 5 contextes × 2 rôles
// ---------------------------------------------------------------------------
const cases: Case[] = [
  // --- sit_application ---------------------------------------------------
  {
    contextType: 'sit_application',
    recipientRole: 'owner',
    expectedSubject: `${SENDER} candidate à votre garde`,
    htmlIncludes: ['Nouvelle candidature', 'a candidaté', 'votre annonce'],
    htmlExcludes: ['Réponse à votre candidature', 'vous a répondu'],
  },
  {
    contextType: 'sit_application',
    recipientRole: 'sitter',
    expectedSubject: `${SENDER} a répondu à votre candidature`,
    htmlIncludes: ['Réponse à votre candidature', 'vous a répondu', 'l&#x27;annonce'],
    // Anti-régression critique : le sitter ne doit JAMAIS recevoir le wording owner
    htmlExcludes: ['candidate à votre garde', 'Nouvelle candidature', 'votre annonce'],
  },

  // --- sitter_inquiry ----------------------------------------------------
  {
    contextType: 'sitter_inquiry',
    recipientRole: 'sitter',
    expectedSubject: `${SENDER} souhaite connaître vos disponibilités`,
    htmlIncludes: ['Un propriétaire vous contacte'],
    htmlExcludes: ['Demande de disponibilité', 'vous a répondu'],
  },
  {
    contextType: 'sitter_inquiry',
    recipientRole: 'owner',
    expectedSubject: `${SENDER} vous a répondu`,
    htmlIncludes: ['Demande de disponibilité'],
    htmlExcludes: ['Un propriétaire vous contacte'],
  },

  // --- mission_help ------------------------------------------------------
  {
    contextType: 'mission_help',
    recipientRole: 'owner',
    expectedSubject: `${SENDER} propose son aide pour votre mission`,
    htmlIncludes: ['Proposition d', 'vous propose son aide', 'votre mission'],
    htmlExcludes: ['Réponse à votre proposition'],
  },
  {
    contextType: 'mission_help',
    recipientRole: 'sitter',
    expectedSubject: `${SENDER} a répondu à votre proposition`,
    htmlIncludes: ['Réponse à votre proposition', 'vous a répondu', 'la mission'],
    htmlExcludes: ['vous propose son aide', 'votre mission'],
  },

  // --- helper_inquiry (pas de variation par rôle attendue) ---------------
  {
    contextType: 'helper_inquiry',
    recipientRole: 'sitter',
    expectedSubject: `${SENDER} vous a envoyé un message`,
    htmlIncludes: ['Nouveau message d'],
  },
  {
    contextType: 'helper_inquiry',
    recipientRole: 'owner',
    expectedSubject: `${SENDER} vous a envoyé un message`,
    htmlIncludes: ['Nouveau message d'],
  },

  // --- owner_pitch -------------------------------------------------------
  {
    contextType: 'owner_pitch',
    recipientRole: 'owner',
    expectedSubject: `${SENDER} souhaite vous proposer ses services`,
    htmlIncludes: ['Un gardien vous contacte'],
    htmlExcludes: ['Réponse à votre message'],
  },
  {
    contextType: 'owner_pitch',
    recipientRole: 'sitter',
    expectedSubject: `${SENDER} vous a répondu`,
    htmlIncludes: ['Réponse à votre message'],
    htmlExcludes: ['Un gardien vous contacte', 'souhaite vous proposer ses services'],
  },
]

// Tests générés dynamiquement pour avoir un cas Deno.test par combinaison
for (const c of cases) {
  const id = `${c.contextType} + recipient=${c.recipientRole}`

  Deno.test(`subject: ${id}`, () => {
    const data = baseData(c)
    assertEquals(renderSubject(data), c.expectedSubject, `Sujet incorrect pour ${id}`)
  })

  Deno.test(`html: ${id}`, () => {
    const data = baseData(c)
    const html = renderHtml(data)
    for (const needle of c.htmlIncludes) {
      assertStringIncludes(html, needle, `HTML doit contenir "${needle}" pour ${id}`)
    }
    for (const banned of c.htmlExcludes ?? []) {
      assertNotMatch(html, new RegExp(banned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        `HTML ne doit PAS contenir "${banned}" pour ${id}`)
    }
  })
}

// ---------------------------------------------------------------------------
// Tests transverses : détails (ville/dates) et fallbacks
// ---------------------------------------------------------------------------

Deno.test('html: affiche ville et dates quand fournies', () => {
  const html = renderHtml({
    senderFirstName: SENDER,
    contextType: 'sit_application',
    recipientRole: 'owner',
    contextLabel: 'votre annonce « X »',
    contextCity: 'Schweighouse-sur-Moder',
    contextDates: '14 juin → 28 juin 2026',
  })
  assertStringIncludes(html, 'Schweighouse-sur-Moder')
  assertStringIncludes(html, '14 juin')
  assertStringIncludes(html, '28 juin 2026')
  assertStringIncludes(html, 'Lieu')
  assertStringIncludes(html, 'Dates')
})

Deno.test('html: pas de bloc détails si ni ville ni dates', () => {
  const html = renderHtml({
    senderFirstName: SENDER,
    contextType: 'sit_application',
    recipientRole: 'owner',
    contextLabel: 'votre annonce « X »',
  })
  assertNotMatch(html, /Lieu\s*:/)
  assertNotMatch(html, /Dates\s*:/)
})

Deno.test('subject: fallback si contextType inconnu', () => {
  const subj = renderSubject({ senderFirstName: SENDER, contextType: 'unknown_ctx' })
  assertEquals(subj, `Vous avez un nouveau message de ${SENDER}`)
})

Deno.test('subject: fallback "Un membre" si pas de prénom', () => {
  const subj = renderSubject({ contextType: 'sit_application', recipientRole: 'owner' })
  assertEquals(subj, 'Un membre candidate à votre garde')
})

Deno.test('html: lien CTA pointe vers la conversation', () => {
  const html = renderHtml({
    senderFirstName: SENDER,
    conversationId: 'conv-abc',
    contextType: 'sit_application',
    recipientRole: 'owner',
  })
  assertStringIncludes(html, '/messages?c=conv-abc')
})

Deno.test('html: aperçu du message rendu entre guillemets', () => {
  const html = renderHtml({
    senderFirstName: SENDER,
    contextType: 'sit_application',
    recipientRole: 'sitter',
    messagePreview: 'Coucou test',
  })
  assertStringIncludes(html, 'Coucou test')
})

// ---------------------------------------------------------------------------
// Garantie de couverture : la matrice couvre bien toutes les combinaisons
// ---------------------------------------------------------------------------
Deno.test('matrice: toutes les combinaisons rôle × contexte sont testées', () => {
  const expected: ContextType[] = ['sit_application', 'sitter_inquiry', 'mission_help', 'helper_inquiry', 'owner_pitch']
  const roles: RecipientRole[] = ['owner', 'sitter']
  for (const ctx of expected) {
    for (const role of roles) {
      const found = cases.some(c => c.contextType === ctx && c.recipientRole === role)
      assert(found, `Cas manquant : ${ctx} / ${role}`)
    }
  }
})
