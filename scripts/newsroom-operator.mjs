import fs from "node:fs";

const cfg=JSON.parse(fs.readFileSync("newsroom-config.json","utf8"));
const out=[];
const clean=s=>String(s||"").replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
const parse=(xml,source)=>{
  const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  return items.map(m=>{
    const b=m[1];
    const get=k=>(b.match(new RegExp("<"+k+"(?: [^>]*)?>([\s\S]*?)</"+k+">","i"))||[])[1]||"";
    return {title:clean(get("title")),url:clean(get("link")),date:clean(get("pubDate")),source};
  }).filter(x=>x.title&&x.url);
};
const noise=t=>cfg.noise.some(n=>t.toLowerCase().includes(n));

for(const s of cfg.sources){
  try{
    const r=await fetch(s.url,{headers:{"user-agent":"DistrictMindMedia-NewsroomOperator/1.0"}});
    if(!r.ok) throw new Error("HTTP "+r.status);
    out.push(...parse(await r.text(),s.name));
  }catch(e){ console.log("SOURCE_OFFLINE",s.name,e.message); }
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

const report={
 generatedAt:new Date().toISOString(),
 operator:"District Mind AI Newsroom",
 status:stories.length?"READY_FOR_EDITOR":"NO_STORIES_AVAILABLE",
 storyCount:stories.length,
 stories:stories.slice(0,100),
 sources:cfg.sources.map(s=>s.name)
};

fs.mkdirSync("reports",{recursive:true});
fs.writeFileSync("reports/newsroom-latest.json",JSON.stringify(report,null,2));
fs.writeFileSync(
 "reports/newsroom-latest.md",
 "# District Mind Newsroom Report\n\nGenerated: "+report.generatedAt+
 "\n\nStatus: "+report.status+"\n\nStories discovered: "+report.storyCount+
 "\n\n"+stories.slice(0,30).map((s,i)=>`${i+1}. **${s.title}** — ${s.source} — ${s.date||"undated"}\n   ${s.url}`).join("\n")
);
console.log(JSON.stringify({status:report.status,storyCount:report.storyCount}));
