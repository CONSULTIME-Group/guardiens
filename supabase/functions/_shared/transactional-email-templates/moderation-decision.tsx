import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'
import {
  buildModerationDecisionCopy,
  moderationDecisionLine,
  type ModerationAction,
  type ModerationDecisionData,
  type ModerationTarget,
} from '../moderation-decision-copy.ts'

// Lot A9 : décision de modération envoyée au membre concerné. N'affiche que
// le message rédigé pour le membre (reports.member_message), jamais la note
// interne de l'équipe.
// Lot J2c : décision motivée (CGU 14.5) ou avertissement préalable (CGU
// 11.3). Tout le texte vient de buildModerationDecisionCopy, à partir des
// seules données transmises par l'appelant.

export type { ModerationAction, ModerationTarget }
export { moderationDecisionLine }

const ModerationDecisionEmail = (props: ModerationDecisionData) => {
  const copy = buildModerationDecisionCopy(props)
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{copy.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{copy.heading}</Heading>
          <Text style={text}>{copy.greeting}</Text>
          {copy.sections.map((s) => (
            <React.Fragment key={s.key}>
              <Text style={label}>{s.label}</Text>
              {s.lines.map((line, i) => (
                <Text key={i} style={s.key === 'measure' ? decision : value}>{line}</Text>
              ))}
            </React.Fragment>
          ))}
          {copy.memberMessage ? (
            <>
              <Hr style={hr} />
              <Text style={label}>Message de l'équipe :</Text>
              <Text style={noteText}>{copy.memberMessage}</Text>
            </>
          ) : null}
          <Hr style={hr} />
          <Text style={text}>{copy.closing}</Text>
          <LegalFooter purpose="la modération de la communauté" basis="6.1.f" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ModerationDecisionEmail,
  subject: (data: Record<string, any>) => buildModerationDecisionCopy(data as ModerationDecisionData).subject,
  displayName: 'Décision de modération',
  previewData: {
    firstName: 'Camille',
    action: 'suspend',
    targetType: 'profile',
    facts: 'Une rémunération a été demandée à un gardien pour une garde d\'octobre.',
    origin: 'report',
    automated: 'none',
    ruleStatement: 'Article 11.4 des CGU : la demande ou le versement d\'une rémunération pour une garde ou un coup de main fait partie des cas où une mesure prend effet dès sa notification.',
    durationDays: 30,
    untilDate: '2026-11-13',
    conservatory: true,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
const label = { fontSize: '13px', fontWeight: 'bold' as const, color: '#1D1B16', margin: '0 0 4px' }
const value = { fontSize: '14px', color: '#1D1B16', lineHeight: '1.6', margin: '0 0 14px' }
const decision = { fontSize: '15px', color: '#1D1B16', fontWeight: 'bold' as const, lineHeight: '1.6', margin: '0 0 14px' }
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }
const noteText = { fontSize: '14px', color: '#1D1B16', lineHeight: '1.5', margin: '0 0 16px', padding: '12px 16px', backgroundColor: '#F1EEE9', borderRadius: '8px', whiteSpace: 'pre-line' as const }
