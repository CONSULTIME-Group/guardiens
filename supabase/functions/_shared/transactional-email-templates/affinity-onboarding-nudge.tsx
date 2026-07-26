import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'
const CTA_URL = `${SITE_URL}/onboarding/affinity?utm_source=email&utm_medium=email&utm_campaign=affinity_stale`

interface Props {
  firstName?: string
  hours?: number
}

const AffinityOnboardingNudgeEmail = ({ firstName }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Il ne vous reste que quelques étapes</Preview>
    <Body style={main}>
      <Container style={container} className="em-container">
        <BrandHeader />

        <Section style={hero} className="em-hero">
          <Text style={heroKicker}>Votre profil</Text>
          <Heading style={h1} className="em-h1">Il ne vous reste que quelques étapes.</Heading>
        </Section>

        <Text style={text} className="em-text">
          Bonjour{firstName ? ` ${firstName}` : ''},
        </Text>

        <Text style={text} className="em-text">
          Vous avez commencé à renseigner vos préférences de garde, puis vous vous êtes arrêté en
          chemin. Ces quelques réponses permettent de vous proposer les profils et les annonces
          qui vous correspondent vraiment.
        </Text>

        <Section style={ctaSection} className="em-cta">
          <Button style={button} className="em-btn" href={CTA_URL}>
            Reprendre où je m'étais arrêté
          </Button>
        </Section>

        <Hr style={hr} />

        <LegalFooter
          purpose="l'accompagnement à la complétion de votre profil"
          basis="6.1.f"
          extra="Cet email est envoyé depuis une adresse qui ne reçoit pas de réponse."
        />
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#f7f5f0', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '14px' }
const hero = { backgroundColor: 'hsl(153, 42%, 96%)', padding: '22px 20px', borderRadius: '12px', margin: '0 0 24px', borderLeft: '4px solid hsl(153, 42%, 30%)' }
const heroKicker = { fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: 'hsl(153, 42%, 30%)', fontWeight: 600, margin: '0 0 6px' }
const h1 = { fontSize: '24px', lineHeight: '1.25', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 20%)', margin: 0, fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '15px', color: 'hsl(37, 7%, 25%)', lineHeight: '1.65', margin: '0 0 16px' }
const ctaSection = { textAlign: 'center' as const, margin: '32px 0 12px' }
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
  component: AffinityOnboardingNudgeEmail,
  subject: 'Il ne vous reste que quelques étapes',
  displayName: 'Affinité, parcours interrompu',
  previewData: { firstName: 'Camille', hours: 30 },
} satisfies TemplateEntry
