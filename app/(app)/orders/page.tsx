import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CancelOrderButton } from "@/components/cancel-order-button";
import { getDictionary } from "@/lib/i18n/get-locale";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";

const statusTone: Record<string, "neutral" | "warning" | "info" | "success" | "critical"> = {
  pending: "warning",
  accessioned: "info",
  in_progress: "info",
  partially_completed: "info",
  completed: "success",
  cancelled: "critical",
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const dict = await getDictionary();
  const t = dict.orders;

  const { data: orders, error } = await supabase
    .from("edoslmis_orders")
    .select(
      "id, order_number, status, priority, ordered_at, edoslmis_patients(first_name, last_name, patient_number)"
    )
    .order("ordered_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <Link href="/orders/new">
          <Button>
            <Plus size={16} /> {t.newOrderButton}
          </Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t.colOrderNo}</th>
              <th className="px-4 py-3 font-medium">{t.colPatient}</th>
              <th className="px-4 py-3 font-medium">{t.colPriority}</th>
              <th className="px-4 py-3 font-medium">{t.colStatus}</th>
              <th className="px-4 py-3 font-medium">{t.colDate}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-critical">{error.message}</td>
              </tr>
            )}
            {!error && (orders?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">{t.noOrders}</td>
              </tr>
            )}
            {orders?.map((o) => {
              const patient = o.edoslmis_patients as unknown as {
                first_name: string;
                last_name: string;
                patient_number: string;
              } | null;
              return (
                <tr key={o.id} className="border-t border-border hover:bg-surface-muted">
                  <td className="px-4 py-3">
                    <Link href={`/orders/${o.id}`} className="font-medium text-primary hover:underline">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {patient ? `${patient.first_name} ${patient.last_name}` : "-"}
                    <span className="ml-1 text-muted-foreground">({patient?.patient_number})</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={o.priority === "stat" ? "critical" : o.priority === "urgent" ? "warning" : "neutral"}>
                      {o.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[o.status] ?? "neutral"}>{o.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(o.ordered_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {o.status === "pending" && (
                        <Link href={`/orders/${o.id}`}>
                          <Button variant="outline" size="sm">
                            <Pencil size={14} /> Edit
                          </Button>
                        </Link>
                      )}
                      {!["cancelled", "completed"].includes(o.status) && <CancelOrderButton orderId={o.id} />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
