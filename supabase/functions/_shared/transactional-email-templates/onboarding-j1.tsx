import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section, Row, Column, Img,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Guardiens'
const SITE_URL = 'https://guardiens.fr'

interface TopSitter {
  first_name?: string | null
  city?: string | null
  avatar_url?: string | null
  affinity_score?: number | null
  distance_km?: number | null
}

interface OnboardingJ1Props {
  firstName?: string
  /** true = propriétaire, false/undefined = gardien */
  isOwner?: boolean
  /** ville du destinataire (owner) */
  city?: string | null
  /** nb de gardiens vérifiés à ~30 km */
  nearbySittersCount?: number | null
  /** top 3 gardiens compatibles (owner only) */
  topSitters?: TopSitter[]
}

const utm = 'utm_source=email&utm_campaign=onboarding_j1&utm_medium=lifecycle'

const OnboardingJ1Email = ({
  firstName,
  isOwner,
  city,
  nearbySittersCount,
  topSitters,
}: OnboardingJ1Props) => {
  const name = firstName || ''
  const hasSitters = Array.isArray(topSitters) && topSitters.length > 0
  const locationLabel = city ? ` près de ${city}` : ' près de chez vous'

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>
        {isOwner
          ? `Votre annonce peut être publiée en 2 minutes${locationLabel}`
          : `Votre profil ${SITE_NAME} vous attend, 5 minutes suffisent`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>

          {isOwner ? (
            <>
              <Text style={text}>
                Bienvenue sur {SITE_NAME}. Publier votre première annonce prend
                deux minutes, et c'est gratuit sans engagement.
              </Text>

              {typeof nearbySittersCount === 'number' && nearbySittersCount > 0 && (
                <Text style={textStrong}>
                  {nearbySittersCount} gardien{nearbySittersCount > 1 ? 's' : ''} vérifié{nearbySittersCount > 1 ? 's' : ''}
                  {locationLabel} peuvent voir votre annonce dès sa publication.
                </Text>
              )}

              {hasSitters && (
                <>
                  <Heading as="h2" style={h2}>Ces gardiens sont déjà là</Heading>
                  <Section style={cardsSection}>
                    {topSitters!.slice(0, 3).map((s, i) => (
                      <Row key={i} style={cardRow}>
                        <Column style={cardAvatarCol}>
                          {s.avatar_url ? (
                            <Img
                              src={s.avatar_url}
                              alt=""
                              width="48"
                              height="48"
                              style={avatarImg}
                            />
                          ) : (
                            <div style={avatarFallback}>
                              {(s.first_name || '?').slice(0, 1).toUpperCase()}
                            </div>
                          )}
                        </Column>
                        <Column style={cardBodyCol}>
                          <Text style={cardName}>{s.first_name || 'Gardien'}</Text>
                          <Text style={cardMeta}>
                            {[s.city, s.distance_km != null ? `à ${s.distance_km} km` : null]
                              .filter(Boolean).join(' · ')}
                          </Text>
                          {typeof s.affinity_score === 'number' && s.affinity_score > 0 && (
                            <Text style={cardScore}>Affinité {s.affinity_score}/100</Text>
                          )}
                        </Column>
                      </Row>
                    ))}
                  </Section>
                </>
              )}

              <Section style={ctaSection}>
                <Button style={button} href={`${SITE_URL}/dashboard?intent=draft_from_prompt&${utm}`}>
                  Publier mon annonce en 2 minutes
                </Button>
              </Section>

              <Text style={textMuted}>
                Astuce, décrivez votre absence en une phrase, notre assistant
                pré-remplit le formulaire pour vous.
              </Text>

              <Hr style={hr} />

              <Text style={textSmall}>
                Vous préférez compléter votre profil d'abord ?{' '}
                <a href={`${SITE_URL}/profile?${utm}`} style={link}>Compléter mon profil</a>.
              </Text>
            </>
          ) : (
            <>
              <Text style={text}>
                Vous vous êtes inscrit(e) sur {SITE_NAME} hier, bienvenue dans la communauté.
              </Text>
              <Text style={text}>
                Pour accéder aux annonces de garde et aux petites missions près de chez vous,
                ou ailleurs en France si vous élargissez votre rayon,
                votre profil doit être complété à 60 % minimum. Il vous manque
                peut-être juste une photo et une courte bio.
              </Text>
              <Section style={ctaSection}>
                <Button style={button} href={`${SITE_URL}/profile?${utm}`}>
                  Compléter mon profil
                </Button>
              </Section>
            </>
          )}

          <Hr style={hr} />

          <LegalFooter
            purpose="du bon fonctionnement de votre compte"
            basis="6.1.f"
          />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OnboardingJ1Email,
  subject: 'Votre première annonce en 2 minutes, Guardiens',
  displayName: 'Onboarding J+1',
  previewData: {
    firstName: 'Marie',
    isOwner: true,
    city: 'Lyon',
    nearbySittersCount: 12,
    topSitters: [
      { first_name: 'Camille', city: 'Villeurbanne', affinity_score: 82, distance_km: 4.2, avatar_url: null },
      { first_name: 'Léa', city: 'Lyon 3e', affinity_score: 78, distance_km: 6.1, avatar_url: null },
      { first_name: 'Thomas', city: 'Caluire', affinity_score: 71, distance_km: 8.5, avatar_url: null },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const h2 = { fontSize: '16px', fontWeight: '600' as const, color: 'hsl(37, 15%, 25%)', margin: '24px 0 12px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const textStrong = { ...text, color: 'hsl(37, 15%, 25%)', fontWeight: '600' as const }
const textMuted = { fontSize: '13px', color: 'hsl(37, 7%, 55%)', lineHeight: '1.6', margin: '12px 0 0', textAlign: 'center' as const }
const textSmall = { fontSize: '12px', color: 'hsl(37, 7%, 50%)', lineHeight: '1.5', margin: '0 0 12px' }
const link = { color: 'hsl(153, 42%, 30%)', textDecoration: 'underline' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0 8px' }
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)',
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const cardsSection = { margin: '8px 0 20px' }
const cardRow = {
  borderTop: '1px solid hsl(37, 22%, 92%)',
  padding: '10px 0',
}
const cardAvatarCol = { width: '60px', verticalAlign: 'middle' as const }
const cardBodyCol = { verticalAlign: 'middle' as const }
const avatarImg = { borderRadius: '50%', display: 'block' }
const avatarFallback = {
  width: '48px', height: '48px', borderRadius: '50%',
  backgroundColor: 'hsl(153, 42%, 92%)', color: 'hsl(153, 42%, 30%)',
  textAlign: 'center' as const, lineHeight: '48px', fontWeight: '600' as const,
}
const cardName = { fontSize: '14px', fontWeight: '600' as const, color: 'hsl(37, 15%, 20%)', margin: 0 }
const cardMeta = { fontSize: '12px', color: 'hsl(37, 7%, 50%)', margin: '2px 0 0' }
const cardScore = { fontSize: '12px', color: 'hsl(153, 42%, 30%)', margin: '2px 0 0', fontWeight: '600' as const }
