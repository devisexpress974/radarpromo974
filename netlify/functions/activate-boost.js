const { sbPatchById, sbPost } = require("./_sheetbest");
function nowISO(){ return new Date().toISOString(); }
function addHours(h){ return new Date(Date.now()+h*3600000).toISOString(); }
function addDays(d){ return new Date(Date.now()+d*86400000).toISOString(); }
function pid(){ return "PAY-" + Math.random().toString(36).slice(2,10).toUpperCase() + "-" + Date.now().toString(36).toUpperCase(); }

function planSpec(plan){
  if(plan==="BOOST_24H") return { until:addHours(24), amount:"9.00", link:"PAYPAL_BOOST_24H_URL" };
  if(plan==="BOOST_7D") return { until:addDays(7), amount:"19.00", link:"PAYPAL_BOOST_7D_URL" };
  if(plan==="BOOST_NOTIFY") return { until:addDays(7), amount:"29.00", link:"PAYPAL_BOOST_NOTIFY_URL" };
  return null;
}

exports.handler = async (event)=>{
  if(event.httpMethod!=="POST") return { statusCode:405, body:"" };
  try{
    const body=JSON.parse(event.body||"{}");
    const promo_id=String(body.promo_id||"").trim();
    const plan=String(body.plan||"").trim();
    if(!promo_id||!plan) return { statusCode:400, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:false, error:"promo_id et plan requis." }) };
    const spec=planSpec(plan);
    if(!spec) return { statusCode:400, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:false, error:"Plan invalide." }) };

    await sbPatchById("RAD_PROMOS", promo_id, { boosted_until: spec.until });

    await sbPost("RAD_PAYMENTS", {
      id: pid(), merchant_id:"", promo_id, plan, amount: spec.amount, currency:"EUR",
      status:"paid", paypal_link_used: spec.link, created_at: nowISO()
    });

    return { statusCode:200, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:true, boosted_until: spec.until }) };
  }catch(e){
    return { statusCode:500, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:false, error:e.message }) };
  }
};
