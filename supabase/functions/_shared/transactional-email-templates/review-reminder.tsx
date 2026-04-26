import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.fr"

interface Props {
  firstName?: string
  sitTitle?: string
  revieweeName?: string
  sitId?: string
  isOwner?: boolean
}

const ReviewReminderEmail = ({ firstName, sitTitle, revieweeName, sitId, isOwner }: Props) => {
  const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,'
  const who = revieweeName
    ? (isOwner ? `le gardien ${revieweeName}` : `le propriétaire ${revieweeName}`)
    : (isOwner ? 'votre gardien' : 'votre propriétaire')
  const reviewUrl = sitId ? `${SITE_URL}/review/${sitId}` : `${SITE_URL}/sits`

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Comment s'est passée la garde ? Partagez votre retour</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Stars header */}
          <Section style={starsSection}>
            <Text style={starsText}>⭐⭐⭐⭐⭐</Text>
          </Section>

          <Heading style={h1}>Comment s'est passée la garde ?</Heading>

          <Text style={text}>{greeting}</Text>

          <Text style={text}>
            Votre garde{sitTitle ? ` « ${sitTitle} »` : ''} est terminée !
            Prenez 2 minutes pour partager votre expérience avec {who}.
          </Text>

          <Section style={benefitsBox}>
            <Text style={benefitTitle}>Pourquoi laisser un avis ?</Text>
            <Text style={benefitItem}>🤝 Aidez la communauté à faire les bons choix</Text>
            <Text style={benefitItem}>🏆 Valorisez {who} pour son investissement</Text>
            <Text style={benefitItem}>📈 Améliorez votre propre score de confiance</Text>
          </Section>

          <Section style={ctaSection}>
            <Button style={button} href={reviewUrl}>
              Laisser mon avis
            </Button>
          </Section>

          <Text style={note}>
            Votre avis sera publié une fois que les deux parties auront partagé le leur.
            C'est plus juste pour tout le monde ! ✌️
          </Text>

          <Hr style={hr} />

          <Text style={legalNote}>
            Conformément au RGPD (art. 6.1.f), cet e-mail est envoyé dans le cadre de l'intérêt légitime
            lié au bon fonctionnement du service d'avis. Les avis publiés sur {SITE_NAME} sont modérés
            conformément aux articles L. 111-7-2 du Code de la consommation et au décret n° 2017-1436.
          </Text>

          <Text style={footer}>L'équipe {SITE_NAME} 🐾</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ReviewReminderEmail,
  subject: (data: Record<string, any>) =>
    data.revieweeName
      ? `Comment s\u2019est passée la garde avec ${data.revieweeName} ?`
      : "Comment s\u2019est passée la garde ? ⭐",
  displayName: 'Relance avis (J+5)',
  previewData: { firstName: 'Marie', sitTitle: 'Garde chat Paris 11e', revieweeName: 'Thomas', sitId: 'abc-123', isOwner: true },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const starsSection = { textAlign: 'center' as const, margin: '0 0 8px' }
const starsText = { fontSize: '28px', margin: '0', lineHeight: '1' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px', textAlign: 'center' as const }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const benefitsBox = {
  backgroundColor: 'hsl(153, 42%, 96%)',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '20px 0',
  border: '1px solid hsl(153, 42%, 88%)',
}
const benefitTitle = { fontSize: '14px', fontWeight: '600' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 10px' }
const benefitItem = { fontSize: '13px', color: 'hsl(40, 12%, 25%)', lineHeight: '1.5', margin: '0 0 6px' }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
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
const note = { fontSize: '12px', color: 'hsl(37, 7%, 55%)', lineHeight: '1.5', margin: '0 0 16px', fontStyle: 'italic' as const, textAlign: 'center' as const }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const legalNote = { fontSize: '10px', color: 'hsl(37, 7%, 60%)', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '10px 0 0' }
