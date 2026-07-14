import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr, Link, Img,
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
  coverPhotoUrl?: string | null
  animalsSummary?: string
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
            const type: 'besoin' | 'offre' | 'sit' = isMission
              ? (it.missionType === 'offre' ? 'offre' : 'besoin')
              : 'sit'
            const badge = isMission ? missionBadge(it.missionType) : 'Garde'
            const headline = cardHeadline(it)
            const authorLine = isMission && it.ownerFirstName
              ? (it.missionType === 'offre'
                  ? `Proposée par ${it.ownerFirstName}`
                  : `Demandée par ${it.ownerFirstName}`)
              : (it.ownerFirstName ? `Proposée par ${it.ownerFirstName}` : undefined)

            const accent = type === 'besoin' ? '#B45309' // ambre profond
              : type === 'offre' ? '#2C6E49' // vert Guardiens
              : '#6B7280' // neutre gris
            const badgeBg = type === 'besoin' ? '#FEF3C7'
              : type === 'offre' ? '#E6F0EA'
              : '#F1F1EF'
            const badgeFg = type === 'besoin' ? '#92400E'
              : type === 'offre' ? '#1F5638'
              : '#374151'
            const metaBits: string[] = []
            if (it.city) metaBits.push(it.city)
            if (typeof it.distanceKm === 'number') metaBits.push(`${it.distanceKm} km`)
            const metaLine = metaBits.join('  ·  ')

            return (
              <Section
                key={`${it.kind}-${it.id}`}
                style={{ ...card, borderLeft: `4px solid ${accent}` }}
              >
                <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={cardTable}>
                  <tr>
                    <td style={cardBadgeCell}>
                      <span style={{ ...badgePill, backgroundColor: badgeBg, color: badgeFg }}>
                        {badge}
                      </span>
                    </td>
                  </tr>
                </table>
                {it.coverPhotoUrl ? (
                  <Img
                    src={it.coverPhotoUrl}
                    alt=""
                    width="520"
                    height="200"
                    style={coverImg}
                  />
                ) : null}
                {headline ? <Text style={cardTitle}>{headline}</Text> : null}
                {isMission && it.title && it.title !== headline ? (
                  <Text style={cardSubtitle}>{it.title}</Text>
                ) : null}
                {isMission && it.excerpt ? (
                  <Text style={cardExcerpt}>{it.excerpt}</Text>
                ) : null}
                {metaLine ? <Text style={cardMeta}>{metaLine}</Text> : null}
                {it.startDate && it.endDate ? (
                  <Text style={cardMeta}>Du {it.startDate} au {it.endDate}</Text>
                ) : null}
                {!isMission && it.animalsSummary ? (
                  <Text style={cardMeta}>{it.animalsSummary}</Text>
                ) : null}
                {authorLine ? <Text style={cardMeta}>{authorLine}</Text> : null}
                <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: '14px 0 2px' }}>
                  <tr>
                    <td>
                      <Link
                        href={itemUrl(it)}
                        style={{ ...cardCta, backgroundColor: accent }}
                      >
                        Voir l'annonce
                      </Link>
                    </td>
                  </tr>
                </table>
              </Section>
            )
          })}

          <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ margin: '24px 0 4px' }}>
            <tr>
              <td align="center">
                <Button style={button} href={`${SITE_URL}/petites-missions`}>
                  Voir toutes les annonces
                </Button>
              </td>
            </tr>
          </table>

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
            purpose="votre alerte de proximité"
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
      {
        kind: 'mission',
        id: '00000000-0000-0000-0000-000000000003',
        title: 'Coup de main pour promener mon chien le matin',
        excerpt: 'Je propose de promener votre chien 30 minutes chaque matin cette semaine, gratuitement.',
        city: 'Villeurbanne',
        distanceKm: 4,
        missionType: 'offre',
        ownerFirstName: 'Marc',
      },
    ] as Item[],
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#FAF9F6',
  fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  margin: 0,
  padding: '24px 12px',
}
const container = {
  padding: '32px 28px',
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1a1a1a',
  margin: '4px 0 20px',
  lineHeight: '1.3',
}
const text = { fontSize: '15px', color: '#3a3a3a', lineHeight: '1.7', margin: '0 0 14px' }
const card = {
  backgroundColor: '#ffffff',
  border: '1px solid #E7E5E0',
  borderRadius: '12px',
  padding: '16px 18px 18px',
  margin: '14px 0',
  boxShadow: '0 1px 3px rgba(17,24,39,0.04)',
}
const cardTable = { margin: '0 0 6px' }
const cardBadgeCell = { padding: 0 }
const badgePill = {
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: '700' as const,
  letterSpacing: '0.3px',
  textTransform: 'uppercase' as const,
  lineHeight: '1.4',
}
const cardTitle = {
  fontSize: '17px',
  fontWeight: '700' as const,
  color: '#1a1a1a',
  margin: '6px 0 4px',
  lineHeight: '1.35',
}
const cardSubtitle = { fontSize: '14px', color: '#3a3a3a', margin: '0 0 6px', fontWeight: '500' as const }
const cardExcerpt = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: '1.6',
  margin: '4px 0 10px',
  fontStyle: 'italic' as const,
}
const cardMeta = { fontSize: '13px', color: '#6b7280', margin: '2px 0', lineHeight: '1.5' }
const coverImg = {
  width: '100%',
  maxWidth: '520px',
  height: 'auto',
  borderRadius: '10px',
  margin: '8px 0 12px',
  objectFit: 'cover' as const,
  display: 'block',
}
const cardCta = {
  display: 'inline-block',
  padding: '10px 20px',
  color: '#ffffff',
  textDecoration: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '600' as const,
  lineHeight: '1.2',
}
const button = {
  backgroundColor: '#2C6E49',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
  boxShadow: '0 4px 12px rgba(44,110,73,0.25)',
}
const hr = { borderColor: '#E7E5E0', margin: '24px 0 16px' }
const note = { fontSize: '12px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 12px' }
const link = { color: '#2C6E49', textDecoration: 'underline' }
