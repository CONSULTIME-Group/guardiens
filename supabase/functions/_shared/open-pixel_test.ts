import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { massOpenPixelHtml, withOpenPixel } from "./open-pixel.ts";

Deno.test("MAIL2 : pixel par jeton, puis par profil, rien sans destinataire", () => {
  const c = "11111111-1111-4111-8111-111111111111";
  assertStringIncludes(massOpenPixelHtml("https://x.supabase.co", c, { token: "a".repeat(64) }), `track-email-pixel?c=${c}&amp;t=${"a".repeat(64)}`);
  assertStringIncludes(massOpenPixelHtml("https://x.supabase.co", c, { userId: c }), `&amp;u=${c}`);
  assertEquals(massOpenPixelHtml("https://x.supabase.co", c, {}), "");
});

Deno.test("MAIL2 : pixel avant </body>", () => {
  assertEquals(withOpenPixel("<body>a</body></html>", "<img>"), "<body>a<img></body></html>");
  assertEquals(withOpenPixel("a", "<img>"), "a<img>");
  assertEquals(withOpenPixel("a", ""), "a");
});
