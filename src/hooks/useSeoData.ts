import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GA4Metrics {
  sessions: number;
  activeUsers: number;
  screenPageViews: number;
  averageSessionDuration: number;
  sessionsByDay: { date: string; sessions: number }[];
}

export interface GSCMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCRow extends GSCMetrics {
  keys: string[];
}

export interface GA4ChannelRow {
  channel: string;
  sessions: number;
  activeUsers: number;
}

export interface SeoData {
  ga4: {
    current: GA4Metrics;
    previous: GA4Metrics | null;
    propertyId: string;
    channels?: GA4ChannelRow[];
  } | null;
  gsc: {
    current: GSCMetrics;
    previous: GSCMetrics;
    topPages: GSCRow[];
    topQueries: GSCRow[];
  };
  updated_at: string;
  cached: boolean;
  stale?: boolean;
  error?: string;
}

export const useSeoData = () => {
  const [data, setData] = useState<SeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetch = useRef<number>(0);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && Date.now() - lastFetch.current < 600000 && data) return;

    setLoading(true);
    setError(null);

    try {
      const url = forceRefresh ? "fetch-seo-data?refresh=true" : "fetch-seo-data";
      const { data: result, error: fnError } = await supabase.functions.invoke(url);

      if (fnError) throw new Error(fnError.message);
      if (result?.error && !result?.gsc) throw new Error(result.error);

      setData(result as SeoData);
      lastFetch.current = Date.now();
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des données SEO");
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    fetchData();
  }, []);

  const refresh = () => fetchData(true);

  return { data, loading, error, refresh };
};
