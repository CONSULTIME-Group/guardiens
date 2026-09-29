import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callMaPeriode, type DeparturePayload, type DeparturePeriod } from "@/lib/ownerDeparture";

/** État de la question de départ pour le propriétaire connecté (lot N4). */
export function useOwnerDeparture(userId: string | undefined) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const key = ["owner-departure", userId];
  const q = useQuery({
    queryKey: key,
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<DeparturePayload | null> => {
      const res = await callMaPeriode({ mode: "peek" });
      return res.ok ? res : null;
    },
  });
  const pick = async (period: DeparturePeriod) => {
    setBusy(true);
    const res = await callMaPeriode({ mode: "save", period });
    if (res.ok) qc.setQueryData(key, res);
    setBusy(false);
  };
  return { data: q.data ?? null, pick, busy };
}
