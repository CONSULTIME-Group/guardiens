import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://guardiens.fr'

interface Props {
  missionTitle?: string
  /**
   * Lot E17 : true quand une autre personne a été choisie (« Merci, c'est
   * pourvu »), false quand la personne qui a publié s'organise autrement.
   * Calculé par notify-mission-event ; absent, « c'est pourvu ».
   */
  filled?: boolean
}

/** Lot E17 : « Merci, c'est pourvu », texte affirmatif et chaleureux. */
const Email = ({ missionTitle, filled }: Props) => {
  const isFilled = filled !== false
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{isFilled ? 'Merci, c’est pourvu' : 'Merci pour votre proposition'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{isFilled ? 'Merci, c’est pourvu' : 'Merci pour votre proposition'}</Heading>
          <Text style={text}>
            {isFilled
              ? <>{missionTitle ? `« ${missionTitle} » a trouvé son coup de main.` : 'Ce besoin a trouvé son coup de main.'} Merci pour votre Je peux : votre élan compte, et il fait vivre l'entraide près de chez vous.</>
              : <>{missionTitle ? `Pour « ${missionTitle} », la personne qui l'a publié s'organise autrement.` : 'La personne qui a publié ce besoin s’organise autrement.'} Merci pour votre élan : il fait vivre l'entraide près de chez vous.</>}
          </Text>
          <Text style={text}>
            D'autres besoins près de chez vous attendent un coup de main.
          </Text>
          <Button style={button} href={`${SITE_URL}/petites-missions`}>
            Voir les besoins près de chez moi
          </Button>
          <LegalFooter purpose="la bonne marche du service d'entraide" basis="6.1.f" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    d.filled === false
      ? `Merci pour votre proposition${d.missionTitle ? ` : « ${d.missionTitle} »` : ''}`
      : `Merci, c’est pourvu${d.missionTitle ? ` : « ${d.missionTitle} »` : ''}`,
  displayName: 'Entraide, merci c’est pourvu (autres répondants)',
  previewData: { missionTitle: 'Promenade chien dimanche', filled: true },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#524E47', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: '#2C6D50', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
