import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BingPeriod {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface BingDay {
  date: string;
  clicks: number;
  impressions: number;
}

export interface BingTrafficRow {
  Date?: string;
  Clicks?: number;
  Impressions?: number;
  Query?: string;
  Page?: string;
  AvgClickPosition?: number;
  AvgImpressionPosition?: number;
}

export interface BingResponse {
  error?: string;
  site?: string;
  updated_at?: string;
  summary?: { current: BingPeriod; previous: BingPeriod; byDay: BingDay[] } | null;
  traffic?: { d?: BingTrafficRow[] } | { error: string };
  queries?: { d?: BingTrafficRow[] } | { error: string };
  pages?: { d?: BingTrafficRow[] } | { error: string };
}

export function useBingData() {
  return useQuery({
    queryKey: ["bing-data"],
    staleTime: 60 * 60 * 1000, // 1h
    gcTime: 6 * 60 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<BingResponse> => {
      const { data, error } = await supabase.functions.invoke("fetch-bing-data");
      if (error) return { error: error.message };
      return data as BingResponse;
    },
  });
}
