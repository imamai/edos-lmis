"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { ageInDays } from "@/lib/utils";
import { sendNotification } from "@/lib/notifications";
import { checkLowStockAndNotify } from "@/lib/notifications/inventory-alerts";
import { recomputeOrderStatus } from "./order-status";
import { requestRecollection } from "./specimens";
import { revalidatePath } from "next/cache";

type RangeRow = {
  component_id: string | null;
  gender: string;
  age_min_days: number;
  age_max_days: number | null;
  low: number | null;
  high: number | null;
  critical_low: number | null;
  critical_high: number | null;
};

function pickRange(ranges: RangeRow[], componentId: string | null, gender: string | null, ageDays: number) {
  const candidates = ranges.filter(
    (r) =>
      r.component_id === componentId &&
      ageDays >= r.age_min_days &&
      (r.age_max_days === null || ageDays <= r.age_max_days)
  );
  return (
    candidates.find((r) => r.gender === (gender ?? "all")) ??
    candidates.find((r) => r.gender === "all") ??
    candidates[0] ??
    null
  );
}

function flagFor(value: number, range: RangeRow | null): { flag: string; critical: boolean } {
  if (!range) return { flag: "normal", critical: false };
  if (range.critical_low !== null && value <= range.critical_low) return { flag: "critical_low", critical: true };
  if (range.critical_high !== null && value >= range.critical_high) return { flag: "critical_high", critical: true };
  if (range.low !== null && value < range.low) return { flag: "low", critical: false };
  if (range.high !== null && value > range.high) return { flag: "high", critical: false };
  return { flag: "normal", critical: false };
}

export async function enterResults(orderTestId: string, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: orderTest, error: otError } = await supabase
    .from("edoslmis_order_tests")
    .select("id, test_id, order_id, edoslmis_orders(order_number, ordering_clinician, patient_id)")
    .eq("id", orderTestId)
    .single();
  if (otError || !orderTest) return { error: otError?.message ?? "Order test not found" };

  const order = orderTest.edoslmis_orders as unknown as {
    order_number: string; ordering_clinician: string | null; patient_id: string;
  } | null;
  const { data: patient } = await supabase
    .from("edoslmis_patients")
    .select("gender, date_of_birth, first_name, last_name, phone_primary")
    .eq("id", order?.patient_id)
    .single();

  const { data: components } = await supabase
    .from("edoslmis_test_components")
    .select("id, name, unit, data_type, select_options")
    .eq("test_id", orderTest.test_id)
    .order("sequence");

  const { data: ranges } = await supabase
    .from("edoslmis_reference_ranges")
    .select("component_id, gender, age_min_days, age_max_days, low, high, critical_low, critical_high")
    .eq("test_id", orderTest.test_id);

  const ageDays = ageInDays(patient?.date_of_birth ?? null);
  const entries: {
    tenant_id: string;
    order_test_id: string;
    component_id: string | null;
    result_value_numeric: number | null;
    result_value_text: string | null;
    unit: string | null;
    flag: string;
    is_critical: boolean;
    entered_by: string;
  }[] = [];

  const targets =
    components && components.length > 0
      ? components
      : [{ id: null, name: "value", unit: null, data_type: "text", select_options: null }];

  for (const comp of targets) {
    const raw = formData.get(`value_${comp.id ?? "main"}`);
    if (raw === null || String(raw).trim() === "") continue;
    const numeric = Number(raw);
    const range = pickRange((ranges ?? []) as RangeRow[], comp.id, patient?.gender ?? null, ageDays);
    const isNumeric = !Number.isNaN(numeric);
    let { flag, critical } = isNumeric ? flagFor(numeric, range) : { flag: "normal", critical: false };

    if (!isNumeric && comp.data_type === "select" && Array.isArray(comp.select_options)) {
      const options = comp.select_options as { value: string; critical: boolean }[];
      const matched = options.find((o) => o.value === String(raw));
      if (matched?.critical) {
        flag = "abnormal";
        critical = true;
      }
    }

    entries.push({
      tenant_id: staff.tenantId,
      order_test_id: orderTestId,
      component_id: comp.id,
      result_value_numeric: isNumeric ? numeric : null,
      result_value_text: isNumeric ? null : String(raw),
      unit: comp.unit,
      flag,
      is_critical: critical,
      entered_by: staff.userId,
    });
  }

  if (entries.length === 0) return { error: "Enter at least one result value." };

  const { data: inserted, error: insertError } = await supabase
    .from("edoslmis_result_entries")
    .insert(entries)
    .select("id, is_critical");
  if (insertError) return { error: insertError.message };

  const criticalEntries = inserted?.filter((e) => e.is_critical) ?? [];
  if (criticalEntries.length > 0) {
    await supabase.from("edoslmis_critical_alerts").insert(
      criticalEntries.map((e) => ({
        tenant_id: staff.tenantId,
        result_entry_id: e.id,
      }))
    );

    if (patient?.phone_primary) {
      await sendNotification(
        staff.tenantId,
        {
          channel: "sms",
          recipient: patient.phone_primary,
          message: `Critical result flagged for ${patient.first_name} ${patient.last_name}, order ${order?.order_number}. Attn: ${order?.ordering_clinician ?? "duty clinician"} — please review and acknowledge in EDOS LMIS.`,
        },
        { table: "edoslmis_critical_alerts", id: orderTestId }
      );
    }
  }

  await supabase.from("edoslmis_order_tests").update({ status: "resulted" }).eq("id", orderTestId);

  const { data: reagentUsage } = await supabase
    .from("edoslmis_test_reagent_usage")
    .select("item_id, quantity_per_test")
    .eq("test_id", orderTest.test_id);

  for (const usage of reagentUsage ?? []) {
    await supabase.rpc("edoslmis_record_stock_transaction", {
      p_item_id: usage.item_id,
      p_transaction_type: "test_usage",
      p_quantity_change: -Math.abs(usage.quantity_per_test),
      p_batch_id: null,
      p_reference_order_test_id: orderTestId,
      p_notes: "Auto-deducted on result entry",
    });
    await checkLowStockAndNotify(usage.item_id, staff.tenantId);
  }

  revalidatePath(`/results/${orderTestId}`);
  revalidatePath("/inventory");
  return { error: null };
}

export async function verifyResult(orderTestId: string, comments: string) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_result_verification").insert({
    tenant_id: staff.tenantId,
    order_test_id: orderTestId,
    level: "scientist",
    status: "verified",
    verified_by: staff.userId,
    verified_at: new Date().toISOString(),
    comments: comments || null,
  });
  if (error) return { error: error.message };

  await supabase.from("edoslmis_order_tests").update({ status: "verified" }).eq("id", orderTestId);
  revalidatePath(`/results/${orderTestId}`);
  return { error: null };
}

/**
 * The verifier's only option used to be "Verify" — there was no way to flag a
 * suspicious result and send it back for a fresh specimen. This records the
 * rejection (using the verification_status value that already existed for
 * exactly this case but was never written) and reuses the same recollection
 * path specimen rejection now has.
 */
export async function rejectResultForRecollection(orderTestId: string, comments: string) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  if (!comments.trim()) return { error: "Enter a reason for rejecting this result." };

  const { error } = await supabase.from("edoslmis_result_verification").insert({
    tenant_id: staff.tenantId,
    order_test_id: orderTestId,
    level: "scientist",
    status: "rejected_back_for_recollection",
    verified_by: staff.userId,
    verified_at: new Date().toISOString(),
    comments,
  });
  if (error) return { error: error.message };

  return requestRecollection(orderTestId, comments);
}

export async function acknowledgeCriticalAlert(alertId: string, orderTestId: string, notes: string) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("edoslmis_critical_alerts")
    .update({
      acknowledged_by: staff.userId,
      acknowledged_at: new Date().toISOString(),
      notes: notes || null,
    })
    .eq("id", alertId)
    .is("acknowledged_at", null);
  if (error) return { error: error.message };

  revalidatePath(`/results/${orderTestId}`);
  revalidatePath("/dashboard");
  return { error: null };
}

export async function releaseResult(orderTestId: string) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { error: verifyError } = await supabase.from("edoslmis_result_verification").insert({
    tenant_id: staff.tenantId,
    order_test_id: orderTestId,
    level: "pathologist",
    status: "verified",
    verified_by: staff.userId,
    verified_at: new Date().toISOString(),
  });
  if (verifyError) return { error: verifyError.message };

  const { error: releaseError } = await supabase.from("edoslmis_result_release").insert({
    tenant_id: staff.tenantId,
    order_test_id: orderTestId,
    released_by: staff.userId,
    release_channels: { printed: true, sms: true },
  });
  if (releaseError) return { error: releaseError.message };

  await supabase.from("edoslmis_order_tests").update({ status: "released" }).eq("id", orderTestId);

  const { data: orderTest } = await supabase
    .from("edoslmis_order_tests")
    .select("order_id, edoslmis_orders(order_number, edoslmis_patients(first_name, last_name, phone_primary, email))")
    .eq("id", orderTestId)
    .single();
  const order = orderTest?.edoslmis_orders as unknown as {
    order_number: string;
    edoslmis_patients: { first_name: string; last_name: string; phone_primary: string | null; email: string | null } | null;
  } | null;
  const patient = order?.edoslmis_patients;

  if (patient?.phone_primary) {
    await sendNotification(
      staff.tenantId,
      {
        channel: "sms",
        recipient: patient.phone_primary,
        message: `Dear ${patient.first_name}, your lab report for order ${order?.order_number} is ready. Please collect it or check the patient portal.`,
      },
      { table: "edoslmis_result_release", id: orderTestId }
    );
  }
  if (patient?.email) {
    await sendNotification(
      staff.tenantId,
      {
        channel: "email",
        recipient: patient.email,
        subject: `Your lab report — Order ${order?.order_number}`,
        message: `Dear ${patient.first_name} ${patient.last_name}, your laboratory report for order ${order?.order_number} has been released.`,
      },
      { table: "edoslmis_result_release", id: orderTestId }
    );
  }

  if (orderTest?.order_id) {
    const newStatus = await recomputeOrderStatus(supabase, orderTest.order_id);
    if (newStatus === "completed" && patient?.phone_primary) {
      await sendNotification(
        staff.tenantId,
        {
          channel: "sms",
          recipient: patient.phone_primary,
          message: `Dear ${patient.first_name}, all results for order ${order?.order_number} are now complete and ready for collection.`,
        },
        { table: "edoslmis_orders", id: orderTest.order_id }
      );
    }
    revalidatePath(`/orders/${orderTest.order_id}`);
  }

  revalidatePath(`/results/${orderTestId}`);
  return { error: null };
}
