import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { AlmaSignature } from './_alma-signature.tsx'
import { AlmaSignoff } from './_alma-signoff.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = "https://guardiens.fr"

/**
 * Carte gardien du J+3. Les données transmises se limitent au prénom, à la
 * ville, à la photo et à la distance arrondie au kilomètre : les coordonnées
 * exactes des gardiens restent côté base.
 */
export interface OwnerTopSitter {
  id: string
  first_name?: string | null
  city?: string | null
  avatar_url?: string | null
  distance_km?: number | null
  url?: string | null
}

interface Props {
  firstName?: string
  city?: string
  nearby_sitters_count?: number
  radius_km?: number
  top_3_sitter_names?: string[]
  top_3_sitters?: OwnerTopSitter[]
  /** Vrai quand une annonce commencée attend le propriétaire. */
  hasDraft?: boolean
}

const SitterCard = ({ sitter }: { sitter: OwnerTopSitter }) => {
  const name = (sitter.first_name || '').trim()
  const initial = name ? name.charAt(0).toUpperCase() : 'G'
  const href = sitter.url || `${SITE_URL}/gardiens/${sitter.id}`
  return (
    <Section style={card}>
      {sitter.avatar_url ? (
        <img src={sitter.avatar_url} alt={name} width="48" height="48" style={avatar} />
      ) : (
        <Text style={avatarFallback}>{initial}</Text>
      )}
      <Text style={cardTitle}>
        <a href={href} style={inlineLink}>{name || 'Gardien'}</a>
      </Text>
      <Text style={cardLine}>
        {sitter.city ? sitter.city : ''}
        {typeof sitter.distance_km === 'number'
          ? `${sitter.city ? ', ' : ''}à ${Math.round(sitter.distance_km)} km`
          : ''}
      </Text>
    </Section>
  )
}

const Email = ({
  firstName, city, nearby_sitters_count, top_3_sitters, hasDraft,
}: Props) => {
  const name = firstName || ''
  const cityLabel = city || 'chez vous'
  const nearby = typeof nearby_sitters_count === 'number' ? nearby_sitters_count : 0
  const cards = Array.isArray(top_3_sitters) ? top_3_sitters.slice(0, 3) : []
  const publishUrl = `${SITE_URL}/sits/create?utm_source=email&utm_campaign=owner_no_sit&utm_medium=j3`
  const dashboardUrl = `${SITE_URL}/dashboard?utm_source=email&utm_campaign=owner_no_sit&utm_medium=j3`

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>En voici trois, ils habitent près de chez vous.</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <AlmaSignature />
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>

          {nearby > 0 ? (
            <Text style={text}>
              Bienvenue sur Guardiens. Autour de {cityLabel}, {nearby} gardiens peuvent garder
              votre maison et vos animaux. En voici trois&nbsp;:
            </Text>
          ) : (
            <Text style={text}>
              Bienvenue sur Guardiens. Votre première annonce se publie en quelques minutes.
            </Text>
          )}

          {cards.map((s) => <SitterCard key={s.id} sitter={s} />)}

          <Text style={text}>
            Votre annonce leur permet de vous écrire. Vous décrivez vos animaux, vos dates et ce
            qui compte pour vous, puis vous rencontrez les candidats avant de choisir.
          </Text>

          <Section style={ctaSection}>
            <Button style={button} href={publishUrl}>
              Publier mon annonce
            </Button>
          </Section>

          {hasDraft ? (
            <Text style={textSmall}>
              Votre annonce commencée vous attend&nbsp;:{' '}
              <a href={dashboardUrl} style={inlineLink}>Reprendre mon brouillon</a>
            </Text>
          ) : null}

          <Text style={sig}>Elisa et Jérémie</Text>

          <AlmaSignoff />
          <Hr style={hr} />
          <LegalFooter
            purpose="l'accompagnement à la prise en main de votre compte"
            basis="6.1.f"
            extra="Vous recevez ce message en tant que membre de Guardiens. Vos préférences d'email se règlent depuis votre espace personnel."
          />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => {
    const n = typeof d?.nearby_sitters_count === 'number' ? d.nearby_sitters_count : 0
    const cityLabel = d?.city || 'chez vous'
    if (n === 0) return 'Votre première annonce, en quelques minutes'
    if (n === 1) return `Un gardien habite autour de ${cityLabel}`
    return `${n} gardiens habitent autour de ${cityLabel}`
  },
  displayName: 'Propriétaire sans annonce, J+3',
  previewData: {
    firstName: 'Camille',
    city: 'Lyon',
    nearby_sitters_count: 137,
    radius_km: 30,
    top_3_sitter_names: ['Théo (Lyon)', 'Marie (Villeurbanne)', 'Sofia (Bron)'],
    top_3_sitters: [
      { id: '11111111-1111-1111-1111-111111111111', first_name: 'Théo', city: 'Lyon', avatar_url: null, distance_km: 3, url: 'https://guardiens.fr/gardiens/11111111-1111-1111-1111-111111111111' },
      { id: '22222222-2222-2222-2222-222222222222', first_name: 'Marie', city: 'Villeurbanne', avatar_url: null, distance_km: 6, url: 'https://guardiens.fr/gardiens/22222222-2222-2222-2222-222222222222' },
      { id: '33333333-3333-3333-3333-333333333333', first_name: 'Sofia', city: 'Bron', avatar_url: null, distance_km: 9, url: 'https://guardiens.fr/gardiens/33333333-3333-3333-3333-333333333333' },
    ],
    hasDraft: true,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
const textSmall = { fontSize: '13px', color: '#756F66', lineHeight: '1.6', margin: '16px 0 8px' }
const sig = { fontSize: '14px', color: '#524E47', fontStyle: 'italic' as const, margin: '20px 0 0' }
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = {
  backgroundColor: '#2C6D50', color: '#ffffff', padding: '12px 28px',
  borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const,
  textDecoration: 'none', display: 'inline-block',
}
const inlineLink = { color: '#2C6D50', textDecoration: 'underline' }
const card = {
  backgroundColor: '#F8F6F2',
  borderLeft: '3px solid #2C6D50',
  padding: '12px 16px', borderRadius: '6px', margin: '0 0 10px',
}
const avatar = { borderRadius: '24px', display: 'block', marginBottom: '8px' }
const avatarFallback = {
  width: '48px', height: '48px', lineHeight: '48px', textAlign: 'center' as const,
  borderRadius: '24px', backgroundColor: '#2C6D50', color: '#ffffff',
  fontSize: '18px', fontWeight: 'bold' as const, margin: '0 0 8px',
}
const cardTitle = { fontSize: '16px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 2px' }
const cardLine = { fontSize: '13px', color: '#756F66', lineHeight: '1.5', margin: 0 }
