# send-mass-email-proximity

- Diffusion de proximité d'une annonce (send-mass-email-proximity) : une annonce + une adresse = une alerte, identité = id de l'annonce, historique paginé (campagnes de proximité, vagues automatiques) partagé par aperçu et envoi, puis réservation par la RPC dédiée acquire_proximity_send_claim (clé neuve ou retryable seulement, jamais de reprise sur ancienneté), 2xx sans tous les ids fournisseur = incertain, issue ambiguë jamais rejouée, réconciliation manuelle ; pourquoi : incident du 02/10/2026, élargir le rayon renvoyait l'alerte aux mêmes personnes.
