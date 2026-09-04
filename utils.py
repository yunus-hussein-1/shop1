import os
import uuid
from flask import current_app
from werkzeug.utils import secure_filename


def allowed_file(filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext in current_app.config["ALLOWED_IMAGE_EXT"]


def save_image(file_storage, subfolder=""):
    """يحفظ صورة مرفوعة بأمان (اسم عشوائي، امتداد محدود) ويرجّع المسار النسبي."""
    if not file_storage or file_storage.filename == "":
        return None
    if not allowed_file(file_storage.filename):
        raise ValueError("امتداد الصورة غير مسموح. المسموح فقط: png, jpg, jpeg, webp")

    ext = secure_filename(file_storage.filename).rsplit(".", 1)[-1].lower()
    new_name = f"{uuid.uuid4().hex}.{ext}"

    folder = os.path.join(current_app.config["UPLOAD_FOLDER"], subfolder)
    os.makedirs(folder, exist_ok=True)
    full_path = os.path.join(folder, new_name)
    file_storage.save(full_path)

    rel_path = os.path.join("uploads", subfolder, new_name).replace("\\", "/")
    return rel_path


def get_currency_for_lang(lang):
    from flask import current_app
    return current_app.config["LANGUAGE_CURRENCY_MAP"].get(lang, "SYP")


def convert_from_usd(amount_usd, currency):
    from flask import current_app
    rate = current_app.config["EXCHANGE_RATES_PER_USD"].get(currency, 1)
    return round(amount_usd * rate, 2)


def format_price(amount_usd, lang):
    currency = get_currency_for_lang(lang)
    converted = convert_from_usd(amount_usd, currency)
    symbol = current_app_config_symbol(currency)
    # بالعربي/التركي الرمز بعد الرقم أنسب، بالإنجليزي قبل الرقم
    if lang == "en":
        return f"{symbol}{converted:,.2f}"
    return f"{converted:,.0f} {symbol}"


def current_app_config_symbol(currency):
    return current_app.config["CURRENCY_SYMBOL"].get(currency, "")


def notify_user(user_id, message, link=None):
    """يرسل إشعار داخل الموقع للمستخدم (يظهر بجرس الإشعارات)."""
    from extensions import db
    from models import Notification
    n = Notification(user_id=user_id, message=message, link=link)
    db.session.add(n)
    return n
