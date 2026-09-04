import os
from datetime import datetime
from flask import Flask, session, request

from config import Config
from extensions import db, login_manager, mail, migrate
from i18n import t, brand_name
from utils import format_price


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    login_manager.init_app(app)
    mail.init_app(app)
    migrate.init_app(app, db)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    from models import User

    # يطبّق أي هجرة (Migration) ناقصة تلقائياً عند بدء التشغيل — هيك ما في داعي تحذف قاعدة
    # البيانات يدوياً بعد اليوم كل ما يصير تغيير بالجداول. أول تشغيل بينشئ كل الجداول من الصفر.
    with app.app_context():
        from flask_migrate import upgrade as _migrate_upgrade
        try:
            _migrate_upgrade()
        except Exception:
            db.create_all()

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # --- تسجيل الـ Blueprints ---
    from routes.auth import auth_bp
    from routes.main import main_bp
    from routes.shop import shop_bp
    from routes.profile import profile_bp
    from routes.seller import seller_bp
    from routes.admin import admin_bp
    from routes.pages import pages_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(shop_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(seller_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(pages_bp)

    # --- اللغة الحالية بكل Request ---
    @app.before_request
    def set_lang():
        if "lang" not in session:
            session["lang"] = "ar"

    # --- متاح داخل كل القوالب ---
    @app.context_processor
    def inject_globals():
        lang = session.get("lang", "ar")
        from flask_login import current_user
        from models import Favorite, Notification, OrderItem, Order
        from sqlalchemy import func
        from datetime import timedelta

        fav_ids = set()
        unread_count = 0
        if current_user.is_authenticated:
            fav_ids = {f.product_id for f in Favorite.query.filter_by(user_id=current_user.id).all()}
            unread_count = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()

        week_ago = datetime.utcnow() - timedelta(days=7)
        weekly_rows = (
            db.session.query(OrderItem.product_id)
            .join(Order, Order.id == OrderItem.order_id)
            .filter(Order.created_at >= week_ago)
            .group_by(OrderItem.product_id)
            .order_by(func.sum(OrderItem.quantity).desc())
            .limit(5)
            .all()
        )
        weekly_best_ids = {r[0] for r in weekly_rows}

        return {
            "t": lambda key: t(key, lang),
            "current_lang": lang,
            "brand_name": brand_name(lang),
            "price": lambda usd: format_price(usd, lang),
            "dir": "rtl" if lang == "ar" else "ltr",
            "favorite_ids": fav_ids,
            "unread_notifications_count": unread_count,
            "weekly_best_ids": weekly_best_ids,
        }

    # --- رؤوس أمان أساسية على كل استجابة ---
    @app.after_request
    def set_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    return app


app = create_app()

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    # debug=True فقط أثناء التطوير المحلي! لازم تصير False بالإنتاج
    app.run(debug=True, port=5000)
