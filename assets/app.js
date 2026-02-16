const $=(q)=>document.querySelector(q);
const $$=(q)=>Array.from(document.querySelectorAll(q));

const API={
  config:"/.netlify/functions/config",
  promos:"/.netlify/functions/promos",
  submit:"/.netlify/functions/community-submit",
  boost:"/.netlify/functions/activate-boost",
  adminCheck:"/.netlify/functions/admin-check",
  pending:"/.netlify/functions/admin-pending",
  approve:"/.netlify/functions/admin-approve",
  reject:"/.netlify/functions/admin-reject"
};

const state={ cfg:null, promos:[] };

init();

async function init(){
  nav();
  $("#year") && ($("#year").textContent = new Date().getFullYear());
  state.cfg = await safeJson(API.config, null) || {
    RRD_SERVICES_URL:"https://devisexpress974.netlify.app/"
  };

  const path = location.pathname.replace(/\/$/,"") || "/";
  if (path==="/") return home();
  if (path==="/promos") return promosPage();
  if (path.startsWith("/promo/")) return promoDetail(decodeURIComponent(path.split("/").pop()));
  if (path==="/admin") return adminPage();
}

function nav(){
  const burger=$("#burger"), drawer=$("#drawer"), close=$("#drawerClose"), bg=$("#drawerBg");
  if(!burger) return;
  burger.addEventListener("click",()=>drawer.classList.add("on"));
  [close,bg].forEach(x=>x && x.addEventListener("click",()=>drawer.classList.remove("on")));
}

async function loadPromos(status="active"){
  const data = await safeJson(`${API.promos}?status=${encodeURIComponent(status)}`, {items:[]});
  return (data.items||[]).map(normPromo);
}
function normPromo(p){
  const now=Date.now();
  const boosted = Date.parse(p.boosted_until||"");
  return {
    ...p,
    id:String(p.id||"").trim(),
    title:String(p.title||"").trim(),
    description:String(p.description||"").trim(),
    zone:String(p.zone||"").trim(),
    category:String(p.category||"").trim(),
    store_name:String(p.store_name||"").trim(),
    is_container: toBool(p.is_container),
    is_urgent: toBool(p.is_urgent),
    is_boosted: Number.isFinite(boosted) && boosted>now,
    created_ts: Date.parse(p.created_at||"") || 0,
    end_ts: parseYMD(p.end_date)
  };
}
function toBool(v){ if(typeof v==="boolean") return v; const s=String(v||"").toLowerCase().trim(); return ["1","true","yes","oui","on"].includes(s); }
function parseYMD(s){
  const m=String(s||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return null;
  const t=Date.parse(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  return Number.isFinite(t)?t:null;
}
function money(v){
  const n=Number(String(v||"").replace(",",".")); 
  if(!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(n);
}
function esc(s){return String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}

function card(p){
  const services=new URL(state.cfg.RRD_SERVICES_URL);
  if(p.category) services.searchParams.set("categorie", p.related_service||p.category);
  if(p.zone) services.searchParams.set("zone", p.zone);
  const end = p.end_ts? new Date(p.end_ts).toLocaleDateString("fr-FR"):"—";
  return `<article class="cardPromo">
    <div class="cardPromo__head">
      <h3 class="cardPromo__title">${esc(p.title||"Promo")}</h3>
      <div class="badges">
        ${p.is_boosted?`<span class="badge badge--boost">Boost</span>`:""}
        ${p.is_urgent?`<span class="badge badge--urgent">Urgence</span>`:""}
        ${p.is_container?`<span class="badge badge--container">Arrivage</span>`:""}
        <span class="badge badge--store">${esc(p.store_name||"—")}</span>
        <span class="badge badge--zone">${esc(p.zone||"—")}</span>
        <span class="badge badge--cat">${esc(p.category||"—")}</span>
      </div>
    </div>
    <div class="cardPromo__body">${esc(p.description||"—")}</div>
    <div class="cardPromo__prices">
      <div>
        <div class="priceOld">${money(p.old_price)}</div>
        <div class="priceNew">${money(p.new_price)}</div>
      </div>
      <div class="discount">${p.discount_percent?`-${esc(p.discount_percent)}%`:"Promo"}</div>
    </div>
    <div class="metaLine">
      <span>Jusqu’au ${end}</span>
      <span style="display:flex; gap:8px; flex-wrap:wrap">
        <a class="btn btn--ghost" href="/promo/${encodeURIComponent(p.id)}">Voir</a>
        <a class="btn btn--primary" href="${services.toString()}">Artisan</a>
      </span>
    </div>
  </article>`;
}

async function home(){
  const promos = await loadPromos("active");
  promos.sort((a,b)=>(b.is_boosted-a.is_boosted)||(b.created_ts-a.created_ts));
  const featured = promos.filter(p=>p.is_boosted).slice(0,6);
  const urgent = promos.filter(p=>p.is_urgent).slice(0,6);
  const container = promos.filter(p=>p.is_container).slice(0,6);

  $("#kpis") && ($("#kpis").innerHTML = `<span class="pill">Promos actives: ${promos.length}</span><span class="pill">Zones: Nord • Sud • Ouest • Est</span>`);

  fill("#gridFeatured", featured, "Aucune promo boostée pour l’instant.");
  fill("#gridUrgent", urgent, "Aucune promo urgente pour l’instant.");
  fill("#gridContainer", container, "Aucun arrivage container pour l’instant.");

  $("#btnSearch")?.addEventListener("click", ()=>{
    const sp=new URLSearchParams();
    const q=$("#q")?.value?.trim(); if(q) sp.set("q",q);
    const z=$("#zone")?.value; if(z && z!=="ALL") sp.set("zone",z);
    const c=$("#category")?.value; if(c && c!=="ALL") sp.set("category",c);
    if($("#onlyContainer")?.checked) sp.set("container","1");
    location.href="/promos"+(sp.toString()?("?"+sp.toString()):"");
  });
}

async function promosPage(){
  const promosAll = await loadPromos("active");
  let items=[...promosAll];

  const sp=new URLSearchParams(location.search);
  const q=(sp.get("q")||"").toLowerCase();
  const z=sp.get("zone")||"ALL";
  const c=sp.get("category")||"ALL";
  const onlyC=sp.get("container")==="1";

  $("#q2") && ($("#q2").value = sp.get("q")||"");
  $("#zone2") && ($("#zone2").value = z);
  $("#category2") && ($("#category2").value = c);
  $("#onlyContainer2") && ($("#onlyContainer2").checked = onlyC);

  items = items.filter(p=>{
    if(z!=="ALL" && p.zone!==z) return false;
    if(c!=="ALL" && p.category!==c) return false;
    if(onlyC && !p.is_container) return false;
    if(q){
      const hay=(p.title+" "+p.description+" "+p.store_name+" "+p.zone+" "+p.category).toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });

  items.sort((a,b)=>(b.is_boosted-a.is_boosted)||(b.created_ts-a.created_ts));
  $("#kpis2") && ($("#kpis2").innerHTML = `<span class="pill">${items.length} résultat(s)</span>`);

  fill("#grid", items, "Aucune promo ne correspond à tes filtres.");

  const sync=()=>{
    const sp2=new URLSearchParams();
    const qv=$("#q2").value.trim(); if(qv) sp2.set("q",qv);
    const zv=$("#zone2").value; if(zv!=="ALL") sp2.set("zone",zv);
    const cv=$("#category2").value; if(cv!=="ALL") sp2.set("category",cv);
    if($("#onlyContainer2").checked) sp2.set("container","1");
    location.href="/promos"+(sp2.toString()?("?"+sp2.toString()):"");
  };
  $("#btnApply2")?.addEventListener("click", (e)=>{e.preventDefault(); sync();});
}

async function promoDetail(id){
  const promos = await loadPromos("active");
  const p = promos.find(x=>String(x.id)===String(id));
  if(!p){ $("#detail").innerHTML = `<div class="alert alert--error">Promo introuvable (ou expirée).</div>`; return; }

  const services=new URL(state.cfg.RRD_SERVICES_URL);
  if(p.category) services.searchParams.set("categorie", p.related_service||p.category);
  if(p.zone) services.searchParams.set("zone", p.zone);

  const end = p.end_ts? new Date(p.end_ts).toLocaleDateString("fr-FR"):"—";
  document.title = `${p.title} — RadarPromo974`;
  $("#detail").innerHTML = `
  <div class="section">
    <div class="section__head">
      <div>
        <div class="small">${esc(p.store_name)} • ${esc(p.zone)} • ${esc(p.category)}</div>
        <h2 style="margin:6px 0 0">${esc(p.title)}</h2>
      </div>
      <a class="btn btn--primary" href="${services.toString()}">Trouver un artisan</a>
    </div>
    <div class="section__body">
      <div class="badges">
        ${p.is_boosted?`<span class="badge badge--boost">Boost</span>`:""}
        ${p.is_urgent?`<span class="badge badge--urgent">Urgence</span>`:""}
        ${p.is_container?`<span class="badge badge--container">Arrivage</span>`:""}
      </div>
      <p class="lead">${esc(p.description||"—")}</p>
      <div class="hr"></div>
      <div style="display:flex; gap:18px; flex-wrap:wrap; align-items:flex-end">
        <div>
          <div class="priceOld">${money(p.old_price)}</div>
          <div class="priceNew" style="font-size:34px">${money(p.new_price)}</div>
        </div>
        <div class="discount">${p.discount_percent?`-${esc(p.discount_percent)}%`:"Promo"}</div>
        <div class="small">Jusqu’au <b>${end}</b></div>
      </div>
      <div class="hr"></div>
      <a class="btn btn--ghost" href="/promos">← Retour</a>
      ${p.source_url?`<a class="btn btn--ghost" target="_blank" rel="noopener" href="${esc(p.source_url)}">Voir la source</a>`:""}
    </div>
  </div>`;
}

function fill(sel, items, empty){
  const el=$(sel); if(!el) return;
  if(!items.length){ el.innerHTML = `<div class="alert">${empty}</div>`; return; }
  el.innerHTML = items.map(card).join("");
}

async function adminPage(){
  const msg=$("#admMsg"), panel=$("#admPanel");
  const show=(t,err=false)=>{ msg.textContent=t; msg.className=err?"alert alert--error":"alert"; msg.classList.remove("hidden"); };

  let token=null;
  $("#admConnect")?.addEventListener("click", async ()=>{
    msg.classList.add("hidden");
    token=$("#admPwd").value.trim();
    if(!token) return show("Mot de passe requis.", true);
    const data = await safeJson(API.adminCheck,{ok:false,error:"Erreur"});
    const res = await fetch(API.adminCheck,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});
    const j = await res.json().catch(()=>({}));
    if(!res.ok) return show(j.error||"Accès refusé.", true);
    panel.classList.remove("hidden");
    show("✅ Connecté.");
    loadPending(token);
  });

  $("#refreshPending")?.addEventListener("click", ()=>token && loadPending(token));

  async function loadPending(token){
    const list=$("#pendingList");
    list.innerHTML="";
    const res = await fetch(`${API.pending}?token=${encodeURIComponent(token)}`);
    const j = await res.json().catch(()=>({}));
    if(!res.ok) return show(j.error||"Erreur.", true);
    if(!(j.items||[]).length){ list.innerHTML=`<div class="alert">Aucune promo en attente.</div>`; return; }
    list.innerHTML=(j.items||[]).map(p=>`
      <div class="heroCard"><div class="heroCopy">
        <div class="pill">${esc(p.zone||"")} • ${esc(p.category||"")}</div>
        <h2 style="margin:10px 0 6px; font-size:18px">${esc(p.title||"")}</h2>
        <div class="small">${esc(p.store_name||"")}</div>
        <div class="hr"></div>
        <div class="small">${esc(p.description||"—")}</div>
        <div class="hr"></div>
        <div style="display:flex; gap:10px; flex-wrap:wrap">
          <button class="btn btn--primary" data-approve="${esc(p.id)}">Valider</button>
          <button class="btn" data-reject="${esc(p.id)}">Rejeter</button>
        </div>
      </div></div>
    `).join("");

    $$("[data-approve]").forEach(b=>b.addEventListener("click", ()=>approve(token,b.dataset.approve)));
    $$("[data-reject]").forEach(b=>b.addEventListener("click", ()=>reject(token,b.dataset.reject)));
  }

  async function approve(token,id){
    const res=await fetch(API.approve,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,id})});
    const j=await res.json().catch(()=>({}));
    if(!res.ok) return show(j.error||"Erreur.", true);
    show("✅ Validée.");
    loadPending(token);
  }
  async function reject(token,id){
    const reason=prompt("Raison du rejet :")||"";
    const res=await fetch(API.reject,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,id,reason})});
    const j=await res.json().catch(()=>({}));
    if(!res.ok) return show(j.error||"Erreur.", true);
    show("✅ Rejetée.");
    loadPending(token);
  }
}

async function safeJson(url, fallback){
  try{
    const r=await fetch(url);
    if(!r.ok) return fallback;
    return await r.json();
  }catch(e){ return fallback; }
}
