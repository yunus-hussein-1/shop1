from datetime import datetime

from flask import Blueprint, render_template, redirect, url_for, request, flash
from flask_login import login_required, current_user, logout_user

from extensions import db
from models import Address, Order, User, Favorite
from utils import save_image

profile_bp = Blueprint("profile", __name__, url_prefix="/account")


@profile_bp.route("/")
@login_required
def dashboard():
    recent_orders = (
        Order.query.filter_by(buyer_id=current_user.id)
        .order_by(Order.created_at.desc())
        .limit(5)
        .all()
    )
    stats = {
        "orders_count": Order.query.filter_by(buyer_id=current_user.id).count(),
        "favorites_count": Favorite.query.filter_by(user_id=current_user.id).count(),
        "addresses_count": Address.query.filter_by(user_id=current_user.id).count(),
    }

    # نسبة اكتمال الملف الشخصي — ميزة بسيطة تشجّع المستخدم يكمل بياناته
    checklist = [
        bool(current_user.avatar_path),
        bool(current_user.phone),
        bool(current_user.birth_date),
        stats["addresses_count"] > 0,
        bool(current_user.saved_shamcash_number),
    ]
    completion_percent = round(sum(checklist) / len(checklist) * 100)

    return render_template(
        "profile/dashboard.html", recent_orders=recent_orders, stats=stats,
        completion_percent=completion_percent,
    )


@profile_bp.route("/edit", methods=["GET", "POST"])
@login_required
def edit_info():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        phone = request.form.get("phone", "").strip()
        birth_date = request.form.get("birth_date", "")
        avatar = request.files.get("avatar")
        cover = request.files.get("cover")

        current_user.name = name or current_user.name
        current_user.phone = phone
        if birth_date:
            try:
                current_user.birth_date = datetime.strptime(birth_date, "%Y-%m-%d").date()
            except ValueError:
                pass

        if avatar and avatar.filename:
            try:
                current_user.avatar_path = save_image(avatar, subfolder="avatars")
            except ValueError as e:
                flash(str(e), "danger")
                return render_template("profile/edit.html")

        if cover and cover.filename:
            try:
                current_user.cover_path = save_image(cover, subfolder="covers")
            except ValueError as e:
                flash(str(e), "danger")
                return render_template("profile/edit.html")

        db.session.commit()
        flash("تم تحديث معلوماتك بنجاح.", "success")
        return redirect(url_for("profile.dashboard"))

    return render_template("profile/edit.html")


@profile_bp.route("/addresses")
@login_required
def addresses():
    addr_list = Address.query.filter_by(user_id=current_user.id).all()
    return render_template("profile/addresses.html", addresses=addr_list)


@profile_bp.route("/notifications")
@login_required
def notifications():
    from models import Notification
    items = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.created_at.desc()).all()
    unread = [n for n in items if not n.is_read]
    for n in unread:
        n.is_read = True
    if unread:
        db.session.commit()
    return render_template("profile/notifications.html", items=items)


@profile_bp.route("/activity")
@login_required
def activity():
    from models import ActivityLog
    logs = ActivityLog.query.filter_by(user_id=current_user.id).order_by(ActivityLog.created_at.desc()).limit(30).all()
    return render_template("profile/activity.html", logs=logs)


@profile_bp.route("/settings", methods=["GET", "POST"])
@login_required
def settings():
    if request.method == "POST":
        action = request.form.get("action")

        if action == "change_email":
            new_email = request.form.get("new_email", "").strip().lower()
            confirm_pw = request.form.get("confirm_password_email", "")
            if not current_user.check_password(confirm_pw):
                flash("كلمة السر غير صحيحة، ما تم تغيير الإيميل.", "danger")
            elif "@" not in new_email or "." not in new_email:
                flash("الإيميل الجديد غير صحيح.", "danger")
            elif User.query.filter(User.email == new_email, User.id != current_user.id).first():
                flash("في حساب تاني مستخدم هاد الإيميل.", "danger")
            else:
                current_user.email = new_email
                from models import ActivityLog
                db.session.add(ActivityLog(user_id=current_user.id, action="email_change", detail=new_email))
                db.session.commit()
                flash("تم تحديث الإيميل بنجاح.", "success")

        elif action == "save_payment_method":
            saved_number = request.form.get("saved_shamcash_number", "").strip()
            current_user.saved_shamcash_number = saved_number
            db.session.commit()
            flash("تم حفظ رقم شام كاش تبعك للدفع السريع.", "success")

        elif action == "save_preferences":
            unit = request.form.get("measurement_unit", "cm")
            if unit in ("cm", "inch"):
                current_user.measurement_unit = unit
            db.session.commit()
            flash("تم حفظ تفضيلاتك.", "success")

        elif action == "change_password":
            old_pw = request.form.get("old_password", "")
            new_pw = request.form.get("new_password", "")
            confirm = request.form.get("confirm", "")

            if not current_user.check_password(old_pw):
                flash("كلمة السر الحالية غير صحيحة.", "danger")
            elif len(new_pw) < 8 or new_pw != confirm:
                flash("كلمة السر الجديدة لازم تكون 8 محارف عالأقل ومتطابقة.", "danger")
            else:
                current_user.set_password(new_pw)
                current_user.password_changed_at = datetime.utcnow()
                from models import ActivityLog
                db.session.add(ActivityLog(user_id=current_user.id, action="password_change"))
                db.session.commit()
                flash("تم تغيير كلمة السر بنجاح.", "success")

        elif action == "delete_account":
            confirm_pw = request.form.get("confirm_password", "")
            if not current_user.check_password(confirm_pw):
                flash("كلمة السر غير صحيحة، ما تم حذف الحساب.", "danger")
            else:
                user = current_user
                logout_user()
                from extensions import db as _db
                _db.session.delete(user)
                _db.session.commit()
                flash("تم حذف حسابك نهائياً. بشتقلك 🌿", "info")
                return redirect(url_for("main.home"))

        return redirect(url_for("profile.settings"))

    return render_template("profile/settings.html")
