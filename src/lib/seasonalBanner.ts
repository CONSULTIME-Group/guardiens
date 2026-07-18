/**
 * Bandeau saisonnier dynamique : titre + sous-titre adaptés au moment de l'année.
 * - Décembre : fêtes
 * - Janvier-Mars : hiver / vacances de février
 * - Avril-Juin : printemps / pré-été
 * - Juillet-Août : été
 * - Septembre-Novembre : automne / Toussaint
 */
export function getSeasonalBannerKeys(): { titleKey: string; descriptionKey: string } {
  const month = new Date().getMonth(); // 0 = janvier
  if (month === 11) {
    return { titleKey: "landing.seasonal.december.title", descriptionKey: "landing.seasonal.december.description" };
  }
  if (month <= 2) {
    return { titleKey: "landing.seasonal.winter.title", descriptionKey: "landing.seasonal.winter.description" };
  }
  if (month <= 5) {
    return { titleKey: "landing.seasonal.spring.title", descriptionKey: "landing.seasonal.spring.description" };
  }
  if (month <= 7) {
    return { titleKey: "landing.seasonal.summer.title", descriptionKey: "landing.seasonal.summer.description" };
  }
  return { titleKey: "landing.seasonal.autumn.title", descriptionKey: "landing.seasonal.autumn.description" };
}
