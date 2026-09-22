import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = "https://guardiens.fr"

interface RelanceProfilIncompletProps {
  firstName?: string
}

const RelanceProfilIncompletEmail = ({ firstName }: RelanceProfilIncompletProps) => {
  const name = firstName?.trim() || ''

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Une photo, votre code postal, trois lignes sur vous.</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>

          <Text style={text}>
            Bienvenue sur Guardiens. Votre profil est presque prêt.
          </Text>

          <Text style={text}>
            Il apparaît dans les recherches des gens du coin dès qu'il est rempli à 60&nbsp;%.
            Trois informations suffisent&nbsp;:
          </Text>

          <Text style={listItem}>une photo de vous&nbsp;;</Text>
          <Text style={listItem}>votre code postal&nbsp;;</Text>
          <Text style={listItem}>trois lignes pour vous présenter.</Text>

          <Section style={ctaSection}>
            <Button style={button} href={`${SITE_URL}/profile`}>
              Compléter mon profil
            </Button>
          </Section>

          <Text style={text}>
            Comptez trois minutes. Une question&nbsp;? Répondez à cet email, nous lisons chaque
            message.
          </Text>

          <Text style={text}>Elisa et Jérémie</Text>

          <Hr style={hr} />

          <LegalFooter
            purpose="la bonne marche de votre compte"
            basis="6.1.f"
            extra="Vous recevez ce message en tant que membre de Guardiens. Vos préférences d'email se règlent depuis votre espace personnel."
          />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RelanceProfilIncompletEmail,
  subject: 'Trois informations, et votre profil apparaît près de chez vous',
  displayName: 'Relance profil incomplet (J+2)',
  previewData: { firstName: 'Marie' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
const listItem = { fontSize: '14px', color: '#5F5B53', lineHeight: '1.8', margin: '4px 0', paddingLeft: '8px' }
const hr = { borderColor: '#E9E4DD', margin: '24px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0 8px' }
const button = {
  backgroundColor: '#2C6D50',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
