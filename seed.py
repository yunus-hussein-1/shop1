"""
سكربت تجهيز بيانات أولية للموقع.
شغّله مرة وحدة بعد إنشاء قاعدة البيانات:
    python seed.py
"""
from app import create_app
from extensions import db
from models import Category, User, Store, Product

app = create_app()

with app.app_context():
    db.create_all()

    # --- التصنيفات الأساسية ---
    default_categories = [
        ("men", "رجالي", "Men", "Erkek"),
        ("women", "نسائي", "Women", "Kadın"),
        ("kids", "أطفال", "Kids", "Çocuk"),
        ("electronics", "إلكتروني", "Electronics", "Elektronik"),
    ]
    for slug, ar, en, tr in default_categories:
        if not Category.query.filter_by(slug=slug).first():
            db.session.add(Category(slug=slug, name_ar=ar, name_en=en, name_tr=tr))
    db.session.commit()

    # --- حساب أدمن تجريبي ---
    admin_email = app.config["ADMIN_EMAIL"]
    admin = User.query.filter_by(email=admin_email).first()
    if not admin:
        admin = User(name="مدير شايب", email=admin_email, is_admin=True)
        # كلمة سر مؤقتة قوية بدل الكلمة الضعيفة — غيّرها فوراً من صفحة الإعدادات بعد أول دخول!
        admin.set_password("lp44!d@hmxHyc9")
        db.session.add(admin)
        db.session.commit()
        print(f"تم إنشاء حساب أدمن: {admin_email} / كلمة السر المؤقتة: lp44!d@hmxHyc9")

    # --- متجر تجريبي + منتجات (للاختبار فقط، احذفهم قبل الإطلاق الحقيقي) ---
    demo_owner = User.query.filter_by(email="demo@shayebshop.com").first()
    if not demo_owner:
        demo_owner = User(name="بائع تجريبي", email="demo@shayebshop.com")
        demo_owner.set_password("Demo1234!")
        db.session.add(demo_owner)
        db.session.commit()

    if not demo_owner.store:
        store = Store(
            owner_id=demo_owner.id, name="متجر شايب التجريبي",
            category="clothing", description="متجر تجريبي لعرض شكل المنصة.",
            shamcash_number="0999999999", agreed_to_terms=True, status="approved",
        )
        db.session.add(store)
        db.session.commit()

        men = Category.query.filter_by(slug="men").first()
        electronics = Category.query.filter_by(slug="electronics").first()

        demo_products = [
            Product(store_id=store.id, category_id=men.id, title="قميص كلاسيكي قطن",
                    description="قميص رجالي قطن 100% مريح للاستخدام اليومي.",
                    price_usd=18, discount_percent=10, stock=25, is_new=True),
            Product(store_id=store.id, category_id=electronics.id, title="سماعات لاسلكية",
                    description="سماعات بلوتوث بجودة صوت عالية وبطارية تدوم طويلاً.",
                    price_usd=35, discount_percent=0, stock=10, is_new=True, is_shayeb_offer=True),
        ]
        db.session.add_all(demo_products)
        db.session.commit()

    print("تم تجهيز البيانات الأولية بنجاح ✅")
