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
  ownerFirstName?: string
  missionTitle?: string
  missionId?: string
  message?: string
}

const MissionWaveStatusEmail = ({ ownerFirstName, missionTitle, missionId, message }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Des nouvelles de votre demande d'entraide</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Des nouvelles de votre demande</Heading>

        <Text style={text}>Bonjour{ownerFirstName ? ` ${ownerFirstName}` : ''},</Text>

        {missionTitle && <Text style={cardLine}>{missionTitle}</Text>}

        <Text style={text}>{message}</Text>

        {missionId && (
          <Section style={ctaSection}>
            <Button style={button} href={`${SITE_URL}/petites-missions/${missionId}`}>
              Voir ma demande
            </Button>
          </Section>
        )}

        <Hr style={hr} />

        <LegalFooter
          purpose="le suivi de votre demande d'entraide"
          basis="6.1.b"
          extra="Vous recevez ce message car vous avez publié une demande d'entraide sur Guardiens."
        />
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#524E47', lineHeight: '1.6', margin: '0 0 16px' }
const cardLine = { color: '#2C6D50', fontSize: '15px', lineHeight: '22px', fontWeight: 600 as const }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = {
  backgroundColor: '#2C6D50',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }

export const template: TemplateEntry = {
  component: MissionWaveStatusEmail,
  subject: 'Des nouvelles de votre demande d\u2019entraide',
  displayName: 'Entraide, suivi des vagues (demandeur)',
  previewData: {
    ownerFirstName: 'Marie',
    missionTitle: 'Promener Filou samedi après-midi',
    missionId: 'demo',
    message: "Personne n'a encore pu, on prévient dix autres personnes du coin.",
  },
}
