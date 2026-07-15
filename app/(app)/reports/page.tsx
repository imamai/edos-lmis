import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Boxes, Activity } from "lucide-react";

const reports = [
  {
    href: "/reports/lab-stock",
    icon: Boxes,
    title: "Lab Stock Report",
    description: "Commodity stock, usage, and reconciliation checks, filterable by day, week, month, or custom range.",
  },
  {
    href: "/reports/quality",
    icon: Activity,
    title: "Quality Report",
    description: "QC performance, equipment reliability, rejection rate, and turnaround time for the selected period.",
  },
];

export default function ReportsIndexPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">Analytics and quality reporting across the lab.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {reports.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="h-full transition-colors hover:bg-surface-muted">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <r.icon size={18} className="text-primary" />
                  {r.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{r.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
