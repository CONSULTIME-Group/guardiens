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

export interface BingLinkRow {
  Url?: string;
  Count?: number;
}

export interface BingResponse {
  error?: string;
  site?: string;
  period_days?: number;
  updated_at?: string;
  summary?: { current: BingPeriod; previous: BingPeriod; byDay: BingDay[] } | null;
  traffic?: { d?: BingTrafficRow[] } | { error: string };
  queries?: { d?: BingTrafficRow[] } | { error: string };
  pages?: { d?: BingTrafficRow[] } | { error: string };
  links?: { d?: BingLinkRow[] } | { error: string };
}

export type BingPeriodDays = 7 | 28 | 90;

export function useBingData(period: BingPeriodDays = 28) {
  return useQuery({
    queryKey: ["bing-data", period],
    staleTime: 60 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<BingResponse> => {
      const { data, error } = await supabase.functions.invoke(`fetch-bing-data?period=${period}`);
      if (error) return { error: error.message };
      return data as BingResponse;
    },
  });
}
