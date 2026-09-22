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
  const publishUrl = `${SITE_URL}/sits/create?utm_source=email&utm_campaign=owner_no_sit&utm_medium=j21`
  const unsubUrl = `${SITE_URL}/unsubscribe?scope=all`

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Votre réponse nous aide à construire Guardiens.</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <AlmaSignature />
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>

          <Text style={text}>
            Je m'appelle Jérémie. Avec Elisa, nous avons créé Guardiens après avoir gardé
            37&nbsp;maisons à travers la France. Nous savons ce que représente le fait de confier sa
            maison et ses animaux.
          </Text>

          <Text style={text}>
            Vous vous êtes inscrit il y a trois semaines, et j'aimerais comprendre ce que vous
            cherchez. Un départ prévu&nbsp;? Une simple curiosité&nbsp;? Un besoin plus ponctuel,
            comme quelqu'un pour nourrir le chat un soir&nbsp;?
          </Text>

          <Text style={text}>
            Répondez simplement à cet email, je lis chaque réponse moi-même.
          </Text>

          {nearby > 0 ? (
            <>
              <Text style={text}>
                Au passage, {nearby} gardiens habitent autour de {cityLabel}.
              </Text>
              <Section style={ctaSection}>
                <Button style={button} href={publishUrl}>Publier mon annonce</Button>
              </Section>
            </>
          ) : null}

          <Text style={textSmall}>
            Et si vous préférez vous arrêter là, un clic suffit&nbsp;:{' '}
            <a href={unsubUrl} style={inlineLink}>Me désinscrire de ces emails</a>
          </Text>

          <Text style={sig}>Jérémie</Text>

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
  subject: 'Une question de Jérémie',
  displayName: 'Propriétaire sans annonce, J+21 (relance personnelle)',
  previewData: { firstName: 'Camille', city: 'Lyon', nearby_sitters_count: 137 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
const textSmall = { fontSize: '13px', color: '#756F66', lineHeight: '1.6', margin: '16px 0 8px' }
const sig = { fontSize: '14px', color: '#524E47', fontStyle: 'italic' as const, margin: '20px 0 0' }
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = {
  backgroundColor: '#2C6D50', color: '#ffffff', padding: '12px 28px',
  borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const,
  textDecoration: 'none', display: 'inline-block',
}
const inlineLink = { color: '#2C6D50', textDecoration: 'underline' }
