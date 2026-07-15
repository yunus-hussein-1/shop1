/* =====================================================
   SHAYEB SHOP — ⚙️ إعدادات المالك: الإيميل، غوغل، العملات، الكوبونات
   ===================================================== */
/* =====================================================================
   SHAYEB SHOP v2 — demo storefront (client-side)
   أسعار الصرف التجريبية: عدّلها من CUR تحت. الأسعار الأساسية بالدولار.
===================================================================== */
const CUR={
  ar:{sym:"ل.س",rate:12500,after:true},   // ليرة سورية
  en:{sym:"$",  rate:1,    after:false},  // دولار
  tr:{sym:"₺",  rate:42,   after:true}    // ليرة تركية
};

/* ⚙️⚙️⚙️ إعدادات المالك — غيّرها لبياناتك قبل الانطلاق ⚙️⚙️⚙️ */
const ADMIN_EMAIL="yunuselhuseyin82@gmail.com";    // ← حط إيميلك الشخصي هون (المدير العام الكامل)
const ADMIN_PASS="admin1999";              // ← وغيّر كلمة سر الإدارة
const SUPPORT_MAIL="support@shayeb.shop"; // بريد متجر الشايب الرسمي للشكاوى (بيوصل للمدير)
const FREE_SHIP_USD=20,SHIP_USD=2;        // حد الشحن المجاني وكلفة الشحن (بالدولار)
const COUPONS={WELCOME10:10};             // الكوبونات الفعالة: كود → نسبة الخصم %

/* 🟢 باركود شام كاش الحقيقي تبع المتجر (لاستقبال الدفعات):
   حط صورة الباركود بمجلد img/ باسم sham-qr.png واكتب المسار هون.
   إذا تركته فاضياً "" بيظهر باركود تجريبي شكلي (غير قابل للمسح). */
const SHAM_QR_IMG="img/sham-qr.png";

/* 🔑🔑🔑 تسجيل الدخول عبر Google — تعليمات الربط (لما يجهز الدومين) 🔑🔑🔑
   1) افتح: console.cloud.google.com وأنشئ مشروع جديد باسم Shayeb Shop
   2) من القائمة: APIs & Services ← OAuth consent screen ← اختر External
      وعبّي اسم التطبيق (SHAYEB SHOP) وإيميل الدعم واحفظ
   3) بعدين: APIs & Services ← Credentials ← Create Credentials ← OAuth client ID
      واختر النوع: Web application
   4) بخانة Authorized JavaScript origins اضغط ADD URI وضيف دومينك، مثلاً:
      https://shayebshop.com    و    https://www.shayebshop.com
      (لازم https وبدون / بالآخر — وللتجربة المحلية ضيف كمان http://localhost)
   5) اضغط Create وبيطلعلك Client ID طويل بيخلص بـ .apps.googleusercontent.com
   6) انسخه والصقه مكان القيمة بالسطر تحت 👇 وخلص! الزر بيشتغل فوراً */
const GOOGLE_CLIENT_ID="PASTE_YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com";

