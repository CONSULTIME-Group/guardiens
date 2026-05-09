import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section,
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

const ReactivationD30Email = ({ firstName, daysSinceLastSeen }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Quelques nouveautés depuis votre dernière visite chez Guardiens</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Toujours partant pour rendre service&nbsp;?</Heading>

        <Text style={text}>
          Bonjour{firstName ? ` ${firstName}` : ''},
        </Text>

        <Text style={text}>
          Cela fait {daysSinceLastSeen ?? 'quelques semaines'} jours que nous ne vous avons pas
          croisé sur Guardiens. Pendant ce temps, de nouvelles annonces sont apparues près de
          chez vous et plusieurs gardes attendent encore une bonne âme.
        </Text>

        <Section style={card}>
          <Text style={cardTitle}>En 2&nbsp;minutes vous pouvez&nbsp;:</Text>
          <Text style={cardLine}>· Vérifier les annonces ouvertes près de chez vous</Text>
          <Text style={cardLine}>· Mettre à jour vos disponibilités</Text>
          <Text style={cardLine}>· Republier votre annonce si vous cherchez un gardien</Text>
        </Section>

        <Button style={button} href={`${SITE_URL}/recherche`}>Voir les annonces</Button>

        <Text style={muted}>
          Pas envie pour l'instant&nbsp;? Aucun souci, votre compte reste ouvert et nous ne vous
          relancerons pas tout de suite.
        </Text>

        <LegalFooter
          purpose="du maintien de votre compte actif"
          basis="6.1.f"
          extra="Vous recevez ce message car votre compte n'a pas eu d'activité récente. Vous pouvez ajuster vos préférences d'email depuis votre espace personnel."
        />
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' as const }
const container = { margin: '0 auto', padding: '24px', maxWidth: '560px' }
const h1 = { color: '#1a1a1a', fontSize: '22px', fontWeight: 700, marginBottom: '16px' }
const text = { color: '#1a1a1a', fontSize: '15px', lineHeight: '22px', marginBottom: '12px' }
const card = { backgroundColor: '#f7f5ee', padding: '16px', borderRadius: '10px', margin: '16px 0' }
const cardTitle = { color: '#1a1a1a', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }
const cardLine = { color: '#444', fontSize: '14px', lineHeight: '22px', marginBottom: '4px' }
const button = {
  backgroundColor: '#1a1a1a', color: '#ffffff', padding: '12px 22px', borderRadius: '8px',
  textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginTop: '8px',
}
const muted = { color: '#666', fontSize: '13px', lineHeight: '20px', marginTop: '20px' }

export const template: TemplateEntry = {
  component: ReactivationD30Email,
  subject: 'Toujours partant pour rendre service — Guardiens',
  displayName: 'Réactivation à 30 jours d\'inactivité',
  previewData: { firstName: 'Camille', daysSinceLastSeen: 32 },
}
