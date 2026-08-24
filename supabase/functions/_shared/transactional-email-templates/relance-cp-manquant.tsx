import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"

interface RelanceCpProps {
  prenom?: string
  cta_url?: string
  /** Rang de la relance, de 1 à 4. Le message change à chaque rang. */
  rang?: number
  /** Nombre de gardes ouvertes utilisé au rang 2, si la donnée est disponible. */
  open_sits_count?: number
  /** Zone décrite au rang 2 : département, région, ou "en France". */
  open_sits_zone?: string
  /** Lien profond authentifié, prioritaire sur cta_url quand il est présent. */
  deepLinkUrl?: string
}

const RelanceCpManquantEmail = ({
  prenom,
  cta_url,
  rang,
  open_sits_count,
  open_sits_zone,
  deepLinkUrl,
}: RelanceCpProps) => {
  const name = prenom || ''
  const link = deepLinkUrl || cta_url || 'https://guardiens.fr/mon-secteur'
  const step = rang && rang >= 1 && rang <= 4 ? rang : 1
  const zone = open_sits_zone || 'en France'

  // Rang 1, le bénéfice. Rang 2, le concret chiffré. Rangs 3 et 4, la sobriété.
  const heading = step >= 3
    ? (name ? `Bonjour ${name},` : 'Bonjour,')
    : (name ? `Bonjour ${name},` : 'Bonjour,')

  const body: React.ReactNode = step === 1 ? (
    <>
      <Text style={text}>
        Bienvenue chez {SITE_NAME}. Il manque une seule information pour que nous puissions
        vous prévenir dès qu'une garde s'ouvre près de chez vous : votre secteur, c'est à dire
        votre code postal et la distance que vous acceptez de parcourir.
      </Text>
      <Text style={text}>
        Tant qu'il n'est pas renseigné, vous n'apparaissez pas dans les recherches des
        propriétaires du coin, et aucune alerte ne peut vous parvenir. Cela prend trente secondes,
        sur une page qui ne demande que ces deux réponses.
      </Text>
    </>
  ) : step === 2 ? (
    <>
      <Text style={text}>
        {typeof open_sits_count === 'number' && open_sits_count > 0
          ? `Il y a en ce moment ${open_sits_count} garde${open_sits_count > 1 ? 's' : ''} ouverte${open_sits_count > 1 ? 's' : ''} ${zone}. Nous ne pouvons pas vous dire lesquelles vous concernent, parce que nous ne savons pas encore où vous habitez.`
          : `Des gardes s'ouvrent régulièrement ${zone}. Nous ne pouvons pas vous dire lesquelles vous concernent, parce que nous ne savons pas encore où vous habitez.`}
      </Text>
      <Text style={text}>
        Indiquez votre code postal et votre rayon de déplacement, et nous vous montrons
        immédiatement ce qui est ouvert autour de vous.
      </Text>
    </>
  ) : (
    <>
      <Text style={text}>
        Un simple rappel : votre secteur n'est pas encore renseigné, donc nous ne pouvons pas
        vous signaler les gardes qui s'ouvrent près de chez vous.
      </Text>
      <Text style={text}>
        Si le sujet n'est plus d'actualité pour vous, vous pouvez vous désinscrire de ces
        rappels avec le lien situé en bas de ce message. Nous ne reviendrons pas vers vous.
      </Text>
    </>
  )

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>
        {step >= 3
          ? 'Votre secteur, en deux réponses'
          : 'Indiquez votre secteur pour voir les gardes près de chez vous'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{heading}</Heading>

          {body}

          <Section style={ctaSection}>
            <Button style={button} href={link}>
              Indiquer mon secteur
            </Button>
            <Text style={reassurance}>
              Trente secondes, et vous voyez les gardes autour de vous.
            </Text>
          </Section>

          <Hr style={hr} />

          <LegalFooter
            purpose="la bonne marche de votre compte"
            basis="6.1.f"
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
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
