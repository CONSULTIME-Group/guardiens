import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface Props {
  raisonSociale?: string
  reason?: string
}

const ProProfileRejectedEmail = ({ raisonSociale, reason }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Votre fiche pro nécessite une correction</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Votre fiche pro nécessite une correction</Heading>
        <Text style={text}>
          Bonjour{raisonSociale ? `, ${raisonSociale}` : ''},
        </Text>
        <Text style={text}>
          Votre fiche n’a pas pu être publiée en l’état dans l’annuaire des pros animaliers Guardiens.
        </Text>
        {reason && (
          <Text style={{ ...text, backgroundColor: 'hsl(37, 22%, 95%)', padding: '12px 16px', borderRadius: '8px' }}>
            <strong>Motif :</strong> {reason}
          </Text>
        )}
        <Text style={text}>
          Corrigez les éléments demandés depuis votre espace pro puis enregistrez, votre fiche repassera automatiquement en validation.
        </Text>
        <Button style={button} href={`${SITE_URL}/pros/mon-espace`}>
          Corriger ma fiche
        </Button>
        <LegalFooter
          purpose="la gestion de votre fiche dans l’annuaire des pros animaliers"
          basis="6.1.b"
        />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ProProfileRejectedEmail,
  subject: 'Votre fiche pro nécessite une correction, Guardiens',
  displayName: 'Fiche pro refusée',
  previewData: { raisonSociale: 'Cabinet Vétérinaire des Brotteaux', reason: 'SIRET illisible, merci de fournir un justificatif lisible.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
