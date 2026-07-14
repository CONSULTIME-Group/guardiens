/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr, Link, Img } from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { AlmaSignature, AlmaIntro } from './_alma-signature.tsx'
import { AlmaSignoff } from './_alma-signoff.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'
const utm = (section: string) => `utm_source=email&utm_campaign=mutual_aid_weekly_digest&utm_medium=weekly&utm_content=${section}`

interface MissionItem {
  id: string
  title?: string
  city?: string
  missionType?: 'besoin' | 'offre' | null
  distanceKm?: number | null
  photoUrl?: string | null
}
interface QuestionItem {
  id: string
  title?: string
  city?: string | null
  answersCount?: number
}
interface TopMemberItem {
  userId: string
  firstName?: string
  city?: string | null
  badgesCount?: number
}
interface Props {
  firstName?: string
  city?: string | null
  missions?: MissionItem[]
  questions?: QuestionItem[]
  topMembers?: TopMemberItem[]
}

const Email = ({ firstName, city, missions = [], questions = [], topMembers = [] }: Props) => {
  const zoneLabel = city ? `à ${city}` : 'en France'
  const publishUrl = `${SITE_URL}/petites-missions/creer?${utm('cta_publish')}`
  const askUrl = `${SITE_URL}/questions/nouvelle?${utm('cta_ask')}`
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Le fil de l'entraide de cette semaine {zoneLabel}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <AlmaSignature />
          <AlmaIntro firstName={firstName} />
          <Heading style={h1}>Le fil de l'entraide de cette semaine {zoneLabel}</Heading>

          {missions.length > 0 && (
            <Section style={section}>
              <Heading as="h2" style={h2}>Nouvelles missions près de chez vous</Heading>
              {missions.map((m) => (
                <div key={m.id} style={missionRow}>
                  {m.photoUrl ? (
                    <Img
                      src={m.photoUrl}
                      alt=""
                      width="80"
                      height="80"
                      style={missionThumb}
                    />
                  ) : null}
                  <Text style={itemLine}>
                    <Link href={`${SITE_URL}/petites-missions/${m.id}?${utm('mission')}`} style={link}>
                      {m.title || 'Mission sans titre'}
                    </Link>
                    <span style={meta}>
                      {m.missionType === 'offre' ? ' · Offre' : ' · Besoin'}
                      {m.city ? ` · ${m.city}` : ''}
                      {typeof m.distanceKm === 'number' ? ` · ${Math.round(m.distanceKm)} km` : ''}
                    </span>
                  </Text>
                </div>
              ))}
            </Section>
          )}

          {questions.length > 0 && (
            <Section style={section}>
              <Heading as="h2" style={h2}>Les questions qui font parler cette semaine</Heading>
              {questions.map((q) => (
                <Text key={q.id} style={itemLine}>
                  <Link href={`${SITE_URL}/questions/${q.id}?${utm('question')}`} style={link}>
                    {q.title || 'Question sans titre'}
                  </Link>
                  <span style={meta}>
                    {typeof q.answersCount === 'number' ? ` · ${q.answersCount} réponse${q.answersCount > 1 ? 's' : ''}` : ''}
                    {q.city ? ` · ${q.city}` : ''}
                  </span>
                </Text>
              ))}
            </Section>
          )}

          {topMembers.length > 0 && (
            <Section style={section}>
              <Heading as="h2" style={h2}>Les membres les plus reconnus cette semaine</Heading>
              {topMembers.map((tm) => (
                <Text key={tm.userId} style={itemLine}>
                  <Link href={`${SITE_URL}/gardiens/${tm.userId}?${utm('member')}`} style={link}>
                    {tm.firstName || 'Un membre'}
                  </Link>
                  <span style={meta}>
                    {tm.city ? ` · ${tm.city}` : ''}
                    {typeof tm.badgesCount === 'number' ? ` · ${tm.badgesCount} badge${tm.badgesCount > 1 ? 's' : ''} reçu${tm.badgesCount > 1 ? 's' : ''}` : ''}
                  </span>
                </Text>
              ))}
            </Section>
          )}

          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={publishUrl} style={btnPrimary}>Publier votre besoin ou votre offre</Button>
          </Section>
          <Text style={pCenter}>
            Ou <Link href={askUrl} style={link}>posez votre question</Link> à la communauté.
          </Text>

          <Hr style={hr} />
          <AlmaSignoff />
          <LegalFooter />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const zone = data?.city ? `à ${data.city}` : 'en France'
    return `Le fil de l'entraide cette semaine ${zone}`
  },
  displayName: "Digest hebdo entraide",
  previewData: {
    firstName: 'Marie',
    city: 'Lyon',
    missions: [
      { id: 'm1', title: 'Sortir mon chien mercredi', city: 'Lyon', missionType: 'besoin', distanceKm: 2 },
    ],
    questions: [
      { id: 'q1', title: 'Comment habituer un chat à la laisse ?', answersCount: 4 },
    ],
    topMembers: [
      { userId: 'u1', firstName: 'Julien', city: 'Lyon', badgesCount: 3 },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { color: '#1a1a1a', fontSize: '22px', fontWeight: 700, margin: '20px 0 16px 0' }
const h2 = { color: '#1a1a1a', fontSize: '16px', fontWeight: 700, margin: '0 0 8px 0' }
const section = { margin: '18px 0', padding: '14px 16px', backgroundColor: '#fafafa', borderRadius: '10px' }
const itemLine = { color: '#333', fontSize: '14px', lineHeight: '22px', margin: '4px 0' }
const missionRow = { display: 'flex' as const, alignItems: 'flex-start' as const, gap: '10px', margin: '6px 0' }
const missionThumb = { borderRadius: '8px', objectFit: 'cover' as const, flexShrink: 0 }
const meta = { color: '#666', fontSize: '13px' }
const link = { color: '#2b6cb0', textDecoration: 'underline', fontWeight: 600 }
const pCenter = { textAlign: 'center' as const, color: '#666', fontSize: '13px', margin: '6px 0 0 0' }
const btnPrimary = { backgroundColor: '#1a1a1a', color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }
const hr = { borderColor: '#eee', margin: '20px 0' }
