const fetch = global.fetch;

function mustEnv(name){
  const v = process.env[name];
  if(!v) throw new Error(`Missing env var: ${name}`);
  return v;
}
function baseUrl(){ return mustEnv("SHEETBEST_API_URL").replace(/\/$/,""); }
function tabUrl(tab){ return `${baseUrl()}/tabs/${encodeURIComponent(tab)}`; }

async function sbGet(tab){
  const r = await fetch(tabUrl(tab), { method:"GET" });
  const t = await r.text();
  if(!r.ok) throw new Error(`GET ${r.status}: ${t}`);
  try{ return JSON.parse(t); }catch(e){ return []; }
}
async function sbPost(tab,row){
  const r = await fetch(tabUrl(tab), { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(row) });
  const t = await r.text();
  if(!r.ok) throw new Error(`POST ${r.status}: ${t}`);
  try{ return JSON.parse(t); }catch(e){ return {ok:true}; }
}
async function sbPatchById(tab,id,patch){
  // Common Sheetbest pattern: /tabs/TAB/id/{id}
  const r = await fetch(`${tabUrl(tab)}/id/${encodeURIComponent(id)}`, { method:"PATCH", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(patch) });
  const t = await r.text();
  if(!r.ok) throw new Error(`PATCH ${r.status}: ${t}`);
  try{ return JSON.parse(t); }catch(e){ return {ok:true}; }
}

module.exports = { mustEnv, sbGet, sbPost, sbPatchById };
