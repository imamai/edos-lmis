"use client";

import {
  addQueuedAction,
  getQueuedActions,
  removeQueuedAction,
  payloadToFormData,
  formDataToPayload,
  type QueuedAction,
  type QueuedActionType,
} from "./db";
import { collectSpecimens } from "@/lib/actions/specimens";
import { enterResults } from "@/lib/actions/results";

export const QUEUE_CHANGED_EVENT = "edoslmis-offline-queue-changed";

function notifyChanged() {
  window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
}

export async function queueOfflineAction(
  type: QueuedActionType,
  label: string,
  formData: FormData
): Promise<QueuedAction> {
  const action = await addQueuedAction({ type, label, payload: formDataToPayload(formData) });
  notifyChanged();
  return action;
}

export async function getQueueCount(): Promise<number> {
  return (await getQueuedActions()).length;
}

async function runAction(action: QueuedAction): Promise<boolean> {
  const formData = payloadToFormData(action.payload);
  try {
    if (action.type === "collectSpecimens") {
      const orderId = String(formData.get("order_id") ?? "");
      const result = await collectSpecimens(orderId);
      return !result.error;
    }
    if (action.type === "enterResults") {
      const orderTestId = String(formData.get("order_test_id") ?? "");
      const result = await enterResults(orderTestId, formData);
      return !result.error;
    }
  } catch {
    return false;
  }
  return false;
}

export async function flushOfflineQueue(): Promise<{ flushed: number; failed: number }> {
  const actions = await getQueuedActions();
  let flushed = 0;
  let failed = 0;
  for (const action of actions) {
    const ok = await runAction(action);
    if (ok) {
      await removeQueuedAction(action.id);
      flushed++;
    } else {
      failed++;
    }
  }
  if (flushed > 0 || failed > 0) notifyChanged();
  return { flushed, failed };
}
