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

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.fr"

interface Props {
  firstName?: string
  city?: string
  nearby_sitters_count?: number
  radius_km?: number
  top_3_sitter_names?: string[]
}

const Email = ({ firstName, city, nearby_sitters_count, radius_km, top_3_sitter_names }: Props) => {
  const name = firstName || ''
  const cityLabel = city || 'chez vous'
  const nearby = typeof nearby_sitters_count === 'number' ? nearby_sitters_count : 0
  const radius = radius_km || 30
  const top = Array.isArray(top_3_sitter_names) ? top_3_sitter_names.filter(Boolean) : []
  const publishUrl = `${SITE_URL}/sits/create?utm_source=email&utm_campaign=owner_no_sit&utm_medium=j3`
  const dashboardUrl = `${SITE_URL}/dashboard?utm_source=email&utm_campaign=owner_no_sit&utm_medium=j3`

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>
        {nearby > 0
          ? `${nearby} gardiens attendent une annonce à ${cityLabel}`
          : `Publiez votre première annonce en 2 minutes`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <AlmaSignature />
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>

          <Text style={text}>
            Vous êtes inscrit sur {SITE_NAME} depuis quelques jours. Vous n'avez pas encore
            publié votre première annonce, et c'est ce qui débloque tout le reste. Sans annonce,
            aucun gardien ne peut vous proposer sa candidature.
          </Text>

          {nearby > 0 ? (
            <Section style={statCard}>
              <Text style={statBig}>{nearby} gardiens vérifiés</Text>
              <Text style={statSmall}>
                dans un rayon de {radius} km autour de {cityLabel}
                {top.length > 0 ? `, dont ${top.join(', ')}.` : '.'}
              </Text>
            </Section>
          ) : null}

          <Text style={text}>
            Publier une annonce prend 2 minutes. Vous décrivez vos animaux, vos dates, ce que
            vous attendez du gardien. Vous rencontrez les candidats avant de choisir. La
            rencontre reste la meilleure façon de savoir si le courant passe.
          </Text>

          <Text style={baseline}>Gratuit pour vous, sans engagement.</Text>

          <Section style={ctaSection}>
            <Button style={button} href={publishUrl}>
              Publier mon annonce en 2 minutes
            </Button>
          </Section>

          <Text style={textSmall}>
            Vous avez commencé une annonce ? Elle vous attend en brouillon.{' '}
            <a href={dashboardUrl} style={inlineLink}>Reprenez où vous en étiez</a>.
          </Text>

          <Text style={sig}>Jérémie et Elisa</Text>

          <Hr style={hr} />
          <LegalFooter purpose="d'accompagnement à la prise en main de votre compte" basis="6.1.f" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Vos gardiens locaux attendent votre annonce',
  displayName: 'Propriétaire sans annonce, J+3',
  previewData: {
    firstName: 'Camille',
    city: 'Lyon',
    nearby_sitters_count: 137,
    radius_km: 30,
    top_3_sitter_names: ['Théo (Lyon)', 'Marie (Villeurbanne)', 'Sofia (Bron)'],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const textSmall = { fontSize: '13px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '16px 0 8px' }
const baseline = { fontSize: '13px', color: 'hsl(153, 42%, 30%)', fontWeight: '600' as const, margin: '4px 0 16px' }
const sig = { fontSize: '14px', color: 'hsl(37, 7%, 30%)', fontStyle: 'italic' as const, margin: '20px 0 0' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px',
  borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const,
  textDecoration: 'none', display: 'inline-block',
}
const inlineLink = { color: 'hsl(153, 42%, 30%)', textDecoration: 'underline' }
const statCard = {
  backgroundColor: 'hsl(37, 30%, 96%)',
  borderLeft: '3px solid hsl(153, 42%, 30%)',
  padding: '14px 16px', borderRadius: '6px', margin: '16px 0',
}
const statBig = { fontSize: '18px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 4px' }
const statSmall = { fontSize: '13px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.5', margin: 0 }
