const { mustEnv } = require("./_sheetbest");
exports.handler = async (event)=>{
  if(event.httpMethod!=="POST") return { statusCode:405, body:"" };
  const body=JSON.parse(event.body||"{}");
  const token=String(body.token||"");
  if(!token || token !== mustEnv("ADMIN_PASSWORD")){
    return { statusCode:401, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:false, error:"Accès refusé." }) };
  }
  return { statusCode:200, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:true }) };
};
