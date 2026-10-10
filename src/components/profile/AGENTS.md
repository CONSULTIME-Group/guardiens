# Décisions techniques, profil

- Hero de profil public (lot L5) : un seul composant ProfileHero pour les facettes gardien, propriétaire et entraide, identité vérifiée par IdentityVerifiedMark, gardes accueillies d'un propriétaire = ownerHostedSitsCount (avis publics), jamais le nombre d'annonces ; pourquoi : deux en-têtes divergeaient et une annonce future laissait croire qu'une garde avait eu lieu.
- Public profile hero uses a full-surface image with asset anchors and a local text wash in global CSS, never a separate image column; why: identity and personal artwork must share one continuous composition at every width.
- The sitter contact card stays in document flow; why: a scrolling overlay hides the profile facts below it.
