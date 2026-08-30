from flask import Blueprint, render_template, request, session, redirect, url_for
from models import Product, Category, Review
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
    categories = Category.query.all()
    return render_template(
        "index.html", new_products=new_products, offer_products=offer_products, categories=categories
    )


@main_bp.route("/category/<slug>")
def category(slug):
    cat = Category.query.filter_by(slug=slug).first_or_404()
    products = (
        Product.query.filter_by(category_id=cat.id, is_active=True)
        .order_by(Product.created_at.desc())
        .all()
    )
    return render_template("shop/category.html", category=cat, products=products)


@main_bp.route("/product/<int:product_id>")
def product_detail(product_id):
    product = Product.query.get_or_404(product_id)
    reviews = Review.query.filter_by(product_id=product.id).order_by(Review.created_at.desc()).all()
    return render_template("shop/product.html", product=product, reviews=reviews)


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
