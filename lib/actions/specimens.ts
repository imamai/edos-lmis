"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";
import { recomputeOrderStatus } from "./order-status";
import { revalidatePath } from "next/cache";

export async function collectSpecimens(orderId: string) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: orderTests, error: fetchError } = await supabase
    .from("edoslmis_order_tests")
    .select("id, edoslmis_tests(specimen_type_id)")
    .eq("order_id", orderId)
    .eq("status", "pending");

  if (fetchError) return { error: fetchError.message };
  if (!orderTests || orderTests.length === 0) {
    return { error: "No pending tests to collect specimens for." };
  }

  const groups = new Map<string, string[]>();
  for (const ot of orderTests) {
    const test = ot.edoslmis_tests as unknown as { specimen_type_id: string | null } | null;
    const key = test?.specimen_type_id ?? "unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ot.id);
  }

  const createdSpecimenIds: string[] = [];

  for (const [specimenTypeId, orderTestIds] of groups) {
    const { data: specimenNumber, error: numberError } = await supabase.rpc(
      "edoslmis_generate_specimen_number"
    );
    if (numberError) return { error: numberError.message };

    const { data: specimen, error: specimenError } = await supabase
      .from("edoslmis_specimens")
      .insert({
        tenant_id: staff.tenantId,
        branch_id: staff.branchId,
        order_id: orderId,
        specimen_number: specimenNumber as string,
        specimen_type_id: specimenTypeId === "unknown" ? null : specimenTypeId,
        status: "collected",
        collected_at: new Date().toISOString(),
        collected_by: staff.userId,
        created_by: staff.userId,
      })
      .select("id")
      .single();

    if (specimenError) return { error: specimenError.message };
    createdSpecimenIds.push(specimen.id);

    const { error: updateError } = await supabase
      .from("edoslmis_order_tests")
      .update({ specimen_id: specimen.id, status: "specimen_collected" })
      .in("id", orderTestIds);
    if (updateError) return { error: updateError.message };

    await supabase.from("edoslmis_specimen_tracking").insert([
      { tenant_id: staff.tenantId, specimen_id: specimen.id, event_type: "ordered", actor_user_id: staff.userId },
      { tenant_id: staff.tenantId, specimen_id: specimen.id, event_type: "collected", actor_user_id: staff.userId },
    ]);
  }

  await supabase.from("edoslmis_orders").update({ status: "in_progress" }).eq("id", orderId);

  revalidatePath(`/orders/${orderId}`);
  return { error: null, specimenIds: createdSpecimenIds };
}

export async function receiveSpecimen(specimenId: string) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("edoslmis_specimens")
    .update({
      status: "received",
      received_at: new Date().toISOString(),
      received_by: staff.userId,
    })
    .eq("id", specimenId);
  if (error) return { error: error.message };

  await supabase
    .from("edoslmis_order_tests")
    .update({ status: "received" })
    .eq("specimen_id", specimenId)
    .eq("status", "specimen_collected");

  await supabase.from("edoslmis_specimen_tracking").insert({
    tenant_id: staff.tenantId,
    specimen_id: specimenId,
    event_type: "received",
    actor_user_id: staff.userId,
  });

  revalidatePath("/specimens");
  return { error: null };
}

export async function rejectSpecimen(specimenId: string, reason: string) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: specimen } = await supabase
    .from("edoslmis_specimens")
    .select("order_id")
    .eq("id", specimenId)
    .single();

  const { error } = await supabase
    .from("edoslmis_specimens")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      rejected_by: staff.userId,
      rejection_reason: reason,
    })
    .eq("id", specimenId);
  if (error) return { error: error.message };

  await supabase
    .from("edoslmis_order_tests")
    .update({ status: "rejected" })
    .eq("specimen_id", specimenId);

  await supabase.from("edoslmis_specimen_tracking").insert({
    tenant_id: staff.tenantId,
    specimen_id: specimenId,
    event_type: "rejected",
    actor_user_id: staff.userId,
    notes: reason,
  });

  if (specimen?.order_id) {
    await recomputeOrderStatus(supabase, specimen.order_id);
    revalidatePath(`/orders/${specimen.order_id}`);
  }

  revalidatePath("/specimens");
  return { error: null };
}

const NON_RECOLLECTABLE_STATUSES = new Set(["released", "cancelled"]);

/**
 * The only way forward from a rejected specimen used to be nothing — the
 * order test stayed "rejected" permanently, with no path back to
 * "Collect Specimens". This resets it to pending (clearing the old specimen
 * link) so a fresh specimen can be collected, and logs/notifies accordingly.
 * Shared by the specimen-accessioning reject flow and result verification's
 * "reject back for recollection" path.
 */
export async function requestRecollection(orderTestId: string, reason: string) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: orderTest } = await supabase
    .from("edoslmis_order_tests")
    .select("id, order_id, specimen_id, status")
    .eq("id", orderTestId)
    .single();
  if (!orderTest) return { error: "Order test not found." };
  if (NON_RECOLLECTABLE_STATUSES.has(orderTest.status)) {
    return { error: "This test has already been released or cancelled and can no longer be recollected." };
  }

  if (orderTest.specimen_id) {
    await supabase
      .from("edoslmis_specimens")
      .update({
        status: "rejected",
        rejected_at: new Date().toISOString(),
        rejected_by: staff.userId,
        rejection_reason: reason,
      })
      .eq("id", orderTest.specimen_id)
      .neq("status", "rejected");

    await supabase.from("edoslmis_specimen_tracking").insert({
      tenant_id: staff.tenantId,
      specimen_id: orderTest.specimen_id,
      event_type: "rejected",
      actor_user_id: staff.userId,
      notes: `Recollection requested: ${reason}`,
    });
  }

  const { error } = await supabase
    .from("edoslmis_order_tests")
    .update({ status: "pending", specimen_id: null })
    .eq("id", orderTestId);
  if (error) return { error: error.message };

  const { data: fullOrderTest } = await supabase
    .from("edoslmis_order_tests")
    .select("order_id, edoslmis_orders(order_number, edoslmis_patients(first_name, last_name, phone_primary))")
    .eq("id", orderTestId)
    .single();
  const order = fullOrderTest?.edoslmis_orders as unknown as {
    order_number: string;
    edoslmis_patients: { first_name: string; last_name: string; phone_primary: string | null } | null;
  } | null;
  const patient = order?.edoslmis_patients;

  if (patient?.phone_primary) {
    await sendNotification(
      staff.tenantId,
      {
        channel: "sms",
        recipient: patient.phone_primary,
        message: `Dear ${patient.first_name}, a new specimen is needed for order ${order?.order_number} (${reason}). Please visit the lab for recollection.`,
      },
      { table: "edoslmis_order_tests", id: orderTestId }
    );
  }

  await recomputeOrderStatus(supabase, orderTest.order_id);

  revalidatePath(`/orders/${orderTest.order_id}`);
  revalidatePath("/specimens");
  revalidatePath(`/results/${orderTestId}`);
  return { error: null };
}
