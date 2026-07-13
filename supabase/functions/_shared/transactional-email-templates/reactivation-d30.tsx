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
  daysSinceLastSeen?: number
}

const ReactivationD30Email = ({ firstName, daysSinceLastSeen }: Props) => {
  const since = typeof daysSinceLastSeen === 'number' && daysSinceLastSeen > 0
    ? `Cela fait ${daysSinceLastSeen} jours`
    : 'Cela fait quelques semaines'

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>De nouvelles annonces vous attendent près de chez vous</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>Toujours partant pour rendre service&nbsp;?</Heading>

          <Text style={text}>
            Bonjour{firstName ? ` ${firstName}` : ''},
          </Text>

          <Text style={text}>
            {since} que nous ne vous avons pas croisé sur Guardiens. Pendant ce temps,
            de nouvelles annonces sont apparues près de chez vous et plusieurs gardes
            attendent encore une bonne âme.
          </Text>

          <Section style={card}>
            <Text style={cardTitle}>En 2&nbsp;minutes vous pouvez&nbsp;:</Text>
            <Text style={cardLine}>· Vérifier les annonces ouvertes près de chez vous</Text>
            <Text style={cardLine}>· Mettre à jour vos disponibilités</Text>
            <Text style={cardLine}>· Republier votre annonce si vous cherchez un gardien</Text>
          </Section>

          <Section style={ctaSection}>
            <Button style={button} href={`${SITE_URL}/recherche`}>Voir les annonces</Button>
          </Section>

          <Text style={muted}>
            Pas envie pour l'instant&nbsp;? Aucun souci, votre compte reste ouvert et nous ne
            vous relancerons pas tout de suite.
          </Text>

          <Hr style={hr} />

          <LegalFooter
            purpose="le maintien de votre compte actif"
            basis="6.1.f"
            extra="Vous recevez ce message car votre compte n'a pas eu d'activité récente. Vous pouvez ajuster vos préférences d'email depuis votre espace personnel."
          />
        </Container>
      </Body>
    </Html>
  )
}

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
  component: ReactivationD30Email,
  subject: 'Toujours partant pour rendre service — Guardiens',
  displayName: 'Réactivation à 30 jours d\'inactivité',
  previewData: { firstName: 'Camille', daysSinceLastSeen: 32 },
}
