/**
 * Lot perf 7 : liaison React du moteur léger (remplace react-i18next).
 *
 * useTranslation() rend { t, i18n, ready } (aussi lisible en tableau), et
 * recharge le composant à chaque changement de langue, comme react-i18next
 * (aucun rechargement à l'ajout d'un dictionnaire, même réglage par défaut).
 * <Trans> lit une chaîne à balises numérotées (`<1>texte</1>`) et place
 * chaque balise dans le composant fourni ; br, strong, i et p restent des
 * balises HTML, toute autre balise reste du texte. Parité avec react-i18next
 * vérifiée dans src/__tests__/perf7/.
 */
import { cloneElement, createElement, Fragment, isValidElement, useEffect, useMemo, useReducer, type ReactElement, type ReactNode } from "react";
import i18n from "./index";
import type { TFunction, TOptions } from "./lite";

export type { TFunction } from "./lite";

type UseTranslationResult = [TFunction, typeof i18n, boolean] & { t: TFunction; i18n: typeof i18n; ready: boolean };

export function useTranslation(): UseTranslationResult {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const onChange = () => rerender();
    i18n.on("languageChanged", onChange);
    // Lot perf 8 : filet d'un espace chargé après coup, les textes se redessinent.
    i18n.on("namespacesLoaded", onChange);
    return () => { i18n.off("languageChanged", onChange); i18n.off("namespacesLoaded", onChange); };
  }, []);
  const lng = i18n.language;
  return useMemo(() => {
    const r = [i18n.t, i18n, true] as unknown as UseTranslationResult;
    r.t = i18n.t;
    r.i18n = i18n;
    r.ready = true;
    return r;
  }, [lng]);
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&#38;": "&", "&lt;": "<", "&#60;": "<", "&gt;": ">", "&#62;": ">",
  "&apos;": "'", "&#39;": "'", "&quot;": '"', "&#34;": '"', "&nbsp;": " ", "&#160;": " ",
  "&copy;": "©", "&#169;": "©", "&reg;": "®", "&#174;": "®", "&hellip;": "…", "&#8230;": "…",
  "&#x2F;": "/", "&#47;": "/",
};
const unescape = (s: string) => s.replace(/&(?:amp|#38|lt|#60|gt|#62|apos|#39|quot|#34|nbsp|#160|copy|#169|reg|#174|hellip|#8230|#x2F|#47);/g, (m) => ENTITIES[m] ?? m);

const KEEP_HTML = new Set(["br", "strong", "i", "p"]);
const TAG = /<(\/?)([a-zA-Z0-9]+)\s*(\/?)>/g;

interface TagNode { name: string; raw: string; self: boolean; children: (string | TagNode)[] }

function parse(str: string): (string | TagNode)[] {
  const root: TagNode = { name: "", raw: "", self: false, children: [] };
  const stack: TagNode[] = [root];
  let last = 0;
  let m: RegExpExecArray | null;
  TAG.lastIndex = 0;
  while ((m = TAG.exec(str))) {
    if (m.index > last) stack[stack.length - 1].children.push(str.slice(last, m.index));
    last = TAG.lastIndex;
    const [raw, closing, name, selfClosing] = m;
    if (closing) {
      const top = stack[stack.length - 1];
      if (stack.length > 1 && top.name === name) stack.pop();
      else top.children.push(raw);
    } else {
      const node: TagNode = { name, raw, self: !!selfClosing, children: [] };
      stack[stack.length - 1].children.push(node);
      if (!selfClosing) stack.push(node);
    }
  }
  if (last < str.length) stack[stack.length - 1].children.push(str.slice(last));
  // Balise jamais fermée : son ouverture redevient du texte.
  while (stack.length > 1) {
    const open = stack.pop()!;
    const parent = stack[stack.length - 1];
    const i = parent.children.indexOf(open);
    parent.children.splice(i, 1, open.raw, ...open.children);
  }
  return root.children;
}

type Components = ReadonlyArray<ReactNode> | Readonly<Record<string, ReactNode>>;

function render(nodes: (string | TagNode)[], components: Components | undefined, prefix: string): ReactNode[] {
  return nodes.map((n, i) => {
    if (typeof n === "string") return unescape(n);
    const key = `${prefix}${i}`;
    const inner = render(n.children, components, `${key}-`);
    const comp = components ? (components as Record<string, ReactNode>)[n.name] : undefined;
    if (isValidElement(comp)) {
      const own = (comp as ReactElement<{ children?: ReactNode }>).props.children;
      return cloneElement(comp as ReactElement, { key }, ...(inner.length ? inner : own !== undefined ? [own] : []));
    }
    if (KEEP_HTML.has(n.name)) return createElement(n.name, { key }, ...(inner.length ? inner : []));
    return createElement(Fragment, { key }, n.raw, ...inner, n.self ? null : `</${n.name}>`);
  });
}

export interface TransProps {
  i18nKey: string;
  values?: Record<string, unknown>;
  components?: Components;
  count?: number;
  defaults?: string;
  t?: TFunction;
}

export function Trans({ i18nKey, values, components, count, defaults, t }: TransProps) {
  const opts: TOptions = { ...(values ?? {}) };
  if (count !== undefined) opts.count = count;
  if (defaults !== undefined) opts.defaultValue = defaults;
  const str = (t ?? i18n.t)(i18nKey, opts);
  return createElement(Fragment, null, ...render(parse(str), components, ""));
}
