import secrets
from datetime import datetime, timedelta

from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

from extensions import db


def gen_order_number():
    return "SH-" + secrets.token_hex(4).upper()


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(160), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(30))
    birth_date = db.Column(db.Date)
    preferred_lang = db.Column(db.String(5), default="ar")
    avatar_path = db.Column(db.String(255))

    is_admin = db.Column(db.Boolean, default=False)
    is_banned = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # تسجيل دخول بديل (جوجل مثلاً) — نخزن معرف الحساب البديل هون لاحقاً
    oauth_provider = db.Column(db.String(30))
    oauth_id = db.Column(db.String(255))

    addresses = db.relationship("Address", backref="user", cascade="all, delete-orphan")
    orders = db.relationship("Order", backref="buyer", cascade="all, delete-orphan")
    store = db.relationship("Store", backref="owner", uselist=False, cascade="all, delete-orphan")
    reviews = db.relationship("Review", backref="author", cascade="all, delete-orphan")
    favorites = db.relationship("Favorite", backref="user", cascade="all, delete-orphan")

    def set_password(self, raw):
        self.password_hash = generate_password_hash(raw)

    def check_password(self, raw):
        return check_password_hash(self.password_hash, raw)


class PasswordResetCode(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    code = db.Column(db.String(6), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)

    user = db.relationship("User")

    @staticmethod
    def new_for(user, minutes_valid=15):
        code = f"{secrets.randbelow(1000000):06d}"
        prc = PasswordResetCode(
            user_id=user.id,
            code=code,
            expires_at=datetime.utcnow() + timedelta(minutes=minutes_valid),
        )
        db.session.add(prc)
        return prc


class Address(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    label = db.Column(db.String(60))       # مثال: المنزل / العمل
    city = db.Column(db.String(80), nullable=False)
    area = db.Column(db.String(120))
    street_details = db.Column(db.String(255))
    phone = db.Column(db.String(30))
    is_default = db.Column(db.Boolean, default=False)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

    @property
    def maps_query(self):
        """نص العنوان الكامل يُستخدم لفتح خرائط جوجل."""
        parts = [self.city, self.area, self.street_details]
        return ", ".join([p for p in parts if p])


class Store(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    logo_path = db.Column(db.String(255))
    category = db.Column(db.String(30))   # clothing / electronics
    description = db.Column(db.Text)
    shamcash_number = db.Column(db.String(40))  # رقم شام كاش لاستلام المستحقات
    tax_number = db.Column(db.String(60))        # الرقم الضريبي للمحل

    status = db.Column(db.String(20), default="pending")  # pending / approved / rejected / banned
    agreed_to_terms = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    products = db.relationship("Product", backref="store", cascade="all, delete-orphan")
    photos = db.relationship("StorePhoto", backref="store", cascade="all, delete-orphan")


class StorePhoto(db.Model):
    """صور حقيقية للمحل (واجهة المحل، الديكور، إلخ) تُرفع عند طلب الانضمام."""
    id = db.Column(db.Integer, primary_key=True)
    store_id = db.Column(db.Integer, db.ForeignKey("store.id"), nullable=False)
    image_path = db.Column(db.String(255), nullable=False)


class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(40), unique=True, nullable=False)  # men/women/kids/electronics
    name_ar = db.Column(db.String(60))
    name_en = db.Column(db.String(60))
    name_tr = db.Column(db.String(60))


class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    store_id = db.Column(db.Integer, db.ForeignKey("store.id"), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("category.id"))

    title = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text)
    price_usd = db.Column(db.Float, nullable=False)   # نخزن دائماً بالدولار كمرجع، ونعرض بعملة اللغة
    discount_percent = db.Column(db.Integer, default=0)
    stock = db.Column(db.Integer, default=1)
    image_path = db.Column(db.String(255))  # صورة حقيقية من الاستوديو، وليست صورة جاهزة من الإنترنت
    is_new = db.Column(db.Boolean, default=True)
    is_shayeb_offer = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    category = db.relationship("Category")
    reviews = db.relationship("Review", backref="product", cascade="all, delete-orphan")
    images = db.relationship("ProductImage", backref="product", cascade="all, delete-orphan", order_by="ProductImage.sort_order")

    @property
    def final_price_usd(self):
        if self.discount_percent:
            return round(self.price_usd * (1 - self.discount_percent / 100), 2)
        return self.price_usd

    @property
    def avg_rating(self):
        vals = [r.rating for r in self.reviews]
        return round(sum(vals) / len(vals), 1) if vals else None

    @property
    def gallery(self):
        """كل صور المنتج بترتيبها؛ الصورة الرئيسية القديمة أول واحدة دايماً."""
        extra = [im.image_path for im in self.images]
        if self.image_path and self.image_path not in extra:
            return [self.image_path] + extra
        return extra or ([self.image_path] if self.image_path else [])


class ProductImage(db.Model):
    """صور إضافية للمنتج (معرض صور)."""
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    image_path = db.Column(db.String(255), nullable=False)
    sort_order = db.Column(db.Integer, default=0)


class CartItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    quantity = db.Column(db.Integer, default=1)

    product = db.relationship("Product")


class Favorite(db.Model):
    """المفضلة (Wishlist) — منتجات حفظها المستخدم للرجوع إلها لاحقاً."""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    product = db.relationship("Product")

    __table_args__ = (db.UniqueConstraint("user_id", "product_id", name="uq_user_product_fav"),)


class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(20), unique=True, default=gen_order_number)
    buyer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    address_id = db.Column(db.Integer, db.ForeignKey("address.id"))

    total_usd = db.Column(db.Float, nullable=False)
    platform_commission_usd = db.Column(db.Float, default=0)

    # الدفع عبر شام كاش: نتحقق يدوياً من فريق شايب
    payment_method = db.Column(db.String(30), default="shamcash")
    payment_reference = db.Column(db.String(120))     # رقم عملية شام كاش يدخله الزبون
    payment_proof_path = db.Column(db.String(255))    # صورة إيصال الدفع
    payment_status = db.Column(db.String(20), default="pending_verification")
    # pending_verification / paid / failed

    status = db.Column(db.String(30), default="processing")
    # processing -> confirmed -> shipped -> delivered -> completed | cancelled

    seller_payout_status = db.Column(db.String(20), default="held")  # held / released
    payout_release_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    address = db.relationship("Address")
    items = db.relationship("OrderItem", backref="order", cascade="all, delete-orphan")


class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("order.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    store_id = db.Column(db.Integer, db.ForeignKey("store.id"), nullable=False)

    title_snapshot = db.Column(db.String(160))
    unit_price_usd = db.Column(db.Float)
    quantity = db.Column(db.Integer, default=1)

    product = db.relationship("Product")
    store = db.relationship("Store")
    return_requests = db.relationship("ReturnRequest", backref="order_item", cascade="all, delete-orphan")


class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("product.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    order_item_id = db.Column(db.Integer, db.ForeignKey("order_item.id"))
    rating = db.Column(db.Integer, nullable=False)  # 1-5
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Complaint(db.Model):
    """رسائل الزبائن (شكاوى/استفسارات) بتوصل لصندوق شايب العام، وترتبط بمتجر معيّن."""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    store_id = db.Column(db.Integer, db.ForeignKey("store.id"))
    subject = db.Column(db.String(200))
    message = db.Column(db.Text)
    status = db.Column(db.String(20), default="open")  # open / resolved
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    store = db.relationship("Store")


class Report(db.Model):
    """إبلاغ عن متجر أو مستخدم."""
    id = db.Column(db.Integer, primary_key=True)
    reporter_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    target_store_id = db.Column(db.Integer, db.ForeignKey("store.id"))
    target_user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    reason = db.Column(db.Text)
    status = db.Column(db.String(20), default="open")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ReturnRequest(db.Model):
    """طلب إرجاع/استبدال منتج من طلب مكتمل."""
    id = db.Column(db.Integer, primary_key=True)
    order_item_id = db.Column(db.Integer, db.ForeignKey("order_item.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    request_type = db.Column(db.String(20), default="return")  # return / exchange
    reason = db.Column(db.Text)
    status = db.Column(db.String(20), default="pending")  # pending / approved / rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User")
