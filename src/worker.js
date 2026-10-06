/* PIKO — backend เล็กๆ บน Cloudflare Workers (+ static assets)
 *
 *  GET  /api/exercises        ทุกคนอ่านได้  → { exercises: [...] | null }
 *  PUT  /api/exercises        เฉพาะ Admin   → บันทึกโจทย์ทั้งหมด
 *  POST /api/admin/login      { password }  → { token, expiresAt }
 *
 * ต้องตั้งค่าใน Cloudflare (Settings → Bindings / Variables and Secrets):
 *  - KV namespace binding ชื่อ  PIKO_KV
 *  - Secret ชื่อ                ADMIN_PASSWORD   (รหัสผ่านของ Admin)
 *
 * ไฟล์อื่นๆ (หน้าเว็บ, css, js, pyodide) ถูกส่งต่อให้ env.ASSETS ตามปกติ (โฟลเดอร์ public)
 */

const KV_KEY = 'exercises';
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 ชั่วโมง
const LEVELS = ['ง่าย', 'กลาง', 'ยาก']; // ง่าย กลาง ยาก
const MAX_EXERCISES = 200;
const MAX_FAILS = 8;          // ใส่รหัสผิดได้กี่ครั้ง
const FAIL_WINDOW_S = 15 * 60; // ในช่วงกี่วินาที

const enc = new TextEncoder();

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });
}

/* ---------- crypto helpers ---------- */
function b64url(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlToBytes(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function hmacKey(password) {
  // คีย์เซ็นโทเค็นได้จากรหัสผ่าน Admin → เปลี่ยนรหัสผ่านแล้วโทเค็นเก่าใช้ไม่ได้ทันที
  const base = await crypto.subtle.digest('SHA-256', enc.encode('piko-admin-token:' + password));
  return crypto.subtle.importKey('raw', base, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function signToken(password) {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS, r: 'admin' })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(password), enc.encode(payload));
  return { token: payload + '.' + b64url(sig), expiresAt: Date.now() + TOKEN_TTL_MS };
}
async function verifyToken(token, password) {
  if (!token || !password || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(password), b64urlToBytes(parts[1]), enc.encode(parts[0]));
    if (!ok) return false;
    const p = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
    return p.r === 'admin' && typeof p.exp === 'number' && p.exp > Date.now();
  } catch (e) { return false; }
}
// เทียบรหัสผ่านแบบไม่รั่วเวลา: เทียบ HMAC ของทั้งสองฝั่ง
async function safeEqual(a, b) {
  const key = await crypto.subtle.importKey('raw', enc.encode('piko-cmp'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const [ha, hb] = await Promise.all([
    crypto.subtle.sign('HMAC', key, enc.encode(String(a))),
    crypto.subtle.sign('HMAC', key, enc.encode(String(b))),
  ]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

function bearer(request) {
  const h = request.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : '';
}

/* ---------- validation ---------- */
function isStr(v, max) { return typeof v === 'string' && v.length <= max; }

function validateExercises(list) {
  if (!Array.isArray(list)) return 'ข้อมูลต้องเป็นรายการ (array)';
  if (list.length > MAX_EXERCISES) return 'มีโจทย์ได้ไม่เกิน ' + MAX_EXERCISES + ' ข้อ';
  const seen = new Set();
  const clean = [];
  for (let i = 0; i < list.length; i++) {
    const x = list[i], n = 'ข้อ ' + (i + 1) + ': ';
    if (!x || typeof x !== 'object') return n + 'รูปแบบไม่ถูกต้อง';
    if (typeof x.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,39}$/.test(x.id)) return n + 'id ต้องเป็น a-z 0-9 _ - ยาวไม่เกิน 40 ตัว และขึ้นต้นด้วยตัวอักษรหรือตัวเลข';
    if (seen.has(x.id)) return n + 'id "' + x.id + '" ซ้ำกับข้ออื่น';
    seen.add(x.id);
    if (!isStr(x.title, 120) || !x.title.trim()) return n + 'ต้องมีชื่อโจทย์ (ไม่เกิน 120 ตัวอักษร)';
    if (!isStr(x.topic, 120)) return n + 'หัวข้อยาวเกินไป';
    if (LEVELS.indexOf(x.level) === -1) return n + 'ระดับต้องเป็น ง่าย / กลาง / ยาก';
    if (!isStr(x.desc, 8000)) return n + 'คำอธิบายยาวเกินไป';
    if (!isStr(x.starter, 8000)) return n + 'โค้ดเริ่มต้นยาวเกินไป';
    if (!Array.isArray(x.tests) || x.tests.length < 1 || x.tests.length > 50) return n + 'ต้องมี test case 1-50 ชุด';
    const tests = [];
    for (let j = 0; j < x.tests.length; j++) {
      const t = x.tests[j], m = n + 'test case ' + (j + 1) + ': ';
      if (!t || !Array.isArray(t.inputs) || t.inputs.length > 30) return m + 'inputs ต้องเป็นรายการ (ไม่เกิน 30 ค่า)';
      for (const v of t.inputs) if (!isStr(v, 500)) return m + 'ค่า input ยาวเกินไปหรือไม่ใช่ข้อความ';
      if (!isStr(t.expected, 5000)) return m + 'expected ยาวเกินไปหรือไม่ใช่ข้อความ';
      tests.push({ inputs: t.inputs.slice(), expected: t.expected });
    }
    let sample = Number.isInteger(x.sample) ? x.sample : 1;
    if (sample < 1) sample = 1;
    if (sample > tests.length) sample = tests.length;
    clean.push({ id: x.id, title: x.title.trim(), topic: x.topic, level: x.level, desc: x.desc, starter: x.starter, sample, tests });
  }
  return clean; // สำเร็จ → คืนรายการที่ล้างแล้ว
}

/* ---------- handlers ---------- */
function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || 'unknown';
}

async function handleLogin(request, env) {
  if (!env.ADMIN_PASSWORD) return json({ error: 'ยังไม่ได้ตั้ง ADMIN_PASSWORD บนเซิร์ฟเวอร์' }, 503);
  const kv = env.PIKO_KV;
  const rlKey = 'rl:' + clientIp(request);
  let fails = 0;
  if (kv) {
    fails = parseInt(await kv.get(rlKey), 10) || 0;
    if (fails >= MAX_FAILS) return json({ error: 'ลองผิดหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' }, 429);
  }
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'คำขอไม่ถูกต้อง' }, 400); }
  const pw = body && typeof body.password === 'string' ? body.password : '';
  if (!(await safeEqual(pw, env.ADMIN_PASSWORD))) {
    if (kv) await kv.put(rlKey, String(fails + 1), { expirationTtl: FAIL_WINDOW_S });
    await new Promise((r) => setTimeout(r, 400));
    return json({ error: 'รหัสผ่านไม่ถูกต้อง' }, 401);
  }
  if (kv && fails) await kv.delete(rlKey);
  return json(await signToken(env.ADMIN_PASSWORD));
}

async function handleGetExercises(env) {
  if (!env.PIKO_KV) return json({ exercises: null });
  const raw = await env.PIKO_KV.get(KV_KEY);
  let list = null;
  if (raw) { try { list = JSON.parse(raw); } catch (e) { list = null; } }
  return json({ exercises: Array.isArray(list) ? list : null });
}

async function handlePutExercises(request, env) {
  if (!env.ADMIN_PASSWORD) return json({ error: 'ยังไม่ได้ตั้ง ADMIN_PASSWORD บนเซิร์ฟเวอร์' }, 503);
  if (!(await verifyToken(bearer(request), env.ADMIN_PASSWORD))) return json({ error: 'ไม่มีสิทธิ์ กรุณาเข้าสู่ระบบ Admin ใหม่' }, 401);
  if (!env.PIKO_KV) return json({ error: 'ยังไม่ได้ผูก KV (PIKO_KV) กับโปรเจกต์' }, 503);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'คำขอไม่ถูกต้อง' }, 400); }
  const result = validateExercises(body && body.exercises);
  if (typeof result === 'string') return json({ error: result }, 422);
  await env.PIKO_KV.put(KV_KEY, JSON.stringify(result));
  return json({ ok: true, count: result.length });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');
    try {
      if (path === '/api/exercises') {
        if (request.method === 'GET') return await handleGetExercises(env);
        if (request.method === 'PUT') return await handlePutExercises(request, env);
        return json({ error: 'method not allowed' }, 405, { allow: 'GET, PUT' });
      }
      if (path === '/api/admin/login') {
        if (request.method === 'POST') return await handleLogin(request, env);
        return json({ error: 'method not allowed' }, 405, { allow: 'POST' });
      }
      if (path.startsWith('/api/')) return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: 'เกิดข้อผิดพลาดบนเซิร์ฟเวอร์' }, 500);
    }
    return env.ASSETS.fetch(request);
  },
};
