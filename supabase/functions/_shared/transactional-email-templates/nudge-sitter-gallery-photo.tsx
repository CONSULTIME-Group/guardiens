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

interface NudgeSitterGalleryPhotoProps {
  firstName?: string
}

const NudgeSitterGalleryPhotoEmail = ({ firstName }: NudgeSitterGalleryPhotoProps) => {
  const name = firstName?.trim() || ''

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Une photo de votre univers, et votre fiche devient visible</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>

          <Text style={text}>
            Vous avez pris le temps d'écrire votre présentation. Ça se voit, et les
            propriétaires la lisent avant de choisir.
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightTitle}>Une photo ouvre votre fiche aux moteurs de recherche</Text>
            <Text style={highlightText}>
              Votre fiche gardien devient visible pour Google dès qu'elle porte une
              photo, en plus de votre texte. Une seule photo suffit.
            </Text>
          </Section>

          <Text style={text}>
            Votre salon, votre jardin, le chat que vous avez gardé le mois dernier.
            Montrez l'univers dans lequel un propriétaire imagine confier sa maison.
          </Text>

          <Section style={ctaSection}>
            <Button style={button} href={`${SITE_URL}/profile?section=galerie`}>
              Ajouter une photo
            </Button>
          </Section>

          <Text style={subtext}>
            Lumière du jour, cadrage large, un téléphone suffit. L'authenticité prime.
          </Text>

          <Text style={text}>
            La vérification d'identité produit le même effet et rassure encore
            davantage. Les deux chemins mènent au même endroit.
          </Text>

          <Hr style={hr} />

          <Text style={text}>
            Une question, un blocage ? Répondez à cet email, on lit tout.
          </Text>

          <LegalFooter
            purpose="la visibilité de votre profil gardien"
            basis="6.1.f"
            extra="Vous recevez ce message parce que votre profil gardien porte déjà un texte de présentation et attend une photo. Vous pouvez ajuster vos préférences d'email depuis votre espace personnel."
          />

        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: NudgeSitterGalleryPhotoEmail,
  subject: "Votre profil est écrit, une photo l'ouvre à Google",
  displayName: 'Nudge photo de galerie (gardien, SEO)',
  previewData: { firstName: 'Camille' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
const subtext = { fontSize: '13px', color: '#948E84', lineHeight: '1.5', margin: '12px 0 0', fontStyle: 'italic' as const }
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
const highlightBox = {
  backgroundColor: '#F8F6F1',
  border: '1px solid #E1DBD0',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '20px 0',
}
const highlightTitle = { fontSize: '14px', fontWeight: '600' as const, color: '#B35919', margin: '0 0 6px' }
const highlightText = { fontSize: '13px', color: '#68625A', lineHeight: '1.55', margin: '0' }
