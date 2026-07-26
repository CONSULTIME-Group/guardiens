import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'
const CTA_URL = `${SITE_URL}/recherche?utm_source=email&utm_medium=email&utm_campaign=dormant_sitter`

interface Props {
  firstName?: string
  days?: number
}

const DormantSitterNudgeEmail = ({ firstName, days }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Il y a peut-être une garde pour vous cette semaine</Preview>
    <Body style={main}>
      <Container style={container} className="em-container">
        <BrandHeader />

        <Section style={hero} className="em-hero">
          <Text style={heroKicker}>Gardes disponibles</Text>
          <Heading style={h1} className="em-h1">Il y a peut-être une garde pour vous cette semaine.</Heading>
        </Section>

        <Text style={text} className="em-text">
          Bonjour{firstName ? ` ${firstName}` : ''},
        </Text>

        <Text style={text} className="em-text">
          Votre profil est prêt{typeof days === 'number' ? ` depuis ${days} jours` : ''}, mais vous n'avez pas
          encore envoyé de candidature. Peut-être n'avez-vous pas vu passer les bonnes annonces.
        </Text>

        <Text style={text} className="em-text">
          Prenez deux minutes pour parcourir les dernières annonces près de chez vous.
        </Text>

        <Section style={ctaSection} className="em-cta">
          <Button style={button} className="em-btn" href={CTA_URL}>
            Voir les annonces
          </Button>
        </Section>

        <Hr style={hr} />

        <LegalFooter
          purpose="l'accompagnement des gardiens inscrits"
          basis="6.1.f"
          extra="Vous recevez ce message car votre profil de gardien est actif. Cet email est envoyé depuis une adresse qui ne reçoit pas de réponse."
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
  component: DormantSitterNudgeEmail,
  subject: (data: Record<string, any>) =>
    data?.firstName
      ? `${data.firstName}, il y a peut-être une garde pour vous cette semaine`
      : 'Il y a peut-être une garde pour vous cette semaine',
  displayName: 'Gardien dormant, relance annonces',
  previewData: { firstName: 'Camille', days: 34 },
} satisfies TemplateEntry
