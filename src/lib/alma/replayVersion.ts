/**
 * Lot A4 (audit Alma du 14/10/2026) : le rejeu suit la version servie.
 * L'onglet Pilotage lit la version en ligne (alma-chat, { kind: "version" })
 * et la compare à celle du dernier rejeu (alma_replay_runs.version).
 * Logique pure, testée dans src/__tests__/a4/.
 */
export interface ReplayFreshness {
  stale: boolean;
  message: string;
}

export function replayFreshness(
  liveVersion: string | null | undefined,
  lastRun: { version?: string | null } | null | undefined,
): ReplayFreshness {
  const live = typeof liveVersion === "string" && liveVersion.trim() ? liveVersion.trim() : null;
  if (!live) return { stale: false, message: "Version en ligne : lecture impossible pour l'instant." };
  if (!lastRun) return { stale: true, message: `Rejeu à refaire : aucun rejeu enregistré, version en ligne ${live}.` };
  const ran = typeof lastRun.version === "string" && lastRun.version.trim() ? lastRun.version.trim() : null;
  if (ran !== live) {
    return {
      stale: true,
      message: `Rejeu à refaire : version en ligne ${live}, dernier rejeu ${ran ? `sur ${ran}` : "sans version enregistrée"}.`,
    };
  }
  return { stale: false, message: `Rejeu à jour pour la version en ligne ${live}.` };
}

/** Version lue dans les réponses du rejeu (replay_meta.version), la première trouvée. */
export function versionFromReplayMetas(metas: Array<{ version?: unknown } | null | undefined>): string | null {
  for (const m of metas) if (m && typeof m.version === "string" && m.version) return m.version;
  return null;
}
