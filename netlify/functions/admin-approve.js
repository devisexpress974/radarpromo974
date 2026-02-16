const { mustEnv, sbPatchById } = require("./_sheetbest");
exports.handler = async (event)=>{
  if(event.httpMethod!=="POST") return { statusCode:405, body:"" };
  try{
    const body=JSON.parse(event.body||"{}");
    const token=String(body.token||"");
    if(!token || token!==mustEnv("ADMIN_PASSWORD")){
      return { statusCode:401, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:false, error:"Accès refusé." }) };
    }
    const id=String(body.id||"").trim();
    if(!id) return { statusCode:400, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:false, error:"id requis." }) };
    await sbPatchById("RAD_PROMOS", id, { status:"active" });
    return { statusCode:200, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:true }) };
  }catch(e){
    return { statusCode:500, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:false, error:e.message }) };
  }
};
