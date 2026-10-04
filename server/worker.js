// LOCKED ROOM — серверная часть бота (Cloudflare Worker)
//
// Что делает:
//   1. POST multipart (из Mini App)  → проверяет подпись Telegram (initData) и присылает
//      отрендеренный трек (MP3 / WAV) в чат с ботом этому пользователю.
//   2. POST JSON (webhook Telegram)  → на /start (и /help) отвечает описанием приложения,
//      инструкцией и кнопкой, которая открывает Mini App.
//
// Переменные окружения (Settings → Variables and Secrets в Cloudflare):
//   BOT_TOKEN       — секрет: токен бота от @BotFather
//   WEBHOOK_SECRET  — секрет: любая длинная случайная строка (для проверки вебхука)
//   APP_URL         — адрес Mini App, например https://klangcrowngh.github.io/LockedRoom/
//   ALLOWED_ORIGIN  — откуда разрешены загрузки, например https://klangcrowngh.github.io

const MAX_FILE = 49 * 1024 * 1024;   // лимит Bot API на отправку файла — 50 МБ

export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('LOCKED ROOM bot is running', { headers: cors });

    const type = req.headers.get('content-type') || '';
    if (type.includes('application/json')) return handleUpdate(req, env);   // вебхук Telegram
    return handleUpload(req, env, cors);                                     // файл из Mini App
  },
};

// ---------- 1. файл из Mini App → в чат ----------
async function handleUpload(req, env, cors) {
  const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  let form;
  try { form = await req.formData(); } catch (e) { return json({ ok: false, error: 'bad request' }, 400); }
  const user = await verifyInitData(String(form.get('initData') || ''), env.BOT_TOKEN);
  if (!user) return json({ ok: false, error: 'not from Telegram' }, 401);
  const file = form.get('file');
  if (!file || typeof file === 'string') return json({ ok: false, error: 'no file' }, 400);
  if (file.size > MAX_FILE) return json({ ok: false, error: 'file too large' }, 413);

  const title = String(form.get('title') || 'LOCKED ROOM').slice(0, 64);
  const isMp3 = /\.mp3$/i.test(file.name || '');
  const tgForm = new FormData();
  tgForm.append('chat_id', String(user.id));
  tgForm.append(isMp3 ? 'audio' : 'document', file, file.name || (isMp3 ? 'track.mp3' : 'track.wav'));
  tgForm.append('caption', '🎛 ' + title + ' · made in LOCKED ROOM');
  if (isMp3) { tgForm.append('title', title); tgForm.append('performer', 'LOCKED ROOM'); }

  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${isMp3 ? 'sendAudio' : 'sendDocument'}`, { method: 'POST', body: tgForm });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) return json({ ok: false, error: j.description || 'telegram error' }, 502);
  return json({ ok: true });
}

// ---------- 2. сообщения боту: /start, /help ----------
async function handleUpdate(req, env) {
  if (env.WEBHOOK_SECRET && req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 });
  }
  const update = await req.json().catch(() => null);
  const msg = update && update.message;
  if (msg && msg.text && /^\/(start|help)\b/.test(msg.text)) {
    await callApi(env, 'sendMessage', {
      chat_id: msg.chat.id,
      text: START_TEXT,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [[{ text: '▶ Open LOCKED ROOM', web_app: { url: env.APP_URL } }]] },
    });
  }
  return new Response('ok');   // Telegram ждёт 200, иначе будет повторять
}

const START_TEXT = [
  '<b>LOCKED / ROOM</b> — a rhythm machine of rays and links.',
  'You build techno by connecting <b>time</b> to <b>sound</b>: one link = one hit.',
  '',
  '<b>How to play</b>',
  '1. Tap <b>▶ Open LOCKED ROOM</b> below, then <b>tap to enter</b>.',
  '2. Tap the <b>center</b> of the circle — play / pause.',
  '3. Tap a <b>sound</b> on the outer ring, then tap <b>time dots</b> in the middle — the sound plays on those steps. Tap again to remove.',
  '4. In the sound panel: <b>Steps</b> (velocity, chance, ratchet), <b>Sound</b> (pitch, drive, reverb, delay, sidechain…), <b>Notes</b> for melodic sounds.',
  '5. <b>+</b> — add a sound from the library (125 sounds).',
  '6. Scenes <b>A B C D</b> — four patterns; <b>Vary</b> creates a variation, <b>Undo</b> reverts.',
  '7. <b>FX</b> — hold the pads for live effects: filter, kill low, wash, roll, build.',
  '8. <b>Song</b> — the arrangement: scenes switch by themselves. <b>Render & save</b> sends the track here as MP3 or WAV.',
  '',
  '<b>Tracks</b> (tap the track name at the top) — presets by genre, your saved tracks (stored in Telegram cloud), share a track with a code.',
  '',
  'Tip: on iPhone turn off silent mode, otherwise there is no sound.',
].join('\n');

async function callApi(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return r.json().catch(() => ({}));
}

// ---------- проверка подписи Telegram Mini App (initData) ----------
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
async function verifyInitData(initData, token) {
  if (!initData || !token) return null;
  const p = new URLSearchParams(initData);
  const hash = p.get('hash'); if (!hash) return null;
  p.delete('hash');
  const check = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join('\n');
  const enc = new TextEncoder();
  const k1 = await crypto.subtle.importKey('raw', enc.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const secret = await crypto.subtle.sign('HMAC', k1, enc.encode(token));
  const k2 = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k2, enc.encode(check)));
  const hex = [...sig].map(b => b.toString(16).padStart(2, '0')).join('');
  if (hex !== hash) return null;
  if (Date.now() / 1000 - Number(p.get('auth_date') || 0) > 24 * 3600) return null;   // подпись не старше суток
  try { return JSON.parse(p.get('user')); } catch (e) { return null; }
}
