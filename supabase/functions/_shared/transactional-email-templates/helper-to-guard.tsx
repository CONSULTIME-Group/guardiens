import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'
const CTA_URL = `${SITE_URL}/login?redirect=${encodeURIComponent('/recherche?utm_source=email&utm_medium=email&utm_campaign=helper_to_guard')}&utm_source=email&utm_medium=email&utm_campaign=helper_to_guard`
const CTA_OWNER_URL = `${SITE_URL}/login?redirect=${encodeURIComponent('/sits/nouveau?utm_source=email&utm_medium=email&utm_campaign=helper_to_guard')}&utm_source=email&utm_medium=email&utm_campaign=helper_to_guard`

interface Props {
  firstName?: string
}

const HelperToGuardEmail = ({ firstName }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Vous avez donné un coup de main, prêt à franchir un pas de plus ?</Preview>
    <Body style={main}>
      <Container style={container} className="em-container">
        <BrandHeader />

        <Section style={hero} className="em-hero">
          <Text style={heroKicker}>Du coup de main à la garde</Text>
          <Heading style={h1} className="em-h1">Merci pour votre entraide, une autre porte s'ouvre.</Heading>
        </Section>

        <Text style={text} className="em-text">
          Bonjour{firstName ? ` ${firstName}` : ''},
        </Text>

        <Text style={text} className="em-text">
          Vous avez récemment répondu à un coup de main sur Guardiens. Ce geste compte, plus
          qu'on ne le croit. Beaucoup de gardiens de confiance ont commencé exactement comme
          vous, en tendant la main pour une petite mission.
        </Text>

        <Section style={card} className="em-card">
          <Text style={cardTitle} className="em-card-title">Le pas suivant, si l'envie vient</Text>
          <Text style={cardLine} className="em-card-line">· Découvrez des annonces de garde d'animaux près de chez vous</Text>
          <Text style={cardLine} className="em-card-line">· Postulez à celles qui vous parlent, à votre rythme, sans engagement</Text>
          <Text style={cardLine} className="em-card-line">· Ou publiez la vôtre si vous cherchez quelqu'un pour vos compagnons</Text>
        </Section>

        <Text style={text} className="em-text">
          Aucune pression, aucune obligation. Vous connaissez déjà l'esprit de la maison,
          il vous suffit de pousser la porte d'à côté.
        </Text>

        <Section style={ctaSection} className="em-cta">
          <Button style={button} className="em-btn" href={CTA_URL}>
            Voir les gardes près de chez moi
          </Button>
          <Text style={ctaHint} className="em-hint">
            Vous préférez confier votre animal ? <a href={CTA_OWNER_URL} style={linkAlt}>Publiez une annonce</a>.
          </Text>
        </Section>

        <Hr style={hr} />

        <LegalFooter
          purpose="l'accompagnement de votre découverte des fonctionnalités de garde"
          basis="6.1.f"
          extra="Vous recevez ce message parce que vous avez récemment donné un coup de main. Vous pouvez ajuster vos préférences d'email depuis votre espace personnel."
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
const card = { backgroundColor: 'hsl(40, 33%, 96%)', padding: '18px 20px', borderRadius: '10px', margin: '18px 0' }
const cardTitle = { color: 'hsl(153, 42%, 25%)', fontSize: '14px', fontWeight: 600, marginBottom: '10px' }
const cardLine = { color: 'hsl(37, 7%, 30%)', fontSize: '14px', lineHeight: '22px', marginBottom: '4px' }
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
  boxShadow: '0 2px 6px hsla(153, 42%, 20%, 0.15)',
}
const ctaHint = { fontSize: '12px', color: 'hsl(37, 7%, 50%)', margin: '12px 0 0' }
const linkAlt = { color: 'hsl(153, 42%, 30%)', textDecoration: 'underline' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '24px 0 16px' }

export const template: TemplateEntry = {
  component: HelperToGuardEmail,
  subject: 'Merci pour votre entraide, une autre porte s\'ouvre',
  displayName: 'Pont entraide vers garde',
  previewData: { firstName: 'Camille' },
}
