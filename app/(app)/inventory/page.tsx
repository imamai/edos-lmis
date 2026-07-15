import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { deleteInventoryItem } from "@/lib/actions/inventory";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";

export default async function InventoryPage() {
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from("edoslmis_inventory_items")
    .select(
      "id, code, name, category, unit_of_measure, reorder_level, edoslmis_departments(name), edoslmis_inventory_balances(current_balance)"
    )
    .eq("is_active", true)
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground">Reagents, consumables, and commodity stock levels</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory/daily-check">
            <Button variant="secondary">Daily Stock Check</Button>
          </Link>
          <Link href="/inventory/new">
            <Button>
              <Plus size={16} /> New Commodity
            </Button>
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Balance</th>
              <th className="px-4 py-3 font-medium">Reorder Level</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-critical">{error.message}</td>
              </tr>
            )}
            {!error && (items?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No commodities yet.</td>
              </tr>
            )}
            {items?.map((item) => {
              const dept = item.edoslmis_departments as unknown as { name: string } | null;
              const balanceRow = item.edoslmis_inventory_balances as unknown as
                | { current_balance: number }
                | { current_balance: number }[]
                | null;
              const balance = Array.isArray(balanceRow) ? balanceRow[0]?.current_balance : balanceRow?.current_balance;
              const isLow = (balance ?? 0) <= item.reorder_level;
              return (
                <tr key={item.id} className="border-t border-border hover:bg-surface-muted">
                  <td className="px-4 py-3">
                    <Link href={`/inventory/${item.id}`} className="font-medium text-primary hover:underline">
                      {item.name}
                    </Link>
                    <span className="ml-1 text-muted-foreground">({item.code})</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{dept?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">{item.category}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className={isLow ? "font-semibold text-critical" : "font-medium text-foreground"}>
                      {balance ?? 0} {item.unit_of_measure}
                    </span>
                    {isLow && <Badge tone="critical" className="ml-2">Low</Badge>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.reorder_level} {item.unit_of_measure}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/inventory/${item.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Pencil size={14} /> Edit
                        </Button>
                      </Link>
                      <DeleteEntityButton id={item.id} action={deleteInventoryItem} canDelete entityLabel="commodity" />
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
