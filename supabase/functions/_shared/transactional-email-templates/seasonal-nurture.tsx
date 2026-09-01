/// <reference types="npm:@types/react@18.3.1" />
//
// Nurturing saisonnier : rappel avant chaque periode de vacances scolaires.
// Le mail parle du depart, pas de la plateforme.
import * as React from 'npm:react@18.3.1'
import { Body, Container, Heading, Html, Preview, Text, Button, Section, Hr } from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { AlmaSignature, AlmaIntro } from './_alma-signature.tsx'
import { AlmaSignoff } from './_alma-signoff.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  firstName?: string
  city?: string | null
  periodLabel?: string
  periodKey?: string
  periodStart?: string | null
  suggestedStart?: string | null
  suggestedEnd?: string | null
  dateCertaine?: boolean
  alreadyPublished?: boolean
}

const formatFr = (iso?: string | null) => {
  if (!iso) return null
  const d = new Date(iso + 'T12:00:00Z')
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(d)
}

const Email = ({
  firstName,
  periodLabel = 'prochaines vacances',
  periodKey,
  periodStart,
  suggestedStart,
  suggestedEnd,
  dateCertaine,
  alreadyPublished,
}: Props) => {
  const startFr = formatFr(periodStart)
  const certain = !!dateCertaine && !!startFr
  const previewText = certain
    ? `Elles commencent le ${startFr}.`
    : 'Il reste trois a quatre semaines pour trouver quelqu\'un.'
  const title = certain
    ? `Les ${periodLabel} commencent le ${startFr}`
    : `Les ${periodLabel} approchent`
  let ctaUrl = `https://guardiens.fr/sits/create?utm_source=email&utm_campaign=seasonal_nurture&utm_medium=${periodKey ?? 'seasonal'}`
  if (suggestedStart) {
    ctaUrl += `&debut=${encodeURIComponent(suggestedStart)}`
  }
  if (suggestedEnd) {
    ctaUrl += `&fin=${encodeURIComponent(suggestedEnd)}`
  }

  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <AlmaSignature />
          <AlmaIntro firstName={firstName} />
          <Heading style={h1}>{title}</Heading>

          <Text style={p}>
            Si vous partez, votre maison, elle, reste. Une maison habitée pendant votre absence, c'est le courrier relevé, les plantes arrosées, et vos animaux chez eux plutôt qu'en pension.
          </Text>

          <Text style={p}>
            {certain
              ? `Les propriétaires qui trouvent quelqu'un publient leur annonce trois à quatre semaines avant le départ. C'est le temps qu'il faut pour recevoir des candidatures, échanger, et choisir sans se presser. Pour un départ le ${startFr}, c'est maintenant.`
              : "Les propriétaires qui trouvent quelqu'un publient leur annonce trois à quatre semaines avant le départ. C'est le temps qu'il faut pour recevoir des candidatures, échanger, et choisir sans se presser."}
          </Text>

          <Text style={p}>
            {alreadyPublished
              ? 'Vous avez déjà publié une annonce, vous connaissez le principe. Celle-ci se prépare de la même façon.'
              : 'Publier prend une dizaine de minutes, et vous pourrez compléter les détails plus tard.'}
          </Text>

          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={ctaUrl} style={btnPrimary}>{`Publier mon annonce pour ${periodLabel}`}</Button>
          </Section>

          <Text style={pCenter}>
            Vous ne partez pas cette fois ? Ne faites rien, on se retrouve avant les prochaines vacances.
          </Text>

          <Hr style={hr} />
          <AlmaSignoff />
          <LegalFooter />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Vous partez pour ${data?.periodLabel ?? 'les prochaines vacances'} ?`,
  displayName: 'Nurturing saisonnier',
  previewData: {
    firstName: 'Marie',
    city: 'Lyon',
    periodLabel: 'vacances de la Toussaint',
    periodKey: 'toussaint-2026',
    periodStart: '2026-10-17',
    dateCertaine: true,
    alreadyPublished: false,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = { color: '#1a1a1a', fontSize: '22px', fontWeight: 700, margin: '20px 0 8px 0' }
const p = { color: '#333', fontSize: '15px', lineHeight: '24px', margin: '0 0 14px 0' }
const pCenter = { textAlign: 'center' as const, color: '#666', fontSize: '13px', margin: '6px 0 0 0' }
const btnPrimary = { backgroundColor: '#1a1a1a', color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }
const hr = { borderColor: '#eee', margin: '20px 0' }
