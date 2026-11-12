import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { QuickActions } from './_quick-actions.tsx'
import { secondNudgeCopy, secondNudgeSubject } from '../rel1-copy.ts'
import type { TemplateEntry } from './registry.ts'

// Lot REL1 : seconde et dernière relance du propriétaire, une par annonce.
// Textes validés par Jérémie le 12/11/2026, tenus dans rel1-copy.ts.
interface Props {
  ownerFirstName?: string
  sitterFirstName?: string
  sitTitle?: string
  count?: number
  oldestDays?: number
  /** Jour (AAAA-MM-JJ) à partir duquel les candidats sont prévenus. */
  noticeDay?: string
  ctaUrl?: string
  declineUrl?: string
  thinkingUrl?: string
}

const normalize = (data: Props) => ({
  ownerFirstName: data.ownerFirstName,
  sitterFirstName: data.sitterFirstName,
  sitTitle: data.sitTitle,
  count: typeof data.count === 'number' && data.count > 0 ? data.count : 1,
  oldestDays: typeof data.oldestDays === 'number' && data.oldestDays > 0 ? data.oldestDays : 7,
  noticeDay: data.noticeDay ?? '',
})

const OwnerPendingApplicationsSecondNudgeEmail = (props: Props) => {
  const input = normalize(props)
  const copy = secondNudgeCopy(input)
  const single = input.count === 1
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{copy.preview}</Preview>
      <Body style={main}>
        <Container style={container} className="em-container">
          <BrandHeader />
          <Heading style={h1} className="em-h1">{copy.subject}</Heading>
          <Text style={text} className="em-text">{copy.hello}</Text>
          <Text style={text} className="em-text">{copy.intro}</Text>
          <Text style={text} className="em-text">{copy.answer}</Text>
          <Text style={text} className="em-text">{copy.update}</Text>
          {input.noticeDay ? <Text style={text} className="em-text">{copy.notice}</Text> : null}
          <QuickActions
            primaryHref={props.ctaUrl || 'https://guardiens.fr/sits'}
            primaryLabel={copy.button}
            declineUrl={single ? props.declineUrl : undefined}
            thinkingUrl={single ? props.thinkingUrl : undefined}
            thinkingLabel={copy.thinking}
            declineLabel={copy.decline}
          />
          <Hr style={hr} />
          <LegalFooter
            purpose="le suivi des candidatures reçues sur vos annonces"
            basis="6.1.b"
            extra="Cet email est envoyé depuis une adresse qui ne reçoit pas de réponse."
          />
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#f7f5f0', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '14px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#255B42', margin: '0 0 18px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '15px', color: '#44413B', lineHeight: '1.65', margin: '0 0 16px' }
const hr = { borderColor: '#E9E4DD', margin: '24px 0 16px' }

export const template = {
  component: OwnerPendingApplicationsSecondNudgeEmail,
  subject: (data: Record<string, any>) => secondNudgeSubject(normalize(data as Props)),
  displayName: 'Candidatures en attente depuis 7 jours, seconde relance propriétaire',
  previewData: {
    ownerFirstName: 'Claire',
    sitterFirstName: 'Camille',
    sitTitle: 'Garde de deux chats à Annecy',
    count: 1,
    oldestDays: 7,
    noticeDay: '2026-11-15',
    ctaUrl: 'https://guardiens.fr/sits/demo-sit-id#candidatures',
    declineUrl: 'https://guardiens.fr/candidature/reponse?t=exemple-decline',
    thinkingUrl: 'https://guardiens.fr/candidature/reponse?t=exemple-attente',
  },
} satisfies TemplateEntry
