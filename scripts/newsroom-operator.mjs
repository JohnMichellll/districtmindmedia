import fs from "node:fs";

const cfg=JSON.parse(fs.readFileSync("newsroom-config.json","utf8"));
const out=[];
const sourceHealth=[];
const clean=s=>String(s||"").replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
const parse=(xml,source)=>{
  const blocks=[...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\\1>/gi)].map(m=>m[2]);
  return blocks.map(b=>{
    const get=k=>(b.match(new RegExp("<"+k+"(?:\\\s[^>]*)?>([\s\S]*?)</"+k+">","i"))||[])[1]||"";
    const linkTag=get("link");
    const href=(linkTag.match(/href=["']([^"']+)["']/i)||[])[1]||linkTag;
    return {title:clean(get("title")),url:clean(href),date:clean(get("pubDate")||get("published")||get("updated")),source};
  }).filter(x=>x.title&&x.url);
};
const noise=t=>cfg.noise.some(n=>t.toLowerCase().includes(n));

for(const s of cfg.sources){
  const started=Date.now();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),cfg.runtime.sourceTimeoutMs);
  try{
    const r=await fetch(s.url,{signal:controller.signal,headers:{"user-agent":"DistrictMindMedia-NewsroomOperator/2.0","accept":"application/rss+xml,application/xml,text/xml,*/*"}});
    if(!r.ok) throw new Error("HTTP "+r.status);
    const stories=parse(await r.text(),s.name);
    out.push(...stories);
    sourceHealth.push({source:s.name,tier:s.tier,status:"ok",stories:stories.length,latencyMs:Date.now()-started});
  }catch(e){
    sourceHealth.push({source:s.name,tier:s.tier,status:"error",stories:0,latencyMs:Date.now()-started,error:String(e?.name==="AbortError"?"TIMEOUT":e?.message||e)});
    console.log("SOURCE_ERROR",s.name,e?.message||e);
  }finally{clearTimeout(timer);}
}

const seen=new Set();
const stories=out
 .filter(x=>x.title.length>=cfg.qualityGates.minimumTitleLength&&!noise(x.title))
 .filter(x=>{
   const k=x.title.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
   if(seen.has(k)) return false;
   seen.add(k); return true;
 })
 .sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));

const errors=sourceHealth.filter(x=>x.status==="error");
const report={
 generatedAt:new Date().toISOString(),
 operator:"District Mind AI Newsroom",
 status:stories.length?"READY_FOR_EDITOR":(errors.length?"DEGRADED":"NO_STORIES_AVAILABLE"),
 storyCount:stories.length,
 stories:stories.slice(0,100),
 sources:cfg.sources.map(s=>s.name),
 sourceHealth,
 errorCount:errors.length
};

fs.mkdirSync("reports",{recursive:true});
fs.writeFileSync("reports/newsroom-latest.json",JSON.stringify(report,null,2));
fs.writeFileSync("reports/newsroom-health.json",JSON.stringify({
 generatedAt:report.generatedAt,status:report.status,storyCount:report.storyCount,
 sourceCount:sourceHealth.length,healthySources:sourceHealth.filter(x=>x.status==="ok").length,
 failedSources:errors.length,sourceHealth
},null,2));
if(errors.length){
 const ledgerPath="reports/error-ledger.json";
 let ledger={version:1,updatedAt:report.generatedAt,errors:[]};
 if(fs.existsSync(ledgerPath)){try{ledger=JSON.parse(fs.readFileSync(ledgerPath,"utf8"));}catch{}}
 ledger.errors=[...ledger.errors,...errors.map(e=>({...e,workflow:"newsroom-operator"}))].slice(-500);
 ledger.updatedAt=report.generatedAt;
 fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2));
}
fs.writeFileSync(
 "reports/newsroom-latest.md",
 "# District Mind Newsroom Report\n\nGenerated: "+report.generatedAt+
 "\n\nStatus: "+report.status+"\n\nStories discovered: "+report.storyCount+
 "\n\n"+stories.slice(0,30).map((s,i)=>`${i+1}. **${s.title}** — ${s.source} — ${s.date||"undated"}\n   ${s.url}`).join("\n")
);
console.log(JSON.stringify({status:report.status,storyCount:report.storyCount}));
