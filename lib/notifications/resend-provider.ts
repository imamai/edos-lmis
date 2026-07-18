import { Resend } from "resend";
import type { NotificationProvider } from "./types";

// Real email delivery via Resend. Falls back to a clear error (not a throw)
// if RESEND_API_KEY isn't set, so a misconfigured env doesn't crash whatever
// server action triggered the send — the caller/UI surfaces result.ok=false.
export const resendProvider: NotificationProvider = {
  name: "resend",
  async send(msg) {
    if (msg.channel !== "email") {
      return { ok: false, error: `Resend provider only supports the "email" channel, got "${msg.channel}"` };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "RESEND_API_KEY is not set" };
    }

    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    const { error } = await resend.emails.send({
      from,
      to: msg.recipient,
      subject: msg.subject || "Notification",
      text: msg.message,
      replyTo: msg.replyTo || undefined,
      attachments: msg.attachment
        ? [{ filename: msg.attachment.filename, content: msg.attachment.content }]
        : undefined,
    });

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  },
};
