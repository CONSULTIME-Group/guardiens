import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr,Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.lovable.app"

interface OnboardingJ1Props {
  firstName?: string
}

const OnboardingJ1Email = ({ firstName }: OnboardingJ1Props) => {
  const name = firstName || 'toi'

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Ton profil {SITE_NAME} t'attend — 5 minutes suffisent</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Bonjour {name},</Heading>

          <Text style={text}>
            Tu t'es inscrit(e) sur {SITE_NAME} hier — bienvenue dans la communauté.
          </Text>

          <Text style={text}>
            Pour accéder aux annonces de garde et aux petites missions près de chez toi, 
            ton profil doit être complété à 60% minimum. Il te manque peut-être juste 
            une photo et une courte bio.
          </Text>

          <Section style={ctaSection}>
            <Button style={button} href={`${SITE_URL}/mon-profil`}>
              Compléter mon profil
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            À très vite,{'\n'}Jérémie & Elisa — {SITE_NAME}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OnboardingJ1Email,
  subject: 'Ton profil Guardiens t\'attend — 5 minutes suffisent',
  displayName: 'Onboarding J+1 — Compléter le profil',
  previewData: { firstName: 'Marie' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
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
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '30px 0 0', whiteSpace: 'pre-line' as const }
