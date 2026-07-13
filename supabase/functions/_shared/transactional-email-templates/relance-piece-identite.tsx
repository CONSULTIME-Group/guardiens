import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Guardiens'
const SITE_URL = 'https://guardiens.fr'

interface RelancePieceIdentiteProps {
  firstName?: string
}

const RelancePieceIdentiteEmail = ({ firstName }: RelancePieceIdentiteProps) => {
  const name = firstName?.trim() || ''

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Finalisez la vérification de votre identité sur {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
        <BrandHeader />
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>

          <Text style={text}>
            Nous avons bien reçu votre selfie pour la vérification d'identité sur <strong>{SITE_NAME}</strong>.
            Merci&nbsp;! Il manque cependant un dernier élément pour que notre équipe puisse traiter votre demande&nbsp;:
            la <strong>pièce d'identité officielle</strong> (carte d'identité, passeport ou titre de séjour).
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightTitle}>Vérification en attente</Text>
            <Text style={highlightText}>
              Tant que les deux fichiers (selfie + pièce d'identité) ne sont pas déposés ensemble,
              votre dossier ne peut pas être soumis à notre équipe et reste invisible côté modération.
            </Text>
            </Section>

          <Text style={text}>
            <strong>2 minutes suffisent</strong> pour finaliser&nbsp;:
          </Text>

          <Text style={listItem}>1. Rendez-vous dans vos paramètres de compte</Text>
          <Text style={listItem}>2. Section « Vérification d'identité »</Text>
          <Text style={listItem}>3. Déposez le recto de votre pièce d'identité</Text>

          <Section style={ctaSection}>
            <Button style={button} href={`${SITE_URL}/settings?tab=identity`}>
              Finaliser ma vérification
            </Button>
            </Section>

          <Text style={subtext}>
            Une fois la pièce déposée, notre équipe valide votre dossier sous 24 à 48&nbsp;h ouvrées
            et vous recevez un email de confirmation.
          </Text>

          <Hr style={hr} />

          <Text style={text}>
            Une question ou un blocage ? Répondez simplement à cet email, nous lisons tout.
          </Text>

        <LegalFooter
          purpose="la bonne marche de votre compte"
          basis="6.1.f"
        />
        </Container>
        </Body>
        </Html>
  )
}

export const template = {
  component: RelancePieceIdentiteEmail,
  subject: 'Finalisez votre vérification d’identité',
  displayName: 'Relance pièce d\'identité manquante',
  previewData: { firstName: 'Julie' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const subtext = { fontSize: '13px', color: 'hsl(37, 7%, 55%)', lineHeight: '1.5', margin: '12px 0 0', fontStyle: 'italic' as const }
const listItem = { fontSize: '14px', color: 'hsl(37, 7%, 35%)', lineHeight: '1.8', margin: '4px 0', paddingLeft: '8px' }
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
const legal = { fontSize: '10px', color: 'hsl(37, 7%, 60%)', lineHeight: '1.5', margin: '20px 0 12px' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '10px 0 0' }
