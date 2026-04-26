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
  reviewerName?: string
  sitTitle?: string
  sitId?: string
}

const ReviewReceivedEmail = ({ firstName, reviewerName, sitTitle, sitId }: Props) => {
  const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,'
  const reviewer = reviewerName || 'votre partenaire de garde'
  const reviewUrl = sitId ? `${SITE_URL}/review/${sitId}` : `${SITE_URL}/sits`

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{reviewer} a laissé un avis — à votre tour !</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={starsSection}>
            <Text style={starsText}>📝</Text>
          </Section>

          <Heading style={h1}>Un avis vous attend</Heading>

          <Text style={text}>{greeting}</Text>

          <Text style={text}>
            {reviewer} a pris le temps de laisser un avis suite à la garde{sitTitle ? ` « ${sitTitle} »` : ''}.
            Partagez à votre tour votre expérience — cela ne prend que 2 minutes.
          </Text>

          <Section style={infoBox}>
            <Text style={infoTitle}>📋 Bon à savoir</Text>
            <Text style={infoItem}>
              Les avis sont publiés simultanément, une fois que les deux parties ont donné le leur.
              Ni vous ni l'autre partie ne pouvez voir l'avis de l'autre avant publication.
            </Text>
            <Text style={infoItem}>
              Ce système « double aveugle » garantit des retours sincères et équitables.
            </Text>
          </Section>

          <Section style={ctaSection}>
            <Button style={button} href={reviewUrl}>
              Laisser mon avis
            </Button>
          </Section>

          <Hr style={hr} />

          <Section style={legalSection}>
            <Text style={legalText}>
              Conformément au RGPD (art. 6.1.f), cet e-mail est envoyé dans le cadre de l'intérêt légitime
              lié au bon fonctionnement du service d'avis entre membres. Vos données personnelles ne sont
              utilisées que pour l'envoi de cette notification et ne sont pas transmises à des tiers.
            </Text>
            <Text style={legalText}>
              Les avis publiés sur {SITE_NAME} sont modérés conformément aux articles L. 111-7-2
              du Code de la consommation et au décret n° 2017-1436. Chaque avis émane d'un membre
              ayant effectivement participé à la garde concernée.
            </Text>
          </Section>

          <Text style={footer}>L'équipe {SITE_NAME} 🐾</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ReviewReceivedEmail,
  subject: (data: Record<string, any>) =>
    data.reviewerName
      ? `${data.reviewerName} a laissé un avis — à votre tour !`
      : 'Un avis a été laissé — à votre tour !',
  displayName: 'Invitation avis (autre partie)',
  previewData: {
    firstName: 'Marie',
    reviewerName: 'Thomas',
    sitTitle: 'Garde chat Paris 11e',
    sitId: 'abc-123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const starsSection = { textAlign: 'center' as const, margin: '0 0 8px' }
const starsText = { fontSize: '28px', margin: '0', lineHeight: '1' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px', textAlign: 'center' as const }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const infoBox = {
  backgroundColor: 'hsl(40, 33%, 96%)',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '20px 0',
  border: '1px solid hsl(40, 22%, 88%)',
}
const infoTitle = { fontSize: '14px', fontWeight: '600' as const, color: 'hsl(40, 12%, 25%)', margin: '0 0 10px' }
const infoItem = { fontSize: '13px', color: 'hsl(40, 12%, 35%)', lineHeight: '1.5', margin: '0 0 6px' }
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
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const legalSection = { margin: '0 0 16px' }
const legalText = { fontSize: '10px', color: 'hsl(37, 7%, 60%)', lineHeight: '1.5', margin: '0 0 8px' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '10px 0 0' }
