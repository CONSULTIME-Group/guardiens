import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"

interface RelanceCpProps {
  prenom?: string
  cta_url?: string
}

const RelanceCpManquantEmail = ({ prenom, cta_url }: RelanceCpProps) => {
  const name = prenom || ''
  const link = cta_url || 'https://guardiens.fr/profile?focus=postal_code'

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Indiquez votre ville pour voir les annonces près de chez vous</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {name ? `Bonjour ${name},` : 'Bonjour,'}
          </Heading>

          <Text style={text}>
            Bienvenue chez {SITE_NAME}. Pour voir les annonces de garde près de
            chez vous et apparaître dans les recherches des propriétaires, il manque
            une information essentielle : votre code postal.
          </Text>

          <Text style={text}>
            Cela prend 30 secondes.
          </Text>

          <Section style={ctaSection}>
            <Button style={button} href={link}>
              Ajouter mon code postal
            </Button>
          </Section>

          <Text style={textMuted}>
            Sans cette information, votre profil n'est pas visible et vous
            ne recevrez pas de notifications d'annonces.
          </Text>

          <Hr style={hr} />

          <Text style={legal}>
            Cet e-mail vous est envoyé par {SITE_NAME} (Jérémie Martinot, SIRET 894 864 040 00015)
            dans le cadre de l'intérêt légitime lié au bon fonctionnement de votre compte (art. 6.1.f RGPD).
            Pour exercer vos droits : contact@guardiens.fr.
          </Text>

          <Text style={footer}>L'équipe {SITE_NAME} 🐾</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RelanceCpManquantEmail,
  subject: 'Indiquez votre ville pour voir les annonces près de chez vous',
  displayName: 'Relance code postal manquant',
  previewData: { prenom: 'Marie', cta_url: 'https://guardiens.fr/profile?focus=postal_code' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const textMuted = { fontSize: '13px', color: 'hsl(37, 7%, 55%)', lineHeight: '1.5', margin: '0 0 16px', fontStyle: 'italic' as const }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
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
const legal = { fontSize: '10px', color: 'hsl(37, 7%, 60%)', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '10px 0 0' }
