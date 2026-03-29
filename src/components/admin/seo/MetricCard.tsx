import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  value: string | number;
  subtitle: string;
  change?: number;
  invertChange?: boolean;
}

const MetricCard = ({ title, icon, value, subtitle, change, invertChange }: MetricCardProps) => {
  const getChangeDisplay = () => {
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
      <span className={`flex items-center gap-1 text-xs ${isPositive ? "text-[#2D7D46]" : "text-[#EF4444]"}`}>
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
