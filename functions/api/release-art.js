const headers={"Cache-Control":"public, max-age=300, s-maxage=300","Content-Type":"application/json","Access-Control-Allow-Origin":"*"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const clean=v=>String(v??"").trim();
const fetchJson=async(url)=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),7000);try{const r=await fetch(url,{signal:c.signal});return r.ok?await r.json():null}catch{return null}finally{clearTimeout(t)}};
export async function onRequestGet({request}){
 const u=new URL(request.url),artist=clean(u.searchParams.get("artist")),title=clean(u.searchParams.get("title"));
 if(artist.length<2||title.length<2)return json({ok:false,error:"Artist and release title are required."},400);
 try{
  const term=encodeURIComponent(artist+" "+title);
  const album=await fetchJson("https://itunes.apple.com/search?term="+term+"&entity=album&attribute=albumTerm&limit=25&country=US");
  const rows=Array.isArray(album?.results)?album.results:[];
  const na=artist.toLowerCase(),nt=title.toLowerCase();
  const scored=rows.map(x=>{const an=String(x.artistName||"").toLowerCase(),cn=String(x.collectionName||"").toLowerCase();let score=0;if(an===na)score+=100;else if(an.includes(na)||na.includes(an))score+=45;if(cn===nt)score+=100;else if(cn.includes(nt)||nt.includes(cn))score+=55;return {...x,_score:score};}).sort((a,b)=>b._score-a._score);
  const hit=scored.find(x=>x._score>=100)||scored[0];
  if(!hit)return json({ok:true,artist,title,artwork:null,match:null});
  return json({ok:true,artist,title,artwork:hit.artworkUrl100?hit.artworkUrl100.replace(/100x100/g,"1000x1000"):null,match:{artist:hit.artistName||"",title:hit.collectionName||"",releaseDate:hit.releaseDate||null,apple:hit.collectionViewUrl||null}});
 }catch{return json({ok:false,error:"Release artwork lookup is temporarily unavailable."},502)}
}