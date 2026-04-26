import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.fr"

interface Props {
  sitterFirstName?: string
  ownerFirstName?: string
  sitTitle?: string
  city?: string
  distanceKm?: number
  startDate?: string
  endDate?: string
  sitId?: string
  animalsSummary?: string
}

const NearbySitAlertEmail = ({
  sitterFirstName,
  ownerFirstName,
  sitTitle,
  city,
  distanceKm,
  startDate,
  endDate,
  sitId,
  animalsSummary,
}: Props) => {
  const ctaHref = sitId ? `${SITE_URL}/sits/${sitId}` : `${SITE_URL}/sits`
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>
        Une nouvelle annonce près de chez vous{city ? ` à ${city}` : ''}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Une annonce près de chez vous 🐾</Heading>

          <Text style={text}>
            Bonjour{sitterFirstName ? ` ${sitterFirstName}` : ''},
          </Text>

          <Text style={text}>
            Une nouvelle garde vient d'être publiée dans votre secteur
            {city ? <> à <strong>{city}</strong></> : null}
            {typeof distanceKm === 'number' ? <> (à environ {distanceKm} km de chez vous)</> : null}.
          </Text>

          <Section style={card}>
            {sitTitle ? <Text style={cardTitle}>{sitTitle}</Text> : null}
            {ownerFirstName ? (
              <Text style={cardLine}>👤 Proposée par {ownerFirstName}</Text>
            ) : null}
            {animalsSummary ? (
              <Text style={cardLine}>🐾 {animalsSummary}</Text>
            ) : null}
            {startDate && endDate ? (
              <Text style={cardLine}>📅 Du {startDate} au {endDate}</Text>
            ) : null}
          </Section>

          <Text style={text}>
            Le secteur compte encore peu de gardiens disponibles : votre profil
            peut vraiment faire la différence pour cette famille.
          </Text>

          <Button style={button} href={ctaHref}>
            Voir l'annonce
          </Button>

          <Hr style={hr} />
          <Text style={legal}>
            Vous recevez cet e-mail car vous êtes inscrit·e comme gardien·ne sur
            {' '}{SITE_NAME} dans une zone proche de cette annonce. Vous pouvez
            ajuster vos préférences d'alerte depuis votre espace personnel.
          </Text>
          <Text style={legal}>
            {SITE_NAME} — Jérémie Martinot (SIRET 894 864 040 00015) ·
            contact@guardiens.fr
          </Text>
          <Text style={footer}>À très vite, l'équipe {SITE_NAME} 🐾</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: NearbySitAlertEmail,
  subject: (data: Record<string, any>) =>
    data.city
      ? `Nouvelle annonce à ${data.city} — un coup de patte ?`
      : `Nouvelle annonce près de chez vous — un coup de patte ?`,
  displayName: 'Alerte annonce locale (gardien)',
  previewData: {
    sitterFirstName: 'Faïza',
    ownerFirstName: 'Patricia',
    sitTitle: 'Tribu de 4 chats, 2 perroquets et un chien',
    city: 'Schweighouse-sur-Moder',
    distanceKm: 35,
    startDate: '21 juin 2026',
    endDate: '5 juillet 2026',
    sitId: '293fab2e-b32d-45a0-9c04-36a4f43c484f',
    animalsSummary: '4 chats, 2 perroquets, 1 chien',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const card = {
  backgroundColor: 'hsl(37, 22%, 96%)',
  border: '1px solid hsl(37, 22%, 89%)',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '12px 0 20px',
}
const cardTitle = { fontSize: '16px', fontWeight: '600' as const, color: 'hsl(153, 42%, 25%)', margin: '0 0 8px' }
const cardLine = { fontSize: '13px', color: 'hsl(37, 7%, 35%)', margin: '4px 0' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const legal = { fontSize: '10px', color: 'hsl(37, 7%, 60%)', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '10px 0 0' }
