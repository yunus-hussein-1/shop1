/* =====================================================
   SHAYEB SHOP — 🔄 المزامنة المشتركة + 🔔 إشعارات الإدارة
   -----------------------------------------------------
   المشكلة اللي بيحلها هالملف:
   طلب البيع كان بينحفظ بمتصفح البائع فقط (localStorage) —
   فالمدير على جهاز/متصفح تاني ما بيشوفه أبداً وما بيوصله إشعار.

   الحل: البيانات المشتركة (المستخدمون، طلبات البيع، المنتجات،
   المنشورات، الشكاوى، البلاغات) بتنحفظ بقاعدة بيانات الخادم
   (SQLite) عبر /api/sync، وكل متصفح بيتفقد التحديثات كل 5 ثوانٍ.
   لما يوصل طلب بيع جديد: بيطلع إشعار فوري للمدير + عدّاد أحمر 🔴
   على زر الحساب وعلى تبويب لوحة الإدارة، والطلب بيظهر بالقائمة.

   البيانات الشخصية (السلة، المفضلة، اللغة، الجلسة) بتضل محلية
   بكل متصفح ولا تتم مزامنتها.
   ملاحظة: هذا حل مرحلي بوضع الديمو — الربط الكامل بالـ API
   (بتوكنات وتشفير كلمات المرور بالخادم) هو الخطوة النهائية.
   ===================================================== */
const SYNC={
  api:(location.protocol==="http:"||location.protocol==="https:")?"/api/sync":null, // ما في خادم عند فتح الملف مباشرة file://
  rev:-1,        // رقم آخر نسخة وصلتنا من الخادم
  timer:null,
  pushing:false
};

/* البيانات المشتركة بين كل الأجهزة (بدون السلة/المفضلة/الجلسة) */
function sharedDump(){
  return {
    users:state.users, posts:state.posts, inbox:state.inbox, reportsList:state.reportsList,
    orderSeq:state.orderSeq, invSeq:state.invSeq,
    userProducts:PRODUCTS.filter(p=>p.ownerEmail)
  };
}
const pendingApps=()=>state.users.filter(x=>x.seller&&x.seller.status==="pending").length;

/* رفع البيانات المشتركة للخادم (بتنادى تلقائياً من saveDB) */
function pushShared(){
  if(!SYNC.api)return;
  SYNC.pushing=true;
  fetch(SYNC.api,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({dump:sharedDump()})})
    .then(r=>r.json()).then(d=>{if(d&&typeof d.rev==="number")SYNC.rev=d.rev})
    .catch(()=>{})
    .finally(()=>{SYNC.pushing=false});
}

/* تطبيق نسخة الخادم محلياً + إعادة رسم الواجهة */
function applyShared(d){
  if(!d)return;
  if(Array.isArray(d.users)&&d.users.length)state.users=d.users.map(x=>mkUser(x));
  if(Array.isArray(d.posts))state.posts=d.posts;
  if(Array.isArray(d.inbox))state.inbox=d.inbox;
  if(Array.isArray(d.reportsList))state.reportsList=d.reportsList;
  if(d.orderSeq>state.orderSeq)state.orderSeq=d.orderSeq;
  if(d.invSeq>state.invSeq)state.invSeq=d.invSeq;
  (d.userProducts||[]).forEach(p=>{
    const i=PRODUCTS.findIndex(x=>x.id===p.id);
    if(i<0)PRODUCTS.push(p);else PRODUCTS[i]=p;
  });
  ensureAdmin();
  // إعادة ربط جلسة المستخدم الحالي بالنسخة الجديدة من القائمة
  if(state.user){
    const u=state.users.find(x=>x.email===state.user.email);
    if(u&&!u.blocked){state.user=u;afterLogin()}else logout();
  }
  ensureAdminTab();
  updateBadges();refreshGrids();renderPosts();
  if($("accPage").classList.contains("open"))renderAccPanel();
}

/* التفقد الدوري: في تحديث جديد بالخادم؟ */
function pollShared(){
  if(!SYNC.api||SYNC.pushing)return;
  fetch(SYNC.api+"?since="+SYNC.rev).then(r=>r.json()).then(d=>{
    if(!d||typeof d.rev!=="number"||d.rev===SYNC.rev)return;
    const before=pendingApps(),first=SYNC.rev===-1;
    SYNC.rev=d.rev;
    if(d.dump)applyShared(d.dump);
    const after=pendingApps();
    // 🔔 إشعار فوري للمدير عند وصول طلب بيع جديد
    if(!first&&state.user&&state.user.role==="admin"&&after>before)toast(t("notifNewApp"));
    // أول اتصال وخادم فاضي؟ ارفع البيانات المحلية الموجودة
    if(first&&d.rev===0)pushShared();
  }).catch(()=>{});
}

function initSync(){
  if(!SYNC.api)return;   // فتح مباشر بدون خادم: بيشتغل التطبيق كالسابق (محلي فقط)
  pollShared();
  SYNC.timer=setInterval(pollShared,5000);
}
initSync();
