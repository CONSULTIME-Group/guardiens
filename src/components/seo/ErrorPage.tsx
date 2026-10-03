import PageMeta from "@/components/PageMeta";

export default function PublicLoadError() {
  return <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-4">
    <PageMeta title="Page momentanément indisponible" description="Cette page n'a pas pu être chargée. Vous pouvez réessayer dans un instant." noindex noCanonical statusCode={503} />
    <h1 className="font-heading text-2xl font-semibold">Page momentanément indisponible</h1>
    <p className="text-muted-foreground">Vous pouvez réessayer dans un instant.</p>
    <button type="button" className="text-primary underline" onClick={() => window.location.reload()}>Réessayer</button>
  </div>;
}
