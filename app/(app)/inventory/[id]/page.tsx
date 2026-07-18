import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StockMovementForm } from "@/components/stock-movement-form";
import { InventoryItemActiveToggle } from "@/components/inventory-item-active-toggle";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { EditableStockRow } from "@/components/editable-stock-row";
import { EditableBatchRow } from "@/components/editable-batch-row";
import { deleteInventoryItem } from "@/lib/actions/inventory";
import { EDITABLE_STOCK_TRANSACTION_TYPES } from "@/lib/inventory-constants";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

const typeTone: Record<string, "neutral" | "success" | "critical" | "warning" | "info"> = {
  opening_balance: "neutral",
  receipt: "success",
  test_usage: "info",
  manual_usage: "warning",
  positive_adjustment: "success",
  negative_adjustment: "warning",
  wastage: "critical",
  expiry: "critical",
  transfer_in: "success",
  transfer_out: "warning",
  stock_count_correction: "neutral",
};

export default async function InventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: item, error: itemError } = await supabase
    .from("edoslmis_inventory_items")
    .select("id, code, name, category, unit_of_measure, reorder_level, is_active, tracking_mode, edoslmis_departments(name)")
    .eq("id", id)
    .single();

  if (itemError) {
    return (
      <div className="space-y-6">
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{itemError.message}</p>
      </div>
    );
  }
  if (!item) notFound();

  const [{ data: transactions }, { count: poLineCount }, { data: batches }] = await Promise.all([
    supabase
      .from("edoslmis_stock_transactions")
      .select("id, transaction_type, quantity_change, balance_after, notes, performed_at")
      .eq("item_id", id)
      .order("performed_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("edoslmis_purchase_order_lines")
      .select("id", { count: "exact", head: true })
      .eq("item_id", id),
    supabase
      .from("edoslmis_stock_batches")
      .select("id, batch_number, supplier_name, expiry_date, quantity_received, quantity_remaining, unit_cost, is_active, received_at")
      .eq("item_id", id)
      .order("expiry_date", { ascending: true, nullsFirst: false })
      .order("received_at", { ascending: false }),
  ]);

  const usageCount = (transactions?.length ?? 0) + (poLineCount ?? 0);
  const dept = item.edoslmis_departments as unknown as { name: string } | null;
  const currentBalance = transactions?.[0]?.balance_after ?? 0;
  const openingBalance = transactions?.length ? transactions[transactions.length - 1].balance_after - transactions[transactions.length - 1].quantity_change : 0;
  const isLow = currentBalance <= item.reorder_level;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{item.name}</h1>
          <p className="text-sm text-muted-foreground">
            {item.code} &middot; {dept?.name ?? "Unassigned"} &middot; <Badge tone="neutral">{item.category}</Badge>{" "}
            {item.tracking_mode === "manual_entry" ? (
              <Badge tone="info">Manual entry</Badge>
            ) : (
              <Badge tone="neutral">Order-driven</Badge>
            )}
            {!item.is_active && <Badge tone="neutral" className="ml-1">Inactive</Badge>}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-semibold ${isLow ? "text-critical" : "text-foreground"}`}>
            {currentBalance} {item.unit_of_measure}
          </p>
          <p className="text-sm text-muted-foreground">Current balance</p>
          {isLow && <Badge tone="critical">Below reorder level ({item.reorder_level})</Badge>}
          <div className="mt-2 flex justify-end gap-2">
            <Link href={`/inventory/${id}/edit`}>
              <Button variant="outline">
                <Pencil size={16} /> Edit
              </Button>
            </Link>
            <InventoryItemActiveToggle itemId={item.id} isActive={item.is_active} />
            <DeleteEntityButton
              id={item.id}
              action={deleteInventoryItem}
              canDelete={usageCount < 2}
              blockedMessage={usageCount >= 2 ? "Has stock/purchase history — deactivate instead." : undefined}
              entityLabel="commodity"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record Stock Movement</CardTitle>
        </CardHeader>
        <CardContent>
          <StockMovementForm itemId={id} trackingMode={item.tracking_mode} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock Card</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Change</th>
                <th className="px-4 py-2 font-medium">Balance</th>
                <th className="px-4 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {(transactions?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No stock movements recorded yet.
                  </td>
                </tr>
              )}
              {transactions?.map((t) => {
                const isEditable = (EDITABLE_STOCK_TRANSACTION_TYPES as readonly string[]).includes(
                  t.transaction_type
                );
                if (isEditable) {
                  return (
                    <EditableStockRow
                      key={t.id}
                      id={t.id}
                      itemId={id}
                      transactionType={t.transaction_type}
                      quantityChange={t.quantity_change}
                      balanceAfter={t.balance_after}
                      notes={t.notes}
                      performedAt={t.performed_at}
                    />
                  );
                }
                return (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(t.performed_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={typeTone[t.transaction_type] ?? "neutral"}>
                        {t.transaction_type.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className={`px-4 py-2 font-medium ${t.quantity_change < 0 ? "text-critical" : "text-success"}`}>
                      {t.quantity_change > 0 ? "+" : ""}
                      {t.quantity_change}
                    </td>
                    <td className="px-4 py-2 font-medium text-foreground">{t.balance_after}</td>
                    <td className="px-4 py-2 text-muted-foreground">{t.notes ?? "-"}</td>
                  </tr>
                );
              })}
              {(transactions?.length ?? 0) > 0 && (
                <tr className="border-t border-border bg-surface-muted">
                  <td colSpan={3} className="px-4 py-2 font-medium text-foreground">Opening balance (oldest shown)</td>
                  <td className="px-4 py-2 font-medium text-foreground">{openingBalance}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Batches</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Batch No.</th>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 font-medium">Expiry Date</th>
                <th className="px-4 py-2 font-medium">Qty Remaining / Received</th>
                <th className="px-4 py-2 font-medium">Unit Cost</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {(batches?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    No batches recorded yet — batches are created when receiving a purchase order line with a
                    batch number or expiry date.
                  </td>
                </tr>
              )}
              {batches?.map((batch) => (
                <EditableBatchRow
                  key={batch.id}
                  itemId={id}
                  unitOfMeasure={item.unit_of_measure}
                  batch={{
                    id: batch.id,
                    batchNumber: batch.batch_number,
                    supplierName: batch.supplier_name,
                    expiryDate: batch.expiry_date,
                    quantityReceived: Number(batch.quantity_received),
                    quantityRemaining: Number(batch.quantity_remaining),
                    unitCost: batch.unit_cost === null ? null : Number(batch.unit_cost),
                    isActive: batch.is_active,
                    receivedAt: batch.received_at,
                  }}
                />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
