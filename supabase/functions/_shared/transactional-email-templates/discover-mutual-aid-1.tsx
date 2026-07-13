import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'
const CTA_URL = `${SITE_URL}/login?redirect=${encodeURIComponent('/petites-missions/creer?utm_source=email&utm_medium=email&utm_campaign=discover_mutual_aid&utm_content=variant_1')}&utm_source=email&utm_medium=email&utm_campaign=discover_mutual_aid&utm_content=variant_1`

interface Props {
  firstName?: string
}

const DiscoverMutualAidEmail = ({ firstName }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Et si vous demandiez un coup de main près de chez vous ?</Preview>
    <Body style={main}>
      <Container style={container} className="em-container">
        <BrandHeader />

        <Section style={hero} className="em-hero">
          <Text style={heroKicker}>Coup de main</Text>
          <Heading style={h1} className="em-h1">Donnez-vous la chance d'être surpris.</Heading>
        </Section>

        <Text style={text} className="em-text">
          Bonjour{firstName ? ` ${firstName}` : ''},
        </Text>

        <Text style={text} className="em-text">
          L'entraide entre membres du coin, c'est gratuit, simple, et c'est souvent ce qui crée
          les plus belles rencontres. Une question, un service, une envie de nouveauté :
          il suffit de demander.
        </Text>

        <Section style={card} className="em-card">
          <Text style={cardTitle} className="em-card-title">Quelques idées pour commencer :</Text>
          <Text style={cardLine} className="em-card-line">· Un coup de main pour porter, monter, déplacer quelque chose</Text>
          <Text style={cardLine} className="em-card-line">· Un avis local sur un bon plan, une adresse, un artisan</Text>
          <Text style={cardLine} className="em-card-line">· Un échange de savoir-faire ou un conseil pratique</Text>
          <Text style={cardLine} className="em-card-line">· Une promenade, une compagnie, un partage</Text>
        </Section>

        <Text style={text} className="em-text">
          Demandez, proposez, échangez. Aucune transaction financière, juste de la confiance
          et le plaisir de découvrir une histoire, une personne, parfois une aventure.
        </Text>

        <Section style={ctaSection} className="em-cta">
          <Button style={button} className="em-btn" href={CTA_URL}>
            Publier un coup de main
          </Button>
          <Text style={ctaHint} className="em-hint">Connectez-vous, puis publiez votre demande en quelques clics.</Text>
        </Section>

        <Hr style={hr} />

        <LegalFooter
          purpose="la découverte des fonctionnalités d'entraide"
          basis="6.1.f"
          extra="Vous recevez ce message car vous n'avez pas encore utilisé l'entraide. Vous pouvez ajuster vos préférences d'email depuis votre espace personnel."
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
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '24px 0 16px' }

export const template: TemplateEntry = {
  component: DiscoverMutualAidEmail,
  subject: "Et si vous donniez sa chance à l'entraide — Guardiens",
  displayName: 'Découverte entraide — invitation',
  previewData: { firstName: 'Camille' },
}
