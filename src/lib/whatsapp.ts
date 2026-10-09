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
