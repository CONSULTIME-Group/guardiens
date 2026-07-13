import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Link, Button,
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
}

const ListingUnpublishedFeedbackEmail = ({
  firstName,
  sitTitle,
  sitUrl,
}: ListingUnpublishedFeedbackProps) => (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Votre annonce {sitTitle || ''} n'est plus en ligne — un retour à nous partager ?</Preview>
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
          Je viens de remarquer que votre annonce{' '}
          {sitTitle ? <strong>« {sitTitle} »</strong> : 'récente'} a été dépubliée
          alors qu'elle avait déjà reçu des candidatures. J'espère que ce n'est pas
          une erreur de manipulation de votre part — si c'est le cas, vous pouvez
          la remettre en ligne en un clic depuis votre espace propriétaire.
        </Text>

        {sitUrl ? (
          <Button href={sitUrl} style={button}>
            Voir mon annonce
          </Button>
        ) : null}

        <Text style={text}>
          Si c'est volontaire (vous avez trouvé quelqu'un, vous changez vos
          dates, vous préférez attendre…), pas de souci, c'est votre annonce et
          vous restez aux commandes.
        </Text>

        <Heading as="h2" style={h2}>
          Auriez-vous 2 minutes pour nous aider à progresser ?
        </Heading>

        <Text style={text}>
          {SITE_NAME} est encore <strong>entièrement gratuit</strong> à ce stade,
          précisément pour pouvoir s'améliorer grâce aux retours des premiers
          propriétaires comme vous. Votre regard compte beaucoup.
        </Text>

        <Text style={text}>
          Quelques questions, répondez aussi librement que vous voulez :
        </Text>

        <Text style={list}>
          • Pourquoi avoir dépublié l'annonce ?<br />
          • Les candidatures reçues correspondaient-elles à ce que vous cherchiez ?<br />
          • Qu'est-ce qui vous a plu, qu'est-ce qui vous a manqué ou frustré ?<br />
          • Y a-t-il quelque chose que nous pourrions changer pour vous donner envie de retenter ?
        </Text>

        <Text style={text}>
          Il vous suffit de répondre directement à cet email — c'est moi qui le
          recevrai.
        </Text>

        <Text style={text}>
          Merci sincèrement pour la confiance que vous nous avez accordée en
          publiant chez nous.
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
    data.sitTitle
      ? `Votre annonce « ${data.sitTitle} » — un retour à partager ?`
      : `Votre annonce dépubliée — un retour à partager ?`,
  displayName: 'Annonce dépubliée — demande de feedback',
  to: 'contact@guardiens.fr',
  previewData: {
    firstName: 'Lucy',
    sitTitle: 'Garde de 2 chats à Mouvaux cet été',
    sitUrl: 'https://guardiens.fr/dashboard',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const h2 = { fontSize: '17px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '24px 0 12px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 30%)', lineHeight: '1.6', margin: '0 0 16px' }
const list = { fontSize: '14px', color: 'hsl(37, 7%, 30%)', lineHeight: '1.8', margin: '0 0 20px' }
const signature = { fontSize: '14px', color: 'hsl(37, 7%, 30%)', lineHeight: '1.5', margin: '20px 0 24px' }
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  display: 'inline-block',
  margin: '8px 0 20px',
}
