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
  yesToken?: string
  noToken?: string
}

const MissionMeetupConfirmHelperEmail = ({
  helperFirstName,
  ownerFirstName,
  missionTitle,
  missionCity,
  yesToken,
  noToken,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Vous vous êtes rencontrés ?</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Vous vous êtes rencontrés ?</Heading>

        <Text style={text}>Bonjour{helperFirstName ? ` ${helperFirstName}` : ''},</Text>

        <Text style={text}>
          Vous avez dit « Je peux » à {ownerFirstName || 'une personne du coin'}. Dites-nous en un
          clic comment cela s'est passé.
        </Text>

        {missionTitle && (
          <Section style={card}>
            <Text style={cardLine}>{missionTitle}</Text>
            {missionCity && <Text style={cardCity}>{missionCity}</Text>}
          </Section>
        )}

        {yesToken && (
          <Section style={ctaSection}>
            <Button style={button} href={`${SITE_URL}/entraide/je-peux?a=rencontre&t=${yesToken}`}>
              Oui, c'est fait
            </Button>
          </Section>
        )}

        {noToken && (
          <Section style={ctaSection}>
            <Button style={buttonGhost} href={`${SITE_URL}/entraide/je-peux?a=rencontre&t=${noToken}`}>
              Ça ne s'est pas fait
            </Button>
          </Section>
        )}

        <Text style={muted}>
          Votre réponse tient en un clic. Vous pourrez y ajouter un mot sur{' '}
          {ownerFirstName || 'la personne'}, si vous le souhaitez.
        </Text>

        <Hr style={hr} />

        <LegalFooter
          purpose="le suivi des coups de main entre membres"
          basis="6.1.b"
          extra="Vous recevez ce message car vous avez répondu « Je peux » à un besoin d'entraide."
        />
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#524E47', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: '#F8F6F1', padding: '16px', borderRadius: '10px', margin: '16px 0' }
const cardLine = { color: '#524E47', fontSize: '15px', lineHeight: '22px', fontWeight: 600 as const }
const cardCity = { color: '#888277', fontSize: '13px', lineHeight: '20px', margin: '6px 0 0' }
const ctaSection = { textAlign: 'center' as const, margin: '12px 0' }
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
const buttonGhost = { ...button, backgroundColor: '#F8F6F1', color: '#2C6D50' }
const muted = { color: '#888277', fontSize: '13px', lineHeight: '20px', marginTop: '20px' }
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }

export const template: TemplateEntry = {
  component: MissionMeetupConfirmHelperEmail,
  subject: 'Vous vous êtes rencontrés ?',
  displayName: 'Entraide, fin d\u2019échange (personne qui aide)',
  previewData: {
    helperFirstName: 'Karim',
    ownerFirstName: 'Laurence',
    missionTitle: 'Nourrir les poules ce week-end',
    missionCity: 'Annecy',
    yesToken: 'demo-oui',
    noToken: 'demo-non',
  },
}
