import { env } from '../config/env.js';

export interface SendResult {
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
  to: string | null;
  delivered: boolean;
  /** Why a send was skipped or failed (for logs/diagnostics). */
  detail?: string;
}

/**
 * Send an email via the Resend HTTP API. Never throws — returns a structured
 * result so the automation engine can record outcomes without breaking.
 */
export async function sendEmail(to: string | null, subject: string, body: string): Promise<SendResult> {
  if (!to) return { channel: 'EMAIL', to, delivered: false, detail: 'no email address' };
  if (!env.email.configured) return { channel: 'EMAIL', to, delivered: false, detail: 'email not configured' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.email.resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.email.from, to, subject, text: body }),
    });
    if (!res.ok) return { channel: 'EMAIL', to, delivered: false, detail: `resend ${res.status}` };
    return { channel: 'EMAIL', to, delivered: true };
  } catch (err) {
    return { channel: 'EMAIL', to, delivered: false, detail: (err as Error).message };
  }
}

/** Twilio Messages API — used for both SMS and (with a whatsapp: prefix) WhatsApp. */
async function twilioSend(channel: 'SMS' | 'WHATSAPP', to: string | null, body: string): Promise<SendResult> {
  if (!to) return { channel, to, delivered: false, detail: 'no phone number' };
  const configured = channel === 'SMS' ? env.twilio.smsConfigured : env.twilio.whatsappConfigured;
  if (!configured) return { channel, to, delivered: false, detail: `${channel.toLowerCase()} not configured` };

  const from = channel === 'SMS' ? env.twilio.smsFrom! : `whatsapp:${env.twilio.whatsappFrom}`;
  const toAddr = channel === 'SMS' ? to : `whatsapp:${to}`;

  try {
    const auth = Buffer.from(`${env.twilio.accountSid}:${env.twilio.authToken}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.twilio.accountSid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: toAddr, From: from, Body: body }).toString(),
    });
    if (!res.ok) return { channel, to, delivered: false, detail: `twilio ${res.status}` };
    return { channel, to, delivered: true };
  } catch (err) {
    return { channel, to, delivered: false, detail: (err as Error).message };
  }
}

export const sendSms = (to: string | null, body: string) => twilioSend('SMS', to, body);
export const sendWhatsApp = (to: string | null, body: string) => twilioSend('WHATSAPP', to, body);
