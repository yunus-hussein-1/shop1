import os
from flask import Flask, session, request

from config import Config
from extensions import db, login_manager, mail
from i18n import t
from utils import format_price


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    login_manager.init_app(app)
    mail.init_app(app)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    from models import User

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
        return {
            "t": lambda key: t(key, lang),
            "current_lang": lang,
            "price": lambda usd: format_price(usd, lang),
            "dir": "rtl" if lang == "ar" else "ltr",
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
