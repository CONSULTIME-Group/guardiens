/// <reference types="npm:@types/react@18.3.1" />
// alert-digest : digest ciblé (rayon / département / France) envoyé aux
// utilisateurs ayant configuré une veille. Remplace l'envoi Resend direct
// historique afin de bénéficier du cap de fréquence, des suppressions, du
// respect des opt-out et du log email_send_log.
//
// Vouvoiement, sans emoji ni tiret cadratin, sans mention de prix, jamais
// « voisin ».
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Img,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface SitItem {
  id: string
  title?: string
  city?: string
  ownerFirstName?: string
  startDate?: string
  endDate?: string
  daysCount?: number | null
  animalsSummary?: string
  excerpt?: string
  isUrgent?: boolean
  coverPhotoUrl?: string | null
}

interface MissionItem {
  id: string
  title?: string
  city?: string
  category?: string
  dateNeeded?: string
  excerpt?: string
  exchangeOffer?: string
  coverPhotoUrl?: string | null
  missionType?: 'besoin' | 'offre' | null
}

interface Props {
  firstName?: string
  zoneLabel?: string
  sits?: SitItem[]
  missions?: MissionItem[]
}

const AlertDigestEmail = ({
  firstName,
  zoneLabel,
  sits = [],
  missions = [],
}: Props) => {
  const total = sits.length + missions.length
  const zone = zoneLabel || 'votre secteur'
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>
        {total} nouveauté{total > 1 ? 's' : ''} dans votre veille {zone}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>Bonjour {firstName ? firstName : ''}</Heading>
          <Text style={lead}>
            {total} nouveauté{total > 1 ? 's' : ''} à découvrir dans votre veille
            {' '}<strong>{zone}</strong>.
          </Text>

          {sits.length > 0 ? (
            <>
              <Text style={sectionTitle}>Gardes proposées · {sits.length}</Text>
              {sits.map((s) => {
                const href = `${SITE_URL}/sits/${s.id}`
                return (
                  <Section key={s.id} style={card}>
                    {s.coverPhotoUrl ? (
                      <Img
                        src={s.coverPhotoUrl}
                        alt=""
                        width="504"
                        height="220"
                        style={coverImg}
                      />
                    ) : null}
                    {s.isUrgent ? <Text style={urgentBadge}>Demande urgente</Text> : null}
                    {s.title ? <Text style={cardTitle}>{s.title}</Text> : null}
                    <Text style={cardMeta}>
                      {s.city ? <strong>{s.city}</strong> : null}
                      {s.city && s.startDate ? ' · ' : null}
                      {s.startDate && s.endDate ? `du ${s.startDate} au ${s.endDate}` : null}
                      {typeof s.daysCount === 'number' ? ` · ${s.daysCount} jour${s.daysCount > 1 ? 's' : ''}` : null}
                    </Text>
                    {s.ownerFirstName ? (
                      <Text style={cardMeta}>Proposée par {s.ownerFirstName}</Text>
                    ) : null}
                    {s.animalsSummary ? (
                      <Text style={cardMeta}>{s.animalsSummary}</Text>
                    ) : null}
                    {s.excerpt ? <Text style={excerpt}>{s.excerpt}</Text> : null}
                    <Button style={button} href={href}>Voir cette garde</Button>
                  </Section>
                )
              })}
            </>
          ) : null}

          {missions.length > 0 ? (
            <>
              <Text style={sectionTitle}>Demandes d'entraide · {missions.length}</Text>
              {missions.map((m) => {
                const href = `${SITE_URL}/petites-missions/${m.id}`
                return (
                  <Section key={m.id} style={card}>
                    {m.coverPhotoUrl ? (
                      <Img
                        src={m.coverPhotoUrl}
                        alt=""
                        width="504"
                        height="200"
                        style={coverImg}
                      />
                    ) : null}
                    {m.title ? <Text style={cardTitle}>{m.title}</Text> : null}
                    <Text style={cardMeta}>
                      {m.city ? <strong>{m.city}</strong> : null}
                      {m.city && (m.category || m.dateNeeded) ? ' · ' : null}
                      {m.category ?? null}
                      {m.category && m.dateNeeded ? ' · ' : null}
                      {m.dateNeeded ? `pour le ${m.dateNeeded}` : null}
                    </Text>
                    {m.excerpt ? <Text style={excerpt}>{m.excerpt}</Text> : null}
                    {m.exchangeOffer ? (
                      <Text style={cardMeta}>En échange : {m.exchangeOffer}</Text>
                    ) : null}
                    <Button style={button} href={href}>
                      {m.missionType === 'offre' ? 'Voir cette offre' : 'Proposer mon aide'}
                    </Button>
                  </Section>
                )
              })}
            </>
          ) : null}

          <LegalFooter
            purpose="la bonne marche de votre veille"
            basis="6.1.f"
          />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AlertDigestEmail,
  subject: (data: Record<string, any>) => {
    const s = Array.isArray(data?.sits) ? data.sits.length : 0
    const m = Array.isArray(data?.missions) ? data.missions.length : 0
    const parts: string[] = []
    if (s > 0) parts.push(`${s} garde${s > 1 ? 's' : ''}`)
    if (m > 0) parts.push(`${m} demande${m > 1 ? 's' : ''} d'entraide`)
    const zone = data?.zoneLabel ? `près de ${data.zoneLabel}` : 'près de chez vous'
    if (parts.length === 0) return `Votre veille Guardiens ${zone}`
    return `${parts.join(' et ')} ${zone}`
  },
  displayName: 'Digest de veille (rayon / département / France)',
  previewData: {
    firstName: 'Camille',
    zoneLabel: 'Lyon',
    sits: [
      {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Deux chats et un jardin à Lyon 3e',
        city: 'Lyon',
        ownerFirstName: 'Camille',
        startDate: '12 juillet 2026',
        endDate: '22 juillet 2026',
        daysCount: 10,
        animalsSummary: '2 chats',
        coverPhotoUrl: null,
        excerpt: 'Un intérieur calme, très lumineux, chats indépendants et joueurs.',
      },
    ],
    missions: [
      {
        id: '22222222-2222-2222-2222-222222222222',
        title: 'Coup de main pour promener mon chien samedi matin',
        city: 'Villeurbanne',
        category: 'Coup de main',
        dateNeeded: 'samedi 20 juillet',
        excerpt: 'Je propose de promener votre chien 30 minutes, gratuitement.',
        exchangeOffer: 'Un pot de confiture maison',
        coverPhotoUrl: null,
        missionType: 'besoin',
      },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 12px' }
const lead = { fontSize: '15px', color: 'hsl(37, 12%, 25%)', lineHeight: '1.6', margin: '0 0 18px' }
const sectionTitle = {
  fontSize: '13px', fontWeight: '700' as const, color: 'hsl(153, 42%, 30%)',
  textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '18px 0 8px',
}
const card = {
  backgroundColor: 'hsl(37, 22%, 96%)',
  border: '1px solid hsl(37, 22%, 89%)',
  borderRadius: '12px',
  padding: '16px 18px',
  margin: '10px 0 16px',
}
const coverImg = {
  width: '100%',
  maxWidth: '504px',
  height: 'auto',
  borderRadius: '8px',
  marginBottom: '10px',
  objectFit: 'cover' as const,
  display: 'block',
}
const urgentBadge = {
  display: 'inline-block',
  backgroundColor: '#FBE9E5',
  color: '#B8341E',
  fontSize: '11px',
  fontWeight: '700' as const,
  letterSpacing: '0.5px',
  textTransform: 'uppercase' as const,
  padding: '4px 10px',
  borderRadius: '999px',
  margin: '0 0 8px',
}
const cardTitle = { fontSize: '16px', fontWeight: '600' as const, color: 'hsl(153, 42%, 25%)', margin: '0 0 6px' }
const cardMeta = { fontSize: '13px', color: 'hsl(37, 7%, 35%)', margin: '4px 0' }
const excerpt = { fontSize: '13px', color: 'hsl(37, 7%, 45%)', margin: '6px 0 10px', lineHeight: '1.55' }
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)',
  color: '#ffffff',
  padding: '10px 22px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
  marginTop: '8px',
}
