function escJson(value){return JSON.stringify(String(value||"")).slice(1,-1)}
function firstMatch(html,patterns){for(const re of patterns){const m=html.match(re);if(m?.[1])return m[1].replace(/&amp;/g,"&").replace(/&#x2F;/g,"/").replace(/\\u0026/g,"&").trim()}return ""}
export async function onRequestGet({request}){
  const u=new URL(request.url), target=u.searchParams.get("url");
  if(!target)return new Response(JSON.stringify({ok:false,error:"missing url"}),{status:400,headers:{"Content-Type":"application/json"}});
  let parsed;try{parsed=new URL(target)}catch{return new Response(JSON.stringify({ok:false,error:"invalid url"}),{status:400,headers:{"Content-Type":"application/json"}})}
  if(!/^https?:$/.test(parsed.protocol))return new Response(JSON.stringify({ok:false,error:"unsupported url"}),{status:400,headers:{"Content-Type":"application/json"}});
  try{
    const r=await fetch(parsed.toString(),{headers:{"User-Agent":"DistrictMindMedia/1.0 (article image resolver)"}});
    if(!r.ok)return new Response(JSON.stringify({ok:false}),{status:404,headers:{"Content-Type":"application/json","Cache-Control":"public, max-age=300"}});
    const html=(await r.text()).slice(0,500000);
    const image=firstMatch(html,[
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["'][^>]*>/i,
      /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["'][^>]*>/i
    ]);
    if(!image)return new Response(JSON.stringify({ok:false}),{status:404,headers:{"Content-Type":"application/json","Cache-Control":"public, max-age=300"}});
    let absolute;try{absolute=new URL(image,parsed).toString()}catch{absolute=""}
    if(!absolute||!/^https?:$/.test(new URL(absolute).protocol))return new Response(JSON.stringify({ok:false}),{status:404,headers:{"Content-Type":"application/json"}});
    return new Response(JSON.stringify({ok:true,image:absolute}),{headers:{"Content-Type":"application/json","Cache-Control":"public, max-age=1800, s-maxage=1800"}});
  }catch{return new Response(JSON.stringify({ok:false}),{status:502,headers:{"Content-Type":"application/json","Cache-Control":"public, max-age=60"}})}
}
