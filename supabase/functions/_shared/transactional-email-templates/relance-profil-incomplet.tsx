import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.fr"

interface RelanceProfilIncompletProps {
  firstName?: string
}

const RelanceProfilIncompletEmail = ({ firstName }: RelanceProfilIncompletProps) => {
  const name = firstName?.trim() || ''

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Votre profil Guardiens est encore invisible — débloquez-le en 3 minutes</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>

          <Text style={text}>
            Vous vous êtes inscrit(e) sur <strong>{SITE_NAME}</strong> il y a quelques jours,
            et nous remarquons que votre profil n'a pas encore été complété.
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightTitle}>⚠️ Votre profil est actuellement invisible</Text>
            <Text style={highlightText}>
              Tant que votre profil n'atteint pas <strong>60 % de complétion</strong>, il n'apparaît
              pas dans les recherches et vous ne pouvez ni candidater à une garde, ni proposer la vôtre.
            </Text>
          </Section>

          <Text style={text}>
            <strong>3 informations suffisent</strong> pour débloquer votre profil :
          </Text>

          <Text style={listItem}>✅ Une photo de profil</Text>
          <Text style={listItem}>✅ Votre code postal</Text>
          <Text style={listItem}>✅ Une courte présentation (3 lignes)</Text>

          <Section style={ctaSection}>
            <Button style={button} href={`${SITE_URL}/profile`}>
              Compléter mon profil maintenant
            </Button>
          </Section>

          <Text style={subtext}>
            ⏱ Temps estimé : 3 minutes — et votre profil rejoint les centaines de membres
            visibles dans votre région.
          </Text>

          <Hr style={hr} />

          <Text style={text}>
            Une question ou un blocage ? Répondez simplement à cet email, nous lisons tout.
          </Text>

          <Text style={legal}>
            Cet e-mail vous est envoyé par {SITE_NAME} (Jérémie Martinot, SIRET 894 864 040 00015)
            dans le cadre de l'intérêt légitime lié au bon fonctionnement de votre compte (art. 6.1.f RGPD).
            Pour exercer vos droits (accès, rectification, suppression) : contact@guardiens.fr.
          </Text>

          <Text style={footer}>À très vite sur {SITE_NAME} 🐾</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RelanceProfilIncompletEmail,
  subject: 'Votre profil Guardiens est encore invisible — débloquez-le en 3 minutes',
  displayName: 'Relance profil incomplet (J+2)',
  previewData: { firstName: 'Marie' },
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
