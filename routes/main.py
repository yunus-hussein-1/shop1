from flask import Blueprint, render_template, request, session, redirect, url_for
from sqlalchemy import func
from extensions import db
from models import Product, Category, Review, OrderItem, Order, Favorite
from flask_login import current_user
from utils import save_image

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def home():
    new_products = (
        Product.query.filter_by(is_active=True, is_new=True)
        .order_by(Product.created_at.desc())
        .limit(8)
        .all()
    )
    offer_products = (
        Product.query.filter_by(is_active=True, is_shayeb_offer=True)
        .order_by(Product.created_at.desc())
        .limit(8)
        .all()
    )

    # الأكثر مبيعاً: مجموع الكميات المباعة ضمن طلبات مكتملة
    best_seller_rows = (
        db.session.query(OrderItem.product_id, func.sum(OrderItem.quantity).label("sold"))
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.status == "completed")
        .group_by(OrderItem.product_id)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(8)
        .all()
    )
    best_seller_ids = [r[0] for r in best_seller_rows]
    best_sellers = []
    if best_seller_ids:
        products_map = {p.id: p for p in Product.query.filter(Product.id.in_(best_seller_ids), Product.is_active == True)}
        best_sellers = [products_map[pid] for pid in best_seller_ids if pid in products_map]

    categories = Category.query.all()

    recent_ids = session.get("recently_viewed", [])
    recently_viewed = []
    if recent_ids:
        products_map = {p.id: p for p in Product.query.filter(Product.id.in_(recent_ids), Product.is_active == True)}
        recently_viewed = [products_map[pid] for pid in recent_ids if pid in products_map][:8]

    return render_template(
        "index.html", new_products=new_products, offer_products=offer_products,
        best_sellers=best_sellers, categories=categories, recently_viewed=recently_viewed,
    )


@main_bp.route("/category/<slug>")
def category(slug):
    cat = Category.query.filter_by(slug=slug).first_or_404()
    sort = request.args.get("sort", "newest")

    q = Product.query.filter_by(category_id=cat.id, is_active=True)
    if sort == "price_asc":
        q = q.order_by(Product.price_usd.asc())
    elif sort == "price_desc":
        q = q.order_by(Product.price_usd.desc())
    elif sort == "rating":
        products = q.all()
        products.sort(key=lambda p: (p.avg_rating or 0), reverse=True)
        return render_template("shop/category.html", category=cat, products=products, sort=sort)
    else:
        q = q.order_by(Product.created_at.desc())

    products = q.all()
    return render_template("shop/category.html", category=cat, products=products, sort=sort)


@main_bp.route("/store/<int:store_id>")
def store_page(store_id):
    from models import Store
    store = Store.query.get_or_404(store_id)
    products = Product.query.filter_by(store_id=store.id, is_active=True).order_by(Product.created_at.desc()).all()
    return render_template("shop/store_page.html", store=store, products=products)


@main_bp.route("/product/<int:product_id>")
def product_detail(product_id):
    product = Product.query.get_or_404(product_id)
    reviews = Review.query.filter_by(product_id=product.id).order_by(Review.created_at.desc()).all()

    related_products = (
        Product.query.filter(
            Product.category_id == product.category_id,
            Product.id != product.id,
            Product.is_active == True,
        ).limit(4).all()
    )

    # تتبّع "شوهد مؤخراً" بجلسة الزائر (بدون حساب مستخدم)
    recent = session.get("recently_viewed", [])
    recent = [pid for pid in recent if pid != product.id]
    recent.insert(0, product.id)
    session["recently_viewed"] = recent[:10]

    return render_template(
        "shop/product.html", product=product, reviews=reviews, related_products=related_products
    )


@main_bp.route("/search")
def search():
    q = request.args.get("q", "").strip()
    results = []
    if q:
        results = Product.query.filter(
            Product.is_active == True, Product.title.ilike(f"%{q}%")
        ).all()
    return render_template("shop/search.html", query=q, results=results)


@main_bp.route("/search/by-image", methods=["GET", "POST"])
def search_by_image():
    """
    بحث عن منتج مشابه بالصورة (كاميرا/رفع صورة).
    ملاحظة مهمة: هاي نسخة أساسية (Phase 1) — بتسمح للمستخدم يرفع/يلتقط صورة،
    وحالياً بترجع أحدث المنتجات كنتيجة مبدئية.
    التحليل الذكي الحقيقي لمطابقة الصور (AI Visual Search) هو ميزة متقدمة
    محتاجة نموذج تعلّم آلي/خدمة خارجية، ومخطط نضيفها بمرحلة لاحقة.
    """
    uploaded_path = None
    results = []
    if request.method == "POST":
        file = request.files.get("photo")
        try:
            uploaded_path = save_image(file, subfolder="search")
        except ValueError as e:
            pass
        results = Product.query.filter_by(is_active=True).order_by(Product.created_at.desc()).limit(12).all()

    return render_template("shop/search_by_image.html", uploaded_path=uploaded_path, results=results)


@main_bp.route("/set-language/<lang>")
def set_language(lang):
    if lang in ("ar", "en", "tr"):
        session["lang"] = lang
    return redirect(request.referrer or url_for("main.home"))
