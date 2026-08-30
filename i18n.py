# ترجمات بسيطة للواجهة (عربي / إنجليزي / تركي)
# لو بدك تضيف كلمة جديدة: زيدها بالقاموس التلاتة بنفس المفتاح

TRANSLATIONS = {
    "ar": {
        "home": "الرئيسية", "new": "جديد", "men": "رجالي", "women": "نسائي",
        "kids": "أطفال", "electronics": "إلكتروني", "offers": "عروض شايب",
        "search_placeholder": "دور عن منتج بالاسم أو بالصورة...",
        "login": "تسجيل الدخول", "register": "إنشاء حساب", "logout": "تسجيل خروج",
        "cart": "السلة", "my_account": "حسابي", "sell_on_shayeb": "بيع على شايب",
        "add_to_cart": "أضف للسلة", "buy_now": "اشترِ الآن",
        "price": "السعر", "rating": "التقييم", "reviews": "التقييمات",
        "checkout": "إتمام الشراء", "orders": "طلباتي", "addresses": "عناويني",
        "settings": "الإعدادات", "about": "من نحنو", "terms": "الشروط والأحكام",
        "privacy": "سياسة الخصوصية", "returns": "سياسة الإرجاع",
        "seller_agreement": "اتفاقية البائع", "track_order": "تتبع الطلب",
    },
    "en": {
        "home": "Home", "new": "New", "men": "Men", "women": "Women",
        "kids": "Kids", "electronics": "Electronics", "offers": "Shayeb Offers",
        "search_placeholder": "Search a product by name or photo...",
        "login": "Log in", "register": "Sign up", "logout": "Log out",
        "cart": "Cart", "my_account": "My Account", "sell_on_shayeb": "Sell on Shayeb",
        "add_to_cart": "Add to cart", "buy_now": "Buy now",
        "price": "Price", "rating": "Rating", "reviews": "Reviews",
        "checkout": "Checkout", "orders": "My Orders", "addresses": "My Addresses",
        "settings": "Settings", "about": "About us", "terms": "Terms & Conditions",
        "privacy": "Privacy Policy", "returns": "Return Policy",
        "seller_agreement": "Seller Agreement", "track_order": "Track Order",
    },
    "tr": {
        "home": "Ana Sayfa", "new": "Yeni", "men": "Erkek", "women": "Kadın",
        "kids": "Çocuk", "electronics": "Elektronik", "offers": "Shayeb Fırsatları",
        "search_placeholder": "İsim veya fotoğrafla ürün ara...",
        "login": "Giriş yap", "register": "Kayıt ol", "logout": "Çıkış yap",
        "cart": "Sepet", "my_account": "Hesabım", "sell_on_shayeb": "Shayeb'de Sat",
        "add_to_cart": "Sepete ekle", "buy_now": "Şimdi al",
        "price": "Fiyat", "rating": "Puan", "reviews": "Yorumlar",
        "checkout": "Ödeme", "orders": "Siparişlerim", "addresses": "Adreslerim",
        "settings": "Ayarlar", "about": "Hakkımızda", "terms": "Şartlar ve Koşullar",
        "privacy": "Gizlilik Politikası", "returns": "İade Politikası",
        "seller_agreement": "Satıcı Sözleşmesi", "track_order": "Sipariş Takibi",
    },
}


def t(key, lang):
    return TRANSLATIONS.get(lang, TRANSLATIONS["ar"]).get(key, key)
