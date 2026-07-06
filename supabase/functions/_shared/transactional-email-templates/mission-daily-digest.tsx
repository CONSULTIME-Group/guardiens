/// <reference types="npm:@types/react@18.3.1" />
// Digest quotidien envoyé aux membres du coin : jusqu'à 3 nouvelles petites
// missions (entraide) publiées dans les 24 dernières heures, dans un rayon de
// 30 km autour du domicile. Vouvoiement, ton factuel, sans tiret cadratin.

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface MissionItem {
  missionId: string
  title?: string
  city?: string
  ownerFirstName?: string
  category?: string
  dateNeeded?: string
  duration?: string
  exchangeOffer?: string
  distanceKm?: number | null
  missionType?: 'besoin' | 'offre' | null
}

interface Props {
  helperFirstName?: string
  items?: MissionItem[]
}

const CTA = (missionId: string) =>
  `${SITE_URL}/petites-missions/${missionId}?utm_source=email&utm_campaign=mission_daily_digest&utm_medium=daily`

const CATEGORY_LABEL: Record<string, string> = {
  animals: 'Animaux', garden: 'Jardin', house: 'Maison', errand: 'Courses',
  tech: 'Technique', company: 'Compagnie', other: 'Autre',
}

const MissionDailyDigestEmail = ({ helperFirstName, items = [] }: Props) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>
      {items.length > 0
        ? `${items.length} nouveau${items.length > 1 ? 'x' : ''} coup${items.length > 1 ? 's' : ''} de main près de chez vous`
        : 'Votre digest entraide Guardiens'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />

        <Heading style={h1}>
          {items.length > 1
            ? `${items.length} coups de main près de chez vous`
            : 'Un coup de main près de chez vous'}
        </Heading>

        <Text style={text}>Bonjour{helperFirstName ? ` ${helperFirstName}` : ''},</Text>

        <Text style={text}>
          Voici les petites missions publiées ces dernières 24 heures dans un rayon
          de 30 km autour de chez vous. L'entraide est gratuite et sans engagement.
        </Text>

        {items.map((item, idx) => (
          <Section key={item.missionId} style={{ ...card, marginTop: idx === 0 ? '20px' : '14px' }}>
            {item.title ? <Text style={cardTitle}>{item.title}</Text> : null}

            <Text style={cardLine}>
              {item.city ? <strong>{item.city}</strong> : null}
              {item.city && (item.category || item.dateNeeded) ? ' · ' : null}
              {item.category ? CATEGORY_LABEL[item.category] ?? item.category : null}
              {item.category && item.dateNeeded ? ' · ' : null}
              {item.dateNeeded ? `pour le ${item.dateNeeded}` : null}
            </Text>

            {item.ownerFirstName || item.duration ? (
              <Text style={cardLine}>
                {item.ownerFirstName ? `Publié par ${item.ownerFirstName}` : ''}
                {item.ownerFirstName && item.duration ? ' · ' : ''}
                {item.duration ? `Durée : ${item.duration}` : ''}
              </Text>
            ) : null}

            {item.exchangeOffer ? (
              <Text style={cardLineSmall}>
                En échange : {item.exchangeOffer}
              </Text>
            ) : null}

            {typeof item.distanceKm === 'number' ? (
              <Text style={cardBadge}>à {item.distanceKm.toFixed(1)} km de chez vous</Text>
            ) : null}

            <Button style={button} href={CTA(item.missionId)}>
              Voir cette mission
            </Button>
          </Section>
        ))}

        <Hr style={hr} />

        <Text style={smallText}>
          Vous recevez cet email parce que vous êtes inscrit sur Guardiens et opt-in
          au digest quotidien d'entraide.
        </Text>

        <Text style={smallText}>
          <Link href={`${SITE_URL}/email-preferences`} style={linkStyle}>
            Modifier mes préférences email
          </Link>
        </Text>

        <Text style={baseline}>L'entraide reste gratuite, pour toujours.</Text>

        <LegalFooter
          purpose="du bon fonctionnement de votre digest entraide quotidien"
          basis="6.1.f"
        />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MissionDailyDigestEmail,
  subject: (data: Record<string, any>) => {
    const n = Array.isArray(data?.items) ? data.items.length : 0
    if (n === 0) return 'Votre digest entraide Guardiens'
    return n === 1
      ? 'Un coup de main près de chez vous aujourd\'hui'
      : `${n} coups de main près de chez vous aujourd'hui`
  },
  displayName: 'Digest quotidien entraide',
  previewData: {
    helperFirstName: 'Camille',
    items: [
      {
        missionId: '11111111-1111-1111-1111-111111111111',
        title: 'Aide pour tondre le jardin samedi matin',
        city: 'Lyon 3e',
        ownerFirstName: 'Thomas',
        category: 'garden',
        dateNeeded: 'samedi 11 juillet',
        duration: '2 heures',
        exchangeOffer: 'Un pot de confiture maison et un café',
        distanceKm: 2.4,
        missionType: 'besoin',
      },
      {
        missionId: '22222222-2222-2222-2222-222222222222',
        title: 'Je propose de garder votre chat pendant vos courses',
        city: 'Villeurbanne',
        ownerFirstName: 'Faïza',
        category: 'animals',
        dateNeeded: 'à convenir',
        duration: '1 à 2 heures',
        exchangeOffer: 'Sourire et gratitude',
        distanceKm: 5.8,
        missionType: 'offre',
      },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 18px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 33%)', lineHeight: '1.6', margin: '0 0 14px' }
const card = {
  backgroundColor: 'hsl(37, 22%, 96%)',
  border: '1px solid hsl(37, 22%, 89%)',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '14px 0',
}
const cardTitle = { fontSize: '16px', fontWeight: '600' as const, color: 'hsl(153, 42%, 25%)', margin: '0 0 8px' }
const cardLine = { fontSize: '13px', color: 'hsl(37, 7%, 35%)', margin: '4px 0' }
const cardLineSmall = { fontSize: '12px', color: 'hsl(37, 7%, 45%)', margin: '6px 0' }
const cardBadge = {
  fontSize: '12px',
  color: 'hsl(153, 42%, 30%)',
  fontWeight: '600' as const,
  backgroundColor: 'hsl(153, 42%, 94%)',
  padding: '4px 10px',
  borderRadius: '999px',
  display: 'inline-block',
  margin: '8px 0 12px',
}
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)',
  color: '#ffffff',
  padding: '11px 22px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
  marginTop: '4px',
}
const linkStyle = { color: 'hsl(153, 42%, 30%)', textDecoration: 'underline' }
const smallText = { fontSize: '12px', color: 'hsl(37, 7%, 50%)', lineHeight: '1.5', margin: '6px 0' }
const baseline = { fontSize: '12px', color: 'hsl(153, 42%, 30%)', fontWeight: '600' as const, margin: '14px 0 8px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '22px 0 16px' }
