import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"

interface ListingUnpublishedFeedbackProps {
  firstName?: string
  sitTitle?: string
  sitUrl?: string
  /** Code du motif choisi au moment de la dépublication, ou texte libre. */
  reason?: string
}

/**
 * Trois variantes de contenu selon le motif déjà déclaré.
 * Le motif est connu : on ne le redemande jamais.
 */
const variantFor = (reason?: string): { question: string | null; closing: string } => {
  if (reason === 'found_offline') {
    return {
      question: "Qu'est-ce qui aurait fait que vous trouviez chez nous ?",
      closing: "Votre annonce reste en brouillon, elle se republie en un clic.",
    }
  }
  if (reason === 'no_relevant_apps') {
    return {
      question: "Qu'est-ce qui manquait dans les profils que vous avez reçus ?",
      closing: "Votre annonce reste en brouillon, elle se republie en un clic.",
    }
  }
  if (reason === 'other') {
    // Motif libre : on ne suppose rien sur les dates ni sur la suite.
    return {
      question: "Qu'est-ce qui aurait fait que vous trouviez chez nous ?",
      closing: "Votre annonce reste en brouillon, elle se republie en un clic.",
    }
  }
  return {
    question: null,
    closing: "Quand vos dates seront fixées, votre annonce vous attend en brouillon.",
  }
}

const ListingUnpublishedFeedbackEmail = ({
  firstName,
  sitTitle,
  sitUrl,
  reason,
}: ListingUnpublishedFeedbackProps) => {
  const variant = variantFor(reason)
  if (reason === 'found_onplatform') {
    return <FoundOnPlatformEmail firstName={firstName} sitTitle={sitTitle} sitUrl={sitUrl} />
  }
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Votre annonce {sitTitle || ''} n'est plus en ligne</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>
            {firstName ? `Bonjour ${firstName},` : 'Bonjour,'}
          </Heading>

          <Text style={text}>
            Jérémie, fondateur de {SITE_NAME}. Je vous écris personnellement.
          </Text>

          <Text style={text}>
            Votre annonce{' '}
            {sitTitle ? <strong>« {sitTitle} »</strong> : 'récente'} vient d'être
            dépubliée. C'est votre annonce, vous restez aux commandes.
          </Text>

          {variant.question ? (
            <Text style={text}>
              <strong>{variant.question}</strong>
            </Text>
          ) : null}

          <Text style={text}>{variant.closing}</Text>

          <Text style={text}>
            Il vous suffit de répondre directement à cet email, c'est moi qui le
            recevrai.
          </Text>

          {sitUrl ? (
            <Button href={sitUrl} style={button}>
              Voir mon brouillon
            </Button>
          ) : null}

          <Text style={signature}>
            Jérémie<br />
            Fondateur de {SITE_NAME}
          </Text>

          <LegalFooter
            purpose="un échange relatif à votre annonce et à l'amélioration du service"
            basis="6.1.f"
          />
        </Container>
      </Body>
    </Html>
  )
}

/** Motif « trouvé via Guardiens » : une félicitation courte, aucune question. */
const FoundOnPlatformEmail = ({ firstName, sitTitle, sitUrl }: ListingUnpublishedFeedbackProps) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Félicitations, votre gardien est trouvé</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>
          {firstName ? `Bonjour ${firstName},` : 'Bonjour,'}
        </Heading>
        <Text style={text}>
          Félicitations ! Vous avez trouvé votre gardien sur {SITE_NAME} pour
          {sitTitle ? <> <strong>« {sitTitle} »</strong></> : ' votre annonce'}.
        </Text>
        <Text style={text}>
          Pensez à confirmer la garde depuis votre annonce : l'accord de garde
          et le guide de la maison vous y attendent, et votre gardien pourra
          ensuite laisser son avis.
        </Text>
        {sitUrl ? (
          <Button href={sitUrl} style={button}>
            Voir mon annonce
          </Button>
        ) : null}
        <Text style={text}>
          Belle garde à vous deux. Une question ? Répondez simplement à cet
          email, c'est moi qui le recevrai.
        </Text>
        <Text style={signature}>
          Jérémie<br />
          Fondateur de {SITE_NAME}
        </Text>
        <LegalFooter
          purpose="un échange relatif à votre annonce et à l'amélioration du service"
          basis="6.1.f"
        />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ListingUnpublishedFeedbackEmail,
  subject: (data: Record<string, any>) =>
    data.reason === 'found_onplatform'
      ? 'Félicitations, votre gardien est trouvé'
      : data.sitTitle
      ? `Votre annonce « ${data.sitTitle} », un retour à partager ?`
      : `Votre annonce dépubliée, un retour à partager ?`,
  displayName: 'Annonce dépubliée, demande de feedback',
  previewData: {
    firstName: 'Lucy',
    sitTitle: 'Garde de 2 chats à Mouvaux cet été',
    sitUrl: 'https://guardiens.fr/sits/demo',
    reason: 'found_offline',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#524E47', lineHeight: '1.6', margin: '0 0 16px' }
const signature = { fontSize: '14px', color: '#524E47', lineHeight: '1.5', margin: '20px 0 24px' }
const button = {
  backgroundColor: '#2C6D50',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  display: 'inline-block',
  margin: '8px 0 20px',
}
