import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface Props {
  sitterFirstName?: string
  ownerFirstName?: string
  sitTitle?: string
  sitCity?: string
  sitPeriod?: string
  message?: string
  sitId: string
}

const SitInvitationEmail = ({
  sitterFirstName,
  ownerFirstName,
  sitTitle,
  sitCity,
  sitPeriod,
  message,
  sitId,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>
      {ownerFirstName || 'Un propriétaire'} vous invite à candidater à une garde
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Vous êtes invité(e) à candidater</Heading>

        <Text style={text}>
          Bonjour{sitterFirstName ? ` ${sitterFirstName}` : ''},
        </Text>

        <Text style={text}>
          {ownerFirstName || 'Un propriétaire'} vous invite personnellement à candidater à
          son annonce de garde
          {sitCity ? ` à ${sitCity}` : ''}
          {sitPeriod ? `, ${sitPeriod}` : ''}.
        </Text>

        {message && message.trim().length > 0 && (
          <Section style={card}>
            <Text style={cardTitle}>Son message :</Text>
            <Text style={cardLine}>{message}</Text>
          </Section>
        )}

        <Section style={ctaSection}>
          <Button style={button} href={`${SITE_URL}/sits/${sitId}`}>
            Voir l'annonce
          </Button>
        </Section>

        <Text style={muted}>
          Vous pouvez accepter en candidatant directement depuis la fiche de l'annonce, ou
          ignorer ce message si cette garde ne vous correspond pas.
        </Text>

        <Hr style={hr} />

        <LegalFooter
          purpose="la mise en relation entre propriétaires et gardiens"
          basis="6.1.b"
          extra="Vous recevez ce message car un propriétaire vous a personnellement invité(e) à candidater à sa garde."
        />
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 30%)', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: 'hsl(40, 33%, 96%)', padding: '16px', borderRadius: '10px', margin: '16px 0' }
const cardTitle = { color: 'hsl(153, 42%, 30%)', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }
const cardLine = { color: 'hsl(37, 7%, 30%)', fontSize: '14px', lineHeight: '22px', whiteSpace: 'pre-wrap' as const }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const muted = { color: 'hsl(37, 7%, 50%)', fontSize: '13px', lineHeight: '20px', marginTop: '20px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }

export const template: TemplateEntry = {
  component: SitInvitationEmail,
  subject: (data: Record<string, any>) =>
    `${data.ownerFirstName || 'Un propriétaire'} vous invite à candidater à sa garde`,
  displayName: 'Invitation à candidater (gardien)',
  previewData: {
    sitterFirstName: 'Camille',
    ownerFirstName: 'Marie',
    sitTitle: 'Garde de Plume et Coco',
    sitCity: 'Lyon',
    sitPeriod: 'du 12 au 18 juillet 2026',
    message: "Bonjour Camille,\n\nJe publie une garde à Lyon du 12 au 18 juillet. Votre profil m'a tapé dans l'œil.",
    sitId: 'demo',
  },
}
