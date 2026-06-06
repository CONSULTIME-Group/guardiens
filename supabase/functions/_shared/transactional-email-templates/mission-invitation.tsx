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
  helperFirstName?: string
  ownerFirstName?: string
  missionTitle?: string
  missionCity?: string
  missionId: string
}

const MissionInvitationEmail = ({
  helperFirstName,
  ownerFirstName,
  missionTitle,
  missionCity,
  missionId,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>
      {ownerFirstName || 'Un membre du coin'} vous propose un coup de main
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Un coup de main qui vous correspond</Heading>

        <Text style={text}>
          Bonjour{helperFirstName ? ` ${helperFirstName}` : ''},
        </Text>

        <Text style={text}>
          {ownerFirstName || 'Un membre du coin'} vient de publier une petite mission
          {missionCity ? ` à ${missionCity}` : ''} et vous invite personnellement à donner
          un coup de main. Vos compétences correspondent à sa demande.
        </Text>

        {missionTitle && (
          <Section style={card}>
            <Text style={cardTitle}>La demande :</Text>
            <Text style={cardLine}>{missionTitle}</Text>
          </Section>
        )}

        <Section style={ctaSection}>
          <Button style={button} href={`${SITE_URL}/petites-missions/${missionId}?invited=1`}>
            Voir la mission
          </Button>
        </Section>

        <Text style={muted}>
          L'entraide est gratuite, sans transaction financière. Si cette mission ne vous
          correspond pas, vous pouvez simplement ignorer ce message.
        </Text>

        <Hr style={hr} />

        <LegalFooter
          purpose="de la mise en relation pour l'entraide entre membres"
          basis="6.1.b"
          extra="Vous recevez ce message car un membre du coin vous a personnellement invité(e) à donner un coup de main."
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
  component: MissionInvitationEmail,
  subject: (data: Record<string, any>) =>
    `${data.ownerFirstName || 'Un membre du coin'} vous propose un coup de main — Guardiens`,
  displayName: "Invitation à une petite mission (aidant)",
  previewData: {
    helperFirstName: 'Camille',
    ownerFirstName: 'Marie',
    missionTitle: 'Promener Filou 3 fois cette semaine',
    missionCity: 'Lyon',
    missionId: 'demo',
  },
}
