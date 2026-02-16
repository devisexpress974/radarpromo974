const { sbGet } = require("./_sheetbest");
function bool(v, def=true){
  const s=String(v??"").trim().toLowerCase();
  if(!s) return def;
  if(["true","1","yes","oui","on"].includes(s)) return true;
  if(["false","0","no","non","off"].includes(s)) return false;
  return def;
}
exports.handler = async ()=>{
  try{
    const rows = await sbGet("RAD_SETTINGS");
    const r = (rows && rows[0]) ? rows[0] : {};
    const data = {
      cyclone_mode: bool(r.cyclone_mode, false),
      moderation_mode: bool(r.moderation_mode, true),
      zones: String(r.zones||"Nord,Sud,Ouest,Est"),
      categories: String(r.categories||"Travaux,Maison,Alimentaire,High-Tech,Auto,Loisirs,Autre"),
      RRD_SERVICES_URL: String(r.RRD_SERVICES_URL || r.devis_base_url || process.env.RRD_SERVICES_URL || "https://devisexpress974.netlify.app/")};
    return { statusCode:200, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:true, ...data }) };
  }catch(e){
    return { statusCode:200, headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ok:true, cyclone_mode:false, moderation_mode:true, zones:"Nord,Sud,Ouest,Est", categories:"Travaux,Maison,Alimentaire,High-Tech,Auto,Loisirs,Autre", RRD_SERVICES_URL: process.env.RRD_SERVICES_URL||"https://devisexpress974.netlify.app/" }) };
  }
};
