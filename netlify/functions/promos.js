const { sbGet } = require("./_sheetbest");

function startOfDay(ts){ const d=new Date(ts); d.setHours(0,0,0,0); return d.getTime(); }
function parseYMD(s){
  const m=String(s||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return null;
  const t=Date.parse(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  return Number.isFinite(t)?t:null;
}

exports.handler = async (event)=>{
  try{
    const status=(event.queryStringParameters?.status||"active").toLowerCase();
    const rows = await sbGet("RAD_PROMOS");
    const today = startOfDay(Date.now());
    const items = (rows||[]).filter(r=>{
      const del = r.deleted_at && String(r.deleted_at).trim();
      if(del) return false;
      const st = String(r.status||"active").toLowerCase();
      const end = parseYMD(r.end_date);
      if(status==="active"){
        if(st!=="active") return false;
        if(end && end<today) return false;
      }
      return true;
    });
    return { statusCode:200, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:true, items }) };
  }catch(e){
    return { statusCode:500, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:false, error:e.message }) };
  }
};
