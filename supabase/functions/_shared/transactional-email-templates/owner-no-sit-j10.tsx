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
}

const Email = ({ firstName, city, nearby_sitters_count }: Props) => {
  const name = firstName || ''
  const cityLabel = city || 'chez vous'
  const nearby = typeof nearby_sitters_count === 'number' ? nearby_sitters_count : 0
  const publishUrl = `${SITE_URL}/sits/create?utm_source=email&utm_campaign=owner_no_sit&utm_medium=j10`

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Une annonce publiée = première candidature en 48h en moyenne</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <AlmaSignature />
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>

          <Text style={text}>
            Il y a 10 jours vous vous êtes inscrit chez nous. Nous ne vous avons pas encore vu
            publier d'annonce. C'est peut-être que ce n'est pas le bon moment, et c'est OK.
            Mais on voulait vous dire : vos gardiens locaux vous attendent.
          </Text>

          {nearby > 0 ? (
            <Section style={statCard}>
              <Text style={statBig}>{nearby} gardiens vérifiés autour de {cityLabel}</Text>
              <Text style={statSmall}>
                La plupart des propriétaires qui publient reçoivent leur première candidature
                en moins de 48h.
              </Text>
            </Section>
          ) : (
            <Text style={text}>
              La plupart des propriétaires qui publient reçoivent leur première candidature en
              moins de 48h.
            </Text>
          )}

          <Text style={text}>
            Depuis notre lancement, nos propriétaires reçoivent en moyenne 3 candidatures par
            annonce. Vous rencontrez chaque candidat avant de choisir. Vous décidez.
          </Text>

          <Text style={baseline}>
            {SITE_NAME} est gratuit pour vous, sans engagement. Nous facturerons peut-être un
            jour, quand nous serons vraiment au niveau que nous voulons offrir, pas avant.
          </Text>

          <Section style={ctaSection}>
            <Button style={button} href={publishUrl}>
              Publier mon annonce maintenant
            </Button>
          </Section>

          <Text style={textSmall}>
            Si {SITE_NAME} ne vous intéresse plus, vous pouvez vous désinscrire via le lien en
            bas de cet email. Aucun jugement.
          </Text>

          <Text style={sig}>Jérémie et Elisa</Text>

          <AlmaSignoff />
          <Hr style={hr} />
          <LegalFooter purpose="l'accompagnement à la prise en main de votre compte" basis="6.1.f" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Vos gardiens locaux vous attendent',
  displayName: 'Propriétaire sans annonce, J+10',
  previewData: { firstName: 'Camille', city: 'Lyon', nearby_sitters_count: 137 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const textSmall = { fontSize: '13px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '16px 0 8px' }
const baseline = { fontSize: '13px', color: 'hsl(153, 42%, 30%)', margin: '4px 0 16px', lineHeight: '1.6' }
const sig = { fontSize: '14px', color: 'hsl(37, 7%, 30%)', fontStyle: 'italic' as const, margin: '20px 0 0' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px',
  borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const,
  textDecoration: 'none', display: 'inline-block',
}
const statCard = {
  backgroundColor: 'hsl(37, 30%, 96%)',
  borderLeft: '3px solid hsl(153, 42%, 30%)',
  padding: '14px 16px', borderRadius: '6px', margin: '16px 0',
}
const statBig = { fontSize: '17px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 4px' }
const statSmall = { fontSize: '13px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.5', margin: 0 }
