import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { AlmaSignature, AlmaIntro } from './_alma-signature.tsx'
import { AlmaSignoff } from './_alma-signoff.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

interface MissingItem {
  label: string
  /** Le champ vit dans le profil, pas dans le formulaire d'annonce. */
  inProfile?: boolean
}

interface Props {
  firstName?: string
  sitId?: string
  fieldsRemaining?: number
  /** Liste nommée de ce qui manque, dans les mots exacts du formulaire. */
  missingItems?: MissingItem[]
  nearbySittersCount?: number
  daysSinceCreated?: number
  resumeUrl?: string
  profileUrl?: string
}

// Amorce adaptée à l'âge réel du brouillon. Sans valeur exploitable,
// on retombe sur la formulation neutre, jamais sur "Hier".
function openingSentence(days?: number): string {
  if (typeof days !== 'number' || !Number.isFinite(days)) {
    return 'Vous avez commencé à rédiger une annonce il y a un moment'
  }
  if (days <= 1) return 'Hier, vous avez commencé à rédiger une annonce'
  if (days <= 6) return 'Il y a quelques jours, vous avez commencé à rédiger une annonce'
  if (days <= 29) return 'Il y a quelques semaines, vous avez commencé à rédiger une annonce'
  return 'Vous avez commencé à rédiger une annonce il y a un moment'
}

const SitDraftReminderEmail = ({
  firstName = '',
  fieldsRemaining = 3,
  missingItems = [],
  nearbySittersCount = 0,
  daysSinceCreated,
  resumeUrl = 'https://guardiens.fr/dashboard',
  profileUrl = 'https://guardiens.fr/owner-profile',
}: Props) => {
  const items = Array.isArray(missingItems) ? missingItems : []
  const count = items.length > 0 ? items.length : fieldsRemaining
  const formItems = items.filter((i) => !i.inProfile)
  const profileItems = items.filter((i) => i.inProfile)
  return (
  <Html lang="fr" dir="ltr">
    <BrandedHead />
    <Preview>Votre annonce vous attend en brouillon</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <AlmaSignature />
        <Heading style={h1}>Vous avez commencé une annonce chez Guardiens</Heading>
        <AlmaIntro
          firstName={firstName}
          seen="Voici où en est votre annonce en brouillon."
        />
        <Text style={text}>
          {openingSentence(daysSinceCreated)} pour faire garder vos
          animaux et votre maison. Elle vous attend en brouillon dans votre espace.
        </Text>
        <Text style={text}>
          {count === 0
            ? 'Votre annonce est complète, il ne reste plus qu\u2019à la publier.'
            : items.length > 0
              ? `Voici précisément ce qu'il reste à renseigner, ${count} point${count > 1 ? 's' : ''} :`
              : `Il vous reste environ ${count} champ${count > 1 ? 's' : ''} à remplir pour la publier.`}
        </Text>
        {formItems.length > 0 ? (
          <ul style={list}>
            {formItems.map((item) => (
              <li key={item.label} style={listItem}>{item.label}</li>
            ))}
          </ul>
        ) : null}
        {profileItems.length > 0 ? (
          <>
            <Text style={text}>
              {profileItems.length > 1
                ? 'Ces deux points ne se remplissent pas dans l\u2019annonce, ils vivent sur votre profil propriétaire :'
                : 'Ce point ne se remplit pas dans l\u2019annonce, il vit sur votre profil propriétaire :'}
            </Text>
            <ul style={list}>
              {profileItems.map((item) => (
                <li key={item.label} style={listItem}>{item.label}</li>
              ))}
            </ul>
            <Text style={textSmall}>
              Vous pouvez le compléter ici : <a href={profileUrl} style={link}>votre profil propriétaire</a>.
            </Text>
          </>
        ) : null}
        {nearbySittersCount > 0 ? (
          <Text style={text}>
            {nearbySittersCount} gardien{nearbySittersCount > 1 ? 's' : ''} vérifié{nearbySittersCount > 1 ? 's' : ''} dans un rayon de 30 km attendent une annonce comme la vôtre.
          </Text>
        ) : null}
        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={resumeUrl} style={btn}>
            {count === 0 ? 'Publier mon annonce' : 'Reprendre mon annonce'}
          </Button>
        </Section>
        <Text style={textSmall}>
          Vous pouvez aussi supprimer ce brouillon depuis votre dashboard si vous
          préférez.
        </Text>
        <AlmaSignoff />
        <LegalFooter purpose="l'accompagnement de votre brouillon d'annonce" basis="6.1.f" />

      </Container>
    </Body>
  </Html>
  )
}

export const template = {
  component: SitDraftReminderEmail,
  subject: 'Vous avez commencé une annonce chez Guardiens',
  displayName: 'Rappel brouillon annonce',
  previewData: {
    firstName: 'Camille',
    sitId: 'demo-sit-id',
    fieldsRemaining: 2,
    missingItems: [
      { label: "Pourquoi avez-vous besoin d'un gardien pour cette période ?" },
      { label: 'Au moins un animal déclaré sur votre logement', inProfile: true },
    ],
    nearbySittersCount: 12,
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
const link = { color: '#2C6D50', textDecoration: 'underline' }
