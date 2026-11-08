// Règles partagées avec les relances : aucune condition facultative ne bloque.
export * from "../../supabase/functions/_shared/sit-publish-rules.ts";

import {
  getBlockingBlockers,
  getSitPublishBlockers as getSitPublishBlockersShared,
  type PublishBlocker,
  type SitPublishInput,
} from "../../supabase/functions/_shared/sit-publish-rules.ts";
import { localTodayIso } from "./localDate";

/**
 * Lot PUB3 (recette du 08/11/2026) : côté site, « aujourd'hui » est la date du
 * calendrier de l'appareil, comme dans le formulaire de création (lot PUB1).
 * La règle partagée retombe sur la date UTC quand l'appelant ne la donne pas :
 * Mes annonces, la fiche et l'édition jugeaient alors « passée » une garde qui
 * commence aujourd'hui pour un propriétaire des Amériques ou de Polynésie en
 * soirée, quand le formulaire l'acceptait.
 */
export const getSitPublishBlockers = (
  input: SitPublishInput,
  options: Parameters<typeof getSitPublishBlockersShared>[1] = {},
): PublishBlocker[] =>
  getSitPublishBlockersShared(input, { ...options, today: options?.today ?? localTodayIso() });

export const canPublishSit = (input: SitPublishInput): boolean =>
  getBlockingBlockers(getSitPublishBlockers(input)).length === 0;
