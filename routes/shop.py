from datetime import datetime, timedelta

from flask import Blueprint, render_template, redirect, url_for, request, flash, current_app, session, jsonify
from flask_login import login_required, current_user

from extensions import db
from models import CartItem, Product, Order, OrderItem, Address, Review, Favorite, ReturnRequest
from utils import save_image, send_order_email

shop_bp = Blueprint("shop", __name__)


@shop_bp.route("/cart")
@login_required
def cart():
    items = CartItem.query.filter_by(user_id=current_user.id).all()
    total = sum(i.product.final_price_usd * i.quantity for i in items)
    return render_template("shop/cart.html", items=items, total=total)


@shop_bp.route("/cart/mini")
@login_required
def mini_cart():
    from utils import format_price
    items = CartItem.query.filter_by(user_id=current_user.id).all()
    total = sum(i.product.final_price_usd * i.quantity for i in items)
    data = {
        "items": [
            {
                "id": i.id,
                "title": i.product.title,
                "image": url_for("static", filename=i.product.image_path) if i.product.image_path else "",
                "quantity": i.quantity,
                "price": format_price(i.product.final_price_usd * i.quantity, session.get("lang", "ar")),
            }
            for i in items
        ],
        "total": format_price(total, session.get("lang", "ar")),
        "count": sum(i.quantity for i in items),
    }
    return jsonify(data)


@shop_bp.route("/cart/add/<int:product_id>", methods=["POST"])
@login_required
def add_to_cart(product_id):
    product = Product.query.get_or_404(product_id)
    qty = max(1, int(request.form.get("quantity", 1)))

    item = CartItem.query.filter_by(user_id=current_user.id, product_id=product.id).first()
    if item:
        item.quantity += qty
    else:
        item = CartItem(user_id=current_user.id, product_id=product.id, quantity=qty)
        db.session.add(item)
    db.session.commit()
    flash("تمت إضافة المنتج للسلة 🛒", "success")
    return redirect(request.referrer or url_for("shop.cart"))


@shop_bp.route("/cart/remove/<int:item_id>", methods=["POST"])
@login_required
def remove_from_cart(item_id):
    item = CartItem.query.get_or_404(item_id)
    if item.user_id != current_user.id:
        flash("مو مسموح.", "danger")
        return redirect(url_for("shop.cart"))
    db.session.delete(item)
    db.session.commit()
    flash("تم إلغاء المنتج من السلة.", "info")
    return redirect(url_for("shop.cart"))


@shop_bp.route("/checkout", methods=["GET", "POST"])
@login_required
def checkout():
    items = CartItem.query.filter_by(user_id=current_user.id).all()
    if not items:
        flash("سلتك فاضية.", "warning")
        return redirect(url_for("main.home"))

    addresses = Address.query.filter_by(user_id=current_user.id).all()
    total = sum(i.product.final_price_usd * i.quantity for i in items)

    if request.method == "POST":
        address_id = request.form.get("address_id")
        payment_reference = request.form.get("payment_reference", "").strip()
        proof_file = request.files.get("payment_proof")

        if not address_id:
            flash("لازم تختار عنوان توصيل.", "danger")
            return render_template("shop/checkout.html", items=items, total=total, addresses=addresses)

        commission = round(total * current_app.config["PLATFORM_COMMISSION_PERCENT"] / 100, 2)

        order = Order(
            buyer_id=current_user.id,
            address_id=address_id,
            total_usd=total,
            platform_commission_usd=commission,
            payment_reference=payment_reference,
            payout_release_at=datetime.utcnow() + timedelta(
                days=current_app.config["SELLER_PAYOUT_DELAY_DAYS"]
            ),
        )

        try:
            order.payment_proof_path = save_image(proof_file, subfolder="payment_proofs")
        except ValueError as e:
            flash(str(e), "danger")
            return render_template("shop/checkout.html", items=items, total=total, addresses=addresses)

        db.session.add(order)
        db.session.flush()

        for i in items:
            oi = OrderItem(
                order_id=order.id,
                product_id=i.product.id,
                store_id=i.product.store_id,
                title_snapshot=i.product.title,
                unit_price_usd=i.product.final_price_usd,
                quantity=i.quantity,
            )
            db.session.add(oi)
            if i.product.stock is not None:
                i.product.stock = max(0, i.product.stock - i.quantity)
            db.session.delete(i)

        db.session.commit()
        send_order_email(
            current_user.email,
            f"تم استلام طلبك رقم {order.order_number} - {current_app.config.get('SUPPORT_EMAIL','')}",
            f"أهلاً {current_user.name}،\n\nتم استلام طلبك رقم {order.order_number} بإجمالي {total:.2f}$.\n"
            f"رح يتأكد فريقنا من الدفع خلال وقت قصير ونعلمك فور التأكيد.\n\nشكراً لثقتك فينا 🌿",
        )
        flash("تم استلام طلبك! رح يتأكد فريق شايب من الدفع خلال وقت قصير.", "success")
        return redirect(url_for("shop.order_detail", order_id=order.id))

    return render_template("shop/checkout.html", items=items, total=total, addresses=addresses)


@shop_bp.route("/orders")
@login_required
def my_orders():
    orders = Order.query.filter_by(buyer_id=current_user.id).order_by(Order.created_at.desc()).all()
    return render_template("shop/orders.html", orders=orders)


@shop_bp.route("/orders/<int:order_id>")
@login_required
def order_detail(order_id):
    order = Order.query.get_or_404(order_id)
    if order.buyer_id != current_user.id and not current_user.is_admin:
        flash("مو مسموح تشوف هاد الطلب.", "danger")
        return redirect(url_for("shop.my_orders"))
    return render_template("shop/order_detail.html", order=order)


@shop_bp.route("/orders/<int:order_id>/cancel", methods=["POST"])
@login_required
def cancel_order(order_id):
    order = Order.query.get_or_404(order_id)
    if order.buyer_id != current_user.id:
        flash("مو مسموح.", "danger")
        return redirect(url_for("shop.my_orders"))
    if order.status in ("processing", "confirmed"):
        order.status = "cancelled"
        db.session.commit()
        flash("تم إلغاء الطلب.", "info")
    else:
        flash("ما فيك تلغي طلب صار بمرحلة شحن متقدمة.", "warning")
    return redirect(url_for("shop.order_detail", order_id=order.id))


@shop_bp.route("/orders/<int:order_item_id>/review", methods=["POST"])
@login_required
def add_review(order_item_id):
    from models import OrderItem
    oi = OrderItem.query.get_or_404(order_item_id)
    if oi.order.buyer_id != current_user.id:
        flash("مو مسموح.", "danger")
        return redirect(url_for("shop.my_orders"))
    if oi.order.status != "completed":
        flash("فيك تقيّم المنتج بعد استلامه فعلياً.", "warning")
        return redirect(url_for("shop.order_detail", order_id=oi.order_id))

    rating = int(request.form.get("rating", 5))
    comment = request.form.get("comment", "").strip()
    review = Review(
        product_id=oi.product_id, user_id=current_user.id,
        order_item_id=oi.id, rating=rating, comment=comment,
    )
    photo = request.files.get("photo")
    if photo and photo.filename:
        try:
            review.photo_path = save_image(photo, subfolder="reviews")
        except ValueError as e:
            flash(str(e), "danger")
            return redirect(url_for("shop.order_detail", order_id=oi.order_id))
    db.session.add(review)
    db.session.commit()
    flash("شكراً إلك على تقييمك 🌟", "success")
    return redirect(url_for("main.product_detail", product_id=oi.product_id))


@shop_bp.route("/orders/<int:order_item_id>/return", methods=["POST"])
@login_required
def request_return(order_item_id):
    oi = OrderItem.query.get_or_404(order_item_id)
    if oi.order.buyer_id != current_user.id:
        flash("مو مسموح.", "danger")
        return redirect(url_for("shop.my_orders"))
    if oi.order.status != "completed":
        flash("فيك تطلب إرجاع/استبدال بس بعد اكتمال الطلب.", "warning")
        return redirect(url_for("shop.order_detail", order_id=oi.order_id))

    rr = ReturnRequest(
        order_item_id=oi.id, user_id=current_user.id,
        request_type=request.form.get("request_type", "return"),
        reason=request.form.get("reason", "").strip(),
    )
    db.session.add(rr)
    db.session.commit()
    flash("تم إرسال طلب الإرجاع/الاستبدال، وفريق شايب رح يتواصل معك قريباً.", "success")
    return redirect(url_for("shop.order_detail", order_id=oi.order_id))


@shop_bp.route("/orders/<int:order_id>/reorder", methods=["POST"])
@login_required
def reorder(order_id):
    order = Order.query.get_or_404(order_id)
    if order.buyer_id != current_user.id:
        flash("مو مسموح.", "danger")
        return redirect(url_for("shop.my_orders"))

    added = 0
    for item in order.items:
        product = Product.query.get(item.product_id)
        if not product or not product.is_active:
            continue
        existing = CartItem.query.filter_by(user_id=current_user.id, product_id=product.id).first()
        if existing:
            existing.quantity += item.quantity
        else:
            db.session.add(CartItem(user_id=current_user.id, product_id=product.id, quantity=item.quantity))
        added += 1
    db.session.commit()

    if added:
        flash("تمت إضافة منتجات الطلبية السابقة لسلتك 🛒", "success")
        return redirect(url_for("shop.cart"))
    flash("للأسف المنتجات بهاد الطلبية ما عادت متوفرة.", "warning")
    return redirect(url_for("shop.order_detail", order_id=order.id))


# --- إدارة العناوين ---

@shop_bp.route("/addresses/add", methods=["POST"])
@login_required
def add_address():
    lat = request.form.get("latitude", "").strip()
    lng = request.form.get("longitude", "").strip()
    addr = Address(
        user_id=current_user.id,
        label=request.form.get("label", "المنزل"),
        city=request.form.get("city", "").strip(),
        area=request.form.get("area", "").strip(),
        street_details=request.form.get("street_details", "").strip(),
        phone=request.form.get("phone", "").strip(),
        is_default=bool(request.form.get("is_default")),
        latitude=float(lat) if lat else None,
        longitude=float(lng) if lng else None,
    )
    if not addr.city:
        flash("المدينة مطلوبة.", "danger")
        return redirect(url_for("profile.addresses"))

    if addr.is_default:
        Address.query.filter_by(user_id=current_user.id).update({"is_default": False})

    db.session.add(addr)
    db.session.commit()
    flash("تمت إضافة العنوان.", "success")
    return redirect(url_for("profile.addresses"))


@shop_bp.route("/addresses/<int:address_id>/delete", methods=["POST"])
@login_required
def delete_address(address_id):
    addr = Address.query.get_or_404(address_id)
    if addr.user_id != current_user.id:
        flash("مو مسموح.", "danger")
        return redirect(url_for("profile.addresses"))
    db.session.delete(addr)
    db.session.commit()
    flash("تم حذف العنوان.", "info")
    return redirect(url_for("profile.addresses"))


# --- المفضلة (Wishlist) ---

@shop_bp.route("/favorites")
@login_required
def favorites():
    items = Favorite.query.filter_by(user_id=current_user.id).order_by(Favorite.created_at.desc()).all()
    return render_template("shop/favorites.html", items=items)


@shop_bp.route("/favorites/toggle/<int:product_id>", methods=["POST"])
@login_required
def toggle_favorite(product_id):
    Product.query.get_or_404(product_id)
    existing = Favorite.query.filter_by(user_id=current_user.id, product_id=product_id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        added = False
    else:
        db.session.add(Favorite(user_id=current_user.id, product_id=product_id))
        db.session.commit()
        added = True
    return redirect(request.referrer or url_for("main.home"))
