import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { AlmaSignature } from './_alma-signature.tsx'
import { AlmaSignoff } from './_alma-signoff.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = "https://guardiens.fr"

interface Props {
  firstName?: string
  city?: string
  nearby_sitters_count?: number
}

const Email = ({ firstName, city, nearby_sitters_count }: Props) => {
  const name = firstName || ''
  const cityLabel = city || 'chez vous'
  const nearby = typeof nearby_sitters_count === 'number' ? nearby_sitters_count : 0
  const publishUrl = `${SITE_URL}/sits/create?utm_source=email&utm_campaign=owner_no_sit&utm_medium=j10`

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Plus d'une annonce sur deux reçoit sa première candidature en moins de 48 h.</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <AlmaSignature />
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>

          <Text style={text}>
            Un départ se prépare souvent plusieurs semaines à l'avance. Publier tôt laisse le temps
            de recevoir des candidatures, d'échanger et de rencontrer la bonne personne.
          </Text>

          <Section style={statCard}>
            <Text style={statBig}>
              Plus d'une annonce sur deux reçoit sa première candidature en moins de 48&nbsp;h.
            </Text>
          </Section>

          {nearby > 0 ? (
            <Text style={text}>
              Autour de {cityLabel}, {nearby} gardiens sont inscrits.
            </Text>
          ) : null}

          <Text style={text}>
            Vos dates sont encore approximatives&nbsp;? Indiquez-les comme flexibles, vous les
            ajusterez ensuite. Vous rencontrez chaque candidat avant de choisir, et la décision vous
            appartient.
          </Text>

          <Text style={baseline}>
            Guardiens est gratuit pour les propriétaires.
          </Text>

          <Section style={ctaSection}>
            <Button style={button} href={publishUrl}>
              Publier mon annonce
            </Button>
          </Section>

          <Text style={sig}>Elisa et Jérémie</Text>

          <AlmaSignoff />
          <Hr style={hr} />
          <LegalFooter
            purpose="l'accompagnement à la prise en main de votre compte"
            basis="6.1.f"
            extra="Vous recevez ce message en tant que membre de Guardiens. Vos préférences d'email se règlent depuis votre espace personnel."
          />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Et si vous prépariez votre prochain départ ?',
  displayName: 'Propriétaire sans annonce, J+10',
  previewData: { firstName: 'Camille', city: 'Lyon', nearby_sitters_count: 137 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
const baseline = { fontSize: '13px', color: '#2C6D50', margin: '4px 0 16px', lineHeight: '1.6' }
const sig = { fontSize: '14px', color: '#524E47', fontStyle: 'italic' as const, margin: '20px 0 0' }
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = {
  backgroundColor: '#2C6D50', color: '#ffffff', padding: '12px 28px',
  borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const,
  textDecoration: 'none', display: 'inline-block',
}
const statCard = {
  backgroundColor: '#F8F6F2',
  borderLeft: '3px solid #2C6D50',
  padding: '14px 16px', borderRadius: '6px', margin: '16px 0',
}
const statBig = { fontSize: '15px', fontWeight: 'bold' as const, color: '#2C6D50', margin: 0, lineHeight: '1.5' }
