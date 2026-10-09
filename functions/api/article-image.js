const json=(data,status=200,cache="no-store")=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":cache,"X-Content-Type-Options":"nosniff"}});
function firstMatch(html,patterns){for(const re of patterns){const m=html.match(re);if(m?.[1])return m[1].replace(/&amp;/g,"&").replace(/&#x2F;/g,"/").replace(/\\u0026/g,"&").trim()}return ""}
function isPublicWebUrl(value){
  try{
    const u=new URL(value);
    if(!["http:","https:"].includes(u.protocol)||u.username||u.password)return false;
    const h=u.hostname.toLowerCase().replace(/^\[|\]$/g,"");
    if(!h||h==="localhost"||h.endsWith(".localhost")||h.endsWith(".local")||h==="::1"||h==="::"||/^f[cd][0-9a-f]{2}:/i.test(h)||/^fe80:/i.test(h))return false;
    if(/^127\.|^10\.|^192\.168\.|^169\.254\.|^0\./.test(h))return false;
    const m=h.match(/^172\.(\d+)\./);if(m&&+m[1]>=16&&+m[1]<=31)return false;
    return true;
  }catch{return false}
}
export async function onRequestGet({request}){
  const target=new URL(request.url).searchParams.get("url");
  if(!target)return json({ok:false,error:"missing url"},400);
  if(!isPublicWebUrl(target))return json({ok:false,error:"invalid article url"},400);
  try{
    let current=target,r;
    for(let hop=0;hop<4;hop++){
      r=await fetch(current,{redirect:"manual",signal:AbortSignal.timeout(7000),headers:{"User-Agent":"DistrictMindMedia/1.0 (article image resolver)","Accept":"text/html,application/xhtml+xml"}});
      if(r.status<300||r.status>=400)break;
      const location=r.headers.get("location");
      if(!location||hop===3)return json({ok:false,error:"too many redirects"},502,"public, max-age=60");
      let next;try{next=new URL(location,current).toString()}catch{return json({ok:false},502,"public, max-age=60")}
      if(!isPublicWebUrl(next))return json({ok:false,error:"unsafe redirect target"},400);
      current=next;
    }
    if(!r.ok)return json({ok:false},404,"public, max-age=300");
    const type=r.headers.get("content-type")||"";
    if(!/text\/html|application\/xhtml\+xml/i.test(type))return json({ok:false,error:"not an html page"},415,"public, max-age=300");
    const reader=r.body?.getReader();
    if(!reader)return json({ok:false},502,"public, max-age=60");
    const chunks=[];let size=0;
    while(size<500000){
      const {done,value}=await reader.read();
      if(done)break;
      const part=value.slice(0,500000-size);chunks.push(part);size+=part.byteLength;
      if(size>=500000){await reader.cancel();break}
    }
    const bytes=new Uint8Array(size);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
    const html=new TextDecoder().decode(bytes);
    const image=firstMatch(html,[
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["'][^>]*>/i,
      /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["'][^>]*>/i
    ]);
    if(!image)return json({ok:false},404,"public, max-age=300");
    let absolute;try{absolute=new URL(image,current).toString()}catch{return json({ok:false},404,"public, max-age=300")}
    if(!isPublicWebUrl(absolute))return json({ok:false},404,"public, max-age=300");
    return json({ok:true,image:absolute},200,"public, max-age=1800, s-maxage=1800");
  }catch{return json({ok:false,error:"image lookup timed out or failed"},502,"public, max-age=60")}
}
