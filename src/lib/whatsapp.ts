/**
 * Sends the sign-in code on WhatsApp through Meta's WhatsApp Cloud API.
 *
 * Needs an approved "Authentication" message template with one code parameter
 * and a copy-code button (Meta's standard authentication template).
 *
 * Until WhatsApp is set up, set OTP_TEST_MODE=true: the code is then shown on
 * screen instead of being sent. Turn it off before real parents use the app.
 */
export type SendResult = { sent: true } | { sent: false; testCode: string };

export const whatsappConfigured = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
export const otpTestMode = () => process.env.OTP_TEST_MODE === 'true';

/**
 * Bus alerts on WhatsApp. Needs two approved "Utility" templates in Arabic:
 *  - WHATSAPP_TEMPLATE_NEXT   (default darb_bus_next):   body with {{1}} = bus number
 *  - WHATSAPP_TEMPLATE_10MIN  (default darb_bus_10min):  body with {{1}} = bus number, {{2}} = minutes
 * Without WhatsApp set up, alerts are still shown in the parent's app.
 */
export async function sendTemplate(
  kind: 'next' | 'ten_min',
  phones: (string | null | undefined)[],
  params: Record<string, unknown>,
): Promise<'sent' | 'failed' | 'skipped'> {
  if (!whatsappConfigured()) return 'skipped';
  const name = kind === 'next' ? process.env.WHATSAPP_TEMPLATE_NEXT || 'darb_bus_next' : process.env.WHATSAPP_TEMPLATE_10MIN || 'darb_bus_10min';
  const values = kind === 'next' ? [String(params.bus ?? '')] : [String(params.bus ?? ''), String(params.minutes ?? 10)];
  let ok = false;
  for (const phone of phones.filter((p): p is string => !!p)) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone.replace('+', ''),
        type: 'template',
        template: {
          name,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'ar' },
          components: [{ type: 'body', parameters: values.map((text) => ({ type: 'text', text })) }],
        },
      }),
    }).catch(() => null);
    if (res?.ok) ok = true;
    else console.error('WhatsApp alert failed', res?.status, await res?.text().catch(() => ''));
  }
  return ok ? 'sent' : 'failed';
}

export async function sendLoginCode(phoneE164: string, code: string, locale: 'ar' | 'en'): Promise<SendResult> {
  if (!whatsappConfigured()) {
    if (otpTestMode()) return { sent: false, testCode: code };
    throw new Error('WHATSAPP_NOT_CONFIGURED');
  }
  const template = process.env.WHATSAPP_OTP_TEMPLATE || 'darb_login_code';
  const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phoneE164.replace('+', ''),
      type: 'template',
      template: {
        name: template,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || (locale === 'ar' ? 'ar' : 'en') },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: code }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
        ],
      },
    }),
  });
  if (!res.ok) {
    console.error('WhatsApp send failed', res.status, await res.text().catch(() => ''));
    if (otpTestMode()) return { sent: false, testCode: code };
    throw new Error('WHATSAPP_SEND_FAILED');
  }
  return { sent: true };
}
