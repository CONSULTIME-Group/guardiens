import leProgres from "@/assets/press/le-progres.jpg.asset.json";

/**
 * Bandeau « Ils parlent de nous ».
 * Logos de presse ayant consacre un article a Guardiens.
 */
export function PressStrip() {
  return (
    <section aria-labelledby="press-strip-title" className="py-10 md:py-14 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2
          id="press-strip-title"
          className="text-center font-heading text-sm md:text-base font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Ils parlent de nous
        </h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-8">
          <img
            src={leProgres.url}
            alt="Logo du journal Le Progres"
            width={200}
            height={100}
            loading="lazy"
            decoding="async"
            className="h-10 md:h-12 w-auto object-contain"
          />
        </div>
      </div>
    </section>
  );
}

export default PressStrip;
