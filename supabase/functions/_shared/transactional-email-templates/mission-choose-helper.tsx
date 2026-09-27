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
  helperFirstName?: string
  missionTitle?: string
  chooseToken?: string
}

const MissionChooseHelperEmail = ({ ownerFirstName, helperFirstName, missionTitle, chooseToken }: Props) => {
  const helper = helperFirstName || 'Cette personne'
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{`C'est ${helper} qui vous aide ?`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{`C'est ${helper} qui vous aide ?`}</Heading>
          <Text style={text}>Bonjour{ownerFirstName ? ` ${ownerFirstName}` : ''},</Text>
          <Text style={text}>
            Vous échangez depuis deux jours avec {helper} au sujet de votre besoin. Si c'est bien {helper} qui
            vous aide, confirmez-le en un clic : le besoin passe en cours et les autres personnes sont prévenues.
          </Text>
          {missionTitle && (
            <Section style={card}>
              <Text style={cardLine}>{missionTitle}</Text>
            </Section>
          )}
          {chooseToken && (
            <Section style={ctaSection}>
              <Button style={button} href={`${SITE_URL}/entraide/choisir?t=${chooseToken}`}>
                {`Choisir ${helper}`}
              </Button>
            </Section>
          )}
          <Text style={muted}>Le lien reste valable 14 jours. Vous pouvez aussi choisir depuis votre messagerie.</Text>
          <Hr style={hr} />
          <LegalFooter
            purpose="le suivi des coups de main entre membres"
            basis="6.1.b"
            extra="Vous recevez ce message car une personne a proposé son aide pour votre demande d'entraide."
          />
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#524E47', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: '#F8F6F1', padding: '16px', borderRadius: '10px', margin: '16px 0' }
const cardLine = { color: '#524E47', fontSize: '15px', lineHeight: '22px', fontWeight: 600 as const }
const ctaSection = { textAlign: 'center' as const, margin: '12px 0' }
const button = {
  backgroundColor: '#2C6D50', color: '#ffffff', padding: '12px 28px', borderRadius: '8px',
  fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block',
}
const muted = { color: '#888277', fontSize: '13px', lineHeight: '20px', marginTop: '20px' }
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }

export const template: TemplateEntry = {
  component: MissionChooseHelperEmail,
  subject: (data: Record<string, unknown>) => `C'est ${(data?.helperFirstName as string) || 'cette personne'} qui vous aide ?`,
  displayName: 'Entraide, choisir la personne (demandeur)',
  previewData: { ownerFirstName: 'Laurence', helperFirstName: 'Karim', missionTitle: 'Nourrir les poules ce week-end', chooseToken: 'demo' },
}
