/**
 * Normalisation de nom de ville en deux temps, équivalente au total à
 * public.normalize_city_name en base.
 *
 * 1. Pendant la frappe (onChange) : retrait des parenthèses et des codes postaux
 *    isolés uniquement. Ne JAMAIS y remettre trim() ni la réduction des espaces
 *    multiples, cela supprimerait l'espace en cours de frappe
 *    (« New York » deviendrait « NewYork »).
 * 2. À la sortie du champ (onBlur) : réduction des espaces multiples puis trim().
 */
export const normalizeCityTyping = (value: string) =>
  value
    .replace(/\([^)]*\)/g, " ")
    .replace(/[()]/g, " ")
    .replace(/\b\d{5}\b/g, " ");

export const normalizeCityName = (value: string) =>
  normalizeCityTyping(value).replace(/\s+/g, " ").trim();
