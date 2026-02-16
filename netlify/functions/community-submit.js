const { sbPost, sbGet } = require("./_sheetbest");

const mem = global.__rp_mem || (global.__rp_mem = new Map());
function ip(event){ return (event.headers["x-nf-client-connection-ip"] || event.headers["x-forwarded-for"] || "unknown").split(",")[0].trim(); }
function nowISO(){ return new Date().toISOString(); }
function id(){ return "RADP-" + Math.random().toString(36).slice(2,8).toUpperCase() + "-" + Date.now().toString(36).toUpperCase(); }
function clean(s,max=800){ return String(s||"").trim().slice(0,max); }
function toBool(v){ if(typeof v==="boolean") return v; const s=String(v||"").toLowerCase().trim(); return ["1","true","yes","oui","on"].includes(s); }

exports.handler = async (event)=>{
  if(event.httpMethod!=="POST") return { statusCode:405, body:"" };
  try{
    const key=ip(event);
    const t=Date.now(), prev=mem.get(key)||0;
    if(t-prev<10000) return { statusCode:429, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:false, error:"Trop de tentatives. Réessaie." }) };
    mem.set(key,t);

    const body = JSON.parse(event.body||"{}");
    if(body.website) return { statusCode:200, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:true }) };

    // moderation_mode from settings if exists, default true
    let moderation=true;
    try{
      const s=await sbGet("RAD_SETTINGS");
      const row=s && s[0] ? s[0] : {};
      moderation = String(row.moderation_mode||"true").toLowerCase()!=="false";
    }catch(e){}

    const row = {
      id: id(),
      merchant_id: "",
      title: clean(body.title,140),
      description: clean(body.description,1200),
      category: clean(body.category,40),
      zone: clean(body.zone,16),
      store_name: clean(body.store_name,80),
      old_price: clean(body.old_price,24),
      new_price: clean(body.new_price,24),
      discount_percent: clean(body.discount_percent,8),
      is_container: toBool(body.is_container),
      is_urgent: toBool(body.is_urgent),
      source_type: "community",
      source_url: clean(body.source_url,300),
      image_url: clean(body.image_url,300),
      start_date: clean(body.start_date,10),
      end_date: clean(body.end_date,10),
      created_at: nowISO(),
      status: moderation ? "pending" : "active",
      boosted_until: "",
      views: 0,
      clicks: 0,
      related_service: "",
      deleted_at: ""
    };

    if(!row.title || !row.store_name || !row.zone || !row.category){
      return { statusCode:400, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:false, error:"Champs requis manquants." }) };
    }

    await sbPost("RAD_PROMOS", row);
    return { statusCode:200, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:true, id: row.id, status: row.status }) };
  }catch(e){
    return { statusCode:500, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:false, error:e.message }) };
  }
};
