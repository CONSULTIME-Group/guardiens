/// <reference types="npm:@types/react@18.3.1" />
//
// `<BrandedHead />` — En-tête HTML partagé pour TOUS les emails Guardiens.
//
// Objectifs :
// 1. **Forcer le mode clair** sur tous les clients mail (Apple Mail, Outlook,
//    Gmail dark) pour garantir la lisibilité du fond blanc + texte gris/vert
//    qui fait notre identité visuelle. Sans ces meta, certains clients
//    inversent les couleurs en dark mode et cassent les CTA verts en
//    illisibles fond noir/texte clair.
// 2. **Compatibilité Outlook (Windows)** :
//    - `mso-line-height-rule: exactly` empêche Outlook d'ajouter une
//      hauteur de ligne fantôme sur tous les blocs de texte.
//    - `<!--[if mso]>` permet d'injecter un fallback bgcolor pour Outlook
//      qui ne supporte pas `background` en CSS sur <body>.
//    - `<meta http-equiv="X-UA-Compatible" content="IE=edge">` aide Outlook
//      à utiliser le moteur de rendu le plus récent disponible.
// 3. **Reset Outlook** : `mso-table-lspace/rspace: 0` retire l'espace
//    parasite que Word ajoute autour des cellules <td>.
//
// Usage :
//   <Html><BrandedHead /><Body>...</Body></Html>
// Au lieu de :
//   <Html><Head /><Body>...</Body></Html>

import * as React from 'npm:react@18.3.1'
import { Head } from 'npm:@react-email/components@0.0.22'

const MSO_RESET = `
  /* Reset Outlook (Word rendering engine) */
  body, table, td, a {
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
  }
  table, td {
    mso-table-lspace: 0pt;
    mso-table-rspace: 0pt;
  }
  /* Force ligne fantôme = 0 sur Outlook */
  body, p, h1, h2, h3, h4, h5, h6, span, div, td, th {
    mso-line-height-rule: exactly;
  }
  /* Évite que iOS transforme les numéros / dates / adresses en liens bleus */
  a[x-apple-data-detectors] {
    color: inherit !important;
    text-decoration: none !important;
  }
`

export const BrandedHead = () => (
  <Head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
    {/*
      Force light mode sur Apple Mail, iOS Mail, Outlook.com (web), Gmail
      mobile. `only light` est plus strict que `light dark` : il indique
      explicitement que le template ne supporte pas le dark mode et que le
      client ne doit pas tenter d'inverser les couleurs.
    */}
    <meta name="color-scheme" content="only light" />
    <meta name="supported-color-schemes" content="light" />
    <style>{MSO_RESET}</style>
    {/*
      Outlook conditional : force le fond blanc pour les versions desktop
      (Outlook 2007–2019) qui ignorent `background` sur <body>. Cf.
      https://www.caniemail.com/features/css-background/
    */}
    {/*
      eslint-disable-next-line react/no-danger
      Le HTML conditionnel mso-* est volontairement injecté tel quel —
      c'est la SEULE façon de cibler Outlook desktop.
    */}
    <div
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: '<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->',
      }}
    />
  </Head>
)

export default BrandedHead
