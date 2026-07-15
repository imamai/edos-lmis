import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type Tone = "neutral" | "primary" | "critical" | "warning" | "success" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-muted text-muted-foreground",
  primary: "bg-primary/15 text-primary",
  critical: "bg-critical/15 text-critical",
  warning: "bg-warning/15 text-warning",
  success: "bg-success/15 text-success",
  info: "bg-info/15 text-info",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
