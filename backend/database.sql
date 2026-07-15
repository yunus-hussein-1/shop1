-- =====================================================
-- SHAYEB SHOP — مخطط قاعدة البيانات الكامل (SQLite/SQL)
-- =====================================================

-- المستخدمون (زبائن + بائعين + إدارة)
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  pass_hash     TEXT NOT NULL,              -- كلمة المرور مشفرة bcrypt (ممنوع تخزينها نصاً)
  phone         TEXT DEFAULT '',
  dob           TEXT DEFAULT '',            -- تاريخ الميلاد
  role          TEXT DEFAULT 'user',        -- user | admin
  blocked       INTEGER DEFAULT 0,          -- 1 = محظور
  points        INTEGER DEFAULT 0,          -- نقاط الشايب
  notif         INTEGER DEFAULT 1,
  created_at    TEXT DEFAULT (datetime('now'))
);

-- عناوين المستخدم (عنوان + عناوين إضافية)
CREATE TABLE IF NOT EXISTS addresses (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label    TEXT NOT NULL,                   -- المنزل / العمل...
  city     TEXT NOT NULL,
  line     TEXT NOT NULL,
  is_def   INTEGER DEFAULT 0                -- العنوان الافتراضي
);

-- متاجر البائعين (طلب البيع على الشايب)
CREATE TABLE IF NOT EXISTS stores (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  store_name  TEXT NOT NULL,
  store_img   TEXT DEFAULT '',              -- رابط/مسار صورة المتجر
  sham_acc    TEXT NOT NULL,                -- رقم شام كاش لاستلام الأرباح (إلزامي)
  status      TEXT DEFAULT 'pending',       -- pending | approved | rejected | removed
  agreed_at   TEXT DEFAULT (datetime('now')) -- وقت الموافقة على الاتفاقية (عمولة 10%)
);

-- المنتجات
CREATE TABLE IF NOT EXISTS products (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id   INTEGER REFERENCES stores(id) ON DELETE CASCADE, -- NULL = منتج المنصة الرسمي
  name_ar    TEXT NOT NULL, name_en TEXT NOT NULL, name_tr TEXT NOT NULL,
  cat        TEXT NOT NULL,                 -- women | men | kids | elec
  price_usd  REAL NOT NULL,                 -- السعر الأساسي بالدولار
  old_usd    REAL DEFAULT 0,                -- سعر قبل الخصم (للعروض)
  descr      TEXT DEFAULT '',
  img        TEXT DEFAULT '',               -- مسار الصورة الحقيقية للسلعة
  stock      INTEGER DEFAULT 10,
  active     INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- الطلبات
CREATE TABLE IF NOT EXISTS orders (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  address_id   INTEGER REFERENCES addresses(id),
  total_usd    REAL NOT NULL,
  sub_usd      REAL NOT NULL,
  coupon_pct   INTEGER DEFAULT 0,
  ship_usd     REAL DEFAULT 0,
  pay_mode     TEXT DEFAULT 'wallet',       -- wallet | qr (شام كاش)
  sham_wallet  TEXT DEFAULT '',             -- رقم محفظة الدافع (إن وجد)
  invoice_no   INTEGER,                     -- رقم الفاتورة النظامية
  status       TEXT DEFAULT 'new',          -- new | done | canceled
  step         INTEGER DEFAULT 1,           -- 0 استلام 1 تجهيز 2 شحن 3 تسليم
  delivered_at TEXT,                        -- وقت التسليم (التحويل للبائع بعده بـ 7 أيام)
  created_at   TEXT DEFAULT (datetime('now'))
);

-- عناصر الطلب
CREATE TABLE IF NOT EXISTS order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  name       TEXT NOT NULL,                 -- نسخة من الاسم وقت الشراء
  qty        INTEGER NOT NULL,
  price_usd  REAL NOT NULL,
  rating     INTEGER DEFAULT 0              -- تقييم المشتري 1-5 بعد الاستلام
);

-- تحويلات أرباح البائعين (بعد 7 أيام من التسليم، بعد خصم 10%)
CREATE TABLE IF NOT EXISTS payouts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id   INTEGER NOT NULL REFERENCES stores(id),
  order_id   INTEGER NOT NULL REFERENCES orders(id),
  gross_usd  REAL NOT NULL,                 -- المبيع
  fee_usd    REAL NOT NULL,                 -- عمولة 10%
  net_usd    REAL NOT NULL,                 -- الصافي للبائع
  due_date   TEXT NOT NULL,                 -- تاريخ الاستحقاق = التسليم + 7 أيام
  paid       INTEGER DEFAULT 0
);

-- تعليقات وتقييمات المنتجات
CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  stars      INTEGER NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- منشورات المتاجر (حق النشر اليومي)
CREATE TABLE IF NOT EXISTS posts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id   INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  img        TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- الشكاوى والاستفسارات (بريد متجر الشايب → المدير)
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  from_email TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- البلاغات على المتاجر
CREATE TABLE IF NOT EXISTS reports (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id   INTEGER REFERENCES stores(id),
  by_user    INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- أكواد استعادة كلمة المرور (تنبعت عالإيميل)
CREATE TABLE IF NOT EXISTS reset_codes (
  email      TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_cat ON products(cat);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);

-- 🔄 الحالة المشتركة لوضع الديمو بالواجهة (طلبات البيع، المستخدمون، المنشورات...)
-- سطر واحد ثابت (id=1) مع رقم نسخة rev بيزيد مع كل تحديث
CREATE TABLE IF NOT EXISTS shared_state (
  id   INTEGER PRIMARY KEY CHECK (id=1),
  rev  INTEGER NOT NULL DEFAULT 0,
  dump TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT DEFAULT (datetime('now'))
);
