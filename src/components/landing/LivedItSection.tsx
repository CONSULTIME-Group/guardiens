import { useQuery } from "@tanstack/react-query";
import { getHomeSocialProof, hasEnoughHomeSocialProof } from "@/lib/homeSocialProof";

const formatter = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

export function LivedItSection() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["home-social-proof"],
    queryFn: getHomeSocialProof,
    staleTime: 5 * 60 * 1000,
  });
  if (isLoading || isError || !hasEnoughHomeSocialProof(data)) return null;
  return (
    <section id="ils-lont-vecu" className="bg-muted/30 py-[52px] scroll-mt-24 md:py-20" aria-labelledby="lived-title">
      <div className="lp-wide">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-[0.2em] text-primary">Expériences partagées</p>
        <h2 id="lived-title" className="text-center font-heading text-3xl font-semibold text-foreground md:text-5xl">Ils l'ont vécu</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {data.map((item, index) => (
            <article key={`${item.proof_type}-${item.happened_at}-${index}`} className="rounded-lg border border-border bg-card p-6">
              <p className="font-heading text-lg leading-relaxed text-foreground">« {item.proof_text} »</p>
              <p className="mt-5 text-sm font-semibold text-foreground">{item.first_name}{item.city ? `, ${item.city}` : ""}</p>
              <time className="mt-1 block text-xs text-muted-foreground" dateTime={item.happened_at}>{formatter.format(new Date(item.happened_at))}</time>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}