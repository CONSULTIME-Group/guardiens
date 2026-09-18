import { normalizeRecacheUrl as n } from "./prerender-recache/index.ts";
for (const u of ["https://guardiens.fr/actualites/x?a=1#b","https://www.guardiens.fr/guides/y","http://guardiens.fr/","https://evil.com/","https://guardiens.fr.evil.com/", 42]) {
  console.log(JSON.stringify(u), "->", n(u));
}
