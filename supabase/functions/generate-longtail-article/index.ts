// Génère un article longue traîne (ville × race) sous forme de brouillon.
// Pas d'IA : template déterministe + liens internes vers fiches ville, race, recherche.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BodySchema = z.object({
  city: z.string().min(1).max(120),
  breed: z.string().min(1).max(120),
  species: z.enum(['dog', 'cat']),
});

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildContent(city: string, breed: string, species: 'dog' | 'cat') {
  const animal = species === 'dog' ? 'chien' : 'chat';
  const article = species === 'dog' ? 'un' : 'un';
  const citySlug = slugify(city);
  const breedSlug = slugify(breed);

  return `## Faire garder ${article} ${breed} à ${city}, comment s'y prendre

Vous cherchez une personne de confiance pour s'occuper de votre ${breed} pendant votre absence à ${city} ? La garde entre particuliers gagne du terrain auprès des propriétaires qui veulent éviter le stress du chenil et privilégier un cadre familier. Voici un repère pratique pour bien préparer cette démarche.

## Ce qui change avec un ${breed}

Chaque race a ses propres besoins, et le ${breed} n'échappe pas à la règle. Avant de confier votre animal, prenez le temps de préciser à la personne qui le garde :

- son niveau d'énergie quotidien et le rythme de promenades attendu,
- ses habitudes alimentaires (marque, quantités, friandises autorisées),
- ses éventuelles particularités de santé ou traitements en cours,
- son comportement avec les enfants, les autres animaux, les inconnus.

Pour aller plus loin sur les besoins spécifiques de cette race, consultez la [fiche complète du ${breed}](/races/${breedSlug}).

## Trouver une personne de confiance à ${city}

À ${city}, plusieurs gardiens proposent leurs services pour accueillir ${article} ${animal} à domicile ou se déplacer chez vous. Le bon réflexe :

1. Préciser vos dates et le type de garde souhaité (chez vous, chez la personne, visites quotidiennes).
2. Consulter les profils vérifiés et lire les avis laissés par d'autres propriétaires.
3. Organiser une rencontre préalable pour valider le courant entre votre ${animal} et la personne qui le gardera.

Pour parcourir les profils et annonces du secteur, rendez-vous sur la [page dédiée à ${city}](/villes/${citySlug}).

## Préparer la garde sereinement

Quelques jours avant le départ, anticipez :

- un carnet de santé à jour et la photocopie de l'identification,
- les coordonnées du vétérinaire habituel,
- une fiche pratique avec les habitudes, mots-clés et signaux d'alerte,
- la nourriture en quantité suffisante pour toute la durée prévue.

Cette préparation rassure tout le monde et permet à votre ${breed} de garder ses repères.

## Et le coup de main entre particuliers

Au-delà des gardes longues, il existe aussi un mode d'entraide plus léger pour les petits besoins du quotidien : promenade ponctuelle, visite courte, dépannage. Ces coups de main entre gens du coin sont gratuits et peuvent rendre service quand vous avez un imprévu. Découvrez [comment ça fonctionne](/coup-de-main).

## En résumé

Faire garder ${article} ${breed} à ${city} est tout à fait possible dans un cadre familier, à condition de bien préparer la rencontre et de communiquer clairement sur les besoins de votre animal. Plus la fiche de garde est précise, plus la personne qui s'en occupe sera à l'aise, et plus votre ${animal} le sera aussi.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { city, breed, species } = parsed.data;
    const animal = species === 'dog' ? 'chien' : 'chat';

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const slug = `garder-${slugify(breed)}-a-${slugify(city)}`;
    const title = `Garder un ${breed} à ${city} : guide pratique`;
    const metaTitle = `Garder un ${breed} à ${city} | Guardiens`.slice(0, 60);
    const metaDescription = `Conseils pour faire garder votre ${breed} à ${city} : trouver une personne de confiance, préparer la garde, besoins spécifiques de la race.`.slice(0, 160);
    const excerpt = `Vous cherchez une personne de confiance pour garder votre ${breed} à ${city} ? Repères pratiques, besoins de la race et conseils pour préparer une garde sereine.`;

    const { data: existing } = await supabase
      .from('articles').select('id').eq('slug', slug).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ skipped: true, slug }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const citySlug = slugify(city);
    const breedSlug = slugify(breed);
    const internalLinks = [
      { url: `/villes/${citySlug}`, label: `Gardes à ${city}` },
      { url: `/races/${breedSlug}`, label: `Fiche race ${breed}` },
      { url: '/coup-de-main', label: 'Coups de main entre particuliers' },
    ];

    const { data, error } = await supabase.from('articles').insert({
      slug,
      title,
      meta_title: metaTitle,
      meta_description: metaDescription,
      excerpt,
      content: buildContent(city, breed, species),
      category: 'conseil',
      tags: [animal, breed, city, 'garde'],
      city,
      related_city: city,
      related_breed: breed,
      author_name: 'Guardiens',
      internal_links: internalLinks,
      published: false,
    }).select('id, slug').single();

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, id: data.id, slug: data.slug }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
