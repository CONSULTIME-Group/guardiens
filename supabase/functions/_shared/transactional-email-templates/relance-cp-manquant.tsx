import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

interface RelanceCpProps {
  prenom?: string
  cta_url?: string
  /** Rang de la relance, de 1 à 4. Conservé pour la compatibilité des appels. */
  rang?: number
  /** Nombre de gardes ouvertes, affiché quand la donnée est disponible. */
  open_sits_count?: number
  /** Zone décrite : département, région, ou "en France". */
  open_sits_zone?: string
  /** Lien profond authentifié, prioritaire sur cta_url quand il est présent. */
  deepLinkUrl?: string
}

const RelanceCpManquantEmail = ({
  prenom,
  cta_url,
  open_sits_count,
  open_sits_zone,
  deepLinkUrl,
}: RelanceCpProps) => {
  const name = prenom || ''
  const link = deepLinkUrl || cta_url || 'https://guardiens.fr/mon-secteur'
  const zone = open_sits_zone || 'en France'
  const count = typeof open_sits_count === 'number' && open_sits_count > 0 ? open_sits_count : null
  const plural = count !== null && count > 1

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Indiquez votre code postal pour voir les gardes près de chez vous</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>

          <Text style={text}>
            Votre code postal fait apparaître votre profil dans les recherches des propriétaires du
            coin, et il déclenche vos alertes dès qu'une garde s'ouvre près de chez vous.
          </Text>

          {count !== null ? (
            <Text style={text}>
              {`En ce moment, ${count} garde${plural ? 's' : ''} ${plural ? 'sont' : 'est'} ouverte${plural ? 's' : ''} ${zone}. Votre code postal permet de vous prévenir des prochaines.`}
            </Text>
          ) : null}

          <Section style={ctaSection}>
            <Button style={button} href={link}>
              Indiquer mon code postal
            </Button>
          </Section>

          <Text style={text}>
            Ces rappels s'arrêtent d'un clic, avec le lien en bas de ce message.
          </Text>

          <Text style={text}>Elisa et Jérémie</Text>

          <Hr style={hr} />

          <LegalFooter
            purpose="la bonne marche de votre compte"
            basis="6.1.f"
            extra="Vous recevez ce message en tant que membre de Guardiens. Vos préférences d'email se règlent depuis votre espace personnel."
          />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RelanceCpManquantEmail,
  subject: 'Indiquez votre secteur pour voir les gardes près de chez vous',
  displayName: 'Relance code postal manquant',
  previewData: {
    prenom: 'Marie',
    cta_url: 'https://guardiens.fr/mon-secteur',
    rang: 2,
    open_sits_count: 12,
    open_sits_zone: 'en France',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0' }
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
