/**
 * Formulations du refus en un clic.
 *
 * Quatre motifs, trois formulations par motif et par langue. La variante est
 * choisie en base (consume_application_action_token) de sorte que deux
 * candidats a la meme annonce ne recoivent jamais le meme texte, et qu'un
 * proprietaire n'envoie pas deux fois de suite la meme formulation.
 */
export type DeclineReason =
  | 'other_chosen'
  | 'dates_changed'
  | 'not_right_time'
  | 'different_profile'

export const DECLINE_REASONS: DeclineReason[] = [
  'other_chosen',
  'dates_changed',
  'not_right_time',
  'different_profile',
]

type Locale = 'fr' | 'en' | 'es' | 'de' | 'it'

const COPY: Record<Locale, Record<DeclineReason, string[]>> = {
  fr: {
    other_chosen: [
      "Le propriétaire a retenu une autre candidature pour cette garde. Votre candidature est libérée, vous restez disponible pour d'autres annonces.",
      "La place est prise, quelqu'un d'autre assurera cette garde. Rien ne vous retient plus, vous pouvez postuler ailleurs.",
      "Cette garde a trouvé son gardien. Votre candidature se termine ici, et d'autres annonces vous attendent.",
    ],
    dates_changed: [
      "Les dates de cette garde ont changé, l'annonce ne correspond plus à ce qui était prévu. Votre candidature est libérée.",
      "Le calendrier du propriétaire a bougé depuis la publication. La garde ne se fera pas dans ces conditions, vous êtes de nouveau disponible.",
      "Changement de dates côté propriétaire, cette garde ne tient plus telle qu'annoncée. Votre candidature prend fin ici.",
    ],
    not_right_time: [
      "Ce n'est finalement pas le bon moment pour le propriétaire, qui préfère reporter. Votre candidature est libérée.",
      "Le propriétaire met cette garde en pause, le moment ne s'y prête pas. Vous restez libre pour d'autres annonces.",
      "La garde n'aura pas lieu cette fois, le contexte du propriétaire a changé. Votre candidature se termine ici.",
    ],
    different_profile: [
      "Le propriétaire cherche un profil au fonctionnement différent pour cette garde précise. Cela tient à ses besoins du moment, pas à votre parcours.",
      "Pour cette garde, le propriétaire s'oriente vers un autre type de profil. C'est une question de correspondance avec son animal et son quotidien.",
      "Les attentes de cette annonce visent un profil différent du vôtre. Une autre annonce collera mieux à ce que vous proposez.",
    ],
  },
  en: {
    other_chosen: [
      'The owner has chosen another application for this stay. Your application is released, you remain available for other listings.',
      'The spot is taken, someone else will look after the animals. Nothing holds you back, you can apply elsewhere.',
      'This stay has found its sitter. Your application ends here, and other listings are waiting for you.',
    ],
    dates_changed: [
      'The dates of this stay have changed, the listing no longer matches what was planned. Your application is released.',
      "The owner's calendar has moved since publication. The stay will not happen under these conditions, you are available again.",
      'Dates changed on the owner side, this stay no longer stands as announced. Your application ends here.',
    ],
    not_right_time: [
      'It is not the right moment for the owner after all, who prefers to postpone. Your application is released.',
      'The owner is pausing this stay, the timing does not work. You stay free for other listings.',
      "The stay will not take place this time, the owner's situation has changed. Your application ends here.",
    ],
    different_profile: [
      'The owner is looking for a profile that works differently for this specific stay. It comes from current needs, not from your track record.',
      'For this stay, the owner is going towards another type of profile. It is a question of fit with the animal and daily routine.',
      'The expectations of this listing point to a different profile from yours. Another listing will match what you offer better.',
    ],
  },
  es: {
    other_chosen: [
      'El propietario ha elegido otra candidatura para esta estancia. Su candidatura queda liberada y sigue disponible para otros anuncios.',
      'La plaza está ocupada, otra persona se encargará de esta estancia. Ya nada le retiene, puede presentarse a otros anuncios.',
      'Esta estancia ya tiene su cuidador. Su candidatura termina aquí, y otros anuncios le esperan.',
    ],
    dates_changed: [
      'Las fechas de esta estancia han cambiado y el anuncio ya no corresponde a lo previsto. Su candidatura queda liberada.',
      'El calendario del propietario se ha movido desde la publicación. La estancia no se hará en estas condiciones, vuelve a estar disponible.',
      'Cambio de fechas por parte del propietario, esta estancia ya no se mantiene tal como se anunció. Su candidatura termina aquí.',
    ],
    not_right_time: [
      'Finalmente no es el buen momento para el propietario, que prefiere aplazar. Su candidatura queda liberada.',
      'El propietario pone esta estancia en pausa, el momento no es adecuado. Sigue libre para otros anuncios.',
      'La estancia no se realizará esta vez, la situación del propietario ha cambiado. Su candidatura termina aquí.',
    ],
    different_profile: [
      'El propietario busca un perfil con otro funcionamiento para esta estancia concreta. Responde a sus necesidades del momento, no a su trayectoria.',
      'Para esta estancia, el propietario se orienta hacia otro tipo de perfil. Es una cuestión de encaje con su animal y su día a día.',
      'Las expectativas de este anuncio apuntan a un perfil distinto del suyo. Otro anuncio se ajustará mejor a lo que propone.',
    ],
  },
  de: {
    other_chosen: [
      'Die Eigentümerin oder der Eigentümer hat sich für eine andere Bewerbung entschieden. Ihre Bewerbung ist frei, Sie bleiben für andere Anzeigen verfügbar.',
      'Der Platz ist vergeben, jemand anderes übernimmt diese Betreuung. Nichts hält Sie zurück, Sie können sich anderswo bewerben.',
      'Diese Betreuung hat ihre Person gefunden. Ihre Bewerbung endet hier, weitere Anzeigen warten auf Sie.',
    ],
    dates_changed: [
      'Die Daten dieser Betreuung haben sich geändert, die Anzeige entspricht nicht mehr dem Geplanten. Ihre Bewerbung ist frei.',
      'Der Kalender der Eigentümerseite hat sich seit der Veröffentlichung verschoben. Die Betreuung findet so nicht statt, Sie sind wieder verfügbar.',
      'Terminänderung auf Eigentümerseite, diese Betreuung gilt nicht mehr wie angekündigt. Ihre Bewerbung endet hier.',
    ],
    not_right_time: [
      'Es ist letztlich nicht der richtige Moment auf Eigentümerseite, die Betreuung wird verschoben. Ihre Bewerbung ist frei.',
      'Die Betreuung wird pausiert, der Zeitpunkt passt nicht. Sie bleiben frei für andere Anzeigen.',
      'Die Betreuung findet diesmal nicht statt, die Situation hat sich geändert. Ihre Bewerbung endet hier.',
    ],
    different_profile: [
      'Für diese Betreuung wird ein anders arbeitendes Profil gesucht. Das liegt an den aktuellen Bedürfnissen, nicht an Ihrem Werdegang.',
      'Für diese Betreuung geht die Wahl in Richtung eines anderen Profiltyps. Es geht um die Passung mit Tier und Alltag.',
      'Die Erwartungen dieser Anzeige zielen auf ein anderes Profil als Ihres. Eine andere Anzeige passt besser zu dem, was Sie anbieten.',
    ],
  },
  it: {
    other_chosen: [
      "Il proprietario ha scelto un'altra candidatura per questa custodia. La sua candidatura è liberata, resta disponibile per altri annunci.",
      "Il posto è preso, se ne occuperà un'altra persona. Nulla la trattiene, può candidarsi altrove.",
      'Questa custodia ha trovato la sua persona. La sua candidatura si conclude qui, e altri annunci la aspettano.',
    ],
    dates_changed: [
      "Le date di questa custodia sono cambiate, l'annuncio non corrisponde più a quanto previsto. La sua candidatura è liberata.",
      'Il calendario del proprietario si è spostato dopo la pubblicazione. La custodia non avverrà in queste condizioni, è di nuovo disponibile.',
      'Cambio di date da parte del proprietario, questa custodia non regge più come annunciata. La sua candidatura termina qui.',
    ],
    not_right_time: [
      'Non è il momento giusto per il proprietario, che preferisce rinviare. La sua candidatura è liberata.',
      'Il proprietario mette in pausa questa custodia, il momento non è adatto. Resta libera per altri annunci.',
      'La custodia non avrà luogo questa volta, la situazione del proprietario è cambiata. La sua candidatura termina qui.',
    ],
    different_profile: [
      'Il proprietario cerca un profilo con un funzionamento diverso per questa custodia. Dipende dalle sue esigenze del momento, non dal suo percorso.',
      "Per questa custodia il proprietario si orienta verso un altro tipo di profilo. È una questione di corrispondenza con l'animale e la routine.",
      'Le attese di questo annuncio puntano a un profilo diverso dal suo. Un altro annuncio corrisponderà meglio a ciò che propone.',
    ],
  },
}

/** Objets d'email et titres H1, un par motif, solidaires des formulations. */
const SUBJECTS: Record<Locale, Record<DeclineReason, string>> = {
  fr: {
    other_chosen: 'Le propriétaire a fait un autre choix',
    dates_changed: 'Les dates de cette garde ont changé',
    not_right_time: 'Cette garde est reportée par le propriétaire',
    different_profile: 'Cette garde ne se fera pas avec vous',
  },
  en: {
    other_chosen: 'The owner has made another choice',
    dates_changed: 'The dates of this stay have changed',
    not_right_time: 'This stay is postponed by the owner',
    different_profile: 'This stay will not happen with you',
  },
  es: {
    other_chosen: 'El propietario ha elegido otra candidatura',
    dates_changed: 'Las fechas de esta estancia han cambiado',
    not_right_time: 'El propietario aplaza esta estancia',
    different_profile: 'Esta estancia no se hará con usted',
  },
  de: {
    other_chosen: 'Es wurde eine andere Bewerbung gewählt',
    dates_changed: 'Die Daten dieser Betreuung haben sich geändert',
    not_right_time: 'Diese Betreuung wird verschoben',
    different_profile: 'Diese Betreuung findet nicht mit Ihnen statt',
  },
  it: {
    other_chosen: 'Il proprietario ha scelto un altra candidatura',
    dates_changed: 'Le date di questa custodia sono cambiate',
    not_right_time: 'Questa custodia è rinviata dal proprietario',
    different_profile: 'Questa custodia non si farà con lei',
  },
}

/** Réassurance, affichée uniquement quand le motif porte sur le profil. */
const REASSURANCE: Record<Locale, string> = {
  fr: "Cela ne dit rien de votre profil : chaque garde a ses contraintes de dates, de lieu et d'animaux.",
  en: 'This says nothing about your profile: every stay has its own constraints of dates, place and animals.',
  es: 'Esto no dice nada de su perfil: cada estancia tiene sus limitaciones de fechas, lugar y animales.',
  de: 'Das sagt nichts über Ihr Profil aus: Jede Betreuung hat eigene Vorgaben zu Daten, Ort und Tieren.',
  it: 'Questo non dice nulla del suo profilo: ogni custodia ha i suoi vincoli di date, luogo e animali.',
}

const resolve = (reason?: string | null, locale: string = 'fr') => {
  const loc = (['fr', 'en', 'es', 'de', 'it'].includes(locale) ? locale : 'fr') as Locale
  const key = (DECLINE_REASONS as string[]).includes(reason ?? '')
    ? (reason as DeclineReason)
    : ('other_chosen' as DeclineReason)
  return { loc, key }
}

export const declineSubject = (reason?: string | null, locale: string = 'fr'): string => {
  const { loc, key } = resolve(reason, locale)
  return SUBJECTS[loc][key]
}

/** Le titre H1 reprend l'objet, pour que l'email tienne un seul discours. */
export const declineTitle = declineSubject

export const declineReassurance = (reason?: string | null, locale: string = 'fr'): string | null => {
  const { loc, key } = resolve(reason, locale)
  return key === 'different_profile' ? REASSURANCE[loc] : null
}

export const declineBody = (
  reason?: string | null,
  variant?: number | null,
  locale: string = 'fr',
): string | null => {
  const loc = (['fr', 'en', 'es', 'de', 'it'].includes(locale) ? locale : 'fr') as Locale
  const key = (DECLINE_REASONS as string[]).includes(reason ?? '')
    ? (reason as DeclineReason)
    : null
  if (!key) return null
  const list = COPY[loc][key]
  const idx = typeof variant === 'number' && variant >= 0 ? variant % list.length : 0
  return list[idx]
}
