import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Link } from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

/** Toujours une URL absolue dans un email : un chemin relatif y est mort. */
const absolute = (path?: string | null): string | null => {
  if (!path) return null
  if (path.startsWith('https://')) return path
  if (!path.startsWith('/')) return null
  return `${SITE_URL}${path}`
}

interface Props {
  firstName?: string
  role?: 'owner' | 'sitter'
  counterpartFirstName?: string
  sitTitle?: string
  startDateFr?: string
  sitId?: string
  /**
   * Préparation de la garde, gardien uniquement. Ces champs ne sont
   * renseignés par la fonction d'envoi que si la ressource existe vraiment
   * (fiche de race résolue, guide de ville publié). Jamais de lien mort,
   * jamais de contenu sans rapport avec cette garde.
   */
  breedGuidePath?: string | null
  breedGuideName?: string | null
  cityGuidePath?: string | null
  cityGuideName?: string | null
}

const SitReminderJ7 = ({
  firstName,
  role,
  counterpartFirstName,
  sitTitle,
  startDateFr,
  sitId,
  breedGuidePath,
  breedGuideName,
  cityGuidePath,
  cityGuideName,
}: Props) => {
  const isOwner = role === 'owner'
  const bodyLead = isOwner
    ? `Votre garde ${sitTitle ? `« ${sitTitle} » ` : ''}avec ${counterpartFirstName || 'votre gardien'} commence le ${startDateFr || 'bientôt'}.`
    : `Votre garde ${sitTitle ? `« ${sitTitle} » ` : ''}chez ${counterpartFirstName || 'votre propriétaire'} commence le ${startDateFr || 'bientôt'}.`
  const checklist = isOwner
    ? 'Pensez à préparer le guide de la maison et à prévoir une rencontre si ce n\'est pas déjà fait.'
    : 'Pensez à confirmer les derniers détails avec le propriétaire et à relire le guide de la maison.'
  const breedUrl = isOwner ? null : absolute(breedGuidePath)
  const cityUrl = isOwner ? null : absolute(cityGuidePath)
  const showPrep = Boolean((breedUrl && breedGuideName) || (cityUrl && cityGuideName))
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Votre garde commence dans 7 jours</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>Votre garde commence dans 7 jours</Heading>
          <Text style={text}>Bonjour {firstName || ''},</Text>
          <Text style={text}>{bodyLead}</Text>
          <Section style={card}>
            <Text style={cardLine}>{checklist}</Text>
          </Section>
          {showPrep && (
            <Section style={card}>
              <Text style={cardLine}>Pour préparer votre arrivée :</Text>
              {breedUrl && breedGuideName && (
                <Text style={cardLine}>
                  <Link style={inlineLink} href={breedUrl}>La fiche {breedGuideName}</Link>
                </Text>
              )}
              {cityUrl && cityGuideName && (
                <Text style={cardLine}>
                  <Link style={inlineLink} href={cityUrl}>Le guide de {cityGuideName}</Link>
                </Text>
              )}
            </Section>
          )}
          <Button style={button} href={`${SITE_URL}/sits/${sitId || ''}`}>Voir la garde</Button>
          <LegalFooter purpose="le suivi de votre garde à venir" basis="6.1.b" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SitReminderJ7,
  subject: 'Votre garde commence dans 7 jours',
  displayName: 'Rappel garde J-7',
  previewData: {
    firstName: 'Camille',
    role: 'sitter',
    counterpartFirstName: 'Alex',
    sitTitle: 'Garde de Mistigri',
    startDateFr: '21 juillet 2026',
    sitId: 'demo',
    breedGuidePath: '/races/cat-europeen',
    breedGuideName: 'européen',
    cityGuidePath: '/guides/annecy',
    cityGuideName: 'Annecy',
  },
} satisfies TemplateEntry


const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 14px' }
const card = { backgroundColor: '#F8F6F1', borderRadius: '8px', padding: '14px 16px', margin: '12px 0 20px' }
const cardLine = { fontSize: '13px', color: '#524E47', lineHeight: '1.6', margin: 0 }
const inlineLink = { color: '#2C6D50', textDecoration: 'underline', fontWeight: '600' as const }

const button = {
  backgroundColor: '#2C6D50',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
