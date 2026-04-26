import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"

interface DisputeResolvedProps {
  firstName?: string
  decision?: 'accepted' | 'rejected'
  category?: string
  adminNote?: string
}

const categoryLabels: Record<string, string> = {
  faux: "Avis manifestement faux",
  diffamation: "Propos diffamatoires ou injurieux",
  inapproprie: "Contenu inapproprié",
  erreur_identite: "Erreur d'identité",
  autre: "Autre motif",
}

const DisputeResolvedEmail = ({ firstName, decision, category, adminNote }: DisputeResolvedProps) => {
  const accepted = decision === 'accepted'
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>
        {accepted
          ? `Votre contestation a été acceptée — ${SITE_NAME}`
          : `Votre contestation a été examinée — ${SITE_NAME}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {accepted ? 'Votre contestation a été acceptée' : 'Votre contestation a été examinée'}
          </Heading>
          <Text style={text}>
            {firstName ? `Bonjour ${firstName},` : 'Bonjour,'}
          </Text>
          <Text style={text}>
            Notre équipe a examiné la contestation que vous aviez soumise
            {category ? ` au motif « ${categoryLabels[category] || category} »` : ''}.
          </Text>

          {accepted ? (
            <Text style={text}>
              <strong>Décision : acceptée.</strong> L'avis concerné a été retiré et ne s'affiche
              plus sur votre profil public.
            </Text>
          ) : (
            <Text style={text}>
              <strong>Décision : refusée.</strong> Après examen, l'avis ne contrevient pas à nos
              règles et reste publié. Vous gardez la possibilité d'y répondre publiquement depuis
              la page « Mes avis ».
            </Text>
          )}

          {adminNote ? (
            <>
              <Hr style={hr} />
              <Text style={noteLabel}>Note de l'équipe :</Text>
              <Text style={noteText}>{adminNote}</Text>
            </>
          ) : null}

          <Hr style={hr} />
          <Text style={text}>
            Merci de contribuer à la qualité et à la fiabilité des avis sur {SITE_NAME}.
          </Text>
          <Text style={legal}>
            Cet e-mail vous est envoyé par {SITE_NAME} (Jérémie Martinot, SIRET 894 864 040 00015)
            dans le cadre de l'intérêt légitime lié à la modération de la communauté (art. 6.1.f RGPD).
            Pour exercer vos droits : contact@guardiens.fr.
          </Text>
          <Text style={footer}>L'équipe {SITE_NAME} 🐾</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: DisputeResolvedEmail,
  subject: (data: Record<string, any>) =>
    data?.decision === 'accepted'
      ? 'Votre contestation a été acceptée'
      : 'Votre contestation a été examinée',
  displayName: "Contestation d'avis résolue",
  previewData: { firstName: 'Camille', decision: 'accepted', category: 'diffamation', adminNote: "Propos jugés excessifs au regard du contexte." },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const noteLabel = { fontSize: '13px', fontWeight: 'bold' as const, color: 'hsl(40, 12%, 10%)', margin: '0 0 6px' }
const noteText = { fontSize: '14px', color: 'hsl(40, 12%, 10%)', lineHeight: '1.5', margin: '0 0 16px', padding: '12px 16px', backgroundColor: 'hsl(37, 22%, 93%)', borderRadius: '8px' }
const legal = { fontSize: '10px', color: 'hsl(37, 7%, 60%)', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: 'hsl(37, 7%, 60%)', margin: '10px 0 0' }
