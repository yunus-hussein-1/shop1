from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_mail import Mail
from flask_migrate import Migrate

db = SQLAlchemy()
login_manager = LoginManager()
mail = Mail()
migrate = Migrate()

login_manager.login_view = "auth.login"
login_manager.login_message = "لازم تسجل دخول أول عشان توصل لهاد الصفحة."
login_manager.login_message_category = "warning"
