import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface Item {
  kind: 'sit' | 'mission'
  id: string
  slug?: string | null
  title?: string
  city?: string
  distanceKm?: number
  startDate?: string
  endDate?: string
  ownerFirstName?: string
  category?: string
  missionType?: 'besoin' | 'offre'
  excerpt?: string
}

interface Props {
  firstName?: string
  radiusKm?: number
  city?: string
  items?: Item[]
}

function itemUrl(it: Item): string {
  const seg = (it.slug && it.slug.trim().length > 0) ? it.slug : it.id
  if (it.kind === 'sit') return `${SITE_URL}/annonces/${seg}`
  return `${SITE_URL}/petites-missions/${seg}`
}

function missionBadge(mt?: 'besoin' | 'offre'): string {
  return mt === 'offre' ? "Offre d'aide" : "Demande d'aide"
}

function cardHeadline(it: Item): string | undefined {
  if (it.kind !== 'mission' || !it.ownerFirstName) return it.title
  return it.missionType === 'offre'
    ? `${it.ownerFirstName} propose son aide`
    : `${it.ownerFirstName} cherche un coup de main`
}

const NearbyDailyDigestEmail = ({ firstName, radiusKm = 15, city, items = [] }: Props) => {
  const count = items.length
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>
        {count} annonce{count > 1 ? 's' : ''} près de chez vous aujourd'hui
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>Aujourd'hui, près de chez vous</Heading>

          <Text style={text}>
            Bonjour{firstName ? ` ${firstName}` : ''},
          </Text>

          <Text style={text}>
            {count === 1
              ? `Une nouvelle annonce a été publiée dans les dernières 24h à moins de ${radiusKm} km`
              : `${count} nouvelles annonces ont été publiées dans les dernières 24h à moins de ${radiusKm} km`}
            {city ? <> de <strong>{city}</strong></> : null}.
          </Text>

          {items.map((it) => {
            const isMission = it.kind === 'mission'
            const badge = isMission
              ? missionBadge(it.missionType)
              : 'Garde'
            const headline = cardHeadline(it)
            const authorLine = isMission && it.ownerFirstName
              ? (it.missionType === 'offre'
                  ? `Proposée par ${it.ownerFirstName}`
                  : `Demandé par ${it.ownerFirstName}`)
              : (it.ownerFirstName ? `Proposée par ${it.ownerFirstName}` : undefined)
            return (
              <Section key={`${it.kind}-${it.id}`} style={card}>
                <Text style={cardTag}>
                  {badge}
                  {typeof it.distanceKm === 'number' ? ` · ${it.distanceKm} km` : ''}
                </Text>
                {headline ? <Text style={cardTitle}>{headline}</Text> : null}
                {isMission && it.title && it.title !== headline ? (
                  <Text style={cardLine}>{it.title}</Text>
                ) : null}
                {isMission && it.excerpt ? (
                  <Text style={cardExcerpt}>{it.excerpt}</Text>
                ) : null}
                {it.city ? <Text style={cardLine}>{it.city}</Text> : null}
                {it.startDate && it.endDate ? (
                  <Text style={cardLine}>Du {it.startDate} au {it.endDate}</Text>
                ) : null}
                {authorLine ? <Text style={cardLine}>{authorLine}</Text> : null}
                <Link style={cardLink} href={itemUrl(it)}>
                  Voir l'annonce
                </Link>
              </Section>
            )
          })}

          <Button style={button} href={`${SITE_URL}/petites-missions`}>
            Voir toutes les annonces
          </Button>

          <Hr style={hr} />

          <Text style={note}>
            Vous recevez ce récapitulatif une fois par jour, à 13h, parce qu'il
            y a eu au moins une nouvelle annonce dans un rayon de {radiusKm} km
            autour de chez vous. Vous pouvez à tout moment ajuster la fréquence,
            le rayon (5, 15 ou 30 km) ou désactiver cet email depuis vos
            {' '}
            <Link style={link} href={`${SITE_URL}/preferences-email`}>
              préférences email
            </Link>.
          </Text>

          <LegalFooter
            purpose="de votre alerte de proximité"
            basis="6.1.f"
          />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: NearbyDailyDigestEmail,
  subject: (data: Record<string, any>) => {
    const n = Array.isArray(data?.items) ? data.items.length : 0
    if (n <= 1) return 'Une nouvelle annonce près de chez vous, Guardiens'
    return `${n} nouvelles annonces près de chez vous, Guardiens`
  },
  displayName: 'Récap quotidien de proximité (13h)',
  previewData: {
    firstName: 'Camille',
    radiusKm: 15,
    city: 'Grenoble',
    items: [
      {
        kind: 'sit',
        id: '00000000-0000-0000-0000-000000000001',
        title: 'Garde d\'un chien senior',
        city: 'Grenoble',
        distanceKm: 3,
        startDate: '20 juillet 2026',
        endDate: '3 août 2026',
        ownerFirstName: 'Lisy',
      },
      {
        kind: 'mission',
        id: '00000000-0000-0000-0000-000000000002',
        title: 'Passages quotidiens pour nourrir le chat',
        excerpt: "Je m'absente quelques jours et cherche quelqu'un pour passer nourrir mon chat.",
        city: 'Lyon',
        distanceKm: 0,
        missionType: 'besoin',
        ownerFirstName: 'Claire',
      },
    ] as Item[],
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
  padding: '14px 16px',
  margin: '10px 0',
}
const cardTag = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: 'hsl(153, 42%, 30%)', margin: '0 0 4px', fontWeight: '600' as const }
const cardTitle = { fontSize: '15px', fontWeight: '600' as const, color: 'hsl(153, 42%, 25%)', margin: '0 0 6px' }
const cardLine = { fontSize: '13px', color: 'hsl(37, 7%, 35%)', margin: '3px 0' }
const cardLink = { fontSize: '13px', color: 'hsl(153, 42%, 30%)', textDecoration: 'underline', display: 'inline-block', marginTop: '6px' }
const button = { backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block', margin: '8px 0 4px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const note = { fontSize: '12px', color: 'hsl(37, 7%, 55%)', lineHeight: '1.6', margin: '0 0 12px' }
const link = { color: 'hsl(153, 42%, 30%)', textDecoration: 'underline' }
