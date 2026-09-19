// Configuration VAPID. Fail closed : sans configuration complete, le push est
// desactive et aucune permission navigateur n'est demandee.
// Les variables VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY et VAPID_SUBJECT restent
// a creer cote backend, elles ne figurent dans aucun fichier du depot.

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export type EnvReader = (name: string) => string | undefined;

export function readVapidConfig(getEnv: EnvReader): VapidConfig | null {
  const publicKey = (getEnv('VAPID_PUBLIC_KEY') ?? '').trim();
  const privateKey = (getEnv('VAPID_PRIVATE_KEY') ?? '').trim();
  const subject = (getEnv('VAPID_SUBJECT') ?? '').trim();

  if (!publicKey || !privateKey || !subject) return null;
  if (!/^(mailto:|https:)/.test(subject)) return null;
  return { publicKey, privateKey, subject };
}

/** Reponse de l'action 'config' : jamais de cle privee, jamais d'endpoint. */
export function buildConfigResponse(getEnv: EnvReader): { enabled: boolean; publicKey?: string } {
  const config = readVapidConfig(getEnv);
  if (!config) return { enabled: false };
  return { enabled: true, publicKey: config.publicKey };
}
