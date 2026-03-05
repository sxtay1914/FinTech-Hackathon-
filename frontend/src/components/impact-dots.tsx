import { cn } from "@/lib/utils";

interface ImpactDotsProps {
  value: number;
  variant: "opportunity" | "portfolio";
  max?: number;
}

export function ImpactDots({ value, variant, max = 5 }: ImpactDotsProps) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 w-2 rounded-full transition-colors",
            i < value
              ? variant === "opportunity"
                ? "bg-red-500"
                : "bg-emerald-500"
              : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}
