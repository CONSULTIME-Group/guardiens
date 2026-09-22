import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const CTA_URL =
  'https://guardiens.fr/petites-missions/creer?utm_source=email&utm_medium=email&utm_campaign=entraide_demander'

interface Props { firstName?: string }

const Email = ({ firstName }: Props) => {
  const name = (firstName || '').trim()
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>
        Des choses qui, pour l'un, sont un vrai besoin, et pour l'autre, un bon moment.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{name ? `Bonjour ${name},` : 'Bonjour,'}</Heading>
          <Text style={text}>
            Près de chez vous, il se passe des choses toutes simples.
          </Text>
          <Text style={text}>
            <strong>Un pommier qui déborde.</strong> Chaque automne, les branches ploient
            sous les fruits. Monter à l'échelle devient compliqué à 80 ans. Une heure à
            deux, un panier chacun, et souvent une tarte au bout.
          </Text>
          <Text style={text}>
            <strong>Un potager à préparer.</strong> Des années à bêcher son jardin, et un
            dos qui demande un peu d'aide ce printemps. Une matinée ensemble, et tous ses
            conseils sur les tomates en prime.
          </Text>
          <Text style={text}>
            <strong>Un dossier en ligne.</strong> Un formulaire pour la retraite, une
            démarche sur internet. Pour l'un, une montagne. Pour l'autre, vingt minutes
            autour d'un café.
          </Text>
          <Text style={text}>
            <strong>Une ampoule au plafond.</strong> Quelqu'un qui préfère garder les pieds
            au sol, et quelqu'un qui a un escabeau.
          </Text>
          <Text style={text}>
            <strong>Un colis lourd au troisième étage</strong>, un chat à nourrir un soir de
            retard, des noix à ramasser avant la pluie.
          </Text>
          <Text style={text}>
            Des choses qui, pour l'un, sont un vrai besoin, et qui, pour l'autre, coûtent
            très peu. Et qui, souvent, finissent par une vraie rencontre.
          </Text>
          <Text style={text}>
            Vous avez un besoin de ce genre ? Décrivez-le en une phrase, avec une date. Les
            dix personnes disponibles les plus proches le reçoivent. Chaque « Je peux »
            arrive sur votre tableau de bord : vous choisissez, et la conversation s'ouvre.
          </Text>
          <Section style={ctaSection}>
            <Button style={button} href={CTA_URL}>Demander un coup de main</Button>
          </Section>
          <Text style={text}>
            Et si quelqu'un autour de vous en a besoin, un parent, une personne âgée de
            votre rue, vous pouvez publier pour elle, à son adresse, et faire le lien.
          </Text>
          <Text style={text}>
            En retour : un merci, un café, ou un coup de main quand ce sera votre tour.
          </Text>
          <Text style={text}>
            La technologie, pour une fois, au service de la rencontre.
          </Text>
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
  subject: 'Les pommes du jardin d’à côté, et d’autres petits coups de main',
  displayName: 'Entraide, demander un coup de main',
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
