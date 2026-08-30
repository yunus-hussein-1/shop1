from datetime import datetime

from flask import Blueprint, render_template, redirect, url_for, request, flash
from flask_login import login_required, current_user, logout_user

from extensions import db
from models import Address, Order

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
    return render_template("profile/dashboard.html", recent_orders=recent_orders)


@profile_bp.route("/edit", methods=["GET", "POST"])
@login_required
def edit_info():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        phone = request.form.get("phone", "").strip()
        birth_date = request.form.get("birth_date", "")

        from models import User
        existing = User.query.filter(User.email == email, User.id != current_user.id).first()
        if existing:
            flash("في حساب تاني مستخدم هاد الإيميل.", "danger")
            return render_template("profile/edit.html")

        current_user.name = name or current_user.name
        current_user.email = email or current_user.email
        current_user.phone = phone
        if birth_date:
            try:
                current_user.birth_date = datetime.strptime(birth_date, "%Y-%m-%d").date()
            except ValueError:
                pass

        db.session.commit()
        flash("تم تحديث معلوماتك بنجاح.", "success")
        return redirect(url_for("profile.dashboard"))

    return render_template("profile/edit.html")


@profile_bp.route("/addresses")
@login_required
def addresses():
    addr_list = Address.query.filter_by(user_id=current_user.id).all()
    return render_template("profile/addresses.html", addresses=addr_list)


@profile_bp.route("/settings", methods=["GET", "POST"])
@login_required
def settings():
    if request.method == "POST":
        action = request.form.get("action")

        if action == "change_password":
            old_pw = request.form.get("old_password", "")
            new_pw = request.form.get("new_password", "")
            confirm = request.form.get("confirm", "")

            if not current_user.check_password(old_pw):
                flash("كلمة السر الحالية غير صحيحة.", "danger")
            elif len(new_pw) < 8 or new_pw != confirm:
                flash("كلمة السر الجديدة لازم تكون 8 محارف عالأقل ومتطابقة.", "danger")
            else:
                current_user.set_password(new_pw)
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
