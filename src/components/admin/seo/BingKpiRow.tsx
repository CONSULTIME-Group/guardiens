import MetricCard from "@/components/admin/seo/MetricCard";
import { MousePointerClick, Eye, Globe } from "lucide-react";
import { useBingData, type BingPeriodDays } from "@/hooks/useBingData";

function pctChange(current: number, previous: number): number | undefined {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

interface Props {
  period?: BingPeriodDays;
}

export default function BingKpiRow({ period = 28 }: Props) {
  const { data, isLoading } = useBingData(period);
  const label = `${period} derniers jours · Bing`;

  if (data?.error) return null;
  const s = data?.summary;
  if (!s) {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard title="Clics Bing" icon={<MousePointerClick className="h-4 w-4 text-primary" />} value="…" subtitle={label} />
          <MetricCard title="Impressions Bing" icon={<Eye className="h-4 w-4 text-primary" />} value="…" subtitle={label} />
          <MetricCard title="Position moy. Bing" icon={<Globe className="h-4 w-4 text-primary" />} value="…" subtitle="Bing" />
        </div>
      );
    }
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <MetricCard
        title="Clics Bing"
        icon={<MousePointerClick className="h-4 w-4 text-primary" />}
        value={s.current.clicks.toLocaleString()}
        subtitle={label}
        change={pctChange(s.current.clicks, s.previous.clicks)}
      />
      <MetricCard
        title="Impressions Bing"
        icon={<Eye className="h-4 w-4 text-primary" />}
        value={s.current.impressions.toLocaleString()}
        subtitle={label}
        change={pctChange(s.current.impressions, s.previous.impressions)}
      />
      <MetricCard
        title="Position moy. Bing"
        icon={<Globe className="h-4 w-4 text-primary" />}
        value={s.current.position > 0 ? s.current.position.toFixed(1) : "–"}
        subtitle="Plus bas = mieux · Bing"
        change={s.previous.position > 0 ? pctChange(s.current.position, s.previous.position) : undefined}
        invertChange
      />
    </div>
  );
}
