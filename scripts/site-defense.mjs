import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {execFileSync} from "node:child_process";

const root=process.cwd();
const failures=[];
const pages=fs.readdirSync(root).filter(f=>f.endsWith(".html"));
const exists=p=>fs.existsSync(path.join(root,p));

if(!exists("index.html")) failures.push("Missing index.html");
if(!exists("style.css")) failures.push("Missing style.css");
else if(fs.statSync(path.join(root,"style.css")).size<20000) failures.push("style.css is unexpectedly small; possible stylesheet overwrite");

for(const file of pages){
 const src=fs.readFileSync(path.join(root,file),"utf8");
 if(!/^<!doctype html>/i.test(src.trim())) failures.push(file+": missing doctype");
 if(!/<title>[^<]+<\/title>/i.test(src)) failures.push(file+": missing title");
 if(!/<link[^>]+href=["']style\.css["']/i.test(src)) failures.push(file+": missing style.css link");
 const ids=[...src.matchAll(/\bid=["']([^"']+)["']/gi)].map(m=>m[1]);
 const dup=ids.filter((x,i)=>ids.indexOf(x)!==i);
 if(dup.length) failures.push(file+": duplicate ids: "+[...new Set(dup)].join(", "));
 for(const m of src.matchAll(/\b(?:href|src)=["']([^"'#?]+)(?:\?[^"']*)?["']/gi)){
  const target=m[1];
  if(!/^https?:\/\//i.test(target) && !/^mailto:/i.test(target) && !/^tel:/i.test(target) && !target.startsWith("data:")){
   const clean=decodeURIComponent(target.split("#")[0]);
   if(clean && !clean.endsWith("/") && !exists(clean)) failures.push(file+": missing local asset "+clean);
  }
 }
 for(const m of src.matchAll(/<script(?:[^>]*)>([\s\S]*?)<\/script>/gi)){
  const body=m[1].trim(); if(!body) continue;
  const tmp=path.join(os.tmpdir(),"dm-inline-"+Math.random().toString(36).slice(2)+".mjs");
  try{fs.writeFileSync(tmp,body);execFileSync(process.execPath,["--check",tmp],{stdio:"pipe"});}
  catch{failures.push(file+": inline script syntax error");}
  finally{try{fs.unlinkSync(tmp)}catch{}}
 }
}
for(const file of ["functions/api/artist-intel.js","functions/api/news.js","functions/api/health.js","functions/api/news.json.js","functions/api/artist.js","functions/api/artist-intel.js"]){
 const p=path.join(root,file);
 if(!fs.existsSync(p)) continue;
 const body=fs.readFileSync(p,"utf8").replace(/export\s+async\s+function/g,"async function").replace(/export\s+function/g,"function");
 const tmp=path.join(os.tmpdir(),"dm-api-"+Math.random().toString(36).slice(2)+".mjs");
 try{fs.writeFileSync(tmp,body);execFileSync(process.execPath,["--check",tmp],{stdio:"pipe"});}
 catch{failures.push(file+": API JavaScript syntax error");}
 finally{try{fs.unlinkSync(tmp)}catch{}}
}
try{JSON.parse(fs.readFileSync("assets/photo-manifest.json","utf8"));}catch{failures.push("photo-manifest.json is invalid JSON");}

if(failures.length){
 console.error("DISTRICT MIND SITE DEFENSE: FAIL");
 for(const f of failures) console.error(" - "+f);
 process.exit(1);
}
console.log("DISTRICT MIND SITE DEFENSE: PASS");
console.log("Pages checked:",pages.length);
console.log("Stylesheet integrity: PASS");
console.log("HTML/local-link/inline-JS/API/manifest checks: PASS");
