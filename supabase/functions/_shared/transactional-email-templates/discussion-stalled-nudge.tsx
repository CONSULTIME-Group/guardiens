import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { QuickActions } from './_quick-actions.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  ownerFirstName?: string
  sitterFirstName?: string
  sitTitle?: string
  daysSince?: number
  msgCount?: number
  ctaUrl?: string
  declineUrl?: string
  thinkingUrl?: string
}

const DiscussionStalledNudgeEmail = ({
  ownerFirstName,
  sitterFirstName,
  sitTitle,
  daysSince,
  msgCount,
  ctaUrl,
  declineUrl,
  thinkingUrl,
}: Props) => {
  const sitter = sitterFirstName || 'votre gardien'
  const days = typeof daysSince === 'number' && daysSince > 0 ? daysSince : 2
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{`Où en êtes-vous avec ${sitter} ?`}</Preview>
      <Body style={main}>
        <Container style={container} className="em-container">
          <BrandHeader />

          <Heading style={h1} className="em-h1">Où en êtes-vous avec {sitter} ?</Heading>

          <Text style={text} className="em-text">
            Bonjour{ownerFirstName ? ` ${ownerFirstName}` : ''},
          </Text>

          <Text style={text} className="em-text">
            Vous échangez avec {sitter} au sujet de votre annonce
            «&nbsp;{sitTitle || 'votre annonce'}&nbsp;»
            {typeof msgCount === 'number' && msgCount > 1 ? ` (${msgCount} messages)` : ''},
            mais la candidature n'a pas encore été confirmée.
          </Text>

          <Text style={text} className="em-text">
            Si vous vous êtes mis d'accord, peut-être déjà par téléphone, il ne reste qu'une
            étape sur Guardiens : confirmer la candidature de {sitter}. La garde devient alors
            officielle et votre accord de garde (commodat) est prêt à signer en ligne,
            chacun de votre côté.
          </Text>

          <Text style={text} className="em-text">
            Si vos plans ont changé, un simple clic le lui fait savoir : {sitter} pourra
            s'organiser de son côté.
          </Text>

          <QuickActions
            primaryHref={ctaUrl || 'https://guardiens.fr/dashboard/candidatures'}
            primaryLabel={`Confirmer la candidature de ${sitter}`}
            declineUrl={declineUrl}
            thinkingUrl={thinkingUrl}
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
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 25%)', margin: '0 0 18px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '15px', color: 'hsl(37, 7%, 25%)', lineHeight: '1.65', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '24px 0 16px' }

export const template = {
  component: DiscussionStalledNudgeEmail,
  subject: (data: Record<string, any>) =>
    `Où en êtes-vous avec ${data?.sitterFirstName || 'votre gardien'} ?`,
  displayName: 'Discussion engagée sans confirmation, relance propriétaire',
  previewData: {
    ownerFirstName: 'Claire',
    sitterFirstName: 'Camille',
    sitTitle: 'Garde de deux chats à Annecy',
    daysSince: 3,
    msgCount: 6,
    ctaUrl: 'https://guardiens.fr/dashboard/candidatures',
    declineUrl: 'https://guardiens.fr/candidature/reponse?t=exemple-decline',
    thinkingUrl: 'https://guardiens.fr/candidature/reponse?t=exemple-attente',
  },
} satisfies TemplateEntry
