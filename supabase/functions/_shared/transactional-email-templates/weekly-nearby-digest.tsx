/// <reference types="npm:@types/react@18.3.1" />
// weekly-nearby-digest : le resume hebdomadaire de proximite.
// Trois sections, dans cet ordre : gardes ouvertes, entraide, questions sans
// reponse acceptee. Ce gabarit n'est jamais rendu sans contenu, la fonction
// d'envoi sort en silence quand le total est nul.
//
// Vouvoiement, aucun emoji, aucun tiret cadratin ni demi-cadratin, jamais le
// mot voisin, jamais "gratuit" en promesse.
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Section, Hr, Link,
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
  distanceKm?: number | null
  startDate?: string
  endDate?: string
  animalsSummary?: string
}
interface MissionItem {
  id: string
  title?: string
  city?: string
  distanceKm?: number | null
  missionType?: 'besoin' | 'offre' | null
}
interface QuestionItem {
  id: string
  title?: string
  city?: string | null
  distanceKm?: number | null
  answersCount?: number
}
interface Props {
  firstName?: string
  radiusKm?: number
  baseRadiusKm?: number
  wideningNotice?: string | null
  sits?: SitItem[]
  missions?: MissionItem[]
  questions?: QuestionItem[]
}

const meta = (city?: string | null, distanceKm?: number | null, extra?: string) => {
  const parts: string[] = []
  if (city) parts.push(city)
  if (typeof distanceKm === 'number') parts.push(`${Math.round(distanceKm)} km`)
  if (extra) parts.push(extra)
  return parts.join(' · ')
}

const Email = ({
  firstName,
  radiusKm = 30,
  wideningNotice = null,
  sits = [],
  missions = [],
  questions = [],
}: Props) => {
  const total = sits.length + missions.length + questions.length
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{`Cette semaine, ${total} chose${total > 1 ? 's' : ''} à regarder dans vos ${radiusKm} km`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>
            {firstName ? `Bonjour ${firstName}, ` : 'Bonjour, '}
            voici votre semaine autour de chez vous
          </Heading>
          <Text style={lead}>
            {`Nous avons regardé ce qui est ouvert dans un rayon de ${radiusKm} km. Rien d'autre ne part de notre part cette semaine.`}
          </Text>
          {wideningNotice ? <Text style={notice}>{wideningNotice}</Text> : null}

          {sits.length > 0 ? (
            <Section style={section}>
              <Heading as="h2" style={h2}>Gardes ouvertes</Heading>
              {sits.map((s) => (
                <Text key={s.id} style={item}>
                  <Link href={`${SITE_URL}/annonces/${s.id}`} style={link}>
                    {s.title || 'Une garde à découvrir'}
                  </Link>
                  <span style={metaStyle}>
                    {' '}
                    {meta(s.city, s.distanceKm, [s.startDate && s.endDate ? `du ${s.startDate} au ${s.endDate}` : '', s.animalsSummary || ''].filter(Boolean).join(' · '))}
                  </span>
                </Text>
              ))}
            </Section>
          ) : null}

          {missions.length > 0 ? (
            <Section style={section}>
              <Heading as="h2" style={h2}>Entraide autour de vous</Heading>
              {missions.map((m) => (
                <Text key={m.id} style={item}>
                  <Link href={`${SITE_URL}/petites-missions/${m.id}`} style={link}>
                    {m.title || 'Un coup de main à donner'}
                  </Link>
                  <span style={metaStyle}>
                    {' '}
                    {meta(m.city, m.distanceKm, m.missionType === 'offre' ? 'offre' : 'besoin')}
                  </span>
                </Text>
              ))}
            </Section>
          ) : null}

          {questions.length > 0 ? (
            <Section style={section}>
              <Heading as="h2" style={h2}>Questions encore sans réponse retenue</Heading>
              {questions.map((q) => (
                <Text key={q.id} style={item}>
                  <Link href={`${SITE_URL}/questions/${q.id}`} style={link}>
                    {q.title || 'Une question de la communauté'}
                  </Link>
                  <span style={metaStyle}>
                    {' '}
                    {meta(q.city, q.distanceKm, typeof q.answersCount === 'number' ? `${q.answersCount} réponse${q.answersCount > 1 ? 's' : ''}` : undefined)}
                  </span>
                </Text>
              ))}
            </Section>
          ) : null}

          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={`${SITE_URL}/recherche`} style={btn}>Voir ce qui se passe près de chez vous</Button>
          </Section>

          <Hr style={hr} />
          <Text style={small}>
            Vous choisissez la fréquence de ces emails, flux par flux, depuis vos{' '}
            <Link href={`${SITE_URL}/email-preferences`} style={link}>préférences email</Link>.
          </Text>
          <LegalFooter />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const n =
      (Array.isArray(data?.sits) ? data.sits.length : 0) +
      (Array.isArray(data?.missions) ? data.missions.length : 0) +
      (Array.isArray(data?.questions) ? data.questions.length : 0)
    const km = data?.radiusKm ?? 30
    return `${n} chose${n > 1 ? 's' : ''} à regarder dans vos ${km} km cette semaine`
  },
  displayName: 'Résumé hebdomadaire de proximité',
  previewData: {
    firstName: 'Camille',
    radiusKm: 50,
    baseRadiusKm: 30,
    wideningNotice: "Rien dans vos 30 km cette semaine, voici ce qui existe un peu plus loin, jusqu'à 50 km.",
    sits: [
      {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Deux chats et un jardin à Villeurbanne',
        city: 'Villeurbanne',
        distanceKm: 12,
        startDate: '12 juillet 2026',
        endDate: '22 juillet 2026',
        animalsSummary: '2 chats',
      },
    ],
    missions: [
      {
        id: '22222222-2222-2222-2222-222222222222',
        title: 'Promener mon chien samedi matin',
        city: 'Lyon',
        distanceKm: 8,
        missionType: 'besoin',
      },
    ],
    questions: [
      {
        id: '33333333-3333-3333-3333-333333333333',
        title: 'Comment habituer un chat à la laisse ?',
        city: 'Bron',
        distanceKm: 15,
        answersCount: 2,
      },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '21px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 12px' }
const h2 = { fontSize: '15px', fontWeight: 700 as const, color: 'hsl(153, 42%, 25%)', margin: '0 0 8px' }
const lead = { fontSize: '15px', color: 'hsl(37, 12%, 25%)', lineHeight: '1.6', margin: '0 0 12px' }
const notice = {
  fontSize: '14px',
  color: 'hsl(37, 12%, 25%)',
  backgroundColor: 'hsl(37, 22%, 94%)',
  borderRadius: '10px',
  padding: '10px 14px',
  margin: '0 0 16px',
  lineHeight: '1.5',
}
const section = { margin: '16px 0', padding: '14px 16px', backgroundColor: 'hsl(37, 22%, 96%)', borderRadius: '12px' }
const item = { fontSize: '14px', color: 'hsl(37, 7%, 30%)', lineHeight: '22px', margin: '6px 0' }
const metaStyle = { color: 'hsl(37, 7%, 45%)', fontSize: '13px' }
const link = { color: 'hsl(153, 42%, 30%)', textDecoration: 'underline', fontWeight: 600 }
const btn = {
  backgroundColor: 'hsl(153, 42%, 30%)',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600 as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const small = { fontSize: '12px', color: 'hsl(37, 7%, 45%)', lineHeight: '1.5', margin: '0 0 8px' }
