// Telegram admin-group notifications (same bot + env convention as the
// wheel-of-fortune widget: prizes are credited MANUALLY by admins from the
// group, never auto-credited).

/**
 * Notify admins that a player earned a prediction-streak voucher.
 * Returns 'sent' | 'stub' (env not configured — dev) | 'failed'.
 */
export async function sendVoucherNotification({ userId, username, phone, voucher, streak }) {
  const message = [
    '🎟️ PREDICTION STREAK VOUCHER',
    `👤 User: ${username || 'unknown'} (id ${userId}${phone ? `, ${phone}` : ''})`,
    `🎁 Voucher: ${voucher}`,
    `🔥 Earned by: ${streak} correct predictions in a row`,
    `🕐 Time: ${new Date().toISOString()}`,
    '➡️ Credit manually on bwanabet',
  ].join('\n');

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('[Telegram stub]', message);
    return 'stub';
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
    if (!res.ok) throw new Error('telegram_http_' + res.status);
    return 'sent';
  } catch (err) {
    console.error('[Telegram] Failed to send voucher notification:', err.message);
    return 'failed';
  }
}
