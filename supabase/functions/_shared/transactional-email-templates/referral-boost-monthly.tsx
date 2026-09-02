import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import { BrandedHead } from './_branded-head.tsx'
import { BrandHeader } from './_brand-header.tsx'
import { AlmaSignature, AlmaIntro } from './_alma-signature.tsx'
import { LegalFooter } from './_legal-footer.tsx'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Guardiens"

interface Props { firstName?: string }

const Email = ({ firstName }: Props) => {
  return (
    <Html lang="fr" dir="ltr">
      <BrandedHead />
      <Preview>Des nouvelles de Guardiens, et un service à vous demander.</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <AlmaSignature />
          <AlmaIntro firstName={firstName} seen="Des nouvelles de Guardiens, et un petit service à vous demander." />
          <Text style={text}>
            Depuis le lancement en mai, plus de trente annonces ont été publiées sur Guardiens. En Bretagne, à Marseille, en Alsace, au Pays basque, dans le Quercy. Et aussi à Marrakech, à La Réunion, et une maison à Tahiti pour tout le mois de décembre. On ne s'y attendait pas, et ça fait vraiment plaisir.
          </Text>
          <Text style={text}>
            Il y a une chose qu'on aimerait voir grandir encore plus : l'entraide entre voisins. Arroser des plantes le temps d'un week-end, sortir un chien, donner un coup de main. C'est gratuit, ça ne passe jamais par de l'argent, et ça ne marche que sur quelques kilomètres. Il ne faut pas du monde partout, il faut du monde tout près.
          </Text>
          <Text style={text}>
            C'est pour ça qu'on vous écrit. Si Guardiens vous plaît, parlez-en autour de vous. Un partage, un message à quelqu'un du quartier. Ça ne coûte rien, et c'est ce qui nous aide le plus.
          </Text>
          <Section style={ctaSection}>
            <Button style={button} href="https://guardiens.fr/?utm_source=email&utm_campaign=partage_communaute&utm_medium=nurturing">
              Partager Guardiens
            </Button>
          </Section>
          <Text style={smallCentered}>
            Le lien à partager : guardiens.fr
          </Text>
          <Text style={text}>
            En échange, on n'a qu'un merci à offrir. Mais il est sincère.
          </Text>
          <Hr style={hr} />
          <LegalFooter purpose="la fidélisation de nos membres actifs" basis="6.1.f" />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'De la Bretagne à Tahiti',
  displayName: 'Appel au partage',
  previewData: { firstName: 'Marie' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Outfit', Arial, sans-serif" }
const container = { padding: '24px 28px', maxWidth: '560px', margin: '0 auto' }
const text = { fontSize: '14px', color: '#756F66', lineHeight: '1.6', margin: '0 0 16px' }
const hr = { borderColor: '#E9E4DD', margin: '20px 0' }
const ctaSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: '#2C6D50', color: '#ffffff', padding: '12px 28px',
  borderRadius: '8px', fontSize: '15px', fontWeight: '600' as const,
  textDecoration: 'none', display: 'inline-block',
}
const smallCentered = {
  fontSize: '12px',
  color: '#999999',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
