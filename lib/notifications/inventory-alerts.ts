import { createClient } from "@/lib/supabase/server";
import { sendNotification } from "@/lib/notifications";

export async function checkLowStockAndNotify(itemId: string, tenantId: string) {
  const supabase = await createClient();

  const [{ data: item }, { data: balanceRow }] = await Promise.all([
    supabase.from("edoslmis_inventory_items").select("name, reorder_level, unit_of_measure").eq("id", itemId).single(),
    supabase.from("edoslmis_inventory_balances").select("current_balance").eq("item_id", itemId).maybeSingle(),
  ]);

  if (!item) return;
  const balance = balanceRow?.current_balance ?? 0;
  if (balance > item.reorder_level) return;

  await sendNotification(
    tenantId,
    {
      channel: "sms",
      recipient: "Lab Manager",
      message: `Low stock: ${item.name} is at ${balance} ${item.unit_of_measure} (reorder level ${item.reorder_level}). Please reorder.`,
    },
    { table: "edoslmis_inventory_items", id: itemId }
  );
}
