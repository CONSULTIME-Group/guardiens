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
  firstName?: string
}

const DiscoverMutualAidOfferEmail = ({ firstName }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Proposez un coup de main et vivez une histoire</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Envie de nouveauté&nbsp;? Offrez un coup de main.</Heading>

        <Text style={text}>
          Bonjour{firstName ? ` ${firstName}` : ''},
        </Text>

        <Text style={text}>
          Vous avez du temps, un savoir-faire, une voiture, une bonne paire de bras&nbsp;?
          Quelqu'un près de chez vous en a peut-être besoin aujourd'hui. Proposer son aide,
          c'est ouvrir la porte à une rencontre, une histoire, parfois une aventure.
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>Ce que vous pouvez proposer&nbsp;:</Text>
          <Text style={cardLine}>· Un trajet, un transport, un déménagement court</Text>
          <Text style={cardLine}>· Du bricolage, du jardinage, un dépannage</Text>
          <Text style={cardLine}>· De la compagnie, une promenade, une discussion</Text>
          <Text style={cardLine}>· Un savoir à partager, un service ponctuel</Text>
        </Section>

        <Text style={text}>
          C'est gratuit, sans transaction financière. L'entraide repose sur la confiance
          et le plaisir de rendre service. Vous pourriez être surpris par ce que ça change.
        </Text>

        <Section style={ctaSection}>
          <Button style={button} href={`${SITE_URL}/petites-missions/creer`}>
            Proposer un coup de main
          </Button>
        </Section>

        <Text style={muted}>
          Vous préférez d'abord parcourir les demandes&nbsp;?{' '}
          Rendez-vous sur la page « Petites missions ».
        </Text>

        <Hr style={hr} />

        <LegalFooter
          purpose="de la découverte des fonctionnalités d'entraide"
          basis="6.1.f"
          extra="Vous recevez ce message car vous n'avez pas encore utilisé l'entraide. Vous pouvez ajuster vos préférences d'email depuis votre espace personnel."
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
const cardTitle = { color: 'hsl(153, 42%, 30%)', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }
const cardLine = { color: 'hsl(37, 7%, 30%)', fontSize: '14px', lineHeight: '22px', marginBottom: '4px' }
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
  component: DiscoverMutualAidOfferEmail,
  subject: 'Proposez un coup de main, vivez une histoire — Guardiens',
  displayName: 'Découverte entraide — proposer',
  previewData: { firstName: 'Camille' },
}
