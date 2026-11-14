-- Lot CGU10 (14/11/2026) : CGU version 10, article 7 bis Sorties. Publiée le
-- 14/11/2026, en vigueur le 14/12/2026 (préavis de 30 jours, article 15.2),
-- acceptation par case à cocher à la première connexion (article 15.4).
-- Aligné sur src/config/legalVersions.ts et sur le SQL préparé J2b.
-- Repère : cgu10_sorties. Rejouable.
INSERT INTO public.legal_document_versions (document, version, published_on, effective_on, requires_reaccept)
VALUES ('cgu', '10', DATE '2026-11-14', DATE '2026-12-14', true)
ON CONFLICT (document, version) DO UPDATE
  SET published_on = EXCLUDED.published_on,
      effective_on = EXCLUDED.effective_on,
      requires_reaccept = EXCLUDED.requires_reaccept;
