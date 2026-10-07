/**
 * Lot P5 : point de rendez-vous entre les pages paresseuses et le
 * dictionnaire complet, sans faire dépendre lazyWithRetry de i18next.
 * Sans dictionnaire enregistré (tests unitaires), aucune attente.
 */
let gate: (() => Promise<void>) | null = null;
export const setDictionaryGate = (g: () => Promise<void>) => { gate = g; };
export const waitDictionary = (): Promise<void> => (gate ? gate() : Promise.resolve());
