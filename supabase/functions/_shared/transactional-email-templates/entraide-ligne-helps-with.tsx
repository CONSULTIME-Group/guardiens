import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

// L'ancre ouvre directement le bloc « Ce que je propose » du tableau de bord.
const CTA_URL =
  'https://guardiens.fr/dashboard?utm_source=email&utm_medium=email&utm_campaign=entraide_ligne#ce-que-je-propose'

interface Props { firstName?: string }

const Email = ({ firstName }: Props) => {
  const name = (firstName || '').trim()
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>
        Une ligne sur ce que vous aimez faire, et quelqu'un du coin peut vous trouver.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>
          <Text style={text}>
            Une journée devant un ordinateur, une pause sur le téléphone, une soirée sur
            les réseaux. Nous avons mille façons de communiquer, et si peu d'occasions de
            nous rencontrer vraiment.
          </Text>
          <Text style={text}>
            Alors nous nous sommes posé une question : et si la technologie servait
            justement à l'inverse ? À découvrir qu'à quelques kilomètres de chez soi,
            quelqu'un a besoin d'un petit coup de main.
          </Text>
          <Text style={text}>
            Vous avez coché « je veux bien donner un coup de main » sur Guardiens. Il reste
            une ligne à écrire : ce que vous aimez faire pour les gens du coin.
          </Text>
          <Text style={text}>
            Cueillir les pommes d'une dame pour qui l'échelle est devenue compliquée. Aider
            quelqu'un de votre rue à remplir un dossier en ligne. Changer une ampoule au
            plafond. Ramasser des noix avant la pluie. Pour l'un, c'est un vrai besoin. Pour
            l'autre, c'est une heure, et souvent un bon moment.
          </Text>
          <Text style={text}>
            Votre ligne apparaît avec votre prénom et votre ville sur la page Entraide.
            Quand quelqu'un près de chez vous cherche de l'aide, il vous voit et peut vous
            écrire.
          </Text>
          <Section style={ctaSection}>
            <Button style={button} href={CTA_URL}>J'écris ma ligne</Button>
          </Section>
          <Text style={text}>
            Se sentir utile, échanger quelques mots, rencontrer quelqu'un : c'est aussi une
            façon de se faire du bien.
          </Text>
          <Text style={text}>À très vite,</Text>
          <Text style={text}>Elisa et Jérémie</Text>
          <Hr style={hr} />
          <LegalFooter
            purpose="l'animation de l'entraide entre membres inscrits"
            basis="6.1.f"
          />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Et si la technologie servait à se rencontrer ?',
  displayName: 'Entraide, écrire sa ligne',
  previewData: { firstName: 'Jérémie' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2C6D50', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: '#2C6D50', color: '#ffffff', padding: '12px 28px',
  borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const,
  textDecoration: 'none', display: 'inline-block',
}
