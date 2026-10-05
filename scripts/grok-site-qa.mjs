import fs from "node:fs/promises";

const FILES=["index.html","colorado.html","artists.html","releases.html","john-michell.html","article.html","functions/api/news.js","assets/photo-manifest.json"];
const key=process.env.XAI_API_KEY||"";

async function readFiles(){
  const out={};
  for(const file of FILES){ try{out[file]=await fs.readFile(file,"utf8")}catch{out[file]="FILE_MISSING"} }
  return out;
}
function localChecks(files){
  const issues=[];
  for(const [file,body] of Object.entries(files)){
    if(body==="FILE_MISSING"){issues.push({severity:"error",file,message:"File missing"});continue}
    if(/images\.unsplash\.com|source\.unsplash\.com/i.test(body)) issues.push({severity:"error",file,message:"Stock Unsplash imagery remains"});
    if(file.endsWith(".html")&&!/<\/html>/i.test(body)) issues.push({severity:"error",file,message:"Missing closing html tag"});
    if(file.endsWith(".html")&&!/<\/body>/i.test(body)) issues.push({severity:"error",file,message:"Missing closing body tag"});
  }
  const photos=JSON.parse(files["assets/photo-manifest.json"]).photos||{};
  for(const k of ["john-michell","john-michell-drivin-crazy","john-michell-who-is-you","john-michell-u"]){
    if(photos[k]?.url) issues.push({severity:"error",file:"assets/photo-manifest.json",message:k+" has an image URL; John Michell entries must stay owner-supplied"});
  }
  return issues;
}
const files=await readFiles();
const checks=localChecks(files);
let ai={summary:"Grok is not configured; local QA only.",issues:[]};
if(key){
  const prompt=`You are the senior QA reviewer for District Mind Media. Review this repository snapshot for broken pages, wrong artist identity, stock imagery, bad links, feed failures, malformed HTML/JS, and obvious SEO problems. Never invent facts. Never substitute one artist for another. Return ONLY JSON with summary and issues. Do not propose code patches in this pass.
SNAPSHOT:
${JSON.stringify(files)}
LOCAL_CHECKS:
${JSON.stringify(checks)}`;
  const r=await fetch("https://api.x.ai/v1/chat/completions",{method:"POST",headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"grok-4.7",temperature:0,messages:[{role:"system",content:"Conservative production QA. JSON only."},{role:"user",content:prompt}]})});
  if(!r.ok) throw new Error("xAI request failed: "+r.status);
  const data=await r.json();
  const raw=data.choices?.[0]?.message?.content||"";
  const m=raw.match(/\{[\s\S]*\}/);
  if(!m) throw new Error("Grok returned no JSON");
  ai=JSON.parse(m[0]);
}
await fs.mkdir("reports",{recursive:true});
let report="# District Mind Media — AI QA\n\nGenerated: "+new Date().toISOString()+"\n\n";
report+="## Local checks\n"+(checks.length?checks.map(x=>"- **"+x.severity+"** "+x.file+": "+x.message).join("\n"):"- No local issues detected.")+"\n\n";
report+="## Grok review\n"+(ai.summary||"No summary")+"\n\n";
report+=(ai.issues?.length?ai.issues.map(x=>"- **"+x.severity+"** "+x.file+": "+x.message).join("\n"):"- No Grok issues reported.")+"\n";
await fs.writeFile("reports/grok-site-qa.md",report);
if(checks.some(x=>x.severity==="error")) process.exitCode=1;
