import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section, Link,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.fr"

interface ConseilsPublicationProps {
  firstName?: string
  sitTitle?: string
  sitId?: string
  city?: string
  nbPhotos?: number
  hasDailyRoutine?: boolean
  hasRegionHighlights?: boolean
  hasHouseGuide?: boolean
  hasCoverPhoto?: boolean
  articleSlug?: string
  articleTitle?: string
}

const ConseilsPublicationEmail = ({
  firstName,
  sitTitle,
  sitId,
  city,
  nbPhotos = 0,
  hasDailyRoutine = false,
  hasRegionHighlights = false,
  hasHouseGuide = false,
  hasCoverPhoto = false,
  articleSlug = 'rediger-bonne-annonce-house-sitting',
  articleTitle = "Rédiger une bonne annonce : ce qui attire les bons gardiens",
}: ConseilsPublicationProps) => {
  const name = firstName?.trim() || ''
  const editUrl = sitId ? `${SITE_URL}/sits/${sitId}/edit` : `${SITE_URL}/sits`
  const sitUrl = sitId ? `${SITE_URL}/sits/${sitId}` : `${SITE_URL}/sits`
  const articleUrl = `${SITE_URL}/articles/${articleSlug}`

  const isPerfect = nbPhotos >= 6 && hasDailyRoutine && hasRegionHighlights && hasHouseGuide

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Votre annonce est en ligne, quelques conseils pour maximiser les candidatures</Preview>
      <Body style={main}>
        <Container style={container}>
        <BrandHeader />
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>

          <Text style={text}>
            Votre annonce {sitTitle ? <>« <strong>{sitTitle}</strong> »</> : null}
            {city ? <> à <strong>{city}</strong></> : null} est désormais publiée.
            Avant que les premières candidatures n'arrivent, nous voulions partager
            avec vous ce qui fait, sur Guardiens, la différence entre une annonce
            qui reçoit quelques messages et une annonce qui attire des gardiens vraiment
            adaptés à votre foyer.
          </Text>

          <Text style={text}>
            Un gardien va vivre chez vous plusieurs jours. Avant de candidater, il
            cherche à se projeter : voir les pièces, comprendre le quotidien des
            animaux, sentir l'ambiance des environs. Plus votre annonce répond à
            ces questions, plus vous recevrez de candidatures pertinentes.
          </Text>

          <Heading as="h2" style={h2}>Les 4 leviers qui changent tout</Heading>

          <Text style={listTitle}>1. Une galerie photo riche, avec une couverture choisie</Text>
          <Text style={text}>
            Les annonces qui reçoivent le plus de candidatures proposent entre
            6 et 12 photos : pièce de vie, chambre du gardien, cuisine, jardin,
            une ou deux vues des environs, et bien sûr les animaux dans leur cadre.
            Vous pouvez aussi définir la <strong>photo de couverture</strong> de
            l'annonce, c'est la première image que verront les gardiens en parcourant
            les résultats. Choisissez celle qui donne le plus envie de cliquer.
          </Text>

          <Text style={listTitle}>2. Une journée type détaillée</Text>
          <Text style={text}>
            Horaires des repas, sorties, soins éventuels, temps de jeu, moments
            calmes, décrire le déroulé matin / midi / soir aide les gardiens à
            évaluer la charge de travail et à se projeter concrètement.
          </Text>

          <Text style={listTitle}>3. Une description des environs</Text>
          <Text style={text}>
            Que peut-on faire autour de chez vous ? Balades, commerces, marchés,
            points d'intérêt. Cette section transforme une garde « utile » en garde
            « attirante ».
          </Text>

          <Text style={listTitle}>4. Le guide de la maison</Text>
          <Text style={text}>
            Wifi, vétérinaire, instructions des appareils, jours de poubelles,
            consignes pour les plantes, le guide n'est partagé qu'au gardien retenu,
            mais le mentionner dans l'annonce témoigne de votre niveau de préparation.
          </Text>

          {isPerfect ? (
            <Section style={successBox}>
              <Text style={successTitle}>Votre annonce est exemplaire</Text>
              <Text style={successText}>
                Vous avez déjà coché tous les indicateurs clés qui font la différence :
                une galerie complète, une journée type renseignée, une description des
                environs et un guide de la maison prêt. C'est ce niveau de soin qui
                attire les meilleurs gardiens. Bravo, et merci pour la qualité que vous
                apportez à la communauté.
              </Text>
              </Section>
          ) : (
            <Section style={highlightBox}>
              <Text style={highlightTitle}>Ce que nous avons remarqué sur votre annonce</Text>
              <Text style={highlightItem}>
                • <strong>Photos du logement :</strong> {nbPhotos} photo{nbPhotos > 1 ? 's' : ''} actuellement.
                {nbPhotos < 6 ? ' Visez 6 à 12 photos pour donner aux gardiens de quoi se projeter.' : ' Très bon volume.'}
              </Text>
              {!hasCoverPhoto && nbPhotos > 0 && (
                <Text style={highlightItem}>
                  • <strong>Photo de couverture :</strong> non définie. La première image
                  de la galerie est utilisée par défaut, pensez à choisir celle qui
                  représente le mieux votre annonce.
                </Text>
              )}
              {!hasDailyRoutine && (
                <Text style={highlightItem}>
                  • <strong>Journée type :</strong> non renseignée. C'est l'un des éléments
                  que les gardiens lisent en premier pour évaluer la charge de travail.
                </Text>
              )}
              {!hasRegionHighlights && (
                <Text style={highlightItem}>
                  • <strong>Description des environs :</strong> non renseignée. Mentionner
                  ce qu'il y a à faire autour rassure et donne envie.
                </Text>
              )}
              {!hasHouseGuide && (
                <Text style={highlightItem}>
                  • <strong>Guide de la maison :</strong> non créé. Il n'est partagé qu'aux
                  gardiens confirmés, mais sa présence rassure dès la lecture de l'annonce.
                </Text>
              )}
            </Section>
          )}

          <Section style={ctaSection}>
            <Button style={button} href={isPerfect ? sitUrl : editUrl}>
              {isPerfect ? 'Voir mon annonce' : 'Compléter mon annonce'}
            </Button>
            </Section>

          <Hr style={hr} />

          <Heading as="h2" style={h2}>Et ensuite ?</Heading>
          <Text style={text}>
            Dès qu'un gardien postule, vous recevez une notification par email.
            Vous pouvez consulter son profil, échanger avec lui via la messagerie,
            poser toutes vos questions, puis confirmer la garde quand vous êtes
            tous les deux prêts. La signature de l'accord se fait directement sur
            le site, en quelques clics. Vous gardez la main à chaque étape.
          </Text>

          <Section style={articleBox}>
            <Text style={articleLabel}>POUR ALLER PLUS LOIN</Text>
            <Link href={articleUrl} style={articleLink}>{articleTitle}</Link>
          </Section>

          <Text style={text}>
            Une question, un doute, une relecture ? Répondez simplement à cet email,
            nous sommes là pour vous accompagner.
          </Text>

        <LegalFooter
          purpose="la bonne marche de votre annonce"
          basis="6.1.f"
        />
        </Container>
        </Body>
        </Html>
  )
}

export const template = {
  component: ConseilsPublicationEmail,
  subject: 'Votre annonce est en ligne, conseils pour la rendre irrésistible',
  displayName: 'Conseils publication annonce (J+30min)',
  previewData: {
    firstName: 'Patricia',
    sitTitle: 'Garde de 2 chats à Lyon, 10 jours en août',
    sitId: '293fab2e-b32d-45a0-9c04-36a4f43c484f',
    city: 'Lyon',
    nbPhotos: 3,
    hasDailyRoutine: false,
    hasRegionHighlights: true,
    hasHouseGuide: false,
    hasCoverPhoto: true,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const h2 = { fontSize: '17px', fontWeight: '600' as const, color: 'hsl(153, 42%, 30%)', margin: '28px 0 12px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 38%)', lineHeight: '1.65', margin: '0 0 16px' }
const listTitle = { fontSize: '14px', fontWeight: '600' as const, color: 'hsl(37, 7%, 25%)', margin: '18px 0 8px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '28px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0 8px' }
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const highlightBox = {
  backgroundColor: 'hsl(37, 35%, 96%)',
  border: '1px solid hsl(37, 22%, 85%)',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '20px 0 24px',
}
const highlightTitle = { fontSize: '14px', fontWeight: '600' as const, color: 'hsl(25, 75%, 40%)', margin: '0 0 10px' }
const highlightItem = { fontSize: '13px', color: 'hsl(37, 7%, 38%)', lineHeight: '1.6', margin: '0 0 8px' }
const successBox = {
  backgroundColor: 'hsl(153, 30%, 96%)',
  border: '1px solid hsl(153, 30%, 80%)',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '20px 0 24px',
}
const successTitle = { fontSize: '14px', fontWeight: '700' as const, color: 'hsl(153, 42%, 25%)', margin: '0 0 8px', letterSpacing: '0.02em' }
const successText = { fontSize: '13px', color: 'hsl(37, 7%, 38%)', lineHeight: '1.65', margin: '0' }
const articleBox = {
  backgroundColor: 'hsl(153, 30%, 96%)',
  border: '1px solid hsl(153, 30%, 85%)',
  borderRadius: '10px',
  padding: '14px 18px',
  margin: '8px 0 20px',
}
const articleLabel = { fontSize: '11px', fontWeight: '700' as const, letterSpacing: '0.08em', color: 'hsl(153, 42%, 30%)', margin: '0 0 6px' }
const articleLink = { fontSize: '15px', fontWeight: '600' as const, color: 'hsl(153, 42%, 25%)', textDecoration: 'underline' }
const legal = { fontSize: '10px', color: 'hsl(37, 7%, 60%)', lineHeight: '1.5', margin: '24px 0 12px' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 50%)', margin: '10px 0 0' }
