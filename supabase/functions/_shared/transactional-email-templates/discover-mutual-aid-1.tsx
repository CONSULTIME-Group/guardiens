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

const DiscoverMutualAidEmail = ({ firstName }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Et si vous demandiez un coup de main près de chez vous&nbsp;?</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Vous vous ennuyez&nbsp;? Donnez-vous la chance d'être surpris.</Heading>

        <Text style={text}>
          Bonjour{firstName ? ` ${firstName}` : ''},
        </Text>

        <Text style={text}>
          L'entraide entre membres du coin, c'est gratuit, simple, et c'est souvent ce qui crée
          les plus belles rencontres. Une question, un service, une envie de nouveauté&nbsp;:
          il suffit de demander.
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>Quelques idées pour commencer&nbsp;:</Text>
          <Text style={cardLine}>· Un coup de main pour porter, monter, déplacer quelque chose</Text>
          <Text style={cardLine}>· Un avis local sur un bon plan, une adresse, un artisan</Text>
          <Text style={cardLine}>· Un échange de savoir-faire ou un conseil pratique</Text>
          <Text style={cardLine}>· Une promenade, une compagnie, un partage</Text>
        </Section>

        <Text style={text}>
          Demandez, proposez, échangez. Aucune transaction financière, juste de la confiance
          et le plaisir de découvrir une histoire, une personne, parfois une aventure.
        </Text>

        <Section style={ctaSection}>
          <Button style={button} href={`${SITE_URL}/petites-missions`}>
            Découvrir l'entraide
          </Button>
        </Section>

        <Text style={muted}>
          L'entraide est gratuite et le restera. C'est l'un des piliers de la communauté.
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
  component: DiscoverMutualAidEmail,
  subject: "Et si vous donniez sa chance à l'entraide — Guardiens",
  displayName: 'Découverte entraide — invitation',
  previewData: { firstName: 'Camille' },
}
