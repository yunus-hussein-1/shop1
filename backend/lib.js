/* =====================================================
   SHAYEB SHOP — أدوات مساعدة بدون أي مكتبات خارجية
   (بديل dotenv + bcryptjs + jsonwebtoken — كلها بأدوات Node المدمجة)
   ===================================================== */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/* ---------- تحميل ملف .env (بديل dotenv) ---------- */
function loadEnv(file) {
  const p = file || path.join(__dirname, ".env");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

/* ---------- تشفير كلمات المرور scrypt (بديل bcryptjs) ---------- */
function hashPass(pass) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(pass), salt, 32, { N: 16384, r: 8, p: 1 });
  return "s2$" + salt.toString("base64") + "$" + hash.toString("base64");
}
function checkPass(pass, stored) {
  try {
    const [tag, saltB64, hashB64] = String(stored).split("$");
    if (tag !== "s2") return false;
    const salt = Buffer.from(saltB64, "base64");
    const want = Buffer.from(hashB64, "base64");
    const got = crypto.scryptSync(String(pass), salt, want.length, { N: 16384, r: 8, p: 1 });
    return crypto.timingSafeEqual(want, got);
  } catch { return false; }
}

/* ---------- توكنات JWT (HS256) — بديل jsonwebtoken ---------- */
const b64u = (buf) => Buffer.from(buf).toString("base64url");
function signToken(payload, secret, days = 30) {
  const header = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + days * 86400 }));
  const sig = crypto.createHmac("sha256", secret).update(header + "." + body).digest("base64url");
  return header + "." + body + "." + sig;
}
function verifyToken(token, secret) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const sig = crypto.createHmac("sha256", secret).update(parts[0] + "." + parts[1]).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(parts[2]);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

module.exports = { loadEnv, hashPass, checkPass, signToken, verifyToken };
