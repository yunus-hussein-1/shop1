import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    # --- الأمان ---
    # مهم جداً: قبل الإطلاق الحقيقي، حط قيمة عشوائية طويلة هون عن طريق متغير بيئة SECRET_KEY
    # ولا تترك القيمة الافتراضية أبداً في بيئة الإنتاج.
    SECRET_KEY = os.environ.get("SECRET_KEY", "change-this-to-a-long-random-value-before-launch")

    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'shayeb.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # جلسات الدخول
    PERMANENT_SESSION_LIFETIME = timedelta(days=14)
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    # فعّلها true إلزامياً بعد ما تحط الموقع خلف HTTPS فعلي
    SESSION_COOKIE_SECURE = os.environ.get("FORCE_HTTPS", "0") == "1"

    # رفع الملفات
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "uploads")
    MAX_CONTENT_LENGTH = 6 * 1024 * 1024  # 6MB لكل طلب رفع
    ALLOWED_IMAGE_EXT = {"png", "jpg", "jpeg", "webp"}

    # البريد (لإرسال كود استعادة كلمة السر). عبّي القيم دي من متغيرات بيئة حقيقية قبل الإطلاق
    MAIL_SERVER = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME", "")  # مثال: care@shayebshop.com
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD", "")  # App Password وليس كلمة السر العادية
    MAIL_DEFAULT_SENDER = os.environ.get("MAIL_DEFAULT_SENDER", "ALSHAYEB SHOP <no-reply@alshayebshop.com>")

    # إيميل الأدمن العام المسؤول الكامل عن التطبيق (حظر/قبول/رفض متاجر ومستخدمين)
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "yunuselhuseyin82@gmail.com")

    # بريد المتجر العام يلي بيوصلو شكاوى/استفسارات الزبائن (بيتحول لصندوق الأدمن)
    SUPPORT_EMAIL = os.environ.get("SUPPORT_EMAIL", "support@alshayebshop.com")

    # بيانات شام كاش الرسمية للشركة (تظهر للزبون وقت الدفع)
    # !! استبدل static/shamcash_qr.png بصورة الباركود الحقيقية من تطبيق شام كاش تبعك، وحدّث الرقم هون !!
    SHAMCASH_NUMBER = os.environ.get("SHAMCASH_NUMBER", "0999999999")
    SHAMCASH_QR_PATH = "shamcash_qr.png"

    # عمولة المنصة على كل عملية بيع
    PLATFORM_COMMISSION_PERCENT = 10

    # مدة الاحتفاظ بمبلغ الطلب قبل تحويله لصاحب المتجر (بالأيام)
    SELLER_PAYOUT_DELAY_DAYS = 7

    # أسعار الصرف التقريبية (لازم تحدّثها بشكل دوري يدوياً أو عبر API خارجي)
    # القيم = كم وحدة من هاي العملة تساوي 1 دولار أمريكي
    EXCHANGE_RATES_PER_USD = {
        "USD": 1,
        "SYP": 13000,   # الليرة السورية
        "TRY": 34,      # الليرة التركية
    }

    LANGUAGE_CURRENCY_MAP = {
        # العملة موحّدة ليرة سوري بكل اللغات — كل الدفع الفعلي بيصير عبر شام كاش بالليرة السوري
        "ar": "SYP",
        "en": "SYP",
    }

    CURRENCY_SYMBOL = {
        "SYP": "ل.س",
        "USD": "$",
        "TRY": "₺",
    }
