import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Heading, Html, Preview, Text, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { AlmaSignature } from './_alma-signature.tsx'
import { AlmaSignoff } from './_alma-signoff.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

interface MissingItem {
  label: string
  /** Le champ vit dans le profil, pas dans le formulaire d'annonce. */
  inProfile?: boolean
}

interface Props {
  title?: string
  firstName?: string
  sitId?: string
  fieldsRemaining?: number
  /** Liste nommée de ce qui manque, dans les mots exacts du formulaire. */
  missingItems?: MissingItem[]
  nearbySittersCount?: number
  /** Libellé « N gardiens à moins de 50 km de {commune} » (owner-nearby.ts). */
  nearbySittersLabel?: string | null
  daysSinceCreated?: number
  resumeUrl?: string
  profileUrl?: string
}

const SitDraftReminderEmail = ({
  firstName = '', title = '', missingItems,
  resumeUrl = 'https://guardiens.fr/dashboard',
}: Props) => {
  // Une liste absente ne prouve pas que l'annonce est complète.
  const known = Array.isArray(missingItems)
  const items = known ? missingItems! : []
  const ready = known && items.length === 0
  const listingTitle = typeof title === "string" ? title.trim() : ""
  const heading = ready ? 'Votre annonce est prête à être publiée' : 'Reprenons votre annonce'
  return (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>{ready ? 'Il reste à vérifier votre annonce et à la publier.' : 'Votre saisie est conservée. Voici ce qu’il reste à compléter.'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <AlmaSignature />
        <Heading style={h1}>{heading}</Heading>
        <Text style={text}>Bonjour{firstName ? ` ${firstName}` : ''},</Text>
        <Text style={text}>
          {listingTitle ? <>Votre annonce « {listingTitle} » est enregistrée en brouillon.</> : 'Votre annonce est enregistrée en brouillon.'}
          {' '}Publiez-la pour la rendre visible et permettre aux gardiens de vous proposer leur aide.
        </Text>
        <Text style={text}>
          {ready
            ? 'Les informations nécessaires sont renseignées. Vérifiez-les, puis cliquez sur « Publier » dans votre annonce.'
            : known
              ? 'Pour la publier, il reste à compléter :'
              : 'Reprenez votre annonce pour vérifier les informations et terminer sa publication.'}
        </Text>
        {items.length > 0 && <ul style={list}>
          {items.map(item => <li key={item.label} style={listItem}>{item.label}</li>)}
        </ul>}
        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={resumeUrl} style={btn}>{ready ? 'Vérifier et publier mon annonce' : 'Compléter mon annonce'}</Button>
        </Section>
        <Text style={textSmall}>Votre saisie est conservée. Si votre projet a changé, vous pouvez modifier vos dates ou supprimer ce brouillon depuis votre espace.</Text>
        <AlmaSignoff />
        <LegalFooter purpose="l'accompagnement de votre brouillon d'annonce" basis="6.1.f" />

      </Container>
    </Body>
  </Html>
  )
}

export const template = {
  component: SitDraftReminderEmail,
  subject: (data: Props) => Array.isArray(data.missingItems) && data.missingItems.length === 0
    ? 'Votre annonce est prête : il reste à la publier'
    : 'Votre brouillon vous attend : terminez votre annonce',
  displayName: 'Rappel brouillon annonce',
  previewData: {
    firstName: 'Camille',
    title: 'Garde de notre maison à Lyon',
    sitId: 'demo-sit-id',
    fieldsRemaining: 2,
    missingItems: [
      { label: "Pourquoi avez-vous besoin d'un gardien pour cette période ?" },
      { label: 'Une photo de votre logement ou de votre galerie' },
    ],
    nearbySittersCount: 12,
    nearbySittersLabel: '12 gardiens à moins de 50 km de Lyon',
    daysSinceCreated: 12,
    resumeUrl: 'https://guardiens.fr/sits/create?resume=demo-sit-id',
    profileUrl: 'https://guardiens.fr/owner-profile',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#44413B', lineHeight: '1.6', margin: '0 0 14px' }
const textSmall = { fontSize: '13px', color: '#756F66', lineHeight: '1.5', margin: '0 0 14px' }
const btn = {
  backgroundColor: '#2C6D50',
  color: '#ffffff',
  padding: '12px 22px',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const list = { margin: '0 0 14px', padding: '0 0 0 20px' }
const listItem = { fontSize: '14px', color: '#44413B', lineHeight: '1.6', marginBottom: '6px' }
