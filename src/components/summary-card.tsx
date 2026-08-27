import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";

interface SummaryCardProps {
  title: string;
  value: number;
  icon?: React.ReactNode;
  description?: string;
  precise?: boolean;
  type?: "currency" | "number";
}

export function SummaryCard({
  title,
  value,
  icon,
  description,
  precise,
  type = "currency",
}: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">
          {type === "currency" ? formatCurrency(value, precise) : value}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
