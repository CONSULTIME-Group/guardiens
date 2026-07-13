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

const SITE_NAME = "Guardiens"
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
  const publishUrl = `${SITE_URL}/sits/create?utm_source=email&utm_campaign=owner_no_sit&utm_medium=j21`
  const unsubUrl = `${SITE_URL}/unsubscribe?scope=all`

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Une dernière question de ma part avant de vous laisser tranquille</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <AlmaSignature />
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>

          <Text style={text}>
            Il y a 21 jours, vous vous êtes inscrit sur {SITE_NAME}. J'ai vu passer votre
            inscription. On vous a envoyé 2 messages entre-temps, sans nouvelle de vous.
          </Text>

          <Text style={text}>
            Je m'appelle Jérémie, je co-construis {SITE_NAME} avec ma compagne Elisa. On a
            lancé la plateforme parce qu'on a nous-mêmes gardé 37 maisons en 5 ans, à travers
            la France. On sait que faire garder ses animaux quand on part, c'est un vrai
            casse-tête.
          </Text>

          <Text style={text}>
            Si {SITE_NAME} ne colle pas à ce que vous cherchez, c'est utile pour nous de le
            savoir. Vous pouvez répondre à cet email, je le lis moi-même.
          </Text>

          <Text style={text}>
            Si vous avez juste manqué de temps, publier votre annonce prend 2 minutes.
            {nearby > 0 ? ` ${nearby} gardiens vous attendent près de ${cityLabel}.` : ''}
          </Text>

          <Section style={ctaSection}>
            <Button style={button} href={publishUrl}>Publier mon annonce</Button>
          </Section>

          <Text style={textSmall}>
            Si vous préférez couper le contact, aucun problème.{' '}
            <a href={unsubUrl} style={inlineLink}>Je préfère me désinscrire de tous les emails</a>.
          </Text>

          <Text style={sig}>Jérémie</Text>

          <AlmaSignoff />
          <Hr style={hr} />
          <LegalFooter purpose="l'accompagnement à la prise en main de votre compte" basis="6.1.f" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Une dernière question avant de vous laisser tranquille',
  displayName: 'Propriétaire sans annonce, J+21 (relance personnelle)',
  previewData: { firstName: 'Camille', city: 'Lyon', nearby_sitters_count: 137 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const textSmall = { fontSize: '13px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '16px 0 8px' }
const sig = { fontSize: '14px', color: 'hsl(37, 7%, 30%)', fontStyle: 'italic' as const, margin: '20px 0 0' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px',
  borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const,
  textDecoration: 'none', display: 'inline-block',
}
const inlineLink = { color: 'hsl(153, 42%, 30%)', textDecoration: 'underline' }
