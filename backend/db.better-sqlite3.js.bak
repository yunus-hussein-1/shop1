/* =====================================================
   SHAYEB SHOP — الاتصال بقاعدة البيانات وتجهيزها
   ===================================================== */
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// ملف قاعدة البيانات بينشأ لحاله جنب المشروع
const db = new Database(path.join(__dirname, "shayeb.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// تنفيذ المخطط الكامل من database.sql
db.exec(fs.readFileSync(path.join(__dirname, "database.sql"), "utf-8"));

// إنشاء حساب المدير العام تلقائياً أول تشغيل (من ملف .env)
const adminEmail = (process.env.ADMIN_EMAIL || "owner@shayeb.shop").toLowerCase();
const exists = db.prepare("SELECT id FROM users WHERE email=?").get(adminEmail);
if (!exists) {
  db.prepare("INSERT INTO users (name,email,pass_hash,role) VALUES (?,?,?,'admin')")
    .run(process.env.ADMIN_NAME || "الإدارة العامة",
         adminEmail,
         bcrypt.hashSync(process.env.ADMIN_PASS || "admin123", 10));
  console.log("👑 تم إنشاء حساب المدير العام:", adminEmail);
}

module.exports = db;
