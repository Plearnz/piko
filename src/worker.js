/* PIKO — backend บน Cloudflare Workers + D1
 *
 *  นักศึกษา
 *   POST /api/register        { sid, name, password }  → { token, user }
 *   POST /api/login           { sid, password }        → { token, user }
 *   GET  /api/progress        (Bearer)                 → { data, updatedAt }
 *   PUT  /api/progress        (Bearer) { data, updatedAt }
 *  โจทย์
 *   GET  /api/exercises       ทุกคนอ่านได้            → { exercises: [...] | null }
 *   PUT  /api/exercises       เฉพาะ Admin
 *  Admin
 *   POST /api/admin/login            { password }      → { token, expiresAt }
 *   GET  /api/admin/students         (Bearer admin)
 *   POST /api/admin/reset-password   (Bearer admin) { sid, password }
 *
 * ต้องตั้งค่า: D1 binding ชื่อ PIKO_DB (ใน wrangler.jsonc) และ Secret ชื่อ ADMIN_PASSWORD
 * ตารางสร้างให้เองอัตโนมัติเมื่อมีคำขอแรก
 */

const LEVELS = ['ง่าย', 'กลาง', 'ยาก']; // ง่าย กลาง ยาก
const MAX_EXERCISES = 200;
const ADMIN_TTL_MS = 12 * 60 * 60 * 1000;
const STUDENT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_PROGRESS_CHARS = 200000;
const SID_RE = /^[A-Z]\d{7}$/;
const PBKDF2_ITER = 100000; // เพดานของ Workers

const enc = new TextEncoder();
const dec = new TextDecoder();

class HttpError extends Error {
  constructor(status, code, message) { super(message || code); this.status = status; this.code = code; }
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });
}

/* ---------------------------------------------------------------- crypto */
function b64url(buf) {
  let s = '';
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
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
async function hmacKey(material) {
  const base = await crypto.subtle.digest('SHA-256', enc.encode('piko-token:' + material));
  return crypto.subtle.importKey('raw', base, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function signToken(payload, material) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(material), enc.encode(body));
  return body + '.' + b64url(sig);
}
async function verifyToken(token, material) {
  if (!token || !material || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(material), b64urlToBytes(parts[1]), enc.encode(parts[0]));
    if (!ok) return null;
    const p = JSON.parse(dec.decode(b64urlToBytes(parts[0])));
    return typeof p.exp === 'number' && p.exp > Date.now() ? p : null;
  } catch (e) { return null; }
}
// เทียบสตริงแบบไม่รั่วเวลา: เทียบ HMAC ของทั้งสองฝั่ง
async function safeEqual(a, b) {
  const key = await crypto.subtle.importKey('raw', enc.encode('piko-cmp'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const [ha, hb] = await Promise.all([crypto.subtle.sign('HMAC', key, enc.encode(String(a))), crypto.subtle.sign('HMAC', key, enc.encode(String(b)))]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}
async function pbkdf2(password, saltBytes) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return b64url(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: PBKDF2_ITER }, key, 256));
}
async function newPasswordRecord(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: b64url(salt), hash: await pbkdf2(password, salt) };
}

/* ---------------------------------------------------------------- database */
let schemaPromise = null;
async function getDb(env) {
  if (!env.PIKO_DB) throw new HttpError(503, 'noDb', 'ยังไม่ได้ผูกฐานข้อมูล D1 (PIKO_DB)');
  if (!schemaPromise) {
    const db = env.PIKO_DB;
    schemaPromise = db.batch([
      db.prepare('CREATE TABLE IF NOT EXISTS users (sid TEXT PRIMARY KEY, name TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, created_at INTEGER NOT NULL)'),
      db.prepare('CREATE TABLE IF NOT EXISTS progress (sid TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL)'),
      db.prepare('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)'),
      db.prepare('CREATE TABLE IF NOT EXISTS rl (k TEXT PRIMARY KEY, n INTEGER NOT NULL, reset_at INTEGER NOT NULL)'),
    ]).catch((e) => { schemaPromise = null; throw e; });
  }
  await schemaPromise;
  return env.PIKO_DB;
}

let cachedSecret = null;
async function sessionSecret(db) {
  if (cachedSecret) return cachedSecret;
  let row = await db.prepare("SELECT v FROM meta WHERE k='session_secret'").first();
  if (!row) {
    const fresh = b64url(crypto.getRandomValues(new Uint8Array(32)));
    await db.prepare("INSERT OR IGNORE INTO meta (k, v) VALUES ('session_secret', ?)").bind(fresh).run();
    row = await db.prepare("SELECT v FROM meta WHERE k='session_secret'").first();
  }
  cachedSecret = row.v;
  return cachedSecret;
}

/* ---------------------------------------------------------------- rate limit */
const nowSec = () => Math.floor(Date.now() / 1000);
async function isBlocked(db, key, max) {
  const row = await db.prepare('SELECT n, reset_at FROM rl WHERE k = ?').bind(key).first();
  return !!(row && row.reset_at > nowSec() && row.n >= max);
}
async function addHit(db, key, windowSec) {
  const row = await db.prepare('SELECT n, reset_at FROM rl WHERE k = ?').bind(key).first();
  if (row && row.reset_at > nowSec()) await db.prepare('UPDATE rl SET n = n + 1 WHERE k = ?').bind(key).run();
  else await db.prepare('INSERT OR REPLACE INTO rl (k, n, reset_at) VALUES (?, 1, ?)').bind(key, nowSec() + windowSec).run();
}
async function clearHits(db, key) { await db.prepare('DELETE FROM rl WHERE k = ?').bind(key).run(); }
const clientIp = (request) => request.headers.get('cf-connecting-ip') || 'unknown';

/* ---------------------------------------------------------------- helpers */
async function readJson(request) {
  try { return await request.json(); } catch (e) { throw new HttpError(400, 'badRequest', 'คำขอไม่ถูกต้อง'); }
}
function bearer(request) {
  const m = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') || '');
  return m ? m[1].trim() : '';
}
function normSid(v) { return typeof v === 'string' ? v.replace(/[\s-]/g, '').toUpperCase() : ''; }

async function requireStudent(request, env) {
  const db = await getDb(env);
  const p = await verifyToken(bearer(request), await sessionSecret(db));
  if (!p || p.r !== 'student' || !SID_RE.test(p.sid || '')) throw new HttpError(401, 'unauthorized', 'กรุณาเข้าสู่ระบบใหม่');
  return { db, sid: p.sid };
}
async function requireAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) throw new HttpError(503, 'noAdminPw', 'ยังไม่ได้ตั้ง ADMIN_PASSWORD บนเซิร์ฟเวอร์');
  const p = await verifyToken(bearer(request), env.ADMIN_PASSWORD);
  if (!p || p.r !== 'admin') throw new HttpError(401, 'unauthorized', 'ไม่มีสิทธิ์ กรุณาเข้าสู่ระบบ Admin ใหม่');
  return getDb(env);
}
async function studentToken(db, sid) {
  return signToken({ r: 'student', sid, exp: Date.now() + STUDENT_TTL_MS }, await sessionSecret(db));
}

/* ---------------------------------------------------------------- students */
async function handleRegister(request, env) {
  const db = await getDb(env);
  const ip = clientIp(request);
  if (await isBlocked(db, 'reg:' + ip, 30)) throw new HttpError(429, 'rate', 'สมัครบ่อยเกินไป กรุณารอสักครู่');
  const b = await readJson(request);
  const sid = normSid(b.sid);
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const pw = typeof b.password === 'string' ? b.password : '';
  if (!SID_RE.test(sid)) throw new HttpError(422, 'badSid', 'รหัสนักศึกษาไม่ถูกต้อง');
  if (!name || name.length > 80) throw new HttpError(422, 'badName', 'ชื่อไม่ถูกต้อง');
  if (pw.length < 8 || pw.length > 200) throw new HttpError(422, 'badPass', 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');
  await addHit(db, 'reg:' + ip, 3600);
  const rec = await newPasswordRecord(pw);
  const res = await db.prepare('INSERT OR IGNORE INTO users (sid, name, salt, hash, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(sid, name, rec.salt, rec.hash, Date.now()).run();
  if (!res.meta || res.meta.changes === 0) throw new HttpError(409, 'sidTaken', 'รหัสนักศึกษานี้ถูกใช้สมัครแล้ว');
  return json({ token: await studentToken(db, sid), user: { sid, name } });
}

async function handleLogin(request, env) {
  const db = await getDb(env);
  const ip = clientIp(request);
  const b = await readJson(request);
  const sid = normSid(b.sid);
  const pw = typeof b.password === 'string' ? b.password : '';
  if (!SID_RE.test(sid) || !pw || pw.length > 200) throw new HttpError(422, 'badLogin', 'ข้อมูลไม่ถูกต้อง');
  const k1 = 'login:' + ip + ':' + sid, k2 = 'loginip:' + ip;
  if ((await isBlocked(db, k1, 8)) || (await isBlocked(db, k2, 60))) throw new HttpError(429, 'rate', 'ลองผิดหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่');
  const user = await db.prepare('SELECT sid, name, salt, hash FROM users WHERE sid = ?').bind(sid).first();
  if (!user) {
    await addHit(db, k2, 900);
    throw new HttpError(404, 'noUser', 'ไม่พบบัญชีนี้');
  }
  const ok = await safeEqual(await pbkdf2(pw, b64urlToBytes(user.salt)), user.hash);
  if (!ok) {
    await addHit(db, k1, 900); await addHit(db, k2, 900);
    throw new HttpError(401, 'wrongPass', 'รหัสผ่านไม่ถูกต้อง');
  }
  await clearHits(db, k1);
  return json({ token: await studentToken(db, sid), user: { sid: user.sid, name: user.name } });
}

async function handleGetProgress(request, env) {
  const { db, sid } = await requireStudent(request, env);
  const row = await db.prepare('SELECT data, updated_at FROM progress WHERE sid = ?').bind(sid).first();
  if (!row) return json({ data: null, updatedAt: 0 });
  let data = null;
  try { data = JSON.parse(row.data); } catch (e) { data = null; }
  return json({ data, updatedAt: row.updated_at });
}

async function handlePutProgress(request, env) {
  const { db, sid } = await requireStudent(request, env);
  const b = await readJson(request);
  if (!b || typeof b.data !== 'object' || b.data === null || Array.isArray(b.data)) throw new HttpError(422, 'badData', 'ข้อมูลไม่ถูกต้อง');
  const text = JSON.stringify(b.data);
  if (text.length > MAX_PROGRESS_CHARS) throw new HttpError(413, 'tooLarge', 'ข้อมูลใหญ่เกินไป');
  let at = Number.isFinite(b.updatedAt) ? Math.floor(b.updatedAt) : Date.now();
  at = Math.min(at, Date.now() + 24 * 3600 * 1000);
  await db.prepare('INSERT INTO progress (sid, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at')
    .bind(sid, text, at).run();
  return json({ ok: true, updatedAt: at });
}

/* ---------------------------------------------------------------- exercises */
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
  return clean;
}

async function handleGetExercises(env) {
  if (!env.PIKO_DB) return json({ exercises: null });
  const db = await getDb(env);
  const row = await db.prepare("SELECT v FROM meta WHERE k='exercises'").first();
  let list = null;
  if (row) { try { list = JSON.parse(row.v); } catch (e) { list = null; } }
  return json({ exercises: Array.isArray(list) ? list : null });
}

async function handlePutExercises(request, env) {
  const db = await requireAdmin(request, env);
  const body = await readJson(request);
  const result = validateExercises(body && body.exercises);
  if (typeof result === 'string') throw new HttpError(422, 'invalid', result);
  await db.prepare("INSERT INTO meta (k, v) VALUES ('exercises', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(JSON.stringify(result)).run();
  return json({ ok: true, count: result.length });
}

/* ---------------------------------------------------------------- admin */
async function handleAdminLogin(request, env) {
  if (!env.ADMIN_PASSWORD) throw new HttpError(503, 'noAdminPw', 'ยังไม่ได้ตั้ง ADMIN_PASSWORD บนเซิร์ฟเวอร์');
  const db = await getDb(env);
  const key = 'admin:' + clientIp(request);
  if (await isBlocked(db, key, 8)) throw new HttpError(429, 'rate', 'ลองผิดหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่');
  const b = await readJson(request);
  const pw = typeof b.password === 'string' ? b.password : '';
  if (!(await safeEqual(pw, env.ADMIN_PASSWORD))) {
    await addHit(db, key, 900);
    await new Promise((r) => setTimeout(r, 400));
    throw new HttpError(401, 'wrongPass', 'รหัสผ่านไม่ถูกต้อง');
  }
  await clearHits(db, key);
  const expiresAt = Date.now() + ADMIN_TTL_MS;
  return json({ token: await signToken({ r: 'admin', exp: expiresAt }, env.ADMIN_PASSWORD), expiresAt });
}

async function handleAdminStudents(request, env) {
  const db = await requireAdmin(request, env);
  const { results } = await db.prepare(
    'SELECT u.sid, u.name, u.created_at, p.updated_at, p.data FROM users u LEFT JOIN progress p ON p.sid = u.sid ORDER BY u.created_at DESC LIMIT 3000'
  ).all();
  const students = (results || []).map((r) => {
    let solved = 0;
    if (r.data) { try { const s = JSON.parse(r.data).solved || {}; solved = Object.keys(s).filter((k) => s[k]).length; } catch (e) { /* ignore */ } }
    return { sid: r.sid, name: r.name, createdAt: r.created_at, updatedAt: r.updated_at || null, solved };
  });
  return json({ students });
}

async function handleAdminReset(request, env) {
  const db = await requireAdmin(request, env);
  const b = await readJson(request);
  const sid = normSid(b.sid);
  const pw = typeof b.password === 'string' ? b.password : '';
  if (!SID_RE.test(sid)) throw new HttpError(422, 'badSid', 'รหัสนักศึกษาไม่ถูกต้อง');
  if (pw.length < 8 || pw.length > 200) throw new HttpError(422, 'badPass', 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร');
  const rec = await newPasswordRecord(pw);
  const res = await db.prepare('UPDATE users SET salt = ?, hash = ? WHERE sid = ?').bind(rec.salt, rec.hash, sid).run();
  if (!res.meta || res.meta.changes === 0) throw new HttpError(404, 'noUser', 'ไม่พบรหัสนักศึกษานี้');
  return json({ ok: true });
}

/* ---------------------------------------------------------------- router */
const ROUTES = {
  'POST /api/register': handleRegister,
  'POST /api/login': handleLogin,
  'GET /api/progress': handleGetProgress,
  'PUT /api/progress': handlePutProgress,
  'GET /api/exercises': (req, env) => handleGetExercises(env),
  'PUT /api/exercises': handlePutExercises,
  'POST /api/admin/login': handleAdminLogin,
  'GET /api/admin/students': handleAdminStudents,
  'POST /api/admin/reset-password': handleAdminReset,
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');
    if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
    const handler = ROUTES[request.method + ' ' + path];
    if (!handler) {
      const known = Object.keys(ROUTES).some((k) => k.split(' ')[1] === path);
      return json({ error: known ? 'method not allowed' : 'not found', code: 'notFound' }, known ? 405 : 404);
    }
    try {
      return await handler(request, env);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, code: e.code }, e.status);
      return json({ error: 'เกิดข้อผิดพลาดบนเซิร์ฟเวอร์', code: 'server' }, 500);
    }
  },
};
