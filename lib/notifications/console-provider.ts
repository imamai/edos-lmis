import type { NotificationProvider } from "./types";

// Default provider: logs to the server console instead of calling a real
// SMS/WhatsApp/email API. Swap the export in lib/notifications/index.ts for
// a real provider (Africa's Talking, Twilio, Resend, etc.) once API keys are
// available — the NotificationProvider interface is what it needs to satisfy.
export const consoleProvider: NotificationProvider = {
  name: "console",
  async send(msg) {
    const attachmentNote = msg.attachment
      ? ` attachment="${msg.attachment.filename}" (${msg.attachment.content.length} bytes, ${msg.attachment.contentType})`
      : "";
    console.log(
      `[notify:${msg.channel}] to=${msg.recipient}${msg.subject ? ` subject="${msg.subject}"` : ""} message="${msg.message}"${attachmentNote}`
    );
    return { ok: true };
  },
};
