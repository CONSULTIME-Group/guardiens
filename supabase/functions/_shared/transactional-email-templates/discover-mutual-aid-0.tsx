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

const DiscoverMutualAidIntroEmail = ({ firstName }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>L'entraide sur Guardiens, en deux minutes</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>L'entraide, le petit pilier qui change tout.</Heading>

        <Text style={text}>
          Bonjour{firstName ? ` ${firstName}` : ''},
        </Text>

        <Text style={text}>
          Vous venez de rejoindre Guardiens. À côté des gardes d'animaux, il existe un espace
          discret mais précieux&nbsp;: les <strong>petites missions d'entraide</strong>. C'est
          un endroit où l'on demande, où l'on propose, où l'on rend service — sans transaction
          financière, simplement entre membres du coin.
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>En pratique, ça ressemble à quoi&nbsp;?</Text>
          <Text style={cardLine}>· Récupérer un colis pendant une absence</Text>
          <Text style={cardLine}>· Demander un avis sur un artisan ou une adresse</Text>
          <Text style={cardLine}>· Partager un trajet, prêter un outil, donner un coup de main</Text>
          <Text style={cardLine}>· Tenir compagnie, marcher ensemble, échanger un savoir</Text>
        </Section>

        <Text style={text}>
          Pas d'obligation, pas d'engagement. Quand l'envie vient — la vôtre ou celle d'un
          proche — l'entraide est là, gratuite et simple à utiliser.
        </Text>

        <Section style={ctaSection}>
          <Button style={button} href={`${SITE_URL}/petites-missions`}>
            Voir les petites missions
          </Button>
        </Section>

        <Text style={muted}>
          Rien à faire pour le moment&nbsp;? C'est très bien aussi. Cet espace vous attendra
          le jour où vous en aurez besoin.
        </Text>

        <Hr style={hr} />

        <LegalFooter
          purpose="de la présentation des fonctionnalités d'entraide"
          basis="6.1.f"
          extra="Vous recevez ce message dans le cadre de la découverte de votre compte. Vous pouvez ajuster vos préférences d'email depuis votre espace personnel."
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
  component: DiscoverMutualAidIntroEmail,
  subject: "L'entraide sur Guardiens, en deux minutes",
  displayName: 'Découverte entraide — présentation',
  previewData: { firstName: 'Camille' },
}
