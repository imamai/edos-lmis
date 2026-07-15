import { createClient } from "@/lib/supabase/server";
import { consoleProvider } from "./console-provider";
import { resendProvider } from "./resend-provider";
import type { NotificationMessage } from "./types";

// Email is delivered for real via Resend; sms/whatsapp have no provider wired
// in yet, so they still fall back to logging.
function providerFor(channel: NotificationMessage["channel"]) {
  if (channel === "email" && process.env.RESEND_API_KEY) return resendProvider;
  return consoleProvider;
}

export async function sendNotification(
  tenantId: string,
  msg: NotificationMessage,
  related?: { table: string; id: string }
) {
  const provider = providerFor(msg.channel);
  const result = await provider.send(msg);

  const supabase = await createClient();
  await supabase.from("edoslmis_notifications_log").insert({
    tenant_id: tenantId,
    channel: msg.channel,
    recipient: msg.recipient,
    subject: msg.subject ?? null,
    message: msg.message,
    status: result.ok ? "sent" : "failed",
    provider: provider.name,
    related_table: related?.table ?? null,
    related_id: related?.id ?? null,
  });

  return result;
}
