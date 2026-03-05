import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const heatStyles: Record<string, string> = {
  Hot: "bg-red-500/15 text-red-400 border-red-500/20",
  Warming: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  Cooling: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Cold: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
};

export function ThemeBadge({ heat }: { heat: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", heatStyles[heat] || heatStyles.Warming)}
    >
      {heat}
    </Badge>
  );
}
