from functools import wraps

from flask import Blueprint, render_template, redirect, url_for, request, flash
from flask_login import login_required, current_user

from extensions import db
from models import Store, User, Order, Complaint, Report, ReturnRequest
from utils import notify_user, send_order_email

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            flash("هاي الصفحة لمسؤولي شايب فقط.", "danger")
            return redirect(url_for("main.home"))
        return f(*args, **kwargs)
    return wrapper


@admin_bp.route("/")
@login_required
@admin_required
def dashboard():
    pending_stores = Store.query.filter_by(status="pending").all()
    pending_payments = Order.query.filter_by(payment_status="pending_verification").all()
    open_complaints = Complaint.query.filter_by(status="open").all()
    open_reports = Report.query.filter_by(status="open").all()
    pending_returns = ReturnRequest.query.filter_by(status="pending").all()
    return render_template(
        "admin/dashboard.html",
        pending_stores=pending_stores,
        pending_payments=pending_payments,
        open_complaints=open_complaints,
        open_reports=open_reports,
        pending_returns=pending_returns,
    )


@admin_bp.route("/stores/<int:store_id>/approve", methods=["POST"])
@login_required
@admin_required
def approve_store(store_id):
    store = Store.query.get_or_404(store_id)
    store.status = "approved"
    db.session.commit()
    flash(f"تمت الموافقة على متجر {store.name}.", "success")
    return redirect(url_for("admin.dashboard"))


@admin_bp.route("/stores/<int:store_id>/reject", methods=["POST"])
@login_required
@admin_required
def reject_store(store_id):
    store = Store.query.get_or_404(store_id)
    store.status = "rejected"
    db.session.commit()
    flash(f"تم رفض طلب متجر {store.name}.", "info")
    return redirect(url_for("admin.dashboard"))


@admin_bp.route("/stores/<int:store_id>/ban", methods=["POST"])
@login_required
@admin_required
def ban_store(store_id):
    store = Store.query.get_or_404(store_id)
    store.status = "banned"
    db.session.commit()
    flash(f"تم حظر متجر {store.name}.", "warning")
    return redirect(url_for("admin.dashboard"))


@admin_bp.route("/users/<int:user_id>/ban", methods=["POST"])
@login_required
@admin_required
def ban_user(user_id):
    user = User.query.get_or_404(user_id)
    user.is_banned = True
    db.session.commit()
    flash(f"تم حظر المستخدم {user.name}.", "warning")
    return redirect(url_for("admin.dashboard"))


@admin_bp.route("/orders/<int:order_id>/confirm-payment", methods=["POST"])
@login_required
@admin_required
def confirm_payment(order_id):
    order = Order.query.get_or_404(order_id)
    order.payment_status = "paid"
    order.status = "confirmed"
    notify_user(order.buyer_id, f"تم تأكيد دفع طلبك رقم {order.order_number} ✅", link=url_for("shop.order_detail", order_id=order.id))
    send_order_email(order.buyer.email, f"تم تأكيد دفع طلبك {order.order_number}", f"تم تأكيد دفعك بنجاح، وطلبك رقم {order.order_number} قيد التجهيز الآن.")
    db.session.commit()
    flash(f"تم تأكيد دفع الطلب {order.order_number}.", "success")
    return redirect(url_for("admin.dashboard"))


@admin_bp.route("/orders/<int:order_id>/reject-payment", methods=["POST"])
@login_required
@admin_required
def reject_payment(order_id):
    order = Order.query.get_or_404(order_id)
    order.payment_status = "failed"
    order.status = "cancelled"
    notify_user(order.buyer_id, f"للأسف تم رفض إثبات دفع طلبك رقم {order.order_number}، تواصل معنا للمساعدة.", link=url_for("shop.order_detail", order_id=order.id))
    send_order_email(order.buyer.email, f"مشكلة بدفع طلبك {order.order_number}", f"للأسف ما قدرنا نأكد دفع طلبك رقم {order.order_number}. تواصل معنا على support@alshayebshop.com للمساعدة.")
    db.session.commit()
    flash(f"تم رفض إثبات دفع الطلب {order.order_number}.", "warning")
    return redirect(url_for("admin.dashboard"))


@admin_bp.route("/orders/<int:order_id>/advance-status", methods=["POST"])
@login_required
@admin_required
def advance_order_status(order_id):
    order = Order.query.get_or_404(order_id)
    flow = ["confirmed", "shipped", "delivered", "completed"]
    labels = {"shipped": "تم شحن طلبك 🚚", "delivered": "تم توصيل طلبك 📦", "completed": "اكتمل طلبك، بالهنا والشفا 🎉"}
    if order.status in flow[:-1]:
        next_status = flow[flow.index(order.status) + 1]
        order.status = next_status
        if next_status in labels:
            notify_user(order.buyer_id, f"{labels[next_status]} — طلب رقم {order.order_number}", link=url_for("shop.order_detail", order_id=order.id))
            send_order_email(order.buyer.email, f"تحديث حالة طلبك {order.order_number}", f"{labels[next_status]}\n\nطلب رقم: {order.order_number}")
        db.session.commit()
        flash(f"تم تحديث حالة الطلب إلى: {next_status}", "success")
    return redirect(url_for("shop.order_detail", order_id=order.id))


@admin_bp.route("/returns/<int:return_id>/approve", methods=["POST"])
@login_required
@admin_required
def approve_return(return_id):
    rr = ReturnRequest.query.get_or_404(return_id)
    rr.status = "approved"
    db.session.commit()
    flash("تم قبول طلب الإرجاع/الاستبدال.", "success")
    return redirect(url_for("admin.dashboard"))


@admin_bp.route("/returns/<int:return_id>/reject", methods=["POST"])
@login_required
@admin_required
def reject_return(return_id):
    rr = ReturnRequest.query.get_or_404(return_id)
    rr.status = "rejected"
    db.session.commit()
    flash("تم رفض طلب الإرجاع/الاستبدال.", "info")
    return redirect(url_for("admin.dashboard"))
