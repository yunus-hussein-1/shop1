/* =====================================================
   SHAYEB SHOP — الاتصال بقاعدة البيانات وتجهيزها
   ✅ نسخة بدون مكتبات خارجية: node:sqlite المدمجة بـ Node 22+
   ===================================================== */
const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");
const { loadEnv, hashPass } = require("./lib");
loadEnv();

// ملف قاعدة البيانات بينشأ لحاله جنب المشروع
const db = new DatabaseSync(path.join(__dirname, "shayeb.db"));
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// تنفيذ المخطط الكامل من database.sql (12 جدول + الفهارس)
db.exec(fs.readFileSync(path.join(__dirname, "database.sql"), "utf-8"));

// سطر الحالة المشتركة (مزامنة واجهة الديمو بين الأجهزة)
db.prepare("INSERT OR IGNORE INTO shared_state (id,rev,dump) VALUES (1,0,'{}')").run();

// إنشاء حساب المدير العام تلقائياً أول تشغيل (من ملف .env)
const adminEmail = (process.env.ADMIN_EMAIL || "owner@shayeb.shop").toLowerCase();
const exists = db.prepare("SELECT id FROM users WHERE email=?").get(adminEmail);
if (!exists) {
  db.prepare("INSERT INTO users (name,email,pass_hash,role) VALUES (?,?,?,'admin')")
    .run(process.env.ADMIN_NAME || "الإدارة العامة",
         adminEmail,
         hashPass(process.env.ADMIN_PASS || "admin123"));
  console.log("👑 تم إنشاء حساب المدير العام:", adminEmail);
}

module.exports = db;
