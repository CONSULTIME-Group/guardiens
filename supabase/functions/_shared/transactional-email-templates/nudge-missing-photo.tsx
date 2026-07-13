import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Guardiens'
const SITE_URL = 'https://guardiens.fr'

interface NudgeMissingPhotoProps {
  firstName?: string
}

const NudgeMissingPhotoEmail = ({ firstName }: NudgeMissingPhotoProps) => {
  const name = firstName?.trim() || ''

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Une photo pour inspirer confiance aux gens du coin</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>

          <Text style={text}>
            Merci d'avoir rejoint <strong>{SITE_NAME}</strong>. Votre profil est
            presque prêt à circuler auprès des propriétaires près de chez vous.
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightTitle}>Il manque votre photo de profil</Text>
            <Text style={highlightText}>
              Les propriétaires confient leur maison et leurs animaux à une personne,
              pas à une silhouette. Une photo claire, souriante, multiplie fortement
              vos chances d'être choisi(e).
            </Text>
          </Section>

          <Text style={text}>
            Deux minutes suffisent pour ajouter la vôtre depuis votre profil.
          </Text>

          <Section style={ctaSection}>
            <Button style={button} href={`${SITE_URL}/profile`}>
              Ajouter ma photo maintenant
            </Button>
          </Section>

          <Text style={subtext}>
            Conseil : privilégiez une photo récente, visage dégagé, en lumière
            naturelle. Pas besoin de studio, l'authenticité prime.
          </Text>

          <Hr style={hr} />

          <Text style={text}>
            Une question ou un blocage ? Répondez à cet email, nous lisons tout.
          </Text>

          <LegalFooter
            purpose="du bon fonctionnement de votre compte"
            basis="6.1.f"
          />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: NudgeMissingPhotoEmail,
  subject: 'Une photo pour inspirer confiance aux propriétaires',
  displayName: 'Nudge photo manquante (gardien)',
  previewData: { firstName: 'Camille' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const subtext = { fontSize: '13px', color: 'hsl(37, 7%, 55%)', lineHeight: '1.5', margin: '12px 0 0', fontStyle: 'italic' as const }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '24px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0 8px' }
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const highlightBox = {
  backgroundColor: 'hsl(37, 35%, 96%)',
  border: '1px solid hsl(37, 22%, 85%)',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '20px 0',
}
const highlightTitle = { fontSize: '14px', fontWeight: '600' as const, color: 'hsl(25, 75%, 40%)', margin: '0 0 6px' }
const highlightText = { fontSize: '13px', color: 'hsl(37, 7%, 38%)', lineHeight: '1.55', margin: '0' }
