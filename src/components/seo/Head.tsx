import { useEffect, useId, useRef, type ReactNode } from "react";
import { Children, isValidElement } from "react";

/**
 * Remplaçant impératif de `<Helmet>`.
 *
 * `react-helmet-async` n'était pas fiable sur ce projet : ses écritures dans le
 * `<head>` arrivent après le passage de `window.prerenderReady` à true, donc les
 * balises (title, robots, JSON-LD) disparaissaient silencieusement des snapshots
 * de production. Ce composant écrit les mêmes balises directement dans le head,
 * de façon synchrone au montage, et les retire au démontage.
 *
 * API volontairement identique à Helmet (enfants JSX) pour une migration sans
 * réécriture : `<Head><title>…</title><meta name="robots" … /></Head>`.
 */

type Tag =
  | { kind: "title"; text: string }
  | { kind: "meta"; attrs: Record<string, string> }
  | { kind: "link"; attrs: Record<string, string> }
  | { kind: "script"; attrs: Record<string, string>; text: string };

const textOf = (children: ReactNode): string =>
  Children.toArray(children)
    .map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : ""))
    .join("");

const collect = (children: ReactNode, out: Tag[]) => {
  Children.forEach(children, (child) => {
    if (Array.isArray(child)) {
      collect(child as ReactNode, out);
      return;
    }
    if (!isValidElement(child)) return;
    const props = (child.props ?? {}) as Record<string, unknown>;

    if (child.type === "title") {
      out.push({ kind: "title", text: textOf(props.children as ReactNode) });
      return;
    }
    if (child.type === "meta" || child.type === "link") {
      const attrs: Record<string, string> = {};
      for (const [k, v] of Object.entries(props)) {
        if (k === "children" || v == null || typeof v === "object" || typeof v === "function") continue;
        attrs[k] = String(v);
      }
      out.push({ kind: child.type === "meta" ? "meta" : "link", attrs });
      return;
    }
    if (child.type === "script") {
      const attrs: Record<string, string> = {};
      for (const [k, v] of Object.entries(props)) {
        if (k === "children" || k === "dangerouslySetInnerHTML" || v == null || typeof v === "object" || typeof v === "function") continue;
        attrs[k] = String(v);
      }
      const dsi = props.dangerouslySetInnerHTML as { __html?: string } | undefined;
      out.push({ kind: "script", attrs, text: dsi?.__html ?? textOf(props.children as ReactNode) });
      return;
    }
    // Fragment ou wrapper : on descend.
    if (props.children) collect(props.children as ReactNode, out);
  });
};

const Head = ({ children }: { children: ReactNode }) => {
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const previousTitle = useRef<string | null>(null);

  const tags: Tag[] = [];
  collect(children, tags);
  const serialized = JSON.stringify(tags);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const parsed = JSON.parse(serialized) as Tag[];
    const marker = `head-${instanceId}`;
    const created: Element[] = [];

    for (const tag of parsed) {
      if (tag.kind === "title") {
        if (previousTitle.current === null) previousTitle.current = document.title;
        document.title = tag.text;
        continue;
      }
      const el = document.createElement(tag.kind);
      for (const [k, v] of Object.entries(tag.attrs)) {
        el.setAttribute(k === "className" ? "class" : k, v);
      }
      if (tag.kind === "script") el.textContent = tag.text;
      el.setAttribute("data-head", marker);
      document.head.appendChild(el);
      created.push(el);
    }

    return () => {
      created.forEach((el) => el.remove());
    };
  }, [serialized, instanceId]);

  useEffect(() => {
    return () => {
      if (previousTitle.current !== null && typeof document !== "undefined") {
        document.title = previousTitle.current;
      }
    };
  }, []);

  return null;
};

export default Head;
export { Head };
