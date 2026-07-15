import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusTone: Record<string, "success" | "critical" | "neutral"> = {
  sent: "success",
  failed: "critical",
  skipped: "neutral",
};

export default async function NotificationsPage() {
  const supabase = await createClient();

  const { data: logs, error } = await supabase
    .from("edoslmis_notifications_log")
    .select("id, channel, recipient, subject, message, status, provider, related_table, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Notifications Log</h1>
        <p className="text-sm text-muted-foreground">
          SMS / WhatsApp / email delivery audit trail (visible to tenant/platform admins).
          Currently wired to a console-logging stub provider — swap in a real
          provider (Africa&apos;s Talking, Twilio, Resend, etc.) in{" "}
          <code>lib/notifications/index.ts</code> once API keys are available.
        </p>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">Recipient</th>
              <th className="px-4 py-3 font-medium">Message</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-critical">{error.message}</td>
              </tr>
            )}
            {!error && (logs?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No notifications yet, or you don&apos;t have admin access to view this log.
                </td>
              </tr>
            )}
            {logs?.map((log) => (
              <tr key={log.id} className="border-t border-border hover:bg-surface-muted">
                <td className="px-4 py-3 text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-4 py-3"><Badge tone="neutral">{log.channel}</Badge></td>
                <td className="px-4 py-3 text-foreground">{log.recipient}</td>
                <td className="px-4 py-3 text-muted-foreground max-w-md truncate" title={log.message}>
                  {log.subject ? `${log.subject}: ` : ""}{log.message}
                </td>
                <td className="px-4 py-3"><Badge tone={statusTone[log.status] ?? "neutral"}>{log.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
