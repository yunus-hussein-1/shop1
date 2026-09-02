from flask import Blueprint, render_template, redirect, url_for, request, flash
from flask_login import login_required, current_user

from extensions import db
from models import Store, Product, Category, OrderItem, Order, StorePhoto
from utils import save_image

seller_bp = Blueprint("seller", __name__, url_prefix="/sell")


@seller_bp.route("/", methods=["GET", "POST"])
@login_required
def apply():
    if current_user.store:
        return redirect(url_for("seller.dashboard"))

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        category = request.form.get("category", "clothing")
        description = request.form.get("description", "").strip()
        shamcash_number = request.form.get("shamcash_number", "").strip()
        tax_number = request.form.get("tax_number", "").strip()
        agree = request.form.get("agree_terms")
        logo = request.files.get("logo")
        store_photos = request.files.getlist("store_photos")

        if not name or not agree or not shamcash_number or not tax_number:
            flash("عبّي اسم المتجر، رقم شام كاش، الرقم الضريبي، ووافق على الشروط أول.", "danger")
            return render_template("seller/apply.html")

        real_photos = [f for f in store_photos if f and f.filename]
        if not real_photos:
            flash("لازم ترفع صورة واحدة عالأقل حقيقية لمحلك.", "danger")
            return render_template("seller/apply.html")

        store = Store(
            owner_id=current_user.id, name=name, category=category,
            description=description, shamcash_number=shamcash_number,
            tax_number=tax_number, agreed_to_terms=True, status="pending",
        )
        try:
            store.logo_path = save_image(logo, subfolder="stores")
        except ValueError as e:
            flash(str(e), "danger")
            return render_template("seller/apply.html")

        db.session.add(store)
        db.session.flush()

        try:
            for f in real_photos[:5]:
                path = save_image(f, subfolder="store_photos")
                db.session.add(StorePhoto(store_id=store.id, image_path=path))
        except ValueError as e:
            db.session.rollback()
            flash(str(e), "danger")
            return render_template("seller/apply.html")

        db.session.commit()
        flash("تم إرسال طلبك للبيع على شايب! رح تنراجع من فريقنا وتنعلمك بالنتيجة.", "success")
        return redirect(url_for("seller.dashboard"))

    return render_template("seller/apply.html")


@seller_bp.route("/dashboard")
@login_required
def dashboard():
    store = current_user.store
    if not store:
        return redirect(url_for("seller.apply"))

    sold_items = []
    stats = {"orders_count": 0, "total_sold_usd": 0, "net_earnings_usd": 0, "pending_payout_usd": 0}

    if store.status == "approved":
        sold_items = OrderItem.query.join(Order).filter(OrderItem.store_id == store.id).all()
        from models import Order as OrderModel
        completed_or_paid = [i for i in sold_items if i.order.payment_status == "paid"]
        gross = sum(i.unit_price_usd * i.quantity for i in completed_or_paid)
        commission_rate = 0.10
        stats["orders_count"] = len({i.order_id for i in sold_items})
        stats["total_sold_usd"] = gross
        stats["net_earnings_usd"] = gross * (1 - commission_rate)
        stats["pending_payout_usd"] = sum(
            i.unit_price_usd * i.quantity * (1 - commission_rate)
            for i in completed_or_paid if i.order.seller_payout_status == "held"
        )

    return render_template("seller/dashboard.html", store=store, sold_items=sold_items, stats=stats)


@seller_bp.route("/products/add", methods=["GET", "POST"])
@login_required
def add_product():
    store = current_user.store
    if not store or store.status != "approved":
        flash("لازم يوافق فريق شايب على متجرك أول قبل ما تضيف منتجات.", "warning")
        return redirect(url_for("seller.dashboard"))

    categories = Category.query.all()

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()
        price = request.form.get("price_usd", "0")
        discount = request.form.get("discount_percent", "0")
        stock = request.form.get("stock", "1")
        category_id = request.form.get("category_id")
        is_offer = bool(request.form.get("is_shayeb_offer"))
        image = request.files.get("image")

        try:
            price_val = float(price)
            discount_val = int(discount)
            stock_val = int(stock)
        except ValueError:
            flash("تأكد إنو السعر والكمية والعرض أرقام صحيحة.", "danger")
            return render_template("seller/add_product.html", categories=categories)

        if not title or price_val <= 0:
            flash("اسم المنتج والسعر مطلوبين.", "danger")
            return render_template("seller/add_product.html", categories=categories)

        product = Product(
            store_id=store.id, category_id=category_id, title=title,
            description=description, price_usd=price_val,
            discount_percent=discount_val, stock=stock_val,
            is_shayeb_offer=is_offer, is_new=True,
        )
        try:
            product.image_path = save_image(image, subfolder="products")
        except ValueError as e:
            flash(str(e), "danger")
            return render_template("seller/add_product.html", categories=categories)

        if not product.image_path:
            flash("لازم تحط صورة حقيقية للمنتج من عندك.", "danger")
            return render_template("seller/add_product.html", categories=categories)

        db.session.add(product)
        db.session.commit()
        flash("تمت إضافة المنتج بنجاح 🎉", "success")
        return redirect(url_for("seller.dashboard"))

    return render_template("seller/add_product.html", categories=categories)
