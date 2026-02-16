const APP_VERSION = "V2 FINAL";
const $=(q)=>document.querySelector(q);
const $$=(q)=>Array.from(document.querySelectorAll(q));

const API={
  config:"/.netlify/functions/config",
  settings:"/.netlify/functions/settings",
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
  if (path==="/arrivages") return arrivagesPage();
  if (path==="/cyclone") return cyclonePage();
  if (path.startsWith("/zone/")) return zonePage(decodeURIComponent(path.split("/").pop()));
  if (path.startsWith("/categorie/")) return categoriePage(decodeURIComponent(path.split("/").pop()));
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
    end_ts: parseDateFlexible(p.end_date)
  };
}
function toBool(v){ if(typeof v==="boolean") return v; const s=String(v||"").toLowerCase().trim(); return ["1","true","yes","oui","on"].includes(s); }
function parseDateFlexible(s){
  const v=String(s||"").trim();
  if(!v) return null;
  // Accept: YYYY-MM-DD
  let m=v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m){
    const t=Date.parse(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
    return Number.isFinite(t)?t:null;
  }
  // Accept: DD/MM/YYYY or DD/MM/YY
  m=v.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
  if(m){
    let yy=m[3];
    if(yy.length===2){
      const n=Number(yy);
      yy = (n<=69 ? (2000+n) : (1900+n)).toString();
    }
    const t=Date.parse(`${yy}-${m[2]}-${m[1]}T00:00:00Z`);
    return Number.isFinite(t)?t:null;
  }
  // Fallback
  const t=Date.parse(v);
  return Number.isFinite(t)?t:null;
}

function fmtDateJJMMAA(ts){
  if(!ts) return "—";
  try{
    return new Date(ts).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"2-digit"});
  }catch(e){ return "—"; }
}

function money(v){
  const n=Number(String(v||"").replace(",",".")); 
  if(!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(n);
}
function esc(s){return String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function num(v){
  const n=Number(String(v??"").replace(",",".").replace(/[^0-9.\-]/g,""));
  return Number.isFinite(n)?n:null;
}
function discountValue(p){
  const oldp=num(p.old_price);
  const newp=num(p.new_price);
  if(oldp && newp && oldp>0){
    const pct=((oldp-newp)/oldp)*100;
    return Number.isFinite(pct)?pct:0;
  }
  const dp=num(p.discount_percent);
  return (dp && dp>0)?dp:0;
}

function renderDiscount(p){
  const oldp=num(p.old_price);
  const newp=num(p.new_price);
  if(oldp && newp && oldp>0){
    const pct=Math.round(((oldp-newp)/oldp)*100);
    if(Number.isFinite(pct) && pct>0) return `-${pct}%`;
  }
  const dp=num(p.discount_percent);
  if(dp && dp>0) return `-${dp}%`;
  return "Promo";
}
function expireIn(endTs){
  if(!endTs) return "—";
  const today = new Date(); today.setHours(0,0,0,0);
  const end = new Date(endTs); end.setHours(0,0,0,0);
  const diff = Math.round((end.getTime()-today.getTime())/86400000);
  if(diff<0) return "expirée";
  if(diff===0) return "aujourd’hui";
  if(diff===1) return "dans 1 jour";
  return `dans ${diff} jours`;
}



function card(p){
  const services=new URL(state.cfg.RRD_SERVICES_URL);
  if(p.category) services.searchParams.set("categorie", p.related_service||p.category);
  if(p.zone) services.searchParams.set("zone", p.zone);
  const end = p.end_ts? fmtDateJJMMAA(p.end_ts):"—";
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
      <div class="discount">${renderDiscount(p)}</div>
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
  const sp=new URLSearchParams(location.search);

  const q=(sp.get("q")||"").toLowerCase();
  const z=sp.get("zone")||"ALL";
  const c=sp.get("category")||"ALL";
  const onlyC=sp.get("container")==="1";
  const sort=sp.get("sort")||"RECENT";

  $("#q2") && ($("#q2").value = sp.get("q")||"");
  $("#zone2") && ($("#zone2").value = z);
  $("#category2") && ($("#category2").value = c);
  $("#onlyContainer2") && ($("#onlyContainer2").checked = onlyC);
  $("#sort2") && ($("#sort2").value = sort);

  let items = promosAll.filter(p=>{
    if(z!=="ALL" && p.zone!==z) return false;
    if(c!=="ALL" && p.category!==c) return false;
    if(onlyC && !p.is_container) return false;
    if(q){
      const hay=(p.title+" "+p.description+" "+p.store_name+" "+p.zone+" "+p.category).toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });

  items = sortItems(items, sort);

  $("#kpis2") && ($("#kpis2").innerHTML = `<span class="pill">${items.length} résultat(s)</span>`);

  let pageSize=12, shown=0;
  const render=()=>{
    fill("#grid", items.slice(0,shown), "Aucune promo ne correspond à tes filtres.");
    const more=$("#more2");
    if(more){
      more.classList.toggle("hidden", shown>=items.length);
      more.textContent = shown>=items.length ? "Fin" : `Voir plus (${Math.min(pageSize, items.length-shown)})`;
    }
  };
  shown = Math.min(pageSize, items.length);
  render();

  $("#more2")?.addEventListener("click", ()=>{
    shown = Math.min(shown+pageSize, items.length);
    render();
  });

  const sync=()=>{
    const sp2=new URLSearchParams();
    const qv=$("#q2").value.trim(); if(qv) sp2.set("q",qv);
    const zv=$("#zone2").value; if(zv!=="ALL") sp2.set("zone",zv);
    const cv=$("#category2").value; if(cv!=="ALL") sp2.set("category",cv);
    if($("#onlyContainer2").checked) sp2.set("container","1");
    const sv=$("#sort2")?.value||"RECENT"; if(sv) sp2.set("sort",sv);
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

  const end = p.end_ts? fmtDateJJMMAA(p.end_ts):"—";
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
        <div class="discount">${renderDiscount(p)}</div>
        <div class="small">Jusqu’au <b>${end}</b> • <span class="small">Expire ${expireIn(p.end_ts)}</span></div>
      </div>
      <div class="hr"></div>
      <a class="btn btn--ghost" href="/promos">← Retour</a>
      ${p.source_url?`<a class="btn btn--ghost" target="_blank" rel="noopener" href="${esc(p.source_url)}">Voir la source</a>`:""}
    </div>
  </div>`;
}

function sortItems(items, sort){
  const arr=[...items];
  const byBoost=(a,b)=>(b.is_boosted-a.is_boosted);
  const byRecent=(a,b)=>(b.created_ts-a.created_ts);
  const byEndSoon=(a,b)=>{
    const ae=(a.end_ts||9e15), be=(b.end_ts||9e15);
    return ae-be;
  };
  const byBestDiscount=(a,b)=> (discountValue(b)-discountValue(a));
  if(sort==="END_SOON") arr.sort((a,b)=> byBoost(a,b) || byEndSoon(a,b) || byRecent(a,b));
  else if(sort==="BEST_DISCOUNT") arr.sort((a,b)=> byBoost(a,b) || byBestDiscount(a,b) || byRecent(a,b));
  else arr.sort((a,b)=> byBoost(a,b) || byRecent(a,b));
  return arr;
}

async function zonePage(zoneSlug){
  const zone = normalizeZone(zoneSlug);
  document.title = `Zone ${zone} — RadarPromo974`;
  $("#zoneTitle") && ($("#zoneTitle").textContent = `Zone ${zone}`);
  $("#zoneLead") && ($("#zoneLead").textContent = `Promos actives dans la zone ${zone}.`);

  const sp=new URLSearchParams(location.search);
  const q=(sp.get("q")||"").toLowerCase();
  const sort=sp.get("sort")||"RECENT";
  $("#qZ") && ($("#qZ").value = sp.get("q")||"");
  $("#sortZ") && ($("#sortZ").value = sort);

  let items = (await loadPromos("active")).filter(p=>p.zone===zone);
  if(q) items = items.filter(p=>(p.title+" "+p.description+" "+p.store_name+" "+p.category).toLowerCase().includes(q));
  items = sortItems(items, sort);

  let pageSize=12, shown=Math.min(pageSize, items.length);
  const render=()=>{
    fill("#gridZone", items.slice(0,shown), "Aucune promo pour cette zone.");
    $("#moreZone")?.classList.toggle("hidden", shown>=items.length);
  };
  render();
  $("#moreZone")?.addEventListener("click", ()=>{ shown=Math.min(shown+pageSize, items.length); render(); });

  $("#applyZ")?.addEventListener("click", ()=>{
    const sp2=new URLSearchParams();
    const qv=$("#qZ").value.trim(); if(qv) sp2.set("q",qv);
    const sv=$("#sortZ").value; if(sv) sp2.set("sort",sv);
    location.href=`/zone/${encodeURIComponent(zone.toLowerCase())}`+(sp2.toString()?`?${sp2.toString()}`:"");
  });
}

async function categoriePage(catSlug){
  const cat = denormalizeCategory(catSlug);
  document.title = `${cat} — RadarPromo974`;
  $("#catTitle") && ($("#catTitle").textContent = cat);
  $("#catLead") && ($("#catLead").textContent = `Promos actives dans la catégorie ${cat}.`);

  const sp=new URLSearchParams(location.search);
  const q=(sp.get("q")||"").toLowerCase();
  const sort=sp.get("sort")||"RECENT";
  $("#qC") && ($("#qC").value = sp.get("q")||"");
  $("#sortC") && ($("#sortC").value = sort);

  let items = (await loadPromos("active")).filter(p=>p.category===cat);
  if(q) items = items.filter(p=>(p.title+" "+p.description+" "+p.store_name+" "+p.zone).toLowerCase().includes(q));
  items = sortItems(items, sort);

  let pageSize=12, shown=Math.min(pageSize, items.length);
  const render=()=>{
    fill("#gridCat", items.slice(0,shown), "Aucune promo pour cette catégorie.");
    $("#moreCat")?.classList.toggle("hidden", shown>=items.length);
  };
  render();
  $("#moreCat")?.addEventListener("click", ()=>{ shown=Math.min(shown+pageSize, items.length); render(); });

  $("#applyC")?.addEventListener("click", ()=>{
    const sp2=new URLSearchParams();
    const qv=$("#qC").value.trim(); if(qv) sp2.set("q",qv);
    const sv=$("#sortC").value; if(sv) sp2.set("sort",sv);
    location.href=`/categorie/${encodeURIComponent(slugify(cat))}`+(sp2.toString()?`?${sp2.toString()}`:"");
  });
}

async function arrivagesPage(){
  document.title = "Arrivages — RadarPromo974";
  const sp=new URLSearchParams(location.search);
  const z=sp.get("zone")||"ALL";
  const sort=sp.get("sort")||"END_SOON";
  $("#zoneA") && ($("#zoneA").value = z);
  $("#sortA") && ($("#sortA").value = sort);

  let items=(await loadPromos("active")).filter(p=>p.is_container);
  if(z!=="ALL") items=items.filter(p=>p.zone===z);
  items = sortItems(items, sort);

  let pageSize=12, shown=Math.min(pageSize, items.length);
  const render=()=>{
    fill("#gridArr", items.slice(0,shown), "Aucun arrivage pour l’instant.");
    $("#moreArr")?.classList.toggle("hidden", shown>=items.length);
  };
  render();
  $("#moreArr")?.addEventListener("click", ()=>{ shown=Math.min(shown+pageSize, items.length); render(); });

  $("#applyA")?.addEventListener("click", ()=>{
    const sp2=new URLSearchParams();
    const zv=$("#zoneA").value; if(zv!=="ALL") sp2.set("zone",zv);
    const sv=$("#sortA").value; if(sv) sp2.set("sort",sv);
    location.href="/arrivages"+(sp2.toString()?`?${sp2.toString()}`:"");
  });
}

async function cyclonePage(){
  document.title = "Cyclone — RadarPromo974";
  const active = !!state.cfg.cyclone_mode;
  const box=$("#cycloneState"), panel=$("#cycloneActive");
  if(!box) return;
  if(!active){
    box.textContent="Mode cyclone inactif pour le moment.";
    box.className="alert";
    panel && panel.classList.add("hidden");
    return;
  }
  box.textContent="Mode cyclone actif : urgences en priorité.";
  box.className="alert";
  panel && panel.classList.remove("hidden");

  let items=(await loadPromos("active")).filter(p=>p.is_urgent);
  items = sortItems(items, "END_SOON");

  let pageSize=12, shown=Math.min(pageSize, items.length);
  const render=()=>{
    fill("#gridCyc", items.slice(0,shown), "Aucune promo urgente pour l’instant.");
    $("#moreCyc")?.classList.toggle("hidden", shown>=items.length);
  };
  render();
  $("#moreCyc")?.addEventListener("click", ()=>{ shown=Math.min(shown+pageSize, items.length); render(); });
}

function normalizeZone(z){
  const s=String(z||"").trim().toLowerCase();
  if(s==="nord") return "Nord";
  if(s==="sud") return "Sud";
  if(s==="ouest") return "Ouest";
  if(s==="est") return "Est";
  return s ? (s[0].toUpperCase()+s.slice(1)) : "Nord";
}
function slugify(s){
  return String(s||"").toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
}
function denormalizeCategory(slug){
  const list=String(state.cfg.categories||"").split(",").map(x=>x.trim()).filter(Boolean);
  const found=list.find(c=>slugify(c)===String(slug||"").toLowerCase());
  if(found) return found;
  const s=String(slug||"").replace(/-/g," ");
  return s ? (s[0].toUpperCase()+s.slice(1)) : "Autre";
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
