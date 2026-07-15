/* =====================================================
   SHAYEB SHOP — الخادم الخلفي (API) + تقديم الواجهة
   ✅ نسخة بدون أي مكتبات خارجية (Node.js 22+ فقط)
   تشغيله:  npm start   ← ما في داعي لـ npm install أبداً
   ===================================================== */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { loadEnv, hashPass, checkPass, signToken, verifyToken } = require("./lib");
loadEnv();
const db = require("./db");

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const COMMISSION = 0.10;   // عمولة الشايب 10%
const PAYOUT_DAYS = 7;     // التحويل للبائع بعد 7 أيام من التسليم
const FRONT_DIR = path.join(__dirname, "..");   // مجلد الواجهة (index.html, css, js)

/* ---------- راوتر صغير (بديل Express) ---------- */
const routes = [];
const add = (method, pattern, ...handlers) => {
  const keys = [];
  const rx = new RegExp("^" + pattern.replace(/:[^/]+/g, (m) => { keys.push(m.slice(1)); return "([^/]+)"; }) + "$");
  routes.push({ method, rx, keys, handlers });
};
const app = {
  get: (p, ...h) => add("GET", p, ...h),
  post: (p, ...h) => add("POST", p, ...h),
  put: (p, ...h) => add("PUT", p, ...h),
  delete: (p, ...h) => add("DELETE", p, ...h),
};

/* ---------- أدوات مساعدة ---------- */
const sign = (u) => signToken({ id: u.id, role: u.role }, SECRET, 30);

// حماية المسارات: لازم توكن صالح
function auth(req, res, next) {
  const tk = (req.headers.authorization || "").replace("Bearer ", "");
  const payload = verifyToken(tk, SECRET);
  if (!payload) return res.status(401).json({ error: "unauthorized" });
  const u = db.prepare("SELECT blocked FROM users WHERE id=?").get(payload.id);
  if (!u || u.blocked) return res.status(403).json({ error: "blocked" });
  req.user = payload;
  next();
}
// مسارات الإدارة فقط
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "admin-only" });
  next();
}

/* ==================== 1) الحسابات ==================== */

// إنشاء حساب
app.post("/api/auth/register", (req, res) => {
  const { name, email, pass } = req.body;
  if (!name || !email || !pass || pass.length < 6) return res.status(400).json({ error: "invalid" });
  const em = email.toLowerCase().trim();
  if (db.prepare("SELECT id FROM users WHERE email=?").get(em)) return res.status(409).json({ error: "exists" });
  const r = db.prepare("INSERT INTO users (name,email,pass_hash) VALUES (?,?,?)")
    .run(name.trim(), em, hashPass(pass));
  const u = db.prepare("SELECT * FROM users WHERE id=?").get(r.lastInsertRowid);
  res.json({ token: sign(u), user: { id: u.id, name: u.name, email: u.email, role: u.role, points: u.points } });
});

// تسجيل الدخول
app.post("/api/auth/login", (req, res) => {
  const { email, pass } = req.body;
  const u = db.prepare("SELECT * FROM users WHERE email=?").get((email || "").toLowerCase().trim());
  if (!u || !checkPass(pass || "", u.pass_hash)) return res.status(401).json({ error: "wrong" });
  if (u.blocked) return res.status(403).json({ error: "blocked" });
  res.json({ token: sign(u), user: { id: u.id, name: u.name, email: u.email, role: u.role, points: u.points } });
});

// بياناتي + تعديل الملف (الاسم/الإيميل/الهاتف/الميلاد)
app.get("/api/me", auth, (req, res) => {
  const u = db.prepare("SELECT id,name,email,phone,dob,role,points,notif FROM users WHERE id=?").get(req.user.id);
  const addresses = db.prepare("SELECT * FROM addresses WHERE user_id=?").all(req.user.id);
  const store = db.prepare("SELECT * FROM stores WHERE user_id=?").get(req.user.id) || null;
  res.json({ user: u, addresses, store });
});
app.put("/api/me", auth, (req, res) => {
  const { name, email, phone, dob } = req.body;
  const em = (email || "").toLowerCase().trim();
  const clash = db.prepare("SELECT id FROM users WHERE email=? AND id<>?").get(em, req.user.id);
  if (clash) return res.status(409).json({ error: "email-used" });
  db.prepare("UPDATE users SET name=?,email=?,phone=?,dob=? WHERE id=?").run(name, em, phone || "", dob || "", req.user.id);
  res.json({ ok: true });
});

// تغيير كلمة المرور
app.put("/api/me/password", auth, (req, res) => {
  const { current, next } = req.body;
  const u = db.prepare("SELECT pass_hash FROM users WHERE id=?").get(req.user.id);
  if (!checkPass(current || "", u.pass_hash)) return res.status(401).json({ error: "wrong" });
  if (!next || next.length < 6) return res.status(400).json({ error: "short" });
  db.prepare("UPDATE users SET pass_hash=? WHERE id=?").run(hashPass(next), req.user.id);
  res.json({ ok: true });
});

// حذف الحساب نهائياً
app.delete("/api/me", auth, (req, res) => {
  db.prepare("DELETE FROM users WHERE id=?").run(req.user.id);
  res.json({ ok: true });
});

// نسيت كلمة المرور: توليد كود (بالإنتاج: يُرسل عبر خدمة بريد مثل Resend/SendGrid)
app.post("/api/auth/forgot", (req, res) => {
  const em = (req.body.email || "").toLowerCase().trim();
  if (!db.prepare("SELECT id FROM users WHERE email=?").get(em)) return res.status(404).json({ error: "no-user" });
  const code = String(crypto.randomInt(100000, 1000000));
  db.prepare("INSERT INTO reset_codes (email,code,expires_at) VALUES (?,?,datetime('now','+15 minutes'))").run(em, code);
  // TODO عند الربط: sendEmail(em, "كود استعادة كلمة المرور", code)
  console.log("📧 كود الاستعادة لـ", em, ":", code);
  res.json({ ok: true });
});
app.post("/api/auth/reset", (req, res) => {
  const { email, code, pass } = req.body;
  const row = db.prepare("SELECT * FROM reset_codes WHERE email=? AND code=? AND expires_at>datetime('now')")
    .get((email || "").toLowerCase().trim(), code);
  if (!row) return res.status(400).json({ error: "bad-code" });
  if (!pass || pass.length < 6) return res.status(400).json({ error: "short" });
  db.prepare("UPDATE users SET pass_hash=? WHERE email=?").run(hashPass(pass), row.email);
  db.prepare("DELETE FROM reset_codes WHERE email=?").run(row.email);
  res.json({ ok: true });
});

/* ==================== 2) العناوين ==================== */
app.post("/api/addresses", auth, (req, res) => {
  const { label, city, line, is_def } = req.body;
  if (is_def) db.prepare("UPDATE addresses SET is_def=0 WHERE user_id=?").run(req.user.id);
  db.prepare("INSERT INTO addresses (user_id,label,city,line,is_def) VALUES (?,?,?,?,?)")
    .run(req.user.id, label, city, line, is_def ? 1 : 0);
  res.json({ ok: true });
});
app.delete("/api/addresses/:id", auth, (req, res) => {
  db.prepare("DELETE FROM addresses WHERE id=? AND user_id=?").run(Number(req.params.id), req.user.id);
  res.json({ ok: true });
});

/* ==================== 3) المنتجات ==================== */
app.get("/api/products", (req, res) => {
  const rows = req.query.cat
    ? db.prepare("SELECT * FROM products WHERE active=1 AND cat=? ORDER BY id DESC").all(req.query.cat)
    : db.prepare("SELECT * FROM products WHERE active=1 ORDER BY id DESC").all();
  res.json(rows);
});
// إضافة منتج (بائع معتمد فقط — صورة حقيقية إلزامية)
app.post("/api/products", auth, (req, res) => {
  const store = db.prepare("SELECT * FROM stores WHERE user_id=? AND status='approved'").get(req.user.id);
  if (!store) return res.status(403).json({ error: "not-approved-seller" });
  const { name, cat, price_usd, old_usd, descr, img } = req.body;
  if (!name || !price_usd || !img) return res.status(400).json({ error: "invalid" });
  db.prepare(`INSERT INTO products (store_id,name_ar,name_en,name_tr,cat,price_usd,old_usd,descr,img)
              VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(store.id, name, name, name, cat, price_usd, old_usd || 0, descr || "", img);
  res.json({ ok: true });
});
app.delete("/api/products/:id", auth, (req, res) => {
  const store = db.prepare("SELECT id FROM stores WHERE user_id=?").get(req.user.id);
  db.prepare("UPDATE products SET active=0 WHERE id=? AND store_id=?").run(Number(req.params.id), store ? store.id : -1);
  res.json({ ok: true });
});
// تعليق + تقييم
app.post("/api/products/:id/comments", auth, (req, res) => {
  const { stars, body } = req.body;
  db.prepare("INSERT INTO comments (product_id,user_id,stars,body) VALUES (?,?,?,?)")
    .run(Number(req.params.id), req.user.id, Math.min(5, Math.max(1, stars)), body);
  res.json({ ok: true });
});
app.get("/api/products/:id/comments", (req, res) => {
  res.json(db.prepare(`SELECT c.stars,c.body,c.created_at,u.name FROM comments c
                       JOIN users u ON u.id=c.user_id WHERE c.product_id=? ORDER BY c.id DESC`).all(Number(req.params.id)));
});

/* ==================== 4) الطلبات والدفع (شام كاش 🟢) ==================== */
// الدفع حصراً عبر شام كاش: pay_mode = wallet (رقم محفظة) أو qr (مسح رمز)
app.post("/api/orders", auth, (req, res) => {
  const { items, address_id, coupon_pct, ship_usd, pay_mode, sham_wallet } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: "empty" });
  const mode = pay_mode === "qr" ? "qr" : "wallet";                    // شام كاش فقط
  const wallet = String(sham_wallet || "").replace(/\D/g, "");
  if (mode === "wallet" && wallet.length < 8) return res.status(400).json({ error: "bad-sham-wallet" });
  let sub = 0;
  for (const it of items) {
    const p = db.prepare("SELECT price_usd FROM products WHERE id=?").get(it.product_id);
    if (p) sub += p.price_usd * it.qty;
  }
  const total = sub * (1 - (coupon_pct || 0) / 100) + (ship_usd || 0);
  const inv = 5000 + db.prepare("SELECT COUNT(*) n FROM orders").get().n + 1;
  const r = db.prepare(`INSERT INTO orders (user_id,address_id,total_usd,sub_usd,coupon_pct,ship_usd,pay_mode,sham_wallet,invoice_no)
                        VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(req.user.id, address_id, total, sub, coupon_pct || 0, ship_usd || 0, mode, wallet, inv);
  const oid = r.lastInsertRowid;
  const ins = db.prepare("INSERT INTO order_items (order_id,product_id,name,qty,price_usd) VALUES (?,?,?,?,?)");
  for (const it of items) {
    const p = db.prepare("SELECT name_ar,price_usd FROM products WHERE id=?").get(it.product_id);
    if (p) ins.run(oid, it.product_id, p.name_ar, it.qty, p.price_usd);
  }
  db.prepare("UPDATE users SET points=points+? WHERE id=?").run(Math.round(total), req.user.id); // نقاط الشايب
  res.json({ ok: true, order_id: Number(oid), invoice_no: inv });
});

app.get("/api/orders/mine", auth, (req, res) => {
  const orders = db.prepare("SELECT * FROM orders WHERE user_id=? ORDER BY id DESC").all(req.user.id);
  for (const o of orders) o.items = db.prepare("SELECT * FROM order_items WHERE order_id=?").all(o.id);
  res.json(orders);
});

// تأكيد الاستلام → يجدول تحويل أرباح البائعين (بعد 7 أيام، بعد خصم 10%) على حساب شام كاش تبع المتجر
app.put("/api/orders/:id/delivered", auth, (req, res) => {
  const o = db.prepare("SELECT * FROM orders WHERE id=? AND user_id=? AND status='new'").get(Number(req.params.id), req.user.id);
  if (!o) return res.status(404).json({ error: "not-found" });
  db.prepare("UPDATE orders SET status='done',step=3,delivered_at=datetime('now') WHERE id=?").run(o.id);
  const items = db.prepare(`SELECT oi.qty,oi.price_usd,p.store_id FROM order_items oi
                            JOIN products p ON p.id=oi.product_id WHERE oi.order_id=? AND p.store_id IS NOT NULL`).all(o.id);
  const pay = db.prepare(`INSERT INTO payouts (store_id,order_id,gross_usd,fee_usd,net_usd,due_date)
                          VALUES (?,?,?,?,?,datetime('now','+${PAYOUT_DAYS} days'))`);
  for (const it of items) {
    const gross = it.qty * it.price_usd, fee = gross * COMMISSION;
    pay.run(it.store_id, o.id, gross, fee, gross - fee);
  }
  res.json({ ok: true });
});
app.put("/api/orders/:id/cancel", auth, (req, res) => {
  db.prepare("UPDATE orders SET status='canceled' WHERE id=? AND user_id=? AND status='new'").run(Number(req.params.id), req.user.id);
  res.json({ ok: true });
});
app.put("/api/orders/:id/rate", auth, (req, res) => {
  db.prepare(`UPDATE order_items SET rating=? WHERE id=? AND order_id IN
              (SELECT id FROM orders WHERE user_id=?)`).run(req.body.rating, req.body.item_id, req.user.id);
  res.json({ ok: true });
});

/* ==================== 5) البيع على الشايب ==================== */
app.post("/api/seller/apply", auth, (req, res) => {
  const { store_name, store_img, sham_acc } = req.body;
  if (!store_name || !sham_acc || sham_acc.replace(/\D/g, "").length < 8)
    return res.status(400).json({ error: "invalid" }); // حساب شام كاش إلزامي لاستلام الأرباح
  db.prepare(`INSERT INTO stores (user_id,store_name,store_img,sham_acc) VALUES (?,?,?,?)
              ON CONFLICT(user_id) DO UPDATE SET store_name=excluded.store_name,
              store_img=excluded.store_img,sham_acc=excluded.sham_acc,status='pending'`)
    .run(req.user.id, store_name, store_img || "", sham_acc);
  res.json({ ok: true, status: "pending" });
});
app.put("/api/seller/store", auth, (req, res) => { // تعديل اسم/صورة المتجر
  db.prepare("UPDATE stores SET store_name=?,store_img=? WHERE user_id=? AND status='approved'")
    .run(req.body.store_name, req.body.store_img || "", req.user.id);
  res.json({ ok: true });
});
app.post("/api/seller/posts", auth, (req, res) => { // منشور يومي بصورة
  const store = db.prepare("SELECT id FROM stores WHERE user_id=? AND status='approved'").get(req.user.id);
  if (!store) return res.status(403).json({ error: "not-seller" });
  db.prepare("INSERT INTO posts (store_id,img,body) VALUES (?,?,?)").run(store.id, req.body.img, req.body.body);
  res.json({ ok: true });
});
app.get("/api/posts", (req, res) => {
  res.json(db.prepare(`SELECT p.img,p.body,p.created_at,s.store_name FROM posts p
                       JOIN stores s ON s.id=p.store_id ORDER BY p.id DESC LIMIT 30`).all());
});
app.get("/api/seller/earnings", auth, (req, res) => {
  const store = db.prepare("SELECT id FROM stores WHERE user_id=?").get(req.user.id);
  res.json(store ? db.prepare("SELECT * FROM payouts WHERE store_id=? ORDER BY id DESC").all(store.id) : []);
});

/* ==================== 6) الشكاوى والبلاغات ==================== */
app.post("/api/contact", (req, res) => { // بتوصل لبريد متجر الشايب (لوحة الإدارة)
  db.prepare("INSERT INTO messages (from_email,subject,body) VALUES (?,?,?)")
    .run(req.body.from_email || "guest", req.body.subject, req.body.body);
  res.json({ ok: true, to: process.env.SUPPORT_MAIL });
});
app.post("/api/reports", auth, (req, res) => {
  db.prepare("INSERT INTO reports (store_id,by_user) VALUES (?,?)").run(req.body.store_id, req.user.id);
  res.json({ ok: true });
});

/* ==================== 7) لوحة الإدارة (المدير العام فقط) ==================== */
app.get("/api/admin/applications", auth, adminOnly, (req, res) => {
  res.json(db.prepare(`SELECT s.*,u.name,u.email FROM stores s JOIN users u ON u.id=s.user_id
                       WHERE s.status='pending'`).all());
});
app.put("/api/admin/applications/:id", auth, adminOnly, (req, res) => { // قبول أو رفض
  const st = req.body.approve ? "approved" : "rejected";
  db.prepare("UPDATE stores SET status=? WHERE id=?").run(st, Number(req.params.id));
  res.json({ ok: true, status: st });
});
app.get("/api/admin/users", auth, adminOnly, (req, res) => {
  res.json(db.prepare("SELECT id,name,email,role,blocked,points FROM users").all());
});
app.put("/api/admin/users/:id/block", auth, adminOnly, (req, res) => { // حظر / فك حظر
  db.prepare("UPDATE users SET blocked=? WHERE id=? AND role<>'admin'").run(req.body.blocked ? 1 : 0, Number(req.params.id));
  res.json({ ok: true });
});
app.put("/api/admin/stores/:id/remove", auth, adminOnly, (req, res) => { // إلغاء عضوية متجر
  db.prepare("UPDATE stores SET status='removed' WHERE id=?").run(Number(req.params.id));
  res.json({ ok: true });
});
app.get("/api/admin/messages", auth, adminOnly, (req, res) => {
  res.json(db.prepare("SELECT * FROM messages ORDER BY id DESC").all());
});
app.get("/api/admin/reports", auth, adminOnly, (req, res) => {
  res.json(db.prepare(`SELECT r.*,s.store_name,u.email by_email FROM reports r
                       LEFT JOIN stores s ON s.id=r.store_id
                       LEFT JOIN users u ON u.id=r.by_user ORDER BY r.id DESC`).all());
});

/* ==================== 8) 🔄 المزامنة المشتركة (واجهة الديمو بين الأجهزة) ====================
   طلبات البيع والمستخدمون والمنشورات بتنحفظ هون بقاعدة البيانات، فبتظهر
   لكل الأجهزة — وهيك المدير بيشوف طلب البيع فوراً وبيوصله إشعار. */
app.get("/api/sync", (req, res) => {
  const r = db.prepare("SELECT rev,dump FROM shared_state WHERE id=1").get();
  const since = Number(req.query.since);
  if (!Number.isNaN(since) && since === r.rev) return res.json({ rev: r.rev }); // ما في جديد
  let dump = {};
  try { dump = JSON.parse(r.dump); } catch {}
  res.json({ rev: r.rev, dump });
});
app.post("/api/sync", (req, res) => {
  const dump = JSON.stringify(req.body.dump || {});
  db.prepare("UPDATE shared_state SET rev=rev+1, dump=?, updated_at=datetime('now') WHERE id=1").run(dump);
  res.json({ ok: true, rev: db.prepare("SELECT rev FROM shared_state WHERE id=1").get().rev });
});

/* ==================== تقديم ملفات الواجهة (index.html, css, js) ==================== */
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2" };

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === "/") rel = "/index.html";
  const file = path.normalize(path.join(FRONT_DIR, rel));
  if (!file.startsWith(FRONT_DIR) || file.startsWith(path.join(FRONT_DIR, "backend"))) {
    res.writeHead(404); return res.end("Not found");
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
}

/* ==================== محرك HTTP ==================== */
const server = http.createServer((req, res) => {
  // CORS (بديل مكتبة cors)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  const u = new URL(req.url, "http://localhost");
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(o)); };

  // مسارات الـ API
  if (u.pathname.startsWith("/api/")) {
    const route = routes.find((r) => r.method === req.method && r.rx.test(u.pathname));
    if (!route) return res.status(404).json({ error: "not-found" });
    req.params = {};
    const m = u.pathname.match(route.rx);
    route.keys.forEach((k, i) => (req.params[k] = m[i + 1]));
    req.query = Object.fromEntries(u.searchParams);

    // قراءة جسم الطلب JSON (حد 8MB لصور المنتجات)
    let body = [], size = 0, aborted = false;
    req.on("data", (ch) => {
      size += ch.length;
      if (size > 8 * 1024 * 1024) { aborted = true; res.status(413).json({ error: "too-large" }); req.destroy(); }
      else body.push(ch);
    });
    req.on("end", () => {
      if (aborted) return;
      try { req.body = body.length ? JSON.parse(Buffer.concat(body).toString("utf-8")) : {}; }
      catch { return res.status(400).json({ error: "bad-json" }); }
      // تشغيل سلسلة المعالجات (auth → adminOnly → handler)
      let i = 0;
      const next = () => {
        const h = route.handlers[i++];
        if (!h) return;
        try { h(req, res, next); }
        catch (e) { console.error("💥", e.message); if (!res.writableEnded) res.status(500).json({ error: "server" }); }
      };
      next();
    });
    return;
  }

  // غير هيك: ملفات الواجهة
  if (req.method === "GET") return serveStatic(req, res, u.pathname);
  res.status(405).json({ error: "method" });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log("🚀 SHAYEB SHOP شغّال — الواجهة + API على http://localhost:" + PORT));
