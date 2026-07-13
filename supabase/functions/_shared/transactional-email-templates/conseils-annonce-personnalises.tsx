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

interface ConseilsAnnoncePersoProps {
  firstName?: string
  sitTitle?: string
  sitId?: string
  city?: string
  nbPhotos?: number
  hasDailyRoutine?: boolean
  hasRegionHighlights?: boolean
  hasHouseGuide?: boolean
  articleSlug?: string
  articleTitle?: string
  /** Phrase courte décrivant les animaux pour personnaliser la routine, ex « deux chats », « un chien et un perroquet » */
  petsContext?: string
  /** Paragraphe spécifique sur la qualité/cohérence des photos (optionnel) */
  photosNote?: string
  /** Inclure le rappel de choisir une photo de couverture */
  remindCoverPhoto?: boolean
}

const ConseilsAnnoncePersoEmail = ({
  firstName,
  sitTitle,
  sitId,
  city,
  nbPhotos = 0,
  hasDailyRoutine = false,
  hasRegionHighlights = false,
  hasHouseGuide = false,
  articleSlug = 'rediger-bonne-annonce-house-sitting',
  articleTitle = "Rédiger une bonne annonce : ce qui attire les bons gardiens",
  petsContext,
  photosNote,
  remindCoverPhoto = false,
}: ConseilsAnnoncePersoProps) => {
  const name = firstName?.trim() || ''
  const editUrl = sitId ? `${SITE_URL}/sits/${sitId}/edit` : `${SITE_URL}/sits`
  const articleUrl = `${SITE_URL}/articles/${articleSlug}`

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Quelques conseils pour rendre votre annonce irrésistible</Preview>
      <Body style={main}>
        <Container style={container}>
        <BrandHeader />
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>

          <Text style={text}>
            Nous avons regardé votre annonce {sitTitle ? <>« <strong>{sitTitle}</strong> »</> : null}
            {city ? <> à <strong>{city}</strong></> : null} et nous voulions
            vous partager quelques observations qui pourraient vous aider à trouver
            le bon gardien plus rapidement.
          </Text>

          <Text style={text}>
            Sur Guardiens, l'expérience est centrale : un gardien va vivre chez vous
            plusieurs jours. Avant de candidater, il a besoin de se projeter — voir
            les pièces, sentir l'ambiance, comprendre les environs. Une annonce avec
            peu d'informations visuelles, surtout dans une zone moins dense en gardiens,
            a naturellement plus de mal à convaincre.
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightTitle}>Ce que nous avons remarqué sur votre annonce</Text>
            <Text style={highlightItem}>
              {nbPhotos <= 1 ? '•' : '•'} <strong>Photos du logement :</strong> {nbPhotos} photo{nbPhotos > 1 ? 's' : ''} actuellement.
              Les annonces qui reçoivent le plus de candidatures en proposent entre 6 et 12.
            </Text>
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

          <Heading as="h2" style={h2}>Nos conseils concrets</Heading>

          <Text style={listTitle}>1. Étoffer et soigner la galerie photos</Text>
          {photosNote && (
            <Text style={text}>{photosNote}</Text>
          )}
          <Text style={listItem}>• La pièce de vie, rangée et baignée de lumière naturelle</Text>
          <Text style={listItem}>• La chambre où le gardien dormira (lit fait, espace dégagé)</Text>
          <Text style={listItem}>• La cuisine et les équipements à disposition</Text>
          <Text style={listItem}>• Le jardin et les extérieurs s'il y en a</Text>
          <Text style={listItem}>• Une ou deux photos du quartier (rue, village, points de vue)</Text>
          <Text style={listItem}>• Vos animaux dans leur cadre habituel, en gros plan et de bonne qualité</Text>
          <Text style={text}>
            Quelques conseils simples : prenez les photos en plein jour, à l'horizontale, sans contre-jour.
            Avant de photographier, prenez 5 minutes pour ranger : c'est ce que verront les gardiens
            et c'est ce qui leur permet de se projeter.
          </Text>
          {remindCoverPhoto && (
            <Text style={text}>
              <strong>Pensez aussi à choisir votre photo de couverture</strong> dans la galerie
              (la première que verront les gardiens). Préférez la photo la plus lumineuse et
              la plus représentative de l'ambiance de votre logement.
            </Text>
          )}

          <Text style={listTitle}>2. Détailler la journée type</Text>
          <Text style={text}>
            {petsContext
              ? <>Avec {petsContext}, les gardiens ont besoin de savoir à quoi ressemble une journée
                  chez vous : horaires des repas, sorties éventuelles, soins ou traitements,
                  habitudes et niveau de sociabilité de chacun. Plus c'est concret, plus vous
                  attirez des gardiens réellement à l'aise avec votre situation.</>
              : <>Les gardiens ont besoin de savoir à quoi ressemble une journée chez vous :
                  horaires des repas, soins, sorties, habitudes des animaux. Plus c'est
                  concret, plus vous attirez les bons profils.</>}
                </Text>

          <Text style={listTitle}>3. Présenter les environs</Text>
          <Text style={text}>
            Que peut-on faire autour de chez vous ? Balades, commerces, marchés, points
            d'intérêt. Cette section transforme une garde « utile » en garde « attirante ».
          </Text>

          <Text style={listTitle}>4. Compléter le guide de la maison</Text>
          <Text style={text}>
            Le guide (wifi, vétérinaire, instructions appareils, jours des poubelles,
            consignes pour les plantes, contacts utiles) n'est partagé qu'au gardien retenu,
            mais le mentionner dans votre annonce montre votre niveau de préparation
            et rassure énormément.
          </Text>

          <Section style={ctaSection}>
            <Button style={button} href={editUrl}>
              Mettre à jour mon annonce
            </Button>
            </Section>

          <Hr style={hr} />

          <Text style={text}>
            Nous avons écrit un article complet sur le sujet, qui détaille tout ce qui
            fait la différence entre une annonce qui reste sans réponse et une annonce qui
            attire les bons profils :
          </Text>

          <Section style={articleBox}>
            <Text style={articleLabel}>À LIRE</Text>
            <Link href={articleUrl} style={articleLink}>{articleTitle}</Link>
          </Section>

          <Text style={text}>
            Et bien sûr, si vous avez la moindre question ou si vous souhaitez qu'on
            relise votre annonce une fois mise à jour, répondez simplement à cet email.
            Nous sommes là pour vous accompagner.
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
  component: ConseilsAnnoncePersoEmail,
  subject: 'Quelques conseils pour rendre votre annonce irrésistible — Guardiens',
  displayName: 'Conseils annonce personnalisés',
  previewData: {
    firstName: 'Patricia',
    sitTitle: 'Tribu de 4 chats et 2 perroquets et un chien',
    sitId: '293fab2e-b32d-45a0-9c04-36a4f43c484f',
    city: 'Schweighouse-sur-Moder',
    nbPhotos: 1,
    hasDailyRoutine: false,
    hasRegionHighlights: false,
    hasHouseGuide: false,
    petsContext: '4 chats, 2 perroquets et un chien',
    photosNote: "Les photos actuelles ne permettent pas vraiment aux gardiens de se projeter chez vous. Quelques clichés bien cadrés et lumineux changeraient tout.",
    remindCoverPhoto: true,
    articleSlug: 'rediger-bonne-annonce-house-sitting',
    articleTitle: "Rédiger une bonne annonce : ce qui attire les bons gardiens",
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const h2 = { fontSize: '17px', fontWeight: '600' as const, color: 'hsl(153, 42%, 30%)', margin: '28px 0 12px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 38%)', lineHeight: '1.65', margin: '0 0 16px' }
const listTitle = { fontSize: '14px', fontWeight: '600' as const, color: 'hsl(37, 7%, 25%)', margin: '18px 0 8px' }
const listItem = { fontSize: '14px', color: 'hsl(37, 7%, 38%)', lineHeight: '1.7', margin: '2px 0', paddingLeft: '8px' }
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
