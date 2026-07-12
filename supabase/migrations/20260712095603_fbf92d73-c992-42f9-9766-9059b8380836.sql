
UPDATE public.articles
SET
  meta_title = 'House sitting : c''est quoi, comment ça marche, prix (guide 2026)',
  meta_description = 'Le house sitting, c''est la garde gratuite d''animaux à domicile en échange d''un logement. Guide 2026 : fonctionnement, prix, cadre légal, plateformes.',
  content = regexp_replace(
    content,
    E'> \\*\\*En bref\\.\\*\\*[^\\n]+',
    '> **En bref.** Le house sitting est la garde bénévole d''une maison et de ses animaux pendant l''absence des propriétaires, en échange d''un logement gratuit. Ni location, ni service payant, un échange direct entre particuliers, généralement organisé via une plateforme spécialisée comme Guardiens. En France, cette pratique se développe depuis 2020 sur les zones touristiques et périurbaines.'
  ),
  updated_at = now()
WHERE slug = 'c-est-quoi-le-house-sitting';

UPDATE public.articles
SET content = replace(content,
  '## <a id="definition"></a>House sitting : définition précise',
  '## <a id="definition"></a>C''est quoi le house sitting, concrètement ?'
)
WHERE slug = 'c-est-quoi-le-house-sitting';

UPDATE public.articles
SET content = replace(content,
  '## <a id="fonctionnement"></a>Comment fonctionne le house sitting, étape par étape',
  '## <a id="fonctionnement"></a>Comment ça fonctionne concrètement ?'
)
WHERE slug = 'c-est-quoi-le-house-sitting';

UPDATE public.articles
SET content = replace(content,
  '## <a id="comparatif"></a>House sitting, home sitting, pet sitting, pension : quelles différences ?',
  '## <a id="comparatif"></a>Quelles différences avec une pension pour animaux ?'
)
WHERE slug = 'c-est-quoi-le-house-sitting';

UPDATE public.articles
SET content = replace(content,
  '## <a id="trouver-missions"></a>Comment trouver des missions de house sitting',
  '## <a id="trouver-missions"></a>Comment devenir gardien (house sitter) ?'
)
WHERE slug = 'c-est-quoi-le-house-sitting';

UPDATE public.articles
SET content = replace(content,
  '## <a id="legislation"></a>House sitting et législation française',
  '## <a id="legislation"></a>Quels sont les risques et le cadre légal en France ?'
)
WHERE slug = 'c-est-quoi-le-house-sitting';
