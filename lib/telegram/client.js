// Server-only Telegram Bot API calls for the purchase flow. Every function
// resolves rather than throws — Telegram being down must never fail a purchase
// (the purchases table is the source of truth; telegram_error flags the miss).
const api = (method) => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;
const CHAT_ID = () => process.env.TELEGRAM_CHAT_ID;

async function call(method, payload) {
  try {
    const r = await fetch(api(method), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d || d.ok === false) {
      console.error(`[telegram] ${method} failed:`, d && d.description || r.status);
      return null;
    }
    return d.result;
  } catch (e) {
    console.error(`[telegram] ${method} error:`, e.message);
    return null;
  }
}

// Returns message_id or null.
export async function sendPurchase(text, purchaseId) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !CHAT_ID()) return null;
  const result = await call('sendMessage', {
    chat_id: CHAT_ID(), text,
    reply_markup: { inline_keyboard: [[{ text: '✅ Mark credited', callback_data: `credit:${purchaseId}` }]] },
  });
  return result ? result.message_id : null;
}

// Replaces the message text (dropping the button) after handling.
export async function editPurchaseMessage(messageId, text) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !CHAT_ID() || !messageId) return null;
  return call('editMessageText', { chat_id: CHAT_ID(), message_id: messageId, text });
}

export async function answerCallback(callbackQueryId, text) {
  return call('answerCallbackQuery', { callback_query_id: callbackQueryId, text });
}
