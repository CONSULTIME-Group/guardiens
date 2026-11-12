import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import { OWNER_SILENT_LINK, OWNER_SILENT_SUBJECT, ownerSilentCopy } from '../rel1-copy.ts'
import type { TemplateEntry } from './registry.ts'

// Lot REL1 : message unique au candidat, à 10 jours sans réponse du propriétaire.
// Trois formulations validées par Jérémie le 12/11/2026 (rel1-copy.ts), une
// candidature reçoit toujours la même.
interface Props {
  sitterFirstName?: string
  sitTitle?: string
  sitCity?: string
  days?: number
  variant?: number
}

const ApplicationOwnerSilentEmail = ({ sitterFirstName, sitTitle, sitCity, days, variant }: Props) => {
  const copy = ownerSilentCopy({
    sitterFirstName, sitTitle, sitCity,
    days: typeof days === 'number' && days > 0 ? days : 10,
    variant: typeof variant === 'number' ? variant : 0,
  })
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{copy.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{copy.subject}</Heading>
          <Text style={text}>{copy.hello}</Text>
          <Text style={text}>{copy.first}</Text>
          <Text style={text}>{copy.second}</Text>
          <Section style={ctaSection}>
            <Button style={button} href={`https://guardiens.fr${OWNER_SILENT_LINK}`}>{copy.button}</Button>
          </Section>
          <Hr style={hr} />
          <LegalFooter purpose="la gestion de votre candidature" basis="6.1.b" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ApplicationOwnerSilentEmail,
  subject: OWNER_SILENT_SUBJECT,
  displayName: 'Candidature en attente, réponse du propriétaire attendue',
  previewData: {
    sitterFirstName: 'Camille',
    sitTitle: 'Garde de deux chats à Annecy',
    sitCity: 'Annecy',
    days: 10,
    variant: 0,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#f7f5f0', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '14px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#255B42', margin: '0 0 18px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '15px', color: '#44413B', lineHeight: '1.65', margin: '0 0 16px' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0 12px' }
const button = {
  backgroundColor: '#2C6D50',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#E9E4DD', margin: '24px 0 16px' }
