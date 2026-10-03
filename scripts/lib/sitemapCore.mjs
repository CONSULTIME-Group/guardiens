import ts from "typescript";
export * from "../../supabase/functions/_shared/sitemap-core.js";

/**
 * Lit SITE_URL et staticRoutes de siteRoutes.ts par l'arbre syntaxique
 * TypeScript (insensible à l'indentation et aux commentaires).
 */
export function readStaticRoutes(source) {
  const sf = ts.createSourceFile("siteRoutes.ts", source, ts.ScriptTarget.Latest, true);
  let siteUrl = null;
  let routes = null;
  const unwrap = (n) => {
    while (ts.isAsExpression(n) || ts.isParenthesizedExpression(n) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(n))) n = n.expression;
    return n;
  };
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
      const init = unwrap(decl.initializer);
      if (decl.name.text === "SITE_URL" && ts.isStringLiteralLike(init)) siteUrl = init.text;
      if (decl.name.text === "staticRoutes") {
        if (!ts.isArrayLiteralExpression(init)) throw new Error("staticRoutes doit être un tableau littéral");
        routes = init.elements.map((el) => {
          if (!ts.isObjectLiteralExpression(el)) throw new Error("staticRoutes : entrée non littérale");
          const o = {};
          for (const p of el.properties) {
            if (!ts.isPropertyAssignment(p) || !p.name) continue;
            const name = p.name.getText(sf).replace(/["']/g, "");
            const v = unwrap(p.initializer);
            if (ts.isStringLiteralLike(v)) o[name] = v.text;
            else if (v.kind === ts.SyntaxKind.TrueKeyword) o[name] = true;
            else if (v.kind === ts.SyntaxKind.FalseKeyword) o[name] = false;
          }
          return o;
        });
      }
    }
  }
  if (!siteUrl) throw new Error("SITE_URL introuvable dans siteRoutes.ts");
  if (!routes || routes.length === 0) throw new Error("Aucune route extraite de staticRoutes");
  return {
    siteUrl,
    routes: routes
      .filter((r) => r.path && r.sitemapPriority && r.changeFreq)
      .map((r) => ({ loc: r.path, priority: r.sitemapPriority, changefreq: r.changeFreq, indexable: r.index !== false })),
  };
}

/** Slugs des pages villes compilees, extraits de la meme source que CityPage. */
export function readStaticCitySlugs(source) {
  const sf = ts.createSourceFile("cities.ts", source, ts.ScriptTarget.Latest, true);
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== "CITIES") continue;
      let init = decl.initializer;
      while (init && (ts.isAsExpression(init) || ts.isSatisfiesExpression?.(init))) init = init.expression;
      if (!init || !ts.isArrayLiteralExpression(init)) throw new Error("CITIES doit etre un tableau litteral");
      return init.elements.map(el => {
        if (!ts.isObjectLiteralExpression(el)) throw new Error("Ville non litterale");
        const slug = el.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(sf) === "slug");
        if (!slug || !ts.isStringLiteralLike(slug.initializer)) throw new Error("Ville sans slug litteral");
        return slug.initializer.text;
      });
    }
  }
  throw new Error("CITIES introuvable");
}
