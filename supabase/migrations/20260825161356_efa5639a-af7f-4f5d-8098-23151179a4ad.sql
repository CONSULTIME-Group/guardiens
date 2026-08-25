-- Sauvegarde datée obligatoire avant toute migration de données.
CREATE TABLE IF NOT EXISTS public._backup_breed_content_20260825 AS
SELECT * FROM public.breed_profiles
WHERE (species = 'cat' AND breed = 'européen')
   OR (species = 'horse' AND breed = 'mérens');

-- 1. Fiche « européen » (chat). L'Européen est une race reconnue par le LOOF,
-- avec un standard. « Chat de gouttière » désigne bien un chat sans pedigree,
-- mais l'Européen n'est pas un chat sans race.
UPDATE public.breed_profiles
SET
  temperament = 'L''Européen est réputé pour son équilibre : affectueux sans être envahissant, joueur sans être turbulent. Il recherche le contact avec les personnes qui prennent soin de lui, tout en gardant une part d''indépendance héritée de son passé de chasseur. Sa robustesse et sa capacité d''adaptation lui permettent de s''ajuster à des environnements variés dès qu''il s''y sent en sécurité. Son niveau d''énergie reste modéré : des phases de jeu vif alternent avec de longues périodes de repos. Il exprime son attachement par des ronronnements, des frottements et une présence discrète mais constante.',
  difficulty_level = 'Modéré. L''Européen est un chat facile à vivre, mais chaque individu garde son caractère propre : certains demandent plus de socialisation ou d''attention que d''autres. Un gardien devra savoir lire les signaux félins et ajuster son comportement en conséquence, ce qui demande une certaine expérience ou une bonne capacité d''observation.',
  rich_content = regexp_replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              rich_content,
              '## Portrait du Chat croisé / sans race définie',
              '## Portrait du Chat européen'
            ),
            'Le chat croisé, souvent appelé "chat de gouttière" ou "chat commun européen", ne possède pas de pedigree reconnu ni d''origine géographique spécifique. Il est le fruit de générations de croisements naturels, ce qui lui confère une **grande diversité génétique** et une **robustesse** souvent supérieure à celle des races pures. Chaque chat croisé est unique, tant par son apparence que par son tempérament.',
            'L''Européen, aussi appelé Celtic Shorthair, est une race reconnue par le LOOF, avec un standard officiel. Il descend des chats domestiques d''Europe continentale et a été sélectionné à partir de cette population naturelle, ce qui lui vaut une **grande diversité génétique** et une **robustesse** remarquable. Attention à ne pas le confondre avec le chat de gouttière, qui désigne un chat sans pedigree : les deux se ressemblent souvent, mais l''Européen est bien une race à part entière.'
          ),
          'chats croisés',
          'chats européens'
        ),
        'chat croisé',
        'chat européen'
      ),
      'Chat croisé',
      'Chat européen'
    ),
    'sans race définie',
    'de race européenne',
    'g'
  )
WHERE species = 'cat' AND breed = 'européen';

-- 2. Fiche « mérens » (cheval). Contenu rédigé au féminin avant renommage.
UPDATE public.breed_profiles
SET
  temperament = 'Le Mérens est réputé pour son caractère calme et posé, ce qui en fait un compagnon agréable. Il est généralement doté d''une grande intelligence et d''une bonne volonté, ce qui facilite son éducation et son interaction avec l''humain. Bien qu''il puisse se montrer indépendant, il s''attache profondément à son gardien une fois la confiance établie, développant un lien fort et loyal. Sa nature robuste et sa capacité d''adaptation lui permettent de bien supporter des environnements variés, tout en restant attentif à son entourage. Son tempérament équilibré le rend particulièrement apprécié pour de nombreuses activités.',
  difficulty_level = 'Modéré. Le Mérens, bien que calme, est un grand animal qui demande une connaissance de base du comportement équin et des soins spécifiques. Sa manipulation nécessite de la force et de la technique, et un gardien débutant pourrait se sentir dépassé par sa taille et sa puissance sans une préparation adéquate. La gestion de son environnement, de son alimentation et la reconnaissance des signes de maladie exigent une certaine vigilance et des compétences spécifiques.',
  rich_content = replace(
    replace(
      replace(
        replace(
          replace(rich_content, '## Portrait du Cheval de race jument mérens', '## Portrait du Mérens'),
          'La jument Mérens', 'Le Mérens'
        ),
        'la jument Mérens', 'le Mérens'
      ),
      'jument Mérens', 'Mérens'
    ),
    'jument mérens', 'Mérens'
  )
WHERE species = 'horse' AND breed = 'mérens';