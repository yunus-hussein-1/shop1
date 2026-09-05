from datetime import datetime, date

from flask import Blueprint, render_template, redirect, url_for, request, flash, session
from flask_login import login_user, logout_user, login_required, current_user
from flask_mail import Message

from extensions import db, mail
from models import User, PasswordResetCode

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("main.home"))

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        confirm = request.form.get("confirm", "")
        agree = request.form.get("agree_terms")

        errors = []
        if not name or len(name) < 2:
            errors.append("الاسم مطلوب.")
        if "@" not in email or "." not in email:
            errors.append("الإيميل غير صحيح.")
        if len(password) < 8:
            errors.append("كلمة السر لازم تكون 8 محارف على الأقل.")
        if password != confirm:
            errors.append("كلمتا السر غير متطابقتين.")
        if not agree:
            errors.append("لازم توافق على اتفاقية الاستخدام أول.")
        if User.query.filter_by(email=email).first():
            errors.append("في حساب مسجل بهاد الإيميل مسبقاً.")

        if errors:
            for e in errors:
                flash(e, "danger")
            return render_template("auth/register.html", form=request.form)

        user = User(name=name, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        login_user(user)
        flash("تم إنشاء حسابك بنجاح! أهلاً فيك بعيلة شايب 🌿", "success")
        return redirect(url_for("main.home"))

    return render_template("auth/register.html", form={})


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("main.home"))

    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        remember = bool(request.form.get("remember"))

        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            flash("الإيميل أو كلمة السر غير صحيحة.", "danger")
            return render_template("auth/login.html")

        if user.is_banned:
            flash("هاد الحساب موقوف. تواصل معنا للاستفسار.", "danger")
            return render_template("auth/login.html")

        login_user(user, remember=remember)
        if user.preferred_lang:
            session["lang"] = user.preferred_lang
        flash(f"أهلاً فيك من جديد يا {user.name} 👋", "success")
        next_page = request.args.get("next")
        return redirect(next_page or url_for("main.home"))

    return render_template("auth/login.html")


@auth_bp.route("/login/google")
def login_google():
    # مكان جاهز لربط تسجيل الدخول البديل (Google OAuth).
    # يحتاج بيانات اعتماد حقيقية (Client ID/Secret) من Google Cloud Console قبل التفعيل.
    flash("تسجيل الدخول عبر جوجل قيد الإعداد حالياً.", "info")
    return redirect(url_for("auth.login"))


@auth_bp.route("/logout")
@login_required
def logout():
    logout_user()
    flash("تم تسجيل خروجك بنجاح.", "info")
    return redirect(url_for("main.home"))


@auth_bp.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        user = User.query.filter_by(email=email).first()
        if user:
            prc = PasswordResetCode.new_for(user)
            db.session.commit()
            try:
                import socket
                old_timeout = socket.getdefaulttimeout()
                socket.setdefaulttimeout(5)
                try:
                    msg = Message(
                        subject="كود استعادة كلمة السر - SHAYEB SHOP",
                        recipients=[user.email],
                        body=f"كود استعادة كلمة السر تبعك: {prc.code}\nصالح لمدة 15 دقيقة فقط.",
                    )
                    mail.send(msg)
                finally:
                    socket.setdefaulttimeout(old_timeout)
            except Exception:
                # بحال إعدادات البريد مش مفعّلة بعد، منعرض الكود بالشاشة (بيئة تطوير فقط!)
                flash(f"[وضع تجريبي - بدون إرسال بريد حقيقي] الكود: {prc.code}", "info")
            session["reset_email"] = email
        # ما منفضح إذا الإيميل موجود أو لأ (لأسباب أمنية)
        flash("إذا الإيميل مسجل عنا، رح توصلك رسالة فيها كود التفعيل.", "success")
        return redirect(url_for("auth.reset_password"))

    return render_template("auth/forgot_password.html")


@auth_bp.route("/reset-password", methods=["GET", "POST"])
def reset_password():
    email = session.get("reset_email")
    if not email:
        return redirect(url_for("auth.forgot_password"))

    if request.method == "POST":
        code = request.form.get("code", "").strip()
        new_password = request.form.get("new_password", "")
        confirm = request.form.get("confirm", "")

        user = User.query.filter_by(email=email).first()
        prc = (
            PasswordResetCode.query.filter_by(user_id=user.id, code=code, used=False)
            .order_by(PasswordResetCode.id.desc())
            .first()
            if user else None
        )

        if not prc or prc.expires_at < datetime.utcnow():
            flash("الكود غير صحيح أو منتهي الصلاحية.", "danger")
            return render_template("auth/reset_password.html")

        if len(new_password) < 8 or new_password != confirm:
            flash("تأكد إنو كلمة السر 8 محارف عالأقل ومتطابقة بالحقلين.", "danger")
            return render_template("auth/reset_password.html")

        user.set_password(new_password)
        prc.used = True
        db.session.commit()
        session.pop("reset_email", None)
        flash("تم تغيير كلمة السر بنجاح، فيك تسجل دخول هلق.", "success")
        return redirect(url_for("auth.login"))

    return render_template("auth/reset_password.html")
