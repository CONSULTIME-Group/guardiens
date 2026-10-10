/**
 * Compte les annonces ouvertes hors France (lieu du propriétaire, repli
 * annonce, jamais FR déduit). Cache 10 min via react-query, même clé partout.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchIntlOpenSits } from "@/lib/intlSitSearch";

export const INTL_SITS_COUNT_KEY = ["international-sits-count"] as const;

export function useInternationalSitsCount() {
  const { data, isLoading } = useQuery({
    queryKey: INTL_SITS_COUNT_KEY,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<{ count: number }> => ({ count: (await fetchIntlOpenSits()).length }),
  });
  return { count: data?.count ?? 0, isLoading };
}
