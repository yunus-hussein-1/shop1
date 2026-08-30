from flask import Blueprint, render_template, request
from models import Order

pages_bp = Blueprint("pages", __name__)


@pages_bp.route("/about")
def about():
    return render_template("pages/about.html")


@pages_bp.route("/terms")
def terms():
    return render_template("pages/terms.html")


@pages_bp.route("/privacy")
def privacy():
    return render_template("pages/privacy.html")


@pages_bp.route("/returns")
def returns():
    return render_template("pages/returns.html")


@pages_bp.route("/seller-agreement")
def seller_agreement():
    return render_template("pages/seller_agreement.html")


@pages_bp.route("/track-order", methods=["GET", "POST"])
def track_order():
    order = None
    searched = False
    if request.method == "POST":
        searched = True
        order_number = request.form.get("order_number", "").strip()
        order = Order.query.filter_by(order_number=order_number).first()
    return render_template("pages/track_order.html", order=order, searched=searched)
