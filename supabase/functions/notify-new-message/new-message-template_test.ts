/**
 * Tests du wording de l'email `new-message`.
 *
 * Vérifie que le SUJET et le TITRE sont correctement inversés selon le rôle
 * du destinataire (owner vs sitter) pour chaque context_type, ET qu'aucun
 * wording "owner" ne fuite vers un destinataire sitter (le bug d'origine où
 * un candidat recevait "X candidate à votre garde").
 *
 * On teste la logique pure (sans React) extraite dans `new-message.logic.ts`
 * — le rendu JSX réutilise EXACTEMENT ces helpers, donc tester la logique
 * suffit à protéger l'invariant.
 *
 * Lancé via le runner Deno (supabase test_edge_functions).
 */

import { assert, assertEquals, assertStringIncludes, assertNotMatch } from 'https://deno.land/std@0.224.0/assert/mod.ts'

import {
  buildLeadSentence,
  buildSubject,
  labelByContext,
  type Context,
  type RecipientRole,
} from '../_shared/transactional-email-templates/new-message.logic.ts'

const SENDER = 'Patricia'

// ---------------------------------------------------------------------------
// Matrice d'attendus : 5 contextes × 2 rôles = 10 cas
// ---------------------------------------------------------------------------
interface Case {
  contextType: Exclude<Context, undefined>
  recipientRole: Exclude<RecipientRole, undefined>
  expectedSubject: string
  expectedTitle: string
  /** Sous-chaînes qui doivent apparaître dans la phrase d'accroche. */
  leadIncludes: string[]
  /** Sous-chaînes interdites (anti-régression wording inversé). */
  leadExcludes?: string[]
}

const cases: Case[] = [
  // --- sit_application ---------------------------------------------------
  {
    contextType: 'sit_application',
    recipientRole: 'owner',
    expectedSubject: `${SENDER} candidate à votre garde`,
    expectedTitle: 'Nouvelle candidature',
    leadIncludes: ['a candidaté'],
    leadExcludes: ['vous a répondu'],
  },
  {
    contextType: 'sit_application',
    recipientRole: 'sitter',
    expectedSubject: `${SENDER} a répondu à votre candidature`,
    expectedTitle: 'Réponse à votre candidature',
    leadIncludes: ['vous a répondu'],
    // INVARIANT CRITIQUE : un sitter ne doit JAMAIS recevoir le wording owner
    leadExcludes: ['a candidaté', 'candidate à votre garde'],
  },

  // --- sitter_inquiry ----------------------------------------------------
  {
    contextType: 'sitter_inquiry',
    recipientRole: 'sitter',
    expectedSubject: `${SENDER} souhaite connaître vos disponibilités`,
    expectedTitle: 'Un propriétaire vous contacte',
    leadIncludes: ['vous a envoyé un message'],
  },
  {
    contextType: 'sitter_inquiry',
    recipientRole: 'owner',
    expectedSubject: `${SENDER} vous a répondu`,
    expectedTitle: 'Demande de disponibilité',
    leadIncludes: ['vous a envoyé un message'],
  },

  // --- mission_help ------------------------------------------------------
  {
    contextType: 'mission_help',
    recipientRole: 'owner',
    expectedSubject: `${SENDER} propose son aide pour votre mission`,
    expectedTitle: "Proposition d'entraide",
    leadIncludes: ['vous propose son aide'],
    leadExcludes: ['vous a répondu'],
  },
  {
    contextType: 'mission_help',
    recipientRole: 'sitter',
    expectedSubject: `${SENDER} a répondu à votre proposition`,
    expectedTitle: 'Réponse à votre proposition',
    leadIncludes: ['vous a répondu'],
    leadExcludes: ['vous propose son aide'],
  },

  // --- helper_inquiry (pas de variation par rôle attendue) ---------------
  {
    contextType: 'helper_inquiry',
    recipientRole: 'sitter',
    expectedSubject: `${SENDER} vous a envoyé un message`,
    expectedTitle: "Nouveau message d'entraide",
    leadIncludes: ['vous a envoyé un message'],
  },
  {
    contextType: 'helper_inquiry',
    recipientRole: 'owner',
    expectedSubject: `${SENDER} vous a envoyé un message`,
    expectedTitle: "Nouveau message d'entraide",
    leadIncludes: ['vous a envoyé un message'],
  },

  // --- owner_pitch -------------------------------------------------------
  {
    contextType: 'owner_pitch',
    recipientRole: 'owner',
    expectedSubject: `${SENDER} souhaite vous proposer ses services`,
    expectedTitle: 'Un gardien vous contacte',
    leadIncludes: ['vous a envoyé un message'],
  },
  {
    contextType: 'owner_pitch',
    recipientRole: 'sitter',
    expectedSubject: `${SENDER} vous a répondu`,
    expectedTitle: 'Réponse à votre message',
    leadIncludes: ['vous a envoyé un message'],
    leadExcludes: ['souhaite vous proposer ses services'],
  },
]

// ---------------------------------------------------------------------------
// Tests générés par cas — un Deno.test par combinaison pour un diagnostic
// fin en cas d'échec.
// ---------------------------------------------------------------------------
for (const c of cases) {
  const id = `${c.contextType} → ${c.recipientRole}`

  Deno.test(`subject — ${id}`, () => {
    assertEquals(
      buildSubject({ senderFirstName: SENDER, contextType: c.contextType, recipientRole: c.recipientRole }),
      c.expectedSubject,
    )
  })

  Deno.test(`title (header) — ${id}`, () => {
    const { title } = labelByContext(c.contextType, c.recipientRole)
    assertEquals(title, c.expectedTitle)
  })

  Deno.test(`lead sentence — ${id}`, () => {
    const lead = buildLeadSentence(SENDER, c.contextType, c.recipientRole, undefined)
    for (const needle of c.leadIncludes) {
      assertStringIncludes(lead, needle, `lead "${lead}" devrait contenir "${needle}"`)
    }
    for (const banned of (c.leadExcludes ?? [])) {
      assertNotMatch(
        lead,
        new RegExp(banned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        `lead "${lead}" ne doit PAS contenir "${banned}"`,
      )
    }
  })
}

// ---------------------------------------------------------------------------
// Tests transverses
// ---------------------------------------------------------------------------

Deno.test('lead sentence — inclut le contextLabel quand fourni (owner sit_application)', () => {
  const lead = buildLeadSentence(SENDER, 'sit_application', 'owner', 'votre annonce « Garde de Léo »')
  assertStringIncludes(lead, 'votre annonce « Garde de Léo »')
  assertStringIncludes(lead, 'a candidaté')
})

Deno.test('lead sentence — sitter reçoit "l\'annonce" et non "votre annonce"', () => {
  // Le contextLabel est construit côté notify-new-message avec le bon possessif.
  const lead = buildLeadSentence(SENDER, 'sit_application', 'sitter', 'l\'annonce « Garde de Léo »')
  assertStringIncludes(lead, 'vous a répondu')
  assertStringIncludes(lead, "l'annonce")
  assertNotMatch(lead, /votre annonce/)
})

Deno.test('subject — fallback "Un membre" quand pas de prénom', () => {
  assertEquals(
    buildSubject({ contextType: 'sit_application', recipientRole: 'owner' }),
    'Un membre candidate à votre garde',
  )
})

Deno.test('subject — fallback générique pour contextType inconnu', () => {
  assertEquals(
    // deno-lint-ignore no-explicit-any
    buildSubject({ senderFirstName: SENDER, contextType: 'bogus' as any, recipientRole: 'owner' }),
    `Vous avez un nouveau message de ${SENDER}`,
  )
})

Deno.test('subject — fallback générique si recipientRole manquant (sit_application)', () => {
  // Sans rôle on retombe sur le wording "owner" par défaut.
  // Important : c'est à notify-new-message de TOUJOURS fournir recipientRole ;
  // ce test documente le comportement de fallback.
  assertEquals(
    buildSubject({ senderFirstName: SENDER, contextType: 'sit_application' }),
    `${SENDER} candidate à votre garde`,
  )
})

Deno.test('label — contextType undefined retombe sur "Nouveau message"', () => {
  const { title } = labelByContext(undefined, undefined)
  assertEquals(title, 'Nouveau message')
})

// ---------------------------------------------------------------------------
// Garantie de couverture : la matrice couvre TOUTES les combinaisons.
// ---------------------------------------------------------------------------
Deno.test('matrice — toutes les combinaisons rôle × contexte sont testées', () => {
  const allContexts: Array<Exclude<Context, undefined>> = [
    'sit_application', 'sitter_inquiry', 'mission_help', 'helper_inquiry', 'owner_pitch',
  ]
  const allRoles: Array<Exclude<RecipientRole, undefined>> = ['owner', 'sitter']
  for (const ctx of allContexts) {
    for (const role of allRoles) {
      const found = cases.some(c => c.contextType === ctx && c.recipientRole === role)
      assert(found, `Cas manquant dans la matrice : ${ctx} / ${role}`)
    }
  }
  assertEquals(cases.length, allContexts.length * allRoles.length)
})
