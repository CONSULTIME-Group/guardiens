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
  headline?: string
  missionTitle?: string
  missionCity?: string
  missionId?: string
  canHelpToken?: string
  proofLine?: string
  sitModeLine?: string
}

const MissionHelpNeededEmail = ({
  helperFirstName,
  headline,
  missionTitle,
  missionCity,
  missionId,
  canHelpToken,
  proofLine,
  sitModeLine,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>{headline || 'Quelqu\u2019un du coin a besoin d\u2019un coup de main'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Un besoin près de chez vous</Heading>

        <Text style={text}>Bonjour{helperFirstName ? ` ${helperFirstName}` : ''},</Text>

        <Text style={text}>{headline}</Text>

        {missionTitle && (
          <Section style={card}>
            {sitModeLine && <Text style={cardCity}>{sitModeLine}</Text>}
            <Text style={cardLine}>{missionTitle}</Text>
            {missionCity && <Text style={cardCity}>{missionCity}</Text>}
          </Section>
        )}

        {proofLine && <Text style={proof}>{proofLine}</Text>}

        {canHelpToken && (
          <Section style={ctaSection}>
            <Button style={button} href={`${SITE_URL}/entraide/je-peux?t=${canHelpToken}`}>
              Je peux
            </Button>
          </Section>
        )}

        {missionId && (
          <Section style={ctaSection}>
            <Button style={buttonGhost} href={`${SITE_URL}/petites-missions/${missionId}`}>
              Voir le détail
            </Button>
          </Section>
        )}

        <Text style={muted}>
          En retour : un merci, un café, ou un coup de main quand ce sera votre tour. Vous voyez
          ça ensemble. Si ce n'est pas possible pour vous, laissez simplement passer.
        </Text>

        <Hr style={hr} />

        <LegalFooter
          purpose="la mise en relation pour l'entraide entre membres"
          basis="6.1.b"
          extra="Vous recevez ce message car vous vous êtes déclaré disponible pour donner un coup de main près de chez vous."
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
const ctaSection = { textAlign: 'center' as const, margin: '16px 0' }
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
const buttonGhost = {
  ...button,
  backgroundColor: '#F8F6F1',
  color: '#2C6D50',
}
const proof = { color: '#2C6D50', fontSize: '13px', lineHeight: '20px', margin: '0 0 16px', fontStyle: 'italic' as const }
const muted = { color: '#888277', fontSize: '13px', lineHeight: '20px', marginTop: '20px' }
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }

export const template: TemplateEntry = {
  component: MissionHelpNeededEmail,
  subject: (data: Record<string, any>) =>
    data.missionCity
      ? `Un coup de main demandé à ${data.missionCity}`
      : 'Un coup de main demandé près de chez vous',
  displayName: 'Entraide, un besoin près de chez vous (vague)',
  previewData: {
    helperFirstName: 'Camille',
    headline: "Marie, à 3 km, a besoin de quelqu'un pour promener Filou, samedi 4 octobre.",
    missionTitle: 'Promener Filou samedi après-midi',
    missionCity: 'Lyon',
    missionId: 'demo',
    canHelpToken: 'demo-token',
    proofLine: "La semaine dernière, à 6 km : Laurence a reçu un coup de main de Karim.",
  },
}
