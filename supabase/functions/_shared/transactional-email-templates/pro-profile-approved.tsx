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
  slug?: string
}

const ProProfileApprovedEmail = ({ raisonSociale, slug }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Votre fiche pro est en ligne sur l’annuaire Guardiens</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Votre fiche pro est en ligne</Heading>
        <Text style={text}>
          Bonjour{raisonSociale ? `, ${raisonSociale}` : ''},
        </Text>
        <Text style={text}>
          Votre fiche a été validée et est désormais visible publiquement dans l’annuaire des pros animaliers Guardiens. Les propriétaires peuvent vous trouver par ville et par spécialité.
        </Text>
        <Button style={button} href={slug ? `${SITE_URL}/pros/${slug}` : `${SITE_URL}/pros`}>
          Voir ma fiche publique
        </Button>
        <Text style={{ ...text, marginTop: '24px' }}>
          Vous pouvez modifier vos informations à tout moment depuis votre espace pro.
        </Text>
        <Text style={text}>
          <a href={`${SITE_URL}/pros/mon-espace`} style={link}>Accéder à mon espace pro</a>
        </Text>
        <LegalFooter
          purpose="la gestion de votre fiche dans l’annuaire des pros animaliers"
          basis="6.1.b"
        />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ProProfileApprovedEmail,
  subject: 'Votre fiche pro est en ligne, Guardiens',
  displayName: 'Fiche pro approuvée',
  previewData: { raisonSociale: 'Cabinet Vétérinaire des Brotteaux', slug: 'cabinet-veterinaire-des-brotteaux-lyon' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const link = { color: 'hsl(153, 42%, 30%)', textDecoration: 'underline' }
