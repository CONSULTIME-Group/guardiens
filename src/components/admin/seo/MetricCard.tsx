import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  value: string | number;
  subtitle: string;
  change?: number;
  invertChange?: boolean;
  isNew?: boolean;
}

const MetricCard = ({ title, icon, value, subtitle, change, invertChange, isNew }: MetricCardProps) => {
  const getChangeDisplay = () => {
    if (isNew) {
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Nouveau</Badge>;
    }
    if (change === undefined || change === null || isNaN(change)) return null;
    const isPositive = invertChange ? change < 0 : change > 0;
    const isNeutral = Math.abs(change) < 0.5;
    const formatted = `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;

    if (isNeutral) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Minus className="h-3 w-3" /> {formatted}
        </span>
      );
    }

    return (
      <span className={`flex items-center gap-1 text-xs font-medium ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {formatted}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {getChangeDisplay()}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
