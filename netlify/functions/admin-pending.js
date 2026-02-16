const { mustEnv, sbGet } = require("./_sheetbest");
exports.handler = async (event)=>{
  try{
    const token=String(event.queryStringParameters?.token||"");
    if(!token || token!==mustEnv("ADMIN_PASSWORD")){
      return { statusCode:401, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:false, error:"Accès refusé." }) };
    }
    const rows=await sbGet("RAD_PROMOS");
    const items=(rows||[]).filter(r=>String(r.status||"").toLowerCase()==="pending");
    return { statusCode:200, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:true, items }) };
  }catch(e){
    return { statusCode:500, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:false, error:e.message }) };
  }
};
