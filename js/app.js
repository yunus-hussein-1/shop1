/* =====================================================
   SHAYEB SHOP — منطق التطبيق كامل: دخول، سلة، دفع، إدارة، بائع
   ===================================================== */
/* ---------- State (داخل الجلسة فقط) ---------- */
const mkUser=o=>Object.assign({name:"",email:"",pass:"",phone:"",dob:"",notif:true,blocked:false,role:"user",points:0,usedCoupons:[],addresses:[],orders:[],seller:{status:"none",agreed:false,shamAcc:"",storeName:"",storeImg:null}},o);
const state={
  lang:"ar",view:"home",filter:null,
  users:[],  // ✅ ما في حسابات تجريبية — حساباتك الحقيقية بتنحفظ بالمتصفح، والمدير بينشأ تلقائياً من config.js
  user:null,cart:{},favs:new Set(),authMode:"login",accPanel:"profile",
  orderSeq:1000,invSeq:5000,posts:[],inbox:[],reportsList:[]
};
const $=id=>document.getElementById(id);
const t=k=>I18N[state.lang][k];
const pName=p=>p.name[state.lang];
const cur=()=>CUR[state.lang];
function money(usd){
  const c=cur();let v=usd*c.rate;
  v=c.rate>=1000?Math.round(v/100)*100:Math.round(v*100)/100;
  const num=v.toLocaleString(state.lang==="ar"?"ar-SY":state.lang==="tr"?"tr-TR":"en-US");
  return c.after?num+" "+c.sym:c.sym+num;
}
const esc=s=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

/* ---------- Base render ---------- */
function applyStaticText(){
  document.querySelectorAll("[data-i]").forEach(el=>{el.textContent=t(el.dataset.i)});
  $("searchInput").placeholder=t("searchPh");
  $("langLabel").textContent=I18N[state.lang].label;
  $("goDeals").textContent=t("dealsBtn");
  $("authSubmit").textContent=state.authMode==="login"?t("doLogin"):t("doSignup");
  $("footBottom").textContent=t("footBottom");
  $("camBtn").title=t("camTitle");
}
function renderNav(){
  const nav=$("navIn");nav.innerHTML="";
  CATS.forEach(c=>{
    const b=document.createElement("button");
    const activeNew=c.id==="new"&&state.view==="deals";
    b.className="nav-item"+((state.filter===c.id&&state.view==="home")||activeNew?" active":"");
    b.innerHTML=c.label[state.lang]+(c.tag?'<span class="new-tag">⚡</span>':"");
    b.addEventListener("mouseenter",()=>openMega(c));
    b.addEventListener("click",()=>{
      if(c.id==="new"){showDeals()}
      else{state.view="home";state.filter=(state.filter===c.id?null:c.id);showHome()}
      renderNav();closeMega();
    });
    nav.appendChild(b);
  });
}
function showHome(){state.view="home";$("homeView").style.display="block";$("dealsView").style.display="none";renderGrid()}
function showDeals(){state.view="deals";$("homeView").style.display="none";$("dealsView").style.display="block";renderBanners();renderDealsGrid();window.scrollTo({top:0,behavior:"smooth"})}
function openMega(c){
  if(!c.groups.length){closeMega();return}
  const m=$("megaIn");m.innerHTML="";
  c.groups.forEach(g=>{
    const col=document.createElement("div");
    col.innerHTML="<h4>"+g.t[state.lang]+" ›</h4>";
    const ul=document.createElement("ul");
    g.items.forEach(it=>{
      const li=document.createElement("li");li.textContent=it[state.lang];
      li.addEventListener("click",()=>{showHome();$("searchInput").value=it[state.lang];renderGrid();closeMega()});
      ul.appendChild(li);
    });
    col.appendChild(ul);m.appendChild(col);
  });
  $("mega").classList.add("open");
}
function closeMega(){$("mega").classList.remove("open")}
const BANNER_GRADS=[["#00713f","#00a86b"],["#005a32","#00915a"],["#007a45","#19b28c"],["#00713f","#2fae7d"],["#00915a","#00713f"],["#046b3f","#1fa87b"]];
const BANNER_ICONS=["👗","🔌","🏎️","👟","🫖","💈"];
const DEALS_T={
 ar:[{t:"أسعار ترويجية",d:"خصومات لغاية 70% على الموضة"},{t:"الأجهزة الإلكترونية",d:"توصيل سريع خلال 24 ساعة"},{t:"ألعاب وهدايا الأطفال",d:"فرحة الصغار بأسعار حلوة"},{t:"أحذية رياضية",d:"جهّز حالك للصيف"},{t:"أجهزة منزلية",d:"مكاوي بخار وخلاطات"},{t:"أدوات العناية",d:"عرض 2 بـ 1"}],
 en:[{t:"Promotional prices",d:"Up to 70% off fashion"},{t:"Electronics",d:"Fast delivery in 24h"},{t:"Kids toys & gifts",d:"Little joys, sweet prices"},{t:"Sports shoes",d:"Get summer-ready"},{t:"Home appliances",d:"Steam irons & blenders"},{t:"Care devices",d:"2-in-1 offer"}],
 tr:[{t:"Promosyonlu fiyatlar",d:"Modada %70'e varan indirim"},{t:"Elektronik",d:"24 saatte hızlı teslimat"},{t:"Çocuk oyuncak & hediye",d:"Minik mutluluklar, tatlı fiyatlar"},{t:"Spor ayakkabılar",d:"Yaza hazır ol"},{t:"Ev aletleri",d:"Buharlı ütü ve blender"},{t:"Bakım cihazları",d:"1 arada 2 fırsatı"}]};
function renderBanners(){/* أزيلت بنرات العروض التجريبية — قسم العروض بيعرض المنتجات المخفضة الحقيقية فقط */}

function renderTrust(){
  const tr=$("trust");tr.innerHTML="";
  t("trust").forEach(([ico,b,s])=>{
    const d=document.createElement("div");d.className="t-item";
    d.innerHTML='<div class="t-ico">'+ico+"</div><div><b>"+b+"</b><span>"+s+"</span></div>";
    tr.appendChild(d);
  });
}
function renderFooter(){
  [["footShopList","footShopL"],["footHelpList","footHelpL"],["footCorpList","footCorpL"]].forEach(([id,key])=>{
    $(id).innerHTML=t(key).map(x=>"<li>"+x+"</li>").join("");
  });
  const shopIds=["deals","women","men","kids","elec"];
  $("footShopList").querySelectorAll("li").forEach((li,i)=>li.addEventListener("click",()=>{
    if(shopIds[i]==="deals")showDeals();else{state.filter=shopIds[i];showHome()}
    renderNav();window.scrollTo({top:0,behavior:"smooth"});
  }));
  const helpIds=["contact","track","returns","terms","contact"];
  $("footHelpList").querySelectorAll("li").forEach((li,i)=>li.addEventListener("click",()=>openPage(helpIds[i])));
  const corpIds=["about","sell","terms","terms","privacy"];
  $("footCorpList").querySelectorAll("li").forEach((li,i)=>li.addEventListener("click",()=>{corpIds[i]==="sell"?openSell():openPage(corpIds[i])}));
}
const starStr=r=>"★".repeat(Math.round(r))+"☆".repeat(5-Math.round(r));
function productCard(p,small){
  const disc=p.oldUsd>p.usd?Math.round((1-p.usd/p.oldUsd)*100):0;
  const inCart=!!state.cart[p.id];
  const card=document.createElement("div");card.className="card";
  const imgHtml=p.img?'<img src="'+p.img+'" alt="">':ico("photo","ph");
  card.innerHTML=
    '<div class="c-img" style="background:linear-gradient(135deg,'+p.g1+","+p.g2+')">'+imgHtml+
    '<button class="c-fav'+(state.favs.has(p.id)?" on":"")+'">'+ico("heart",state.favs.has(p.id)?"fill":"")+"</button>"+
    (disc?'<span class="c-disc">%'+disc+"</span>":"")+
    (p.seller?'<span class="c-seller">'+ico("store")+" "+esc(p.seller)+"</span>":"")+"</div>"+
    '<div class="c-body"><div class="c-name">'+esc(pName(p))+"</div>"+
    '<div class="c-rate"><span class="stars">'+starStr(p.rate)+"</span> "+p.rate+" ("+p.votes.toLocaleString()+")</div>"+
    '<div class="c-price"><span class="now">'+money(p.usd)+"</span>"+(disc?'<span class="old">'+money(p.oldUsd)+"</span>":"")+"</div>"+
    (p.stock<=5?'<div style="font-size:11.5px;font-weight:800;color:var(--danger)">'+t("stockLeft").replace("{x}",p.stock)+"</div>":"")+
    '<button class="c-add'+(inCart?" inCart":"")+'">'+(inCart?ico("check")+" "+t("added"):ico("cart")+" +")+"</button></div>";
  card.querySelector(".c-fav").addEventListener("click",e=>{e.stopPropagation();toggleFav(p.id)});
  card.querySelector(".c-add").addEventListener("click",e=>{e.stopPropagation();addToCart(p.id)});
  card.addEventListener("click",()=>openProduct(p.id));
  return card;
}
function renderGrid(){
  const g=$("grid");g.innerHTML="";
  const q=($("searchInput").value||"").trim().toLowerCase();
  const list=PRODUCTS.filter(p=>{
    const okCat=!state.filter||p.cat===state.filter;
    const hay=(p.name.ar+" "+p.name.en+" "+p.name.tr).toLowerCase();
    return okCat&&(!q||hay.includes(q));
  });
  $("noResults").style.display=list.length?"none":"block";
  list.forEach(p=>g.appendChild(productCard(p)));
}
function renderDealsGrid(){
  const g=$("dealsGridEl");g.innerHTML="";
  PRODUCTS.filter(p=>p.oldUsd>p.usd).forEach(p=>g.appendChild(productCard(p)));
}

/* ---------- Favorites & Cart ---------- */
function toggleFav(id){
  if(state.favs.has(id)){state.favs.delete(id);toast(t("favRemoved"))}
  else{state.favs.add(id);toast(t("favAdded"))}
  updateBadges();refreshGrids();
  if($("accPage").classList.contains("open")&&state.accPanel==="favorites")renderAccPanel();
}
function addToCart(id){state.cart[id]=(state.cart[id]||0)+1;toast(t("added"));updateBadges();refreshGrids();renderCart()}
function refreshGrids(){if(state.view==="home")renderGrid();else renderDealsGrid()}
function updateBadges(){
  const n=Object.values(state.cart).reduce((a,b)=>a+b,0);
  $("cartBadge").style.display=n?"flex":"none";$("cartBadge").textContent=n;
  $("favBadge").style.display=state.favs.size?"flex":"none";$("favBadge").textContent=state.favs.size;
  $("favBtn").querySelector(".ico").innerHTML=ico("heart",state.favs.size?"fill":"");
  /* 🔔 عدّاد طلبات البيع الجديدة للمدير (زر الحساب + تبويب لوحة الإدارة) */
  const pend=(state.user&&state.user.role==="admin")?state.users.filter(x=>x.seller&&x.seller.status==="pending").length:0;
  const ab=$("adminBadge");if(ab){ab.style.display=pend?"flex":"none";ab.textContent=pend}
  const tb=$("adminTabBadge");if(tb){tb.style.display=pend?"inline-flex":"none";tb.textContent=pend}
}
function cartTotalUsd(){return Object.keys(state.cart).reduce((s,id)=>{const p=PRODUCTS.find(x=>x.id==id);return s+(p?p.usd*state.cart[id]:0)},0)}
function renderCart(){
  const body=$("cartBody");body.innerHTML="";
  const ids=Object.keys(state.cart).filter(id=>PRODUCTS.find(x=>x.id==id));
  if(!ids.length){body.innerHTML='<div class="d-empty"><div class="big">🛒</div>'+t("cartEmpty")+"</div>";$("cartFoot").style.display="none";return}
  ids.forEach(id=>{
    const p=PRODUCTS.find(x=>x.id==id);const qty=state.cart[id];
    const d=document.createElement("div");d.className="d-item";
    d.innerHTML='<div class="di-img" style="background:linear-gradient(135deg,'+p.g1+","+p.g2+')">'+(p.img?'<img src="'+p.img+'">':p.icon)+"</div>"+
      '<div style="flex:1"><div class="di-name">'+esc(pName(p))+'</div><div class="di-price">'+money(p.usd)+"</div>"+
      '<div class="qty"><button class="q-minus">−</button><b>'+qty+'</b><button class="q-plus">+</button></div></div>'+
      '<button class="d-remove">🗑</button>';
    d.querySelector(".q-plus").addEventListener("click",()=>{state.cart[id]++;renderCart();updateBadges();refreshGrids()});
    d.querySelector(".q-minus").addEventListener("click",()=>{state.cart[id]--;if(state.cart[id]<=0)delete state.cart[id];renderCart();updateBadges();refreshGrids()});
    d.querySelector(".d-remove").addEventListener("click",()=>{delete state.cart[id];toast(t("removed"));renderCart();updateBadges();refreshGrids()});
    body.appendChild(d);
  });
  $("cartFoot").style.display="block";
  $("cartTotal").textContent=money(cartTotalUsd());
  const subT=cartTotalUsd(),sb=$("shipBox");
  if(sb){if(subT>=FREE_SHIP_USD)sb.innerHTML='<div class="ship-note">'+t("shipFree")+'</div><div class="ship-bar"><i style="width:100%"></i></div>';
  else sb.innerHTML='<div class="ship-note">'+t("shipLeft").replace("{x}",money(FREE_SHIP_USD-subT))+'</div><div class="ship-bar"><i style="width:'+Math.round(subT/FREE_SHIP_USD*100)+'%"></i></div>';}
}
function openCart(){renderCart();$("cartDrawer").classList.add("open");$("drawerOverlay").classList.add("open")}
function closeCart(){$("cartDrawer").classList.remove("open");$("drawerOverlay").classList.remove("open")}

let toastTimer=null;
function toast(msg){$("toastMsg").textContent=msg;$("toast").classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").classList.remove("show"),2300)}


/* =====================================================
   💾 الحفظ الدائم بالمتصفح (localStorage)
   حساباتك ومنتجاتك وطلباتك بتضل محفوظة على هذا الجهاز
   حتى بعد إغلاق المتصفح. ملاحظة: كل جهاز إله تخزينه الخاص —
   مشاركة البيانات بين كل الزوار بتصير عند تفعيل الخادم.
   نصيحة: خلي صور المنتجات صغيرة (أقل من 300KB) حتى ما تمتلئ الذاكرة.
   ===================================================== */
const LS_KEY="shayeb_db_v1";
function saveDB(){
  try{
    const dump={
      users:state.users,posts:state.posts,inbox:state.inbox,reportsList:state.reportsList,
      orderSeq:state.orderSeq,invSeq:state.invSeq,
      userProducts:PRODUCTS.filter(p=>p.ownerEmail),   // منتجات البائعين
      favs:[...state.favs],cart:state.cart,lang:state.lang,
      sessionEmail:state.user?state.user.email:null    // 🔐 حفظ جلسة الدخول
    };
    localStorage.setItem(LS_KEY,JSON.stringify(dump));
  }catch(e){console.warn("التخزين ممتلئ؟ صغّر صور المنتجات.",e)}
  try{if(typeof pushShared==="function")pushShared()}catch(e){} // 🔄 مزامنة فورية مع الخادم
}
function loadDB(){
  try{
    const raw=localStorage.getItem(LS_KEY);if(!raw)return;
    const d=JSON.parse(raw);
    if(Array.isArray(d.users))state.users=d.users;
    state.posts=d.posts||[];state.inbox=d.inbox||[];state.reportsList=d.reportsList||[];
    state.orderSeq=d.orderSeq||1000;state.invSeq=d.invSeq||5000;
    (d.userProducts||[]).forEach(p=>{if(!PRODUCTS.some(x=>x.id===p.id))PRODUCTS.push(p)});
    state.favs=new Set(d.favs||[]);state.cart=d.cart||{};
    if(d.lang&&I18N[d.lang])state.lang=d.lang;
    if(d.sessionEmail){const u=state.users.find(x=>x.email===d.sessionEmail);if(u&&!u.blocked)state.user=u}
  }catch(e){console.warn(e)}
}
/* 👑 الإشراف التلقائي: أي حساب إيميله = ADMIN_EMAIL (بملف config.js)
   بياخد صلاحية الإدارة الكاملة تلقائياً */
function ensureAdmin(){
  const em=ADMIN_EMAIL.toLowerCase();
  let a=state.users.find(x=>x.email===em);
  if(!a){a=mkUser({name:"الإدارة العامة",email:em,pass:ADMIN_PASS,role:"admin"});state.users.push(a)}
  else a.role="admin";
}

/* ---------- Auth (v3: بريد بديل + نسيت كلمة السر + اتفاقية الاستخدام) ---------- */
let resetCtx=null;
function openAuth(mode){setAuthMode(mode||"login");showAuthView("main");$("authOverlay").classList.add("open");$("inEmail").focus()}
function closeOv(id){$(id).classList.remove("open")}
function showAuthView(v){
  $("authMain").style.display=v==="main"?"flex":"none";
  $("authReset").style.display=v==="main"?"none":"flex";
  if(v!=="main"){$("rStep2").style.display="none";$("rErr").textContent="";$("rEmail").value=""}
}
function setAuthMode(m){
  state.authMode=m;
  $("tabLogin").classList.toggle("active",m==="login");
  $("tabSignup").classList.toggle("active",m==="signup");
  $("fName").style.display=m==="signup"?"block":"none";
  $("termsRow").style.display=m==="signup"?"flex":"none";
  $("forgotLink").style.display=m==="login"?"inline-block":"none";
  $("authErr").textContent="";
  $("authSubmit").textContent=m==="login"?t("doLogin"):t("doSignup");
}
const emailOk=e=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const emailTaken=(e,except)=>state.users.some(u=>u!==except&&u.email===e);
function submitAuth(){
  const name=$("inName").value.trim(),email=$("inEmail").value.trim().toLowerCase(),
        pass=$("inPass").value,err=$("authErr");
  if(state.authMode==="signup"){
    if(!name||!email||!pass){err.textContent=t("errFill");return}
    if(!emailOk(email)){err.textContent=t("errEmail");return}
    if(pass.length<6){err.textContent=t("errPass");return}
    if(!$("signTerms").checked){err.textContent=t("mustAgree");return}
    if(emailTaken(email)){err.textContent=t("errExists");return}
    const u=mkUser({name,email,pass});
    state.users.push(u);state.user=u;closeOv("authOverlay");afterLogin();toast(t("accCreated"));
  }else{
    if(!email||!pass){err.textContent=t("errFill");return}
    const u=state.users.find(u=>u.email===email&&u.pass===pass);
    if(!u){err.textContent=t("errWrong");return}
    if(u.blocked){err.textContent=t("blockedMsg");return}
    state.user=u;closeOv("authOverlay");afterLogin();toast(t("loggedIn"));
  }
  $("inName").value="";$("inEmail").value="";$("inPass").value="";
}
function sendResetCode(){
  const e=$("rEmail").value.trim().toLowerCase(),err=$("rErr");
  if(!emailOk(e)){err.textContent=t("errEmail");return}
  const u=state.users.find(u=>u.email===e);
  if(!u){err.textContent=t("errNoUser");return}
  err.textContent="";
  resetCtx={u,code:String(Math.floor(100000+Math.random()*900000))};
  /* بالإنتاج: يُرسل الكود فعلياً عبر خدمة بريد من السيرفر */
  $("rInfo").textContent=t("codeSentA")+" "+t("codeDemo")+" "+resetCtx.code+")";
  $("rStep2").style.display="flex";
}
function doReset(){
  const err=$("rErr");
  if(!resetCtx)return;
  if($("rCode").value.trim()!==resetCtx.code){err.textContent=t("errCode");return}
  const n1=$("rNew").value,n2=$("rConf").value;
  if(n1.length<6){err.textContent=t("errPass");return}
  if(n1!==n2){err.textContent=t("passMismatch");return}
  resetCtx.u.pass=n1;resetCtx=null;err.textContent="";
  ["rCode","rNew","rConf"].forEach(i=>$(i).value="");
  showAuthView("main");setAuthMode("login");toast(t("resetDone"));
}

/* ---------- تسجيل الدخول عبر Google (زر GIS الرسمي) ---------- */
function parseJwt(tk){const b=tk.split(".")[1].replace(/-/g,"+").replace(/_/g,"/");return JSON.parse(decodeURIComponent(escape(atob(b))))}
function onGoogleCred(resp){
  try{
    const d=parseJwt(resp.credential);
    const em=(d.email||"").toLowerCase();
    if(!em)return;
    let u=state.users.find(x=>x.email===em);
    if(!u){u=mkUser({name:d.name||em.split("@")[0],email:em,pass:"g-"+Math.random().toString(36).slice(2)});state.users.push(u)}
    if(u.blocked){toast(t("blockedMsg"));return}
    state.user=u;closeOv("authOverlay");afterLogin();toast(t("loggedIn"));
  }catch(e){console.error("Google sign-in:",e)}
}
function initGoogleBtn(){
  const box=$("gBtn");if(!box)return;
  if(GOOGLE_CLIENT_ID.indexOf("PASTE_")===0){
    /* المفتاح لسا مو مربوط ← منعرض زر شكلي مع تنويه. بعد لصق الـ Client ID فوق، الزر الرسمي بيظهر لحاله */
    box.outerHTML='<div class="g-fake" id="gBtn" title="⚙️ GOOGLE_CLIENT_ID"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20.4H24v7.2h11.3C33.7 32.4 29.3 35.6 24 35.6c-6.4 0-11.6-5.2-11.6-11.6S17.6 12.4 24 12.4c3 0 5.7 1.1 7.7 3l5.1-5.1C33.5 7.1 29 5.2 24 5.2 13.6 5.2 5.2 13.6 5.2 24S13.6 42.8 24 42.8 42.8 34.4 42.8 24c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M7.4 14.7l5.9 4.3C15 15.1 19.2 12.4 24 12.4c3 0 5.7 1.1 7.7 3l5.1-5.1C33.5 7.1 29 5.2 24 5.2 16.7 5.2 10.4 9 7.4 14.7z"/><path fill="#4CAF50" d="M24 42.8c4.9 0 9.3-1.9 12.6-4.9l-5.8-4.9c-1.9 1.4-4.3 2.2-6.8 2.2-5.3 0-9.7-3.2-11.3-7.7l-5.9 4.6C9.8 38.6 16.4 42.8 24 42.8z"/><path fill="#1976D2" d="M43.6 20.5H42V20.4H24v7.2h11.3c-.8 2.2-2.2 4.1-4.1 5.4l5.8 4.9c3.6-3.3 6-8.2 6-14 0-1.2-.1-2.4-.4-3.5z"/></svg> '+t("gSoon")+"</div>";
    return;
  }
  const tryInit=()=>{
    if(!(window.google&&google.accounts&&google.accounts.id))return false;
    google.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:onGoogleCred});
    google.accounts.id.renderButton(box,{theme:"outline",size:"large",shape:"pill",text:"continue_with",width:280,locale:state.lang==="ar"?"ar":state.lang==="tr"?"tr":"en"});
    return true;
  };
  if(!tryInit()){let n=0;const iv=setInterval(()=>{if(tryInit()||++n>25)clearInterval(iv)},300)}
}

function afterLogin(){
  $("loginBtn").style.display="none";$("userBtn").style.display="flex";
  const first=state.user.name.split(" ")[0];
  $("userName").textContent=t("hiUser")+(state.lang==="ar"?"، ":", ")+first;
  $("umName").textContent=state.user.name;$("umEmail").textContent=state.user.email;
  $("accAvatar").textContent=(first[0]||"?").toUpperCase();
  updateBadges();
  /* 🔔 تنبيه المدير عند الدخول إذا في طلبات بيع بالانتظار */
  if(state.user.role==="admin"){
    const pend=state.users.filter(x=>x.seller&&x.seller.status==="pending").length;
    if(pend)setTimeout(()=>toast(t("notifNewApp")),600);
  }
}
function logout(){
  state.user=null;
  $("loginBtn").style.display="flex";$("userBtn").style.display="none";
  $("userMenu").classList.remove("open");closeAccPage();toast(t("loggedOut"));
}

/* ---------- Account page (v3: نقاط + طلبات بتتبع وتقييم + عناوين + أمان + لوحة إدارة) ---------- */
function ensureAdminTab(){
  const has=document.querySelector('#accSide [data-panel="admin"]');
  if(state.user&&state.user.role==="admin"){
    const inner=ico("shield")+' <span>'+t("adminPanelT")+'</span><span class="badge nbadge" id="adminTabBadge" style="display:none">0</span>';
    if(!has){const b=document.createElement("button");b.dataset.panel="admin";b.innerHTML=inner;$("accSide").appendChild(b)}
    else has.innerHTML=inner;
  }else if(has)has.remove();
}
function openAccPage(panel){
  if(!state.user){toast(t("loginFirst"));openAuth("login");return}
  state.accPanel=panel||"profile";
  ensureAdminTab();
  $("accName").textContent=state.user.name;$("accEmail").textContent=state.user.email;
  document.querySelectorAll("#accSide button").forEach(b=>b.classList.toggle("active",b.dataset.panel===state.accPanel));
  renderAccPanel();
  $("accPage").classList.add("open");$("userMenu").classList.remove("open");
  document.body.style.overflow="hidden";
}
function closeAccPage(){$("accPage").classList.remove("open");document.body.style.overflow=""}
const CITIES=["دمشق","حلب","حمص","حماة","اللاذقية","طرطوس","إدلب","درعا","دير الزور","الحسكة","Istanbul","Gaziantep"];
const fld=(labelKey,id,type,val)=>'<div class="field"><label>'+t(labelKey)+'</label><input id="'+id+'" type="'+type+'" value="'+esc(val||"")+'"'+(type==="email"||type==="tel"?' dir="ltr"':"")+"></div>";
const pwFld=(k,id)=>'<div class="field"><label>'+t(k)+'</label><input id="'+id+'" type="password" dir="ltr"></div>';
const userBy=e=>state.users.find(x=>x.email===e);
const emptyMini=()=>'<p class="m-note" style="text-align:start">'+t("noItems")+"</p>";
function renderAccPanel(){
  const p=$("accPanel");const u=state.user;if(!u)return;
  /* ---- البيانات الشخصية ---- */
  if(state.accPanel==="profile"){
    p.innerHTML='<h3 style="justify-content:space-between"><span style="display:flex;align-items:center;gap:8px"><span class="bar"></span>'+t("pProfile")+'</span><span class="chip-pts">⭐ '+t("pointsT")+": "+u.points+"</span></h3>"+
      '<p style="font-size:12px;color:var(--muted);margin:-8px 0 12px">'+t("pointsD")+"</p>"+
      '<div class="acc-grid">'+
      fld("fullName","accFName","text",u.name)+fld("email","accFEmail","email",u.email)+
      fld("phone","accFPhone","tel",u.phone)+
      fld("dob","accFDob","date",u.dob)+
      '</div><div class="f-err" id="profErr"></div><button class="save-btn" id="saveProfile">'+t("save")+"</button>";
    $("saveProfile").addEventListener("click",()=>{
      const ne=$("accFEmail").value.trim().toLowerCase();
      if(!emailOk(ne)){$("profErr").textContent=t("errEmail");return}
      if(ne!==u.email&&emailTaken(ne,u)){$("profErr").textContent=t("errEmailUsed");return}
      $("profErr").textContent="";
      u.name=$("accFName").value.trim()||u.name;u.email=ne;
      u.phone=$("accFPhone").value.trim();u.dob=$("accFDob").value;
      afterLogin();$("accName").textContent=u.name;$("accEmail").textContent=u.email;toast(t("saved"));
    });
  }
  /* ---- الطلبات الجديدة + المشتريات القديمة + التقييم ---- */
  else if(state.accPanel==="orders"){
    const news=u.orders.filter(o=>o.status==="new"),olds=u.orders.filter(o=>o.status!=="new");
    let h='<h3><span class="bar"></span>'+t("pOrders")+"</h3>";
    h+='<h4 class="sub">🟠 '+t("newOrders")+"</h4>";
    h+=news.length?news.map(o=>orderCard(o)).join(""):'<div class="empty-hint" style="padding:18px"><div class="big">📦</div>'+t("noOrders")+"</div>";
    h+='<h4 class="sub">🟢 '+t("oldOrders")+"</h4>";
    h+=olds.length?olds.map(o=>orderCard(o)).join(""):'<div class="empty-hint" style="padding:18px"><div class="big">🧾</div>'+t("noOld")+"</div>";
    p.innerHTML=h;bindOrderCards(p,u);
  }
  /* ---- المفضلة ---- */
  else if(state.accPanel==="favorites"){
    let inner='<h3><span class="bar"></span>'+t("pFavs")+"</h3>";
    if(!state.favs.size)inner+='<div class="empty-hint"><div class="big">💚</div>'+t("noFavs")+"</div>";
    else inner+='<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))" id="favGrid"></div>';
    p.innerHTML=inner;
    if(state.favs.size){const fg=$("favGrid");state.favs.forEach(id=>{const pr=PRODUCTS.find(x=>x.id===id);if(pr)fg.appendChild(productCard(pr))})}
  }
  /* ---- العناوين ---- */
  else if(state.accPanel==="addresses"){
    let h='<h3><span class="bar"></span>'+t("pAddr")+"</h3>";
    u.addresses.forEach((a,i)=>{
      h+='<div class="addr-card'+(a.def?" sel":"")+'"><span class="a-ico">'+(a.def?"📍":"🏠")+'</span><div><b>'+esc(a.label)+
        (a.def?' <span style="color:var(--green-dark);font-size:11px">✔ '+t("addrDefault")+"</span>":"")+"</b><span>"+esc(a.city)+" — "+esc(a.line)+"</span></div>"+
        '<div class="addr-acts">'+(a.def?"":'<button data-def="'+i+'">'+t("setDefault")+"</button>")+
        '<button class="del" data-del="'+i+'">'+t("deleteA")+"</button></div></div>";
    });
    h+='<h4 class="sub">'+t("addAddr")+'</h4><div class="acc-grid">'+
      fld("addrLabel","adLabel","text","")+
      '<div class="field"><label>'+t("addrCity")+'</label><select id="adCity">'+CITIES.map(c=>"<option>"+c+"</option>").join("")+"</select></div></div>"+
      '<div class="field"><label>'+t("addrLine")+'</label><input id="adLine" type="text"></div>'+
      '<button class="save-btn" id="addAddrBtn">'+t("saveAddr")+"</button>";
    p.innerHTML=h;
    p.querySelectorAll("[data-def]").forEach(b=>b.addEventListener("click",()=>{
      u.addresses.forEach((a,i)=>a.def=i==b.dataset.def);renderAccPanel();toast(t("saved"));
    }));
    p.querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click",()=>{
      u.addresses.splice(b.dataset.del,1);
      if(u.addresses.length&&!u.addresses.some(a=>a.def))u.addresses[0].def=true;
      renderAccPanel();toast(t("removed"));
    }));
    $("addAddrBtn").addEventListener("click",()=>{
      const label=$("adLabel").value.trim(),line=$("adLine").value.trim();
      if(!label||!line){toast(t("errFill"));return}
      u.addresses.push({label,city:$("adCity").value,line,def:!u.addresses.length});
      renderAccPanel();toast(t("addrAdded"));
    });
  }
  /* ---- لوحة الإدارة (للمدير العام فقط) ---- */
  else if(state.accPanel==="admin"){
    let h='<h3><span class="bar"></span>'+t("adminPanelT")+"</h3>";
    h+='<p class="m-note" style="text-align:start;margin-bottom:10px">📧 '+t("shopMailName")+': <b dir="ltr">'+SUPPORT_MAIL+'</b> ← <b dir="ltr">'+ADMIN_EMAIL+"</b></p>";
    h+='<h4 class="sub">'+ico("inbox")+" "+t("applicationsT")+"</h4>";
    const apps=state.users.filter(x=>x.seller.status==="pending");
    h+=apps.length?apps.map(x=>'<div class="mini-item"><div style="flex:1"><b>'+ico("store")+" "+esc(x.seller.storeName||x.name)+'</b><div style="font-size:11.5px;color:var(--muted)" dir="ltr">'+esc(x.email)+" · ShamCash: "+esc(x.seller.shamAcc)+"</div></div>"+
      '<button class="mark-btn" data-app-ok="'+esc(x.email)+'">'+t("approve")+'</button><button class="mark-btn" style="background:var(--danger)" data-app-no="'+esc(x.email)+'">'+t("reject")+"</button></div>").join(""):emptyMini();
    h+='<h4 class="sub">'+ico("users")+" "+t("usersMgmt")+"</h4>";
    const others=state.users.filter(x=>x!==u);
    h+=others.length?others.map(x=>{
      const chips=(x.role==="admin"?' <span class="role-chip adm">'+t("adminBadge")+"</span>":"")+(x.seller.status==="approved"?' <span class="role-chip">'+t("sellerBadge")+"</span>":"")+(x.blocked?' <span class="role-chip adm">🚫</span>':"");
      return '<div class="mini-item"><div style="flex:1"><b>'+esc(x.name)+"</b>"+chips+'<div style="font-size:11.5px;color:var(--muted)" dir="ltr">'+esc(x.email)+"</div></div>"+
      '<button class="mark-btn" style="background:'+(x.blocked?"var(--green-2)":"var(--danger)")+'" data-block="'+esc(x.email)+'">'+(x.blocked?t("unblockB"):t("blockB"))+"</button>"+
      (x.seller.status==="approved"?'<button class="mark-btn" style="background:#b7791f" data-unstore="'+esc(x.email)+'">'+t("removeStoreB")+"</button>":"")+"</div>";
    }).join(""):emptyMini();
    h+='<h4 class="sub">'+ico("mail")+" "+t("inboxT")+"</h4>";
    h+=state.inbox.length?state.inbox.map(m=>'<div class="mini-item" style="align-items:flex-start"><div><b>'+esc(m.subject)+'</b><div style="font-size:12px;font-weight:600">'+esc(m.body)+'</div><div style="font-size:11px;color:var(--muted)">'+t("fromL")+' <span dir="ltr">'+esc(m.from)+"</span> · "+m.date+"</div></div></div>").join(""):emptyMini();
    h+='<h4 class="sub">'+ico("flag")+" "+t("reportsT")+"</h4>";
    h+=state.reportsList.length?state.reportsList.map(r=>'<div class="mini-item"><div><b>'+esc(r.store)+'</b><div style="font-size:11px;color:var(--muted)">'+t("fromL")+' <span dir="ltr">'+esc(r.by)+"</span> · "+r.date+"</div></div></div>").join(""):emptyMini();
    p.innerHTML=h;
    p.querySelectorAll("[data-app-ok]").forEach(b=>b.addEventListener("click",()=>{userBy(b.dataset.appOk).seller.status="approved";renderAccPanel();toast(t("approvedMsg"))}));
    p.querySelectorAll("[data-app-no]").forEach(b=>b.addEventListener("click",()=>{userBy(b.dataset.appNo).seller.status="rejected";renderAccPanel();toast(t("rejectedMsg"))}));
    p.querySelectorAll("[data-block]").forEach(b=>b.addEventListener("click",()=>{const x=userBy(b.dataset.block);x.blocked=!x.blocked;renderAccPanel();toast(x.blocked?t("blockedDone"):t("unblockedDone"))}));
    p.querySelectorAll("[data-unstore]").forEach(b=>b.addEventListener("click",()=>{userBy(b.dataset.unstore).seller.status="none";renderAccPanel();toast(t("storeRemoved"))}));
  }
  /* ---- الإعدادات: لغة + كلمة المرور + حذف الحساب ---- */
  else{
    p.innerHTML='<h3><span class="bar"></span>'+t("pSettings")+"</h3>"+
      '<div class="field" style="max-width:300px"><label>'+t("setLang")+'</label><select id="setLangSel">'+
      Object.keys(I18N).map(l=>'<option value="'+l+'"'+(l===state.lang?" selected":"")+">"+I18N[l].label+" — "+CUR[l].sym+"</option>").join("")+"</select></div>"+
      '<div class="switch-row"><div><b>'+t("setNotif")+"</b><span>"+t("setNotifD")+'</span></div><button class="sw'+(u.notif?" on":"")+'" id="swNotif"></button></div>'+
      '<h4 class="sub">🔐 '+t("secTitle")+" — "+t("changePass")+'</h4><div class="acc-grid">'+
      pwFld("curPass","cpCur")+pwFld("newPass","cpNew")+pwFld("confirmPass","cpConf")+
      '</div><div class="f-err" id="cpErr"></div><button class="save-btn" id="cpBtn">'+t("doChangePass")+"</button>"+
      '<h4 class="sub" style="color:var(--danger)">⚠️ '+t("dangerTitle")+'</h4>'+
      '<div id="delZone"><button class="btn-danger" id="delBtn" style="width:auto;padding:11px 22px">'+t("deleteAcc")+"</button></div>";
    $("setLangSel").addEventListener("change",e=>setLang(e.target.value));
    $("swNotif").addEventListener("click",()=>{u.notif=!u.notif;$("swNotif").classList.toggle("on",u.notif);toast(t("saved"))});
    $("cpBtn").addEventListener("click",()=>{
      const c=$("cpCur").value,nw=$("cpNew").value,cf=$("cpConf").value,err=$("cpErr");
      if(!c||!nw||!cf){err.textContent=t("errFill");return}
      if(c!==u.pass){err.textContent=t("passWrong");return}
      if(nw.length<6){err.textContent=t("errPass");return}
      if(nw!==cf){err.textContent=t("passMismatch");return}
      u.pass=nw;err.textContent="";$("cpCur").value=$("cpNew").value=$("cpConf").value="";toast(t("passChanged"));
    });
    $("delBtn").addEventListener("click",()=>{
      $("delZone").innerHTML='<p style="font-size:13px;font-weight:800;color:var(--danger);margin-bottom:10px">'+t("deleteWarn")+"</p>"+
        '<div style="display:flex;gap:10px"><button class="btn-danger" id="delYes">'+t("deleteBtn")+'</button><button class="btn-ghost" id="delNo">'+t("cancel")+"</button></div>";
      $("delYes").addEventListener("click",()=>{state.users=state.users.filter(x=>x!==u);logout();toast(t("accDeleted"))});
      $("delNo").addEventListener("click",renderAccPanel);
    });
  }
}
function orderCard(o){
  const canceled=o.status==="canceled",done=o.status==="done";
  let h='<div class="order-card"><div class="order-top"><div><b>'+t("orderNo")+" "+o.id+'</b> <span class="o-date">· '+o.date+" · 🟢 "+t("shamCash")+(o.payMode==="qr"?" (QR)":"")+"</span></div>"+
    '<span class="o-status '+(done?"done":canceled?"can":"new")+'">'+(done?t("statusDone"):canceled?t("statusCanceled"):t("statusNew"))+"</span></div>";
  if(!canceled)h+='<div class="tl">'+t("timeline").map((s,i)=>'<div class="tl-step'+(i<=o.step?" on":"")+'">'+s+"</div>").join("")+"</div>";
  o.items.forEach(it=>{
    const p=PRODUCTS.find(x=>x.id===it.id);
    const name=p?pName(p):it.name,img=p&&p.img?'<img src="'+p.img+'">':(p?p.icon:"📦");
    const bg=p?"linear-gradient(135deg,"+p.g1+","+p.g2+")":"var(--mint)";
    h+='<div class="o-item"><div class="oi-img" style="background:'+bg+'">'+img+'</div><div class="oi-name">'+esc(name)+" ×"+it.qty+"</div>";
    if(done){const r=o.ratings[it.id]||0;
      h+='<div class="stars-in" data-o="'+o.id+'" data-p="'+it.id+'">'+[1,2,3,4,5].map(n=>'<span class="'+(n<=r?"on":"")+'">★</span>').join("")+"</div>";}
    h+="</div>";
  });
  h+='<div class="o-total"><span>'+t("orderTotal")+"</span><span>"+money(o.usd)+"</span></div>";
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center">';
  h+='<button class="mark-btn inv-btn" data-o="'+o.id+'" style="background:#fff;color:var(--green-dark);border:2px solid var(--green-2)">'+t("viewInv")+"</button>";
  if(!done&&!canceled){
    h+='<button class="mark-btn" data-mark="'+o.id+'">'+t("markDelivered")+"</button>";
    h+='<button class="mark-btn" data-cancel="'+o.id+'" style="background:var(--danger)">'+t("cancelOrder")+"</button>";
  }
  if(done)h+='<span style="font-size:12px;color:var(--muted);font-weight:700">⭐ '+t("rateHint")+"</span>";
  return h+"</div></div>";
}
function bindOrderCards(scope,u){
  scope.querySelectorAll("[data-mark]").forEach(b=>b.addEventListener("click",()=>{
    const o=u.orders.find(x=>x.id==b.dataset.mark);o.status="done";o.step=3;o.deliveredAt=Date.now();
    if($("accPage").classList.contains("open"))renderAccPanel();toast(t("statusDone")+" ✔");
  }));
  scope.querySelectorAll("[data-cancel]").forEach(b=>b.addEventListener("click",()=>{
    const o=u.orders.find(x=>x.id==b.dataset.cancel);o.status="canceled";
    if($("accPage").classList.contains("open"))renderAccPanel();toast(t("orderCanceled"));
  }));
  scope.querySelectorAll(".inv-btn").forEach(b=>b.addEventListener("click",()=>{
    const o=u.orders.find(x=>x.id==b.dataset.o);openInvoice(o,u);
  }));
  scope.querySelectorAll(".stars-in").forEach(box=>{
    box.querySelectorAll("span").forEach((s,i)=>s.addEventListener("click",()=>{
      const o=u.orders.find(x=>x.id==box.dataset.o);
      o.ratings[box.dataset.p]=i+1;
      if($("accPage").classList.contains("open"))renderAccPanel();toast(t("thanksRate"));
    }));
  });
}

/* ---------- Product modal (تعليقات + تقييم) ---------- */
let curProd=null,cmtStars=5;
function openProduct(id){
  curProd=PRODUCTS.find(x=>x.id===id);if(!curProd)return;
  renderProduct();$("prodOverlay").classList.add("open");
}
function renderProduct(){
  const p=curProd;const disc=p.oldUsd>p.usd?Math.round((1-p.usd/p.oldUsd)*100):0;
  const body=$("prodBody");
  let h='<div class="pm-grid"><div class="pm-img" style="background:linear-gradient(135deg,'+p.g1+","+p.g2+')">'+(p.img?'<img src="'+p.img+'">':p.icon)+"</div>"+
    '<div><div class="pm-name">'+esc(pName(p))+'</div>'+
    '<div class="c-rate" style="margin:5px 0"><span class="stars">'+starStr(p.rate)+"</span> "+p.rate+" ("+p.votes.toLocaleString()+")</div>"+
    '<div class="pm-price"><span class="now">'+money(p.usd)+"</span>"+(disc?'<span class="old">'+money(p.oldUsd)+'</span> <span class="c-disc" style="position:static">%'+disc+"</span>":"")+"</div>"+
    '<p style="font-size:12.5px;color:var(--muted);margin:6px 0">'+t("soldBy")+" <b style='color:var(--green-dark)'>"+esc(p.seller||t("shayebStore"))+"</b></p>"+
    '<button class="btn-ghost" id="pmReport" style="font-size:11.5px;padding:5px 10px;margin:2px 0">'+t("reportStore")+"</button>"+
    (p.desc?'<p class="pm-desc"><b>'+t("descLbl")+":</b> "+esc(typeof p.desc==="string"?p.desc:p.desc[state.lang])+"</p>":"")+
    '<button class="m-submit" id="pmAdd" style="margin-top:12px;width:100%">🛒 '+t("added")+" +</button></div></div>";
  h+='<h4 class="sub" style="font-size:14.5px;font-weight:900;color:var(--green-dark);margin-top:6px">💬 '+t("comments")+" ("+p.comments.length+")</h4>";
  h+=p.comments.length?p.comments.map(c=>'<div class="comment"><b>'+esc(c.user)+'</b> <span class="c-stars">'+"★".repeat(c.stars)+'</span><p>'+esc(c.text)+"</p></div>").join(""):
    '<p style="font-size:12.5px;color:var(--muted)">'+t("noComments")+"</p>";
  if(state.user){
    h+='<div class="cmt-form"><div style="display:flex;gap:8px;align-items:center;font-size:13px;font-weight:800">'+t("yourRating")+
      '<div class="stars-in" id="cmtStars">'+[1,2,3,4,5].map(n=>'<span class="'+(n<=cmtStars?"on":"")+'">★</span>').join("")+"</div></div>"+
      '<div class="field"><textarea id="cmtText" placeholder="'+t("addComment")+'"></textarea></div>'+
      '<button class="m-submit" id="cmtSend">'+t("send")+"</button></div>";
  }else h+='<p style="font-size:12.5px;font-weight:800;color:var(--green-dark);margin-top:8px">🔒 '+t("loginToComment")+"</p>";
  body.innerHTML=h;
  $("pmAdd").addEventListener("click",()=>addToCart(p.id));
  $("pmReport").addEventListener("click",()=>{
    if(!state.user){toast(t("loginFirst"));openAuth("login");return}
    state.reportsList.unshift({store:p.seller||t("shayebStore"),by:state.user.email,date:new Date().toLocaleDateString()});
    toast(t("reported"));
  });
  if(state.user){
    document.querySelectorAll("#cmtStars span").forEach((s,i)=>s.addEventListener("click",()=>{cmtStars=i+1;renderProduct()}));
    $("cmtSend").addEventListener("click",()=>{
      const txt=$("cmtText").value.trim();if(!txt){toast(t("errFill"));return}
      p.comments.unshift({user:state.user.name,text:txt,stars:cmtStars});
      p.votes++;p.rate=Math.round(((p.rate*(p.votes-1)+cmtStars)/p.votes)*10)/10;
      renderProduct();refreshGrids();toast(t("commentAdded"));
    });
  }
}

/* ---------- Camera search ---------- */
function openCamModal(){
  $("camBody").innerHTML='<div class="img-drop" id="camDrop"><div class="big">📷</div><p>'+t("camPick")+"</p></div>";
  $("camDrop").addEventListener("click",()=>$("camFile").click());
  $("camOverlay").classList.add("open");
}
function handleCamFile(file){
  const r=new FileReader();
  r.onload=e=>{
    $("camBody").innerHTML='<img class="img-prev" src="'+e.target.result+'"><p style="text-align:center;font-weight:800;color:var(--green-dark);margin-top:10px">⏳ '+t("camSearching")+"</p>";
    setTimeout(()=>{
      const picks=[...PRODUCTS].sort(()=>Math.random()-.5).slice(0,4);
      $("camBody").innerHTML='<img class="img-prev" src="'+e.target.result+'" style="height:120px">'+
        '<h4 style="font-size:14px;font-weight:900;color:var(--green-dark);margin:10px 0 4px">✨ '+t("camResults")+'</h4>'+
        '<div class="grid" style="grid-template-columns:1fr 1fr" id="camGrid"></div>';
      const cg=$("camGrid");picks.forEach(p=>cg.appendChild(productCard(p)));
    },1300);
  };
  r.readAsDataURL(file);
}

/* ---------- البيع على الشايب (v3): اتفاقية ← طلب بحساب شام كاش ← موافقة الإدارة ← لوحة المتجر ---------- */
let sellImg=null,hubTab="add",postImg=null;
function openSell(){
  if(!state.user){toast(t("loginFirst"));openAuth("login");return}
  const s=state.user.seller;
  if(s.status==="approved"){openHub();return}
  $("sellOverlay").classList.add("open");
  if(s.status==="pending"){$("sellBody").innerHTML='<div class="empty-hint"><div class="big">⏳</div>'+t("pendingSell")+"</div>";return}
  if(s.status==="rejected"){$("sellBody").innerHTML='<div class="empty-hint"><div class="big">😔</div>'+t("rejectedSell")+"</div>";return}
  s.agreed?renderApply():renderAgreement();
}
function renderAgreement(){
  const b=$("sellBody");
  b.innerHTML='<div class="commission-chip">💰 '+t("commission")+"</div>"+
    '<h4 style="font-size:14.5px;font-weight:900">'+t("agreeTitle")+'</h4>'+
    '<div class="agree-box">'+t("agreement").map(c=>"<h5>"+c.h+"</h5><p>"+c.p+"</p>").join("")+"</div>"+
    '<label class="agree-chk"><input type="checkbox" id="agreeChk"><span>'+t("agreeChk")+"</span></label>"+
    '<button class="m-submit" id="agreeGo" disabled>'+t("continueBtn")+"</button>";
  $("agreeChk").addEventListener("change",e=>{$("agreeGo").disabled=!e.target.checked});
  $("agreeGo").addEventListener("click",()=>{state.user.seller.agreed=true;renderApply()});
}
function renderApply(){
  let img=null;
  $("sellBody").innerHTML=
    '<div class="commission-chip">💰 '+t("commission")+"</div>"+
    '<div class="field"><label>'+t("storeNameL")+'</label><input id="apName" type="text" value="'+esc(state.user.seller.storeName||"")+'"></div>'+
    '<div class="field"><label>'+t("storeImgL")+'</label><div class="img-drop" id="apDrop"><div class="big">🏪</div><p>'+t("pImgHint")+'</p></div><input type="file" id="apFile" accept="image/*" style="display:none"></div>'+
    '<div class="field"><label>🟢 '+t("shamAccL")+'</label><input id="apSham" type="text" dir="ltr" inputmode="numeric" placeholder="09XXXXXXXX"><p class="m-note" style="text-align:start">'+t("shamAccHint")+"</p></div>"+
    '<div class="f-err" id="apErr"></div><button class="m-submit" id="apGo">'+t("applySell")+"</button>";
  $("apDrop").addEventListener("click",()=>$("apFile").click());
  $("apFile").addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{img=ev.target.result;$("apDrop").innerHTML='<img class="img-prev" src="'+img+'" style="height:120px">'};r.readAsDataURL(f)});
  $("apGo").addEventListener("click",()=>{
    const nm=$("apName").value.trim(),sh=$("apSham").value.replace(/\D/g,"");
    if(!nm){$("apErr").textContent=t("errFill");return}
    if(sh.length<8){$("apErr").textContent=t("errWallet");return}
    const s=state.user.seller;s.storeName=nm;s.shamAcc=sh;if(img)s.storeImg=img;s.status="pending";
    $("sellBody").innerHTML='<div class="empty-hint"><div class="big">🚀</div>'+t("applied")+"</div>";toast(t("applied"));
  });
}
function openHub(){hubTab="add";renderHub();$("hubOverlay").classList.add("open")}
function renderHub(){
  const u=state.user,s=u.seller;
  const tabs=[["add",t("hubAdd")],["prods",t("hubProducts")],["posts",t("hubPosts")],["store",t("hubStore")],["earn",t("hubEarn")]];
  let h='<div style="display:flex;gap:10px;align-items:center">'+(s.storeImg?'<img src="'+s.storeImg+'" style="width:46px;height:46px;border-radius:12px;object-fit:cover">':'<span style="font-size:30px">🏪</span>')+'<b style="font-size:15px">'+esc(s.storeName||u.name)+'</b> <span class="role-chip">'+t("sellerBadge")+"</span></div>";
  h+='<div class="hub-tabs">'+tabs.map(([id,l])=>'<button data-hub="'+id+'" class="'+(hubTab===id?"active":"")+'">'+l+"</button>").join("")+"</div>";
  h+='<div id="hubPane" style="display:flex;flex-direction:column;gap:12px"></div>';
  $("hubBody").innerHTML=h;
  document.querySelectorAll("[data-hub]").forEach(b=>b.addEventListener("click",()=>{hubTab=b.dataset.hub;renderHub()}));
  const pane=$("hubPane");
  if(hubTab==="add")renderAddProduct(pane);
  else if(hubTab==="prods"){
    const mine=PRODUCTS.filter(p=>p.ownerEmail===u.email);
    pane.innerHTML=mine.length?mine.map(p=>'<div class="mini-item"><div class="mi-img" style="background:linear-gradient(135deg,'+p.g1+","+p.g2+')">'+(p.img?'<img src="'+p.img+'">':p.icon)+'</div><div style="flex:1">'+esc(pName(p))+'<div style="font-size:11.5px;color:var(--muted)">'+money(p.usd)+"</div></div>"+
      '<button class="mark-btn" style="background:var(--danger)" data-delp="'+p.id+'">🗑</button></div>').join(""):'<p class="m-note" style="text-align:start">'+t("noProds")+"</p>";
    pane.querySelectorAll("[data-delp]").forEach(b=>b.addEventListener("click",()=>{
      const i=PRODUCTS.findIndex(p=>p.id==b.dataset.delp);if(i>-1)PRODUCTS.splice(i,1);
      delete state.cart[b.dataset.delp];state.favs.delete(+b.dataset.delp);
      updateBadges();refreshGrids();renderHub();toast(t("removed"));
    }));
  }
  else if(hubTab==="posts"){
    postImg=null;
    pane.innerHTML='<p class="m-note" style="text-align:start">'+t("imgRealNote")+"</p>"+
      '<div class="field"><label>'+t("postImgL")+'</label><div class="img-drop" id="poDrop"><div class="big">🖼️</div><p>'+t("pImgHint")+'</p></div><input type="file" id="poFile" accept="image/*" style="display:none"></div>'+
      '<div class="field"><label>'+t("postTextL")+'</label><textarea id="poText" rows="2"></textarea></div>'+
      '<div class="f-err" id="poErr"></div><button class="m-submit" id="poGo">'+t("publishPost")+"</button>"+
      state.posts.filter(x=>x.owner===u.email).map(x=>'<div class="mini-item"><div class="mi-img"><img src="'+x.img+'"></div><div style="flex:1;font-size:12.5px">'+esc(x.text)+'<div style="font-size:11px;color:var(--muted)">'+x.date+"</div></div></div>").join("");
    $("poDrop").addEventListener("click",()=>$("poFile").click());
    $("poFile").addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{postImg=ev.target.result;$("poDrop").innerHTML='<img class="img-prev" src="'+postImg+'" style="height:120px">'};r.readAsDataURL(f)});
    $("poGo").addEventListener("click",()=>{
      const txt=$("poText").value.trim();
      if(!postImg){$("poErr").textContent=t("errImg");return}
      if(!txt){$("poErr").textContent=t("errFill");return}
      state.posts.unshift({store:s.storeName||u.name,owner:u.email,img:postImg,text:txt,date:new Date().toLocaleDateString()});
      renderPosts();renderHub();toast(t("postDone"));
    });
  }
  else if(hubTab==="store"){
    pane.innerHTML='<div class="field"><label>'+t("storeNameL")+'</label><input id="stName" value="'+esc(s.storeName)+'"></div>'+
      '<div class="field"><label>'+t("storeImgL")+'</label><div class="img-drop" id="stDrop">'+(s.storeImg?'<img class="img-prev" src="'+s.storeImg+'" style="height:120px">':'<div class="big">🏪</div><p>'+t("pImgHint")+"</p>")+'</div><input type="file" id="stFile" accept="image/*" style="display:none"></div>'+
      '<button class="m-submit" id="stGo">'+t("save")+"</button>";
    $("stDrop").addEventListener("click",()=>$("stFile").click());
    $("stFile").addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{s.storeImg=ev.target.result;renderHub()};r.readAsDataURL(f)});
    $("stGo").addEventListener("click",()=>{
      s.storeName=$("stName").value.trim()||s.storeName;
      PRODUCTS.forEach(p=>{if(p.ownerEmail===u.email)p.seller=s.storeName});
      refreshGrids();renderHub();toast(t("saved"));
    });
  }
  else{ /* أرباحي */
    let rows="";
    state.users.forEach(buyer=>buyer.orders.forEach(o=>{
      if(o.status!=="done")return;
      o.items.forEach(it=>{
        const p=PRODUCTS.find(x=>x.id===it.id);
        if(!p||p.ownerEmail!==u.email)return;
        const gross=p.usd*it.qty,fee=gross*.1,net=gross-fee;
        const payDate=new Date((o.deliveredAt||Date.now())+7*864e5).toLocaleDateString();
        rows+='<div class="mini-item"><div style="flex:1">'+esc(pName(p))+" ×"+it.qty+'<div style="font-size:11px;color:var(--muted)">'+t("payoutOn")+" "+payDate+' → ShamCash <span dir="ltr">'+esc(s.shamAcc)+"</span></div></div>"+
          '<div style="text-align:end;font-size:12px"><div>'+t("grossL")+": "+money(gross)+'</div><div style="color:var(--danger)">'+t("feeL")+": −"+money(fee)+'</div><b style="color:var(--green-dark)">'+t("netL")+": "+money(net)+"</b></div></div>";
      });
    }));
    pane.innerHTML='<p class="m-note" style="text-align:start">'+t("earnHint")+"</p>"+(rows||'<p class="m-note" style="text-align:start">'+t("noEarn")+"</p>");
  }
}
function renderAddProduct(pane){
  sellImg=null;
  const sellCats=CATS.filter(c=>c.id!=="new");
  pane.innerHTML='<p class="m-note" style="text-align:start">'+t("imgRealNote")+"</p>"+
    '<div class="field"><label>'+t("pImgLbl")+'</label><div class="img-drop" id="sellDrop"><div class="big">🖼️</div><p>'+t("pImgHint")+'</p></div><input type="file" id="sellFile" accept="image/*" style="display:none"></div>'+
    '<div class="field"><label>'+t("pNameLbl")+'</label><input id="spName" type="text"></div>'+
    '<div class="acc-grid"><div class="field"><label>'+t("pPriceLbl")+" ("+cur().sym+')</label><input id="spPrice" type="number" min="0" dir="ltr"></div>'+
    '<div class="field"><label>'+t("pOldLbl")+" ("+cur().sym+')</label><input id="spOld" type="number" min="0" dir="ltr"></div></div>'+
    '<div class="field"><label>'+t("pCatLbl")+'</label><select id="spCat">'+sellCats.map(c=>'<option value="'+c.id+'">'+c.label[state.lang]+"</option>").join("")+"</select></div>"+
    '<div class="field"><label>'+t("pDescLbl")+'</label><textarea id="spDesc" rows="3"></textarea></div>'+
    '<div class="f-err" id="sellErr"></div><button class="m-submit" id="spGo">'+t("publish")+"</button>"+
    '<p class="m-note">'+t("commission")+"</p>";
  $("sellDrop").addEventListener("click",()=>$("sellFile").click());
  $("sellFile").addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{sellImg=ev.target.result;$("sellDrop").innerHTML='<img class="img-prev" src="'+sellImg+'" style="height:150px">'};r.readAsDataURL(f)});
  $("spGo").addEventListener("click",()=>{
    const name=$("spName").value.trim(),price=parseFloat($("spPrice").value),old=parseFloat($("spOld").value)||0,err=$("sellErr");
    if(!name||!(price>0)){err.textContent=t("errPrice");return}
    if(!sellImg){err.textContent=t("errImg");return}
    err.textContent="";
    const usd=price/cur().rate,oldUsd=old>price?old/cur().rate:usd;
    const np=P(T3(name,name,name),$("spCat").value,Math.round(usd*100)/100,Math.round(oldUsd*100)/100,5,1,"🛍️","#e6f6ef","#eafaf2",$("spDesc").value.trim());
    np.img=sellImg;np.seller=state.user.seller.storeName||state.user.name;np.ownerEmail=state.user.email;
    PRODUCTS.unshift(np);
    closeOv("hubOverlay");showHome();state.filter=null;renderNav();renderGrid();
    toast(t("published"));window.scrollTo({top:0,behavior:"smooth"});
  });
}

/* ---------- الدفع بشام كاش (v3): كوبون + شحن مجاني + رقم/QR + فاتورة نظامية ---------- */
let payCtx=null;
function qrSvg(seed){
  let h=0;for(const ch of seed)h=(h*31+ch.charCodeAt(0))>>>0;
  const rnd=()=>{h=(h*1664525+1013904223)>>>0;return h/4294967296};
  const N=21,s=8;let r="";
  const finder=(fx,fy)=>{for(let y=0;y<7;y++)for(let x=0;x<7;x++){const border=x===0||y===0||x===6||y===6,core=x>=2&&x<=4&&y>=2&&y<=4;if(border||core)r+='<rect x="'+(fx+x)*s+'" y="'+(fy+y)*s+'" width="'+s+'" height="'+s+'"/>'}};
  finder(0,0);finder(N-7,0);finder(0,N-7);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const inF=(x<8&&y<8)||(x>=N-8&&y<8)||(x<8&&y>=N-8);if(!inF&&rnd()>0.52)r+='<rect x="'+x*s+'" y="'+y*s+'" width="'+s+'" height="'+s+'"/>'}
  return '<svg class="qr" viewBox="0 0 '+N*s+" "+N*s+'" xmlns="http://www.w3.org/2000/svg" style="background:#fff"><g fill="#0c1b14">'+r+"</g></svg>";
}
function openCheckout(){
  if(!state.user){toast(t("loginFirst"));openAuth("login");return}
  const u=state.user;closeCart();
  const addr=u.addresses.find(a=>a.def)||u.addresses[0];
  payCtx={pct:0,mode:"wallet",code:null};
  const sub=cartTotalUsd();
  let h='<div id="payTotals"></div>';
  h+='<div class="field"><label>🎁 '+t("couponLbl")+'</label><div style="display:flex;gap:8px"><input id="cpCode" dir="ltr" placeholder="WELCOME10" style="flex:1;padding:11px 13px;border:2px solid var(--line);border-radius:10px;background:#fbfdfc"><button class="mark-btn" id="cpApply">'+t("couponApply")+'</button></div><p class="m-note" style="text-align:start" id="cpMsg">'+t("couponHint")+"</p></div>";
  h+='<div class="field"><label>📍 '+t("deliverTo")+"</label>";
  h+=addr?'<div class="addr-card sel" style="margin:0"><span class="a-ico">📍</span><div><b>'+esc(addr.label)+"</b><span>"+esc(addr.city)+" — "+esc(addr.line)+"</span></div></div>":'<p style="font-size:13px;font-weight:800;color:var(--danger)">'+t("noAddr")+"</p>";
  h+="</div>";
  h+='<div class="field"><label>'+t("payMethod")+' — 🟢 '+t("shamCash")+'</label><div class="pay-tabs"><button id="pmWallet" class="active">💳 '+t("payWallet")+'</button><button id="pmQr">▦ '+t("payQr")+"</button></div></div>";
  h+='<div id="payArea"></div>';
  h+='<div class="f-err" id="payErr"></div><button class="m-submit" id="payGo"'+(addr?"":" disabled")+">"+t("confirmPay")+"</button>";
  $("payBody").innerHTML=h;
  $("payOverlay").classList.add("open");
  const renderTotals=()=>{
    const disc=sub*payCtx.pct/100,ship=(sub-disc)>=FREE_SHIP_USD?0:SHIP_USD,total=sub-disc+ship;
    payCtx.total=total;payCtx.ship=ship;payCtx.sub=sub;
    let s2='<div class="d-total" style="margin:0"><span>'+t("total")+"</span><span>"+money(sub)+"</span></div>";
    if(disc>0)s2+='<div class="d-total" style="margin:0;color:var(--green-dark);font-size:13px"><span>🎁 −'+payCtx.pct+"%</span><span>−"+money(disc)+"</span></div>";
    s2+='<div class="d-total" style="margin:0;font-size:13px"><span>🚚 '+t("shipLbl")+"</span><span>"+(ship?money(ship):t("freeLbl"))+"</span></div>";
    if(ship){const left=FREE_SHIP_USD-(sub-disc);
      s2+='<div class="ship-note">'+t("shipLeft").replace("{x}",money(left))+'</div><div class="ship-bar"><i style="width:'+Math.min(100,Math.round((sub-disc)/FREE_SHIP_USD*100))+'%"></i></div>';
    }else s2+='<div class="ship-note">'+t("shipFree")+"</div>";
    s2+='<div class="d-total" style="border-top:2px solid var(--line);padding-top:8px;margin-bottom:0"><span>'+t("orderTotal")+'</span><span style="color:var(--green-dark)">'+money(total)+"</span></div>";
    $("payTotals").innerHTML=s2;
  };
  const renderArea=()=>{
    if(payCtx.mode==="wallet")$("payArea").innerHTML='<div class="field"><label>'+t("walletNo")+'</label><input id="shamNo" type="text" dir="ltr" inputmode="numeric" placeholder="09XXXXXXXX"></div>';
    else{
      /* 🟢 باركود شام كاش الحقيقي (من config.js) — والمبلغ المطلوب تحويله ظاهر تحته */
      const qrImg=(typeof SHAM_QR_IMG!=="undefined"&&SHAM_QR_IMG)
        ?'<img src="'+SHAM_QR_IMG+'" alt="Sham Cash QR" style="width:225px;height:auto;max-height:320px;object-fit:contain;border:2px solid var(--line);border-radius:14px;background:#000;padding:6px" onerror="this.outerHTML=qrSvg(\'SHAYEB\')">'
        :qrSvg("SHAYEB-"+(state.orderSeq+1)+"-"+Math.round(payCtx.total*100));
      $("payArea").innerHTML='<div style="text-align:center">'+qrImg+
        '<div style="font-weight:900;font-size:15px;margin-top:8px;color:var(--green-dark)">'+t("qrAmount")+" "+money(payCtx.total)+"</div>"+
        '<p class="m-note">'+t("qrHint")+"</p></div>";
    }
    $("pmWallet").classList.toggle("active",payCtx.mode==="wallet");
    $("pmQr").classList.toggle("active",payCtx.mode==="qr");
  };
  renderTotals();renderArea();
  $("pmWallet").addEventListener("click",()=>{payCtx.mode="wallet";renderArea()});
  $("pmQr").addEventListener("click",()=>{payCtx.mode="qr";renderArea()});
  $("cpApply").addEventListener("click",()=>{
    const code=$("cpCode").value.trim().toUpperCase();
    if(COUPONS[code]&&!u.usedCoupons.includes(code)){
      payCtx.pct=COUPONS[code];payCtx.code=code;
      $("cpMsg").textContent=t("couponApplied");$("cpMsg").style.color="var(--green-dark)";renderTotals();
    }else{$("cpMsg").textContent=t("couponBad");$("cpMsg").style.color="var(--danger)"}
  });
  $("payGo").addEventListener("click",()=>{
    if(payCtx.mode==="wallet"){
      const w=$("shamNo").value.replace(/\D/g,"");
      if(w.length<8){$("payErr").textContent=t("errWallet");return}
    }
    const items=Object.keys(state.cart).map(id=>{const p=PRODUCTS.find(x=>x.id==id);return{id:p.id,name:pName(p),qty:state.cart[id],usd:p.usd}});
    const o={id:++state.orderSeq,inv:++state.invSeq,
      date:new Date().toLocaleDateString(state.lang==="ar"?"ar-SY":state.lang==="tr"?"tr-TR":"en-GB"),
      items,usd:payCtx.total,sub:payCtx.sub,pct:payCtx.pct,ship:payCtx.ship,
      status:"new",step:1,ratings:{},payMode:payCtx.mode};
    u.orders.unshift(o);
    if(payCtx.code)u.usedCoupons.push(payCtx.code);
    u.points+=Math.round(payCtx.total);
    state.cart={};updateBadges();refreshGrids();renderCart();
    closeOv("payOverlay");toast(t("orderPlaced"));
    openInvoice(o,u);
  });
}
function openInvoice(o,u){
  const rows=o.items.map(it=>"<tr><td>"+esc(it.name)+"</td><td>"+it.qty+"</td><td>"+money(it.usd||0)+"</td></tr>").join("");
  $("invBody").innerHTML='<div class="inv" id="invPrintable">'+
    '<div class="inv-head"><div><b style="font-size:16px">SHAYEB SHOP</b><div style="font-size:11px">متجر الشايب — '+t("invFrom")+'</div><div style="font-size:11px" dir="ltr">'+SUPPORT_MAIL+'</div></div><div style="text-align:end;font-size:12px"><div><b>'+t("invNo")+":</b> "+o.inv+"</div><div><b>"+t("invDate")+":</b> "+o.date+"</div></div></div>"+
    '<div style="font-size:12.5px"><b>'+t("invCust")+":</b> "+esc(u.name)+' · <span dir="ltr">'+esc(u.email)+"</span></div>"+
    "<table><tr><th>"+t("invItem")+"</th><th>"+t("invQty")+"</th><th>"+t("invPrice")+"</th></tr>"+rows+"</table>"+
    '<div style="font-size:12.5px;display:flex;flex-direction:column;gap:2px">'+
    "<div>"+t("total")+": "+money(o.sub)+"</div>"+
    (o.pct?"<div>🎁 −"+o.pct+"%</div>":"")+
    "<div>🚚 "+t("shipLbl")+": "+(o.ship?money(o.ship):t("freeLbl"))+"</div>"+
    '<b style="font-size:14px;color:var(--green-dark)">'+t("orderTotal")+": "+money(o.usd)+"</b></div>"+
    '<div style="font-size:12px;margin-top:8px">🟢 '+t("invPayM")+(o.payMode==="qr"?" (QR)":"")+"</div>"+
    '<p style="font-size:11px;color:var(--muted);margin-top:8px">'+t("invNote")+"</p></div>"+
    '<button class="m-submit" id="invPrint" style="margin-top:12px;width:100%">'+t("printInv")+"</button>";
  $("invOverlay").classList.add("open");
  $("invPrint").addEventListener("click",()=>{
    const w=window.open("","_blank");
    if(!w)return;
    w.document.write('<html><head><meta charset="UTF-8"><title>Invoice '+o.inv+'</title><style>body{font-family:Arial,sans-serif;direction:'+(state.lang==="ar"?"rtl":"ltr")+';padding:24px}table{width:100%;border-collapse:collapse;margin:10px 0}td,th{border:1px solid #bbb;padding:6px;font-size:13px;text-align:start}</style></head><body>'+$("invPrintable").innerHTML+"</body></html>");
    w.document.close();w.focus();w.print();
  });
}

/* ---------- الصفحات: من نحن/الشروط/الخصوصية/الإرجاع/تتبع الطلب/تواصل ---------- */
function openPage(id){
  const b=$("infoBody");
  const para=(title,arr)=>{$("infoTitle").textContent=title;b.innerHTML=arr.map(x=>'<p style="font-size:13.5px;margin-bottom:8px">'+x+"</p>").join("")};
  if(id==="about")para(t("aboutT"),t("aboutC"));
  else if(id==="terms")para(t("termsT"),t("termsC"));
  else if(id==="privacy")para(t("privacyT"),t("privacyC"));
  else if(id==="returns")para(t("returnsT"),t("returnsC"));
  else if(id==="track"){
    $("infoTitle").textContent=t("trackT");
    b.innerHTML='<div class="field"><label>'+t("trackHint")+'</label><div style="display:flex;gap:8px"><input id="trkNo" dir="ltr" inputmode="numeric" style="flex:1;padding:11px 13px;border:2px solid var(--line);border-radius:10px;background:#fbfdfc"><button class="mark-btn" id="trkGo">'+t("trackBtn")+'</button></div></div><div id="trkRes"></div>';
    $("trkGo").addEventListener("click",()=>{
      const no=$("trkNo").value.trim();
      const o=state.user&&state.user.orders.find(x=>String(x.id)===no);
      if(!o){$("trkRes").innerHTML='<p class="f-err">'+t("trackNotFound")+"</p>";return}
      $("trkRes").innerHTML=orderCard(o);bindOrderCards($("trkRes"),state.user);
    });
  }
  else{
    $("infoTitle").textContent=t("contactT");
    b.innerHTML='<p class="m-note" style="text-align:start">'+t("contactHint")+' — <b dir="ltr">'+SUPPORT_MAIL+'</b></p>'+
      '<div class="field"><label>'+t("msgSubject")+'</label><input id="ctSub"></div>'+
      '<div class="field"><label>'+t("msgBody")+'</label><textarea id="ctBody" rows="4"></textarea></div>'+
      '<div class="f-err" id="ctErr"></div><button class="m-submit" id="ctGo">'+t("msgSend")+"</button>";
    $("ctGo").addEventListener("click",()=>{
      const sj=$("ctSub").value.trim(),bd=$("ctBody").value.trim();
      if(!sj||!bd){$("ctErr").textContent=t("errFill");return}
      state.inbox.unshift({from:state.user?state.user.email:"guest",subject:sj,body:bd,date:new Date().toLocaleDateString()});
      closeOv("infoOverlay");toast(t("msgSent"));
    });
  }
  $("infoOverlay").classList.add("open");
}
function renderPosts(){
  const sec=$("postsSec"),g=$("postsGrid");
  if(!state.posts.length){sec.style.display="none";return}
  sec.style.display="block";
  g.innerHTML=state.posts.map(x=>'<div class="post"><img src="'+x.img+'"><div class="p-body"><b>🏪 '+esc(x.store)+"</b><p>"+esc(x.text)+'</p><div class="p-date">'+x.date+"</div></div></div>").join("");
}

/* ---------- Language ---------- */
function setLang(l){
  state.lang=l;
  document.documentElement.lang=l;
  document.documentElement.dir=I18N[l].dir;
  applyStaticText();renderNav();renderTrust();renderFooter();renderCart();renderPosts();if(state.user)ensureAdminTab();
  state.view==="deals"?(renderBanners(),renderDealsGrid()):renderGrid();
  if(state.user)afterLogin();
  if($("accPage").classList.contains("open"))renderAccPanel();
  if($("prodOverlay").classList.contains("open")&&curProd)renderProduct();
  $("langMenu").classList.remove("open");
  document.querySelectorAll("#langMenu button").forEach(b=>b.classList.toggle("active",b.dataset.lang===l));
}

/* ---------- Flash countdown ---------- */
let flashEnd=Date.now()+(1*3600+54*60+43)*1000;
setInterval(()=>{
  let s=Math.max(0,Math.floor((flashEnd-Date.now())/1000));
  if(s===0)flashEnd=Date.now()+2*3600*1000;
  const pad=n=>String(n).padStart(2,"0");
  $("tH").textContent=pad(Math.floor(s/3600));$("tM").textContent=pad(Math.floor(s%3600/60));$("tS").textContent=pad(s%60);
},1000);

/* ---------- Events ---------- */
$("langBtn").addEventListener("click",e=>{e.stopPropagation();$("langMenu").classList.toggle("open")});
document.querySelectorAll("#langMenu button").forEach(b=>b.addEventListener("click",()=>setLang(b.dataset.lang)));
$("loginBtn").addEventListener("click",()=>openAuth("login"));
document.querySelectorAll(".m-close").forEach(b=>b.addEventListener("click",()=>closeOv(b.dataset.close)));
["authOverlay","camOverlay","prodOverlay","sellOverlay","payOverlay","infoOverlay","invOverlay","hubOverlay"].forEach(id=>{
  $(id).addEventListener("click",e=>{if(e.target.id===id)closeOv(id)});
});
$("tabLogin").addEventListener("click",()=>{setAuthMode("login");showAuthView("main")});
$("tabSignup").addEventListener("click",()=>{setAuthMode("signup");showAuthView("main")});
$("authSubmit").addEventListener("click",submitAuth);
$("inPass").addEventListener("keydown",e=>{if(e.key==="Enter")submitAuth()});
$("togglePass").addEventListener("click",()=>{const i=$("inPass");i.type=i.type==="password"?"text":"password";$("togglePass").textContent=i.type==="password"?"👁️":"🙈"});
$("forgotLink").addEventListener("click",()=>showAuthView("reset"));
$("backLoginBtn").addEventListener("click",()=>showAuthView("main"));
$("rSend").addEventListener("click",sendResetCode);
$("rGo").addEventListener("click",doReset);
$("userBtn").addEventListener("click",e=>{e.stopPropagation();$("userMenu").classList.toggle("open")});
document.querySelectorAll("#userMenu [data-acc]").forEach(b=>b.addEventListener("click",()=>openAccPage(b.dataset.acc)));
$("logoutBtn").addEventListener("click",logout);
$("favBtn").addEventListener("click",()=>openAccPage("favorites"));
$("cartBtn").addEventListener("click",openCart);
$("cartClose").addEventListener("click",closeCart);
$("drawerOverlay").addEventListener("click",closeCart);
$("checkoutBtn").addEventListener("click",openCheckout);
$("accBack").addEventListener("click",closeAccPage);
$("accSide").addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b||!b.dataset.panel)return;
  state.accPanel=b.dataset.panel;
  document.querySelectorAll("#accSide button").forEach(x=>x.classList.toggle("active",x===b));
  renderAccPanel();
});
$("searchInput").addEventListener("input",()=>{if(state.view!=="home"){showHome();state.filter=null;renderNav()}renderGrid()});
$("camBtn").addEventListener("click",openCamModal);
$("camFile").addEventListener("change",e=>{if(e.target.files[0])handleCamFile(e.target.files[0]);e.target.value=""});
$("sellLink").addEventListener("click",openSell);
$("aboutLink").addEventListener("click",()=>openPage("about"));
$("helpLink").addEventListener("click",()=>openPage("contact"));
$("goDeals").addEventListener("click",()=>{showDeals();renderNav()});
$("logoHome").addEventListener("click",e=>{e.preventDefault();state.filter=null;$("searchInput").value="";showHome();renderNav();closeAccPage();window.scrollTo({top:0,behavior:"smooth"})});
document.querySelector(".nav").addEventListener("mouseleave",closeMega);
document.addEventListener("click",()=>{$("langMenu").classList.remove("open");$("userMenu").classList.remove("open")});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){["authOverlay","camOverlay","prodOverlay","sellOverlay","payOverlay","infoOverlay","invOverlay","hubOverlay"].forEach(closeOv);closeCart();closeMega();$("langMenu").classList.remove("open");$("userMenu").classList.remove("open")}});

/* ---------- Init ---------- */
loadDB();          // 💾 تحميل كل المحفوظ
ensureAdmin();     // 👑 تفعيل حساب الإدارة من config.js
/* 🌐 أول زيارة: كشف لغة المتصفح تلقائياً (عربي/English/Türkçe) — وكل لغة بعملتها (ل.س/$/₺) */
if(!localStorage.getItem(LS_KEY)){
  const nav=(navigator.language||"ar").slice(0,2).toLowerCase();
  if(I18N[nav])state.lang=nav;
}
setLang(state.lang||"ar");
showHome();
updateBadges();
renderPosts();
initGoogleBtn();
if(state.user)afterLogin();          // 🔐 استرجاع جلسة الدخول تلقائياً
setInterval(saveDB,2000);            // حفظ تلقائي كل ثانيتين
window.addEventListener("beforeunload",saveDB);
