export type NotificationChannel = "sms" | "whatsapp" | "email";

export interface NotificationAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface NotificationMessage {
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  message: string;
  attachment?: NotificationAttachment;
  // Where a reply should land — e.g. the tenant's own clinic_email — since
  // the "from" address is a shared sending domain the recipient shouldn't
  // reply to directly.
  replyTo?: string;
  // Display name shown alongside the "from" address, e.g. the tenant's
  // clinic name, so recipients see "Acme Diagnostics <orders@...>" rather
  // than the bare sending address.
  fromName?: string;
}

export interface NotificationProvider {
  name: string;
  send(msg: NotificationMessage): Promise<{ ok: boolean; error?: string }>;
}
