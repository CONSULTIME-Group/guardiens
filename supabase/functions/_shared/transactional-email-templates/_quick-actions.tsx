import * as React from 'npm:react@18.3.1'
import { Button, Section, Text } from 'npm:@react-email/components@0.0.22'

/**
 * Trois actions de reponse a une candidature, reutilisees par les emails
 * envoyes au proprietaire. Les deux premieres ouvrent une page de
 * confirmation, aucune action n'est executee au simple clic.
 */
export interface QuickActionProps {
  primaryHref: string
  declineUrl?: string
  thinkingUrl?: string
}

export const QuickActions = ({ primaryHref, declineUrl, thinkingUrl }: QuickActionProps) => (
  <Section style={wrap}>
    <Section style={{ textAlign: 'center' as const, margin: '0 0 12px' }}>
      <Button style={primaryBtn} href={primaryHref}>
        Voir la candidature
      </Button>
    </Section>
    {(declineUrl || thinkingUrl) ? (
      <>
        <Text style={hint}>
          Vous pouvez aussi répondre en un clic, sans vous connecter :
        </Text>
        <Section style={{ textAlign: 'center' as const }}>
          {thinkingUrl ? (
            <Button style={secondaryBtn} href={thinkingUrl}>
              Pas encore décidé
            </Button>
          ) : null}
          {declineUrl ? (
            <Button style={secondaryBtn} href={declineUrl}>
              Décliner poliment
            </Button>
          ) : null}
        </Section>
        <Text style={note}>
          Ces deux liens ouvrent une page de confirmation avant toute action.
        </Text>
      </>
    ) : null}
  </Section>
)

const wrap = { margin: '24px 0 8px' }
const primaryBtn = {
  backgroundColor: 'hsl(153, 42%, 30%)',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const secondaryBtn = {
  backgroundColor: '#ffffff',
  color: 'hsl(153, 42%, 30%)',
  border: '1px solid hsl(153, 42%, 60%)',
  padding: '10px 18px',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
  margin: '0 6px 8px',
}
const hint = { fontSize: '13px', color: 'hsl(37, 7%, 43%)', textAlign: 'center' as const, margin: '10px 0 8px' }
const note = { fontSize: '11px', color: 'hsl(37, 7%, 55%)', textAlign: 'center' as const, margin: '4px 0 0' }
