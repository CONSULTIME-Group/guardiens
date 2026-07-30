import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Hr,
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
  ctaUrl?: string
  declineUrl?: string
  thinkingUrl?: string
}

const OwnerPendingApplicationNudgeEmail = ({
  ownerFirstName,
  sitterFirstName,
  sitTitle,
  daysSince,
  ctaUrl,
  declineUrl,
  thinkingUrl,
}: Props) => {
  const sitter = sitterFirstName || 'Un gardien'
  const days = typeof daysSince === 'number' && daysSince > 0 ? daysSince : 2
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{`${sitter} attend votre réponse`}</Preview>
      <Body style={main}>
        <Container style={container} className="em-container">
          <BrandHeader />

          <Heading style={h1} className="em-h1">{sitter} attend votre réponse</Heading>

          <Text style={text} className="em-text">
            Bonjour{ownerFirstName ? ` ${ownerFirstName}` : ''},
          </Text>

          <Text style={text} className="em-text">
            {sitter} a candidaté à votre annonce «&nbsp;{sitTitle || 'votre annonce'}&nbsp;» il y a{' '}
            {days} jour{days > 1 ? 's' : ''}, et vous n'avez pas encore répondu.
          </Text>

          <Text style={text} className="em-text">
            Une réponse rapide, même brève, aide {sitter} à s'organiser. Prenez un moment pour lui écrire.
          </Text>

          <QuickActions
            primaryHref={ctaUrl || 'https://guardiens.fr/dashboard'}
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
const ctaSection = { textAlign: 'center' as const, margin: '28px 0 12px' }
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '24px 0 16px' }

export const template = {
  component: OwnerPendingApplicationNudgeEmail,
  subject: (data: Record<string, any>) =>
    `${data?.sitterFirstName || 'Un gardien'} attend votre réponse sur Guardiens`,
  displayName: 'Candidature sans réponse, relance propriétaire',
  previewData: {
    ownerFirstName: 'Claire',
    sitterFirstName: 'Camille',
    sitTitle: 'Garde de deux chats à Annecy',
    daysSince: 3,
    ctaUrl: 'https://guardiens.fr/dashboard',
    declineUrl: 'https://guardiens.fr/candidature/reponse?t=exemple-decline',
    thinkingUrl: 'https://guardiens.fr/candidature/reponse?t=exemple-attente',
  },
} satisfies TemplateEntry
