import { Link } from "react-router-dom";
import { Author, resolveAuthors } from "@/data/authors";

interface ArticleAuthorBioProps {
  authorName: string | null | undefined;
}

/**
 * Bloc « À propos de l'auteur » affiché en pied d'article.
 * - 1 auteur identifié → photo + prénom + bio courte + lien
 * - Cosigné Jérémie + Elisa → 2 photos côte à côte + 2 liens
 * - Auteur générique (Guardiens, L'équipe Guardiens, etc.) → rien
 */
export default function ArticleAuthorBio({ authorName }: ArticleAuthorBioProps) {
  const authors = resolveAuthors(authorName);
  if (authors.length === 0) return null;

  const isCosigned = authors.length > 1;

  return (
    <aside
      className="mt-10 pt-8 border-t border-border"
      aria-labelledby="article-author-bio-heading"
    >
      <h2
        id="article-author-bio-heading"
        className="font-heading text-lg font-semibold text-foreground mb-4"
      >
        {isCosigned ? "À propos des auteurs" : "À propos de l'auteur"}
      </h2>

      <div className="rounded-xl bg-muted/40 border border-border p-5 space-y-5">
        {isCosigned ? (
          <div className="flex items-start gap-4">
            <div className="flex -space-x-3 shrink-0">
              {authors.map((a) => (
                <img
                  key={a.slug}
                  src={a.photo}
                  alt={`Portrait de ${a.firstName}`}
                  width={64}
                  height={64}
                  loading="lazy"
                  decoding="async"
                  className="w-16 h-16 rounded-full object-cover border-2 border-background"
                />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">
                {authors.map((a) => a.firstName).join(" & ")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Co-fondateurs de Guardiens. 5 ans de house-sitting à deux.
                Articles écrits depuis le terrain.
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {authors.map((a) => (
                  <Link
                    key={a.slug}
                    to={`/auteurs/${a.slug}`}
                    className="text-primary hover:underline font-medium"
                  >
                    En savoir plus sur {a.firstName} →
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <SingleAuthor author={authors[0]} />
        )}
      </div>
    </aside>
  );
}

function SingleAuthor({ author }: { author: Author }) {
  return (
    <div className="flex items-start gap-4">
      <img
        src={author.photo}
        alt={`Portrait de ${author.firstName}`}
        width={72}
        height={72}
        loading="lazy"
        decoding="async"
        className="w-18 h-18 rounded-full object-cover shrink-0"
        style={{ width: 72, height: 72 }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{author.firstName}</p>
        <p className="text-sm text-muted-foreground mt-1">{author.shortBio}</p>
        <Link
          to={`/auteurs/${author.slug}`}
          className="inline-block mt-2 text-sm text-primary hover:underline font-medium"
        >
          Tous les articles de {author.firstName} →
        </Link>
      </div>
    </div>
  );
}
