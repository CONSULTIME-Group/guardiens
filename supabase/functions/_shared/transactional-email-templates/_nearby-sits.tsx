import * as React from 'npm:react@18.3.1'
import { Section, Text } from 'npm:@react-email/components@0.0.22'

// Bloc partagé « annonces ouvertes à portée ».
//
// Les relances gardien ne partent plus sans annonce réelle : ce bloc affiche
// les 1 à 3 annonces les plus proches transmises par la fonction appelante.
// Aucune valeur n'est inventée ici, une donnée absente n'est pas affichée.

export interface NearbySitView {
  id: string
  title: string
  city?: string | null
  startDate?: string | null
  endDate?: string | null
  distanceKm?: number | null
  url: string
}

export const NearbySitsBlock = ({ sits }: { sits?: NearbySitView[] }) => {
  if (!Array.isArray(sits) || sits.length === 0) return null
  return (
    <Section style={wrap}>
      {sits.map((sit) => (
        <Section key={sit.id} style={card}>
          <Text style={cardTitle}>
            <a href={sit.url} style={link}>{sit.title}</a>
          </Text>
          {sit.city ? (
            <Text style={cardLine}>
              À {sit.city}
              {typeof sit.distanceKm === 'number' ? `, à ${sit.distanceKm} km de chez vous` : ''}
            </Text>
          ) : null}
          {sit.startDate && sit.endDate ? (
            <Text style={cardLine}>Du {sit.startDate} au {sit.endDate}</Text>
          ) : null}
        </Section>
      ))}
    </Section>
  )
}

const wrap = { margin: '8px 0 4px' }
const card = {
  backgroundColor: '#F8F6F1',
  padding: '14px 16px',
  borderRadius: '10px',
  margin: '0 0 10px',
}
const cardTitle = { color: '#2C6D50', fontSize: '15px', fontWeight: 600, margin: '0 0 4px' }
const cardLine = { color: '#524E47', fontSize: '14px', lineHeight: '21px', margin: '0 0 2px' }
const link = { color: '#2C6D50', textDecoration: 'none' }
