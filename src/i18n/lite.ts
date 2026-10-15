/**
 * Lot perf 7 : moteur de traduction léger qui remplace i18next.
 *
 * Guardiens est monolingue français depuis le 17/08/2026. Ce moteur reprend
 * exactement ce que le site utilise d'i18next (parité vérifiée clé par clé
 * contre i18next dans src/__tests__/perf7/) :
 *   - clés à points dans un dictionnaire imbriqué, liste de clés de repli ;
 *   - pluriels par Intl.PluralRules (`_one`, `_other`, `_many`, `_zero` pour 0) ;
 *   - interpolation `{{nom}}` ou `{{objet.champ}}`, sans échappement ; une
 *     variable absente des options reste telle quelle, une variable présente
 *     mais vide devient une chaîne vide ;
 *   - valeur par défaut (`t(clé, "texte")` ou `{ defaultValue }`), sinon la clé ;
 *   - ajout d'un dictionnaire (addResourceBundle), langue, événements.
 * Tout le reste d'i18next (espaces de noms multiples, contextes, formats,
 * imbrication `$t()`) n'est utilisé nulle part et n'est pas repris.
 */

type Dict = Record<string, unknown>;
type Handler = (...args: any[]) => void;
export type TOptions = Record<string, unknown> & { count?: number; defaultValue?: string; replace?: Record<string, unknown> };
export type TFunction = (key: string | string[], optionsOrDefault?: TOptions | string, maybeOptions?: TOptions) => string;

const isObject = (v: unknown): v is Dict => !!v && typeof v === "object" && !Array.isArray(v);

function deepExtend(target: Dict, source: Dict, overwrite: boolean): Dict {
  for (const k of Object.keys(source)) {
    if (k === "__proto__" || k === "constructor") continue;
    const s = source[k];
    const t = target[k];
    if (isObject(s) && isObject(t)) deepExtend(t, s, overwrite);
    else if (overwrite || t === undefined) target[k] = isObject(s) ? deepExtend({}, s, true) : s;
  }
  return target;
}

function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Dict)[part];
  }
  return cur;
}

const VAR = /\{\{(.+?)\}\}/g;

/** Interpolation `{{x}}` au comportement d'i18next (skipOnVariables, sans échappement). */
export function interpolate(str: string, data: Record<string, unknown>, options: Record<string, unknown>): string {
  return str.replace(VAR, (whole, inner: string) => {
    const name = inner.trim().replace(/^-\s*/, "");
    let value = getPath(data, name);
    if (value === undefined && name in Object(data)) value = (data as Dict)[name];
    if (value === undefined) return Object.prototype.hasOwnProperty.call(options, name) ? "" : whole;
    return value == null ? "" : String(value);
  });
}

export class LiteI18n {
  language: string;
  languages: string[];
  readonly isInitialized = true;
  readonly options: { fallbackLng: string; supportedLngs: string[]; defaultNS: string };
  private readonly store: Record<string, Record<string, Dict>> = {};
  private readonly handlers = new Map<string, Set<Handler>>();
  private readonly rules = new Map<string, Intl.PluralRules>();

  /** Lot perf 8 : appelé quand une clé vise un espace absent du dictionnaire chargé. */
  onMissingNamespace: ((ns: string, key: string) => void) | null = null;

  constructor(opts: { lng: string; supportedLngs: string[]; ns?: string; resources?: Record<string, Record<string, Dict>> }) {
    this.language = opts.lng;
    this.languages = [opts.lng];
    this.options = { fallbackLng: opts.lng, supportedLngs: opts.supportedLngs, defaultNS: opts.ns ?? "common" };
    for (const [lng, bundles] of Object.entries(opts.resources ?? {})) {
      for (const [ns, dict] of Object.entries(bundles)) this.addResourceBundle(lng, ns, dict, true, true);
    }
  }

  private dict(): Dict | undefined {
    return this.store[this.language]?.[this.options.defaultNS] ?? this.store[this.options.fallbackLng]?.[this.options.defaultNS];
  }

  private pluralSuffix(count: number): string {
    let r = this.rules.get(this.language);
    if (!r) {
      try { r = new Intl.PluralRules(this.language); } catch { r = new Intl.PluralRules("fr"); }
      this.rules.set(this.language, r);
    }
    return `_${r.select(count)}`;
  }

  private lookup(key: string, opts: TOptions): unknown {
    const d = this.dict();
    if (!d) return undefined;
    const count = opts.count;
    const plural = count !== undefined && typeof count !== "string";
    // Même ordre qu'i18next : _zero (pour 0), puis le suffixe de pluriel, puis la clé.
    const candidates: string[] = [];
    if (plural) {
      if (count === 0) candidates.push(`${key}_zero`);
      candidates.push(key + this.pluralSuffix(count as number));
    }
    candidates.push(key);
    for (const k of candidates) {
      const v = getPath(d, k);
      if (v !== undefined && v !== null) return v;
    }
    return undefined;
  }

  /** Fonction de traduction, stable pendant toute la vie de l'application. */
  readonly t: TFunction = (keys, optionsOrDefault, maybeOptions) => {
    const opts: TOptions = typeof optionsOrDefault === "string"
      ? { ...(maybeOptions ?? {}), defaultValue: optionsOrDefault }
      : (optionsOrDefault ?? {});
    const list = Array.isArray(keys) ? keys : [keys];
    let found: unknown;
    let usedKey = list[list.length - 1] ?? "";
    for (const k of list) {
      const key = String(k);
      found = this.lookup(key, opts);
      usedKey = key;
      if (found !== undefined) break;
    }
    const data = opts.replace && typeof opts.replace !== "string" ? (opts.replace as Record<string, unknown>) : (opts as Record<string, unknown>);
    if (found === undefined && this.onMissingNamespace) {
      const d = this.dict();
      for (const k of list) {
        const ns = String(k).split(".")[0];
        if (ns && !(d && ns in d)) this.onMissingNamespace(ns, String(k));
      }
    }
    if (found === undefined) {
      if (typeof opts.defaultValue === "string") return interpolate(opts.defaultValue, data, opts);
      return usedKey;
    }
    if (typeof found !== "string") {
      if (typeof found === "number" || typeof found === "boolean") return String(found);
      return `key '${usedKey} (${this.language})' returned an object instead of string.`;
    }
    return interpolate(found, data, opts);
  };

  exists(key: string, opts: TOptions = {}): boolean {
    return this.lookup(key, opts) !== undefined;
  }

  hasResourceBundle(lng: string, ns: string): boolean {
    return !!this.store[lng]?.[ns];
  }

  getResourceBundle(lng: string, ns: string): Dict | undefined {
    return this.store[lng]?.[ns];
  }

  addResourceBundle(lng: string, ns: string, resources: Dict, deep = false, overwrite = false): this {
    const bundles = (this.store[lng] ??= {});
    const current = bundles[ns];
    if (!current) bundles[ns] = deepExtend({}, resources, true);
    else if (deep) deepExtend(current, resources, overwrite);
    else bundles[ns] = overwrite ? { ...current, ...resources } : { ...resources, ...current };
    this.emit("added", lng, ns);
    return this;
  }

  /** Seules les langues proposées sont retenues ; toute autre retombe sur la langue de repli. */
  async changeLanguage(lng?: string): Promise<TFunction> {
    const target = lng && this.options.supportedLngs.includes(lng) ? lng : this.options.fallbackLng;
    this.language = target;
    this.languages = [target];
    this.emit("cacheLanguage", target);
    // Comme i18next : l'événement part à chaque appel, même langue comprise.
    this.emit("languageChanged", target);
    return this.t;
  }

  getFixedT(): TFunction {
    return this.t;
  }

  on(event: string, fn: Handler): this {
    let set = this.handlers.get(event);
    if (!set) this.handlers.set(event, (set = new Set()));
    set.add(fn);
    return this;
  }

  off(event: string, fn?: Handler): this {
    if (!fn) this.handlers.delete(event);
    else this.handlers.get(event)?.delete(fn);
    return this;
  }

  emit(event: string, ...args: unknown[]): void {
    for (const fn of [...(this.handlers.get(event) ?? [])]) fn(...args);
  }
}
