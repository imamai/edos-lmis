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
}

export interface NotificationProvider {
  name: string;
  send(msg: NotificationMessage): Promise<{ ok: boolean; error?: string }>;
}
