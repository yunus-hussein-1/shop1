/* =====================================================
   SHAYEB SHOP — البيانات: الفئات والقوائم والمنتجات
   ===================================================== */
/* ---------- Categories (جديد، امرأة، رجل، أطفال، إلكتروني) ---------- */
const T3=(ar,en,tr)=>({ar,en,tr});
const CATS=[
 {id:"new",label:T3("جديد","New","Yeni"),tag:true,groups:[]},
 {id:"women",label:T3("امرأة","Women","Kadın"),groups:[
   {t:T3("ملابس","Clothing","Giyim"),items:[T3("فستان","Dress","Elbise"),T3("تي شيرت","T-shirt","Tişört"),T3("قميص","Shirt","Gömlek"),T3("جينز","Jeans","Kot"),T3("جاكيت جينز","Denim jacket","Kot ceket")]},
   {t:T3("حذاء","Shoes","Ayakkabı"),items:[T3("أحذية بكعب عالٍ","High heels","Topuklu"),T3("حذاء رياضة","Sneakers","Spor ayakkabı"),T3("أحذية كاجوال","Casual shoes","Günlük ayakkabı"),T3("صنادل","Sandals","Sandalet")]},
   {t:T3("الإكسسوارات والحقائب","Accessories & Bags","Aksesuar & Çanta"),items:[T3("شنطة","Bag","Çanta"),T3("ساعة","Watch","Saat"),T3("مجوهرات","Jewelry","Takı"),T3("حافظة","Wallet","Cüzdan"),T3("وشاح","Scarf","Şal")]},
   {t:T3("مستحضرات التجميل","Beauty","Kozmetik"),items:[T3("عطر","Perfume","Parfüm"),T3("مكياج العيون","Eye makeup","Göz makyajı"),T3("العناية بالبشرة","Skincare","Cilt bakımı"),T3("العناية بالشعر","Haircare","Saç bakımı")]}]},
 {id:"men",label:T3("رجل","Men","Erkek"),groups:[
   {t:T3("ملابس","Clothing","Giyim"),items:[T3("تي شيرت","T-shirt","Tişört"),T3("قميص","Shirt","Gömlek"),T3("بنطلون","Trousers","Pantolon"),T3("بدلة رياضية","Tracksuit","Eşofman"),T3("سراويل","Shorts","Şort")]},
   {t:T3("حذاء","Shoes","Ayakkabı"),items:[T3("أحذية رياضية","Sneakers","Spor ayakkabı"),T3("أحذية كاجوال","Casual shoes","Günlük ayakkabı"),T3("أحذية المشي","Walking shoes","Yürüyüş ayakkabısı")]},
   {t:T3("الساعات والإكسسوارات","Watches & Accessories","Saat & Aksesuar"),items:[T3("ساعة","Watch","Saat"),T3("نظارات شمسية","Sunglasses","Güneş gözlüğü"),T3("حزام","Belt","Kemer"),T3("محفظة","Wallet","Cüzdan")]},
   {t:T3("حقائب","Bags","Çanta"),items:[T3("حقيبة ظهر","Backpack","Sırt çantası"),T3("حقيبة مراسلة","Messenger bag","Postacı çantası"),T3("حقيبة كمبيوتر محمول","Laptop bag","Laptop çantası")]}]},
 {id:"kids",label:T3("أطفال","Kids","Çocuk"),groups:[
   {t:T3("ولد","Boys","Erkek çocuk"),items:[T3("سويت شيرت","Sweatshirt","Sweatshirt"),T3("أحذية رياضية","Sneakers","Spor ayakkabı"),T3("بدلة رياضية","Tracksuit","Eşofman"),T3("تيشيرتات","T-shirts","Tişörtler")]},
   {t:T3("بنت","Girls","Kız çocuk"),items:[T3("فستان","Dress","Elbise"),T3("سويت شيرت","Sweatshirt","Sweatshirt"),T3("أحذية رياضية","Sneakers","Spor ayakkabı"),T3("ملابس داخلية وبيجامات","Underwear & PJs","İç giyim & pijama")]},
   {t:T3("لعبة","Toys","Oyuncak"),items:[T3("ألعاب تعليمية","Educational toys","Eğitici oyuncak"),T3("سيارة لعبة","Toy car","Oyuncak araba"),T3("لعبة تحكم عن بعد","RC toys","Uzaktan kumandalı")]},
   {t:T3("رعاية الطفل","Baby care","Bebek bakım"),items:[T3("حفاضات","Diapers","Bebek bezi"),T3("شامبو الأطفال","Baby shampoo","Bebek şampuanı"),T3("حقيبة أطفال","Kids bag","Çocuk çantası")]}]},
 {id:"elec",label:T3("إلكتروني","Electronics","Elektronik"),groups:[
   {t:T3("الهاتف","Phones","Telefon"),items:[T3("الهاتف المحمول","Mobile phones","Cep telefonu"),T3("أغطية الهواتف","Phone cases","Telefon kılıfı"),T3("الشواحن","Chargers","Şarj aletleri")]},
   {t:T3("أجهزة الكمبيوتر","Computers","Bilgisayar"),items:[T3("كمبيوتر محمول","Laptop","Laptop"),T3("جهاز لوحي","Tablet","Tablet"),T3("شاشة","Monitor","Monitör")]},
   {t:T3("الأجهزة المنزلية","Home appliances","Ev aletleri"),items:[T3("مكواة بخار","Steam iron","Buharlı ütü"),T3("خلاط","Blender","Blender"),T3("مكنسة روبوت","Robot vacuum","Robot süpürge"),T3("ماكينة قهوة","Coffee machine","Kahve makinesi")]},
   {t:T3("التكنولوجيا القابلة للارتداء","Wearables","Giyilebilir teknoloji"),items:[T3("ساعة ذكية","Smartwatch","Akıllı saat"),T3("سوار ذكي","Smart band","Akıllı bileklik"),T3("سماعات لاسلكية","Wireless earbuds","Kablosuz kulaklık")]}]}
];

/* ---------- Products — الأسعار الأساسية بالدولار ثم تُحوَّل حسب اللغة ---------- */
let PID=100;
const P=(name,cat,usd,oldUsd,rate,votes,icon,g1,g2,desc)=>({id:PID++,name,cat,usd,oldUsd,rate,votes,icon,g1,g2,img:null,seller:null,desc,comments:[],ownerEmail:null,stock:3+(PID%13)});
/* ✅ المتجر صار حقيقي وفاضي — المنتجات بتنضاف من البائعين عبر «البيع على الشايب»
   (بعد موافقة الإدارة من لوحة الإدارة 🛡️) */
const PRODUCTS=[];


