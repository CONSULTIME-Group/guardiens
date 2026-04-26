import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.fr"

interface WelcomeProps {
  firstName?: string
  role?: string
}

const roleLabel = (role?: string) => {
  if (role === 'owner') return 'propriétaire'
  if (role === 'both') return 'propriétaire & gardien'
  return 'gardien'
}

const sitterSteps = [
  { emoji: '📝', text: 'Complétez votre profil (bio, photo, expérience)' },
  { emoji: '✅', text: 'Vérifiez votre identité pour rassurer les propriétaires' },
  { emoji: '🔍', text: 'Parcourez les annonces de garde et postulez' },
  { emoji: '💬', text: 'Échangez avec les propriétaires via la messagerie' },
]

const ownerSteps = [
  { emoji: '🏠', text: 'Décrivez votre logement et vos animaux' },
  { emoji: '📸', text: 'Ajoutez des photos pour attirer les meilleurs gardiens' },
  { emoji: '📋', text: 'Publiez votre première annonce de garde' },
  { emoji: '🤝', text: 'Sélectionnez le gardien idéal parmi les candidatures' },
]

const WelcomeEmail = ({ firstName, role }: WelcomeProps) => {
  const steps = role === 'owner' ? ownerSteps : sitterSteps
  const greeting = firstName ? `Bienvenue ${firstName} !` : 'Bienvenue sur Guardiens !'

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Bienvenue sur {SITE_NAME} — voici comment bien démarrer</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{greeting}</Heading>
          <Text style={text}>
            Vous venez de rejoindre la communauté {SITE_NAME} en tant que <strong>{roleLabel(role)}</strong>. 
            On est ravis de vous accueillir ! 🎉
          </Text>

          <Hr style={hr} />

          <Heading as="h2" style={h2}>
            Vos premières étapes
          </Heading>

          {steps.map((step, i) => (
            <Section key={i} style={stepRow}>
              <Text style={stepEmoji}>{step.emoji}</Text>
              <Text style={stepText}>
                <strong>Étape {i + 1}.</strong> {step.text}
              </Text>
            </Section>
          ))}

          <Section style={ctaSection}>
            <Button style={button} href={`${SITE_URL}/dashboard`}>
              Compléter mon profil
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={text}>
            Si vous avez la moindre question, n'hésitez pas à consulter notre FAQ ou à nous contacter.
            La communauté est là pour vous !
          </Text>

          <Text style={legal}>
            Cet e-mail vous est envoyé par {SITE_NAME} (Jérémie Martinot, SIRET 894 864 040 00015)
            suite à la création de votre compte (art. 6.1.b RGPD — exécution du contrat).
            Pour exercer vos droits (accès, rectification, suppression) : contact@guardiens.fr.
          </Text>

          <Text style={footer}>L'équipe {SITE_NAME} 🐾</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WelcomeEmail,
  subject: (data: Record<string, any>) =>
    data.firstName
      ? `Bienvenue ${data.firstName} sur Guardiens ! 🐾`
      : 'Bienvenue sur Guardiens ! 🐾',
  displayName: 'Email de bienvenue',
  previewData: { firstName: 'Marie', role: 'sitter' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const h2 = { fontSize: '18px', fontWeight: '600' as const, color: 'hsl(40, 12%, 10%)', margin: '0 0 16px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const stepRow = { display: 'flex' as const, marginBottom: '12px' }
const stepEmoji = { fontSize: '18px', margin: '0 12px 0 0', lineHeight: '1.4' }
const stepText = { fontSize: '14px', color: 'hsl(40, 12%, 10%)', lineHeight: '1.5', margin: '0' }
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
