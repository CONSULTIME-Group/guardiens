import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"
const SITE_URL = "https://guardiens.fr"

interface Props { firstName?: string }

const Email = ({ firstName }: Props) => {
  const name = firstName || ''
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Pas d'animaux, pas de maison à confier ? Vous pouvez quand même rendre service.</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>
          <Text style={text}>
            Ce n'est pas parce que vous n'avez pas d'animaux ni de maison à confier
            que vous ne pouvez pas être utile à la communauté {SITE_NAME}.
          </Text>
          <Text style={text}>
            Sur {SITE_NAME}, les petits coups de main circulent aussi entre membres du coin :
            monter un meuble, donner un coup de main pour un déménagement,
            se promener à plusieurs avec les animaux en forêt,
            ou simplement demander de l'aide pour une tâche du quotidien.
          </Text>
          <Text style={text}>
            C'est gratuit, sans engagement, et souvent l'occasion de faire une belle rencontre près de chez vous.
          </Text>
          <Section style={ctaSection}>
            <Button style={button} href={`${SITE_URL}/petites-missions`}>
              Découvrir les coups de main
            </Button>
          </Section>
          <Text style={text}>
            Vous pouvez proposer votre aide, ou publier votre propre besoin en quelques secondes.
          </Text>
          <Hr style={hr} />
          <LegalFooter purpose="l'envoi de rappels saisonniers aux gardiens inscrits" basis="6.1.f" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: "Un coup de main, ça compte aussi",
  displayName: 'Invitation entraide gardiens',
  previewData: { firstName: 'Julien' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(153, 42%, 30%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(37, 7%, 43%)', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: 'hsl(37, 22%, 89%)', margin: '20px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: 'hsl(153, 42%, 30%)', color: '#ffffff', padding: '12px 28px',
  borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const,
  textDecoration: 'none', display: 'inline-block',
}
