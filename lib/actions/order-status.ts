import { createClient } from "@/lib/supabase/server";

const TERMINAL_ORDER_TEST_STATUSES = new Set(["released", "cancelled", "rejected"]);

/**
 * Order status never had a writer for accessioned/partially_completed/completed —
 * orders sat at pending/in_progress forever. Called after any order_test status
 * change that could close out (or reopen) an order.
 * Returns the new status if it changed, otherwise null.
 *
 * Not a standalone server action (no "use server", no auth check of its own)
 * by design — it's only ever called from within an already-authenticated
 * action (results.ts, specimens.ts) and reuses that caller's session-scoped
 * Supabase client, so RLS still applies. Do not export this as a directly
 * callable action without adding its own auth check first.
 */
export async function recomputeOrderStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string
): Promise<string | null> {
  const { data: order } = await supabase.from("edoslmis_orders").select("status").eq("id", orderId).single();
  if (!order || order.status === "cancelled") return null;

  const { data: orderTests } = await supabase.from("edoslmis_order_tests").select("status").eq("order_id", orderId);
  if (!orderTests || orderTests.length === 0) return null;

  const allTerminal = orderTests.every((ot) => TERMINAL_ORDER_TEST_STATUSES.has(ot.status));
  const anyTerminal = orderTests.some((ot) => TERMINAL_ORDER_TEST_STATUSES.has(ot.status));
  const nextStatus = allTerminal ? "completed" : anyTerminal ? "partially_completed" : null;

  if (nextStatus && nextStatus !== order.status) {
    await supabase.from("edoslmis_orders").update({ status: nextStatus }).eq("id", orderId);
    return nextStatus;
  }
  return null;
}
