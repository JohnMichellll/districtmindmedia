const headers={"Cache-Control":"public, max-age=300, s-maxage=300","Content-Type":"application/json","Access-Control-Allow-Origin":"*"};
const clean=v=>String(v??"").replace(/<[^>]*>/g,"").trim();
const legacyNames=["ray charles","louis armstrong","aretha franklin","ella fitzgerald","nat king cole","sam cooke","billie holiday","nina simone","john coltrane","miles davis","duke ellington","charlie parker","frank sinatra","marvin gaye","stevie wonder","james brown","otis redding","the beatles","elvis presley","buddy holly","muddy waters","howlin wolf","chuck berry","little richard","b.b. king","bb king"];
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const fetchJson=async(url,ms=7000)=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal});return r.ok?await r.json():null}catch{return null}finally{clearTimeout(t)}};
const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const appleImageFromPage=async(artistUrl)=>{
 if(!artistUrl)return null;
 try{
  const r=await fetch(artistUrl,{headers:{"User-Agent":"Mozilla/5.0 DistrictMindMedia/1.0"}});
  if(!r.ok)return null;
  const html=await r.text();
  const metas=[
   /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
   /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
   /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
   /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i
  ];
  for(const re of metas){
   const m=html.match(re);
   if(m?.[1]){
    const image=m[1].replace(/&amp;/g,"&");
    if(/^https:\/\//i.test(image))return image;
   }
  }
  const ld=html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if(ld?.[1]){
   try{
    const data=JSON.parse(ld[1]);
    const image=Array.isArray(data)?data.find(x=>x?.image)?.image:data?.image;
    if(typeof image==="string"&&/^https:\/\//i.test(image))return image;
    if(Array.isArray(image)&&image[0])return image[0];
   }catch{}
  }
 }catch{}
 return null;
};
const artistScore=(a,q)=>{const n=norm(a.artistName),x=norm(q);if(n===x)return 100;if(n.startsWith(x))return 85;if(n.includes(x))return 70;return 0};
export async function onRequestGet({request,env}){
 const q=(new URL(request.url).searchParams.get("q")||"").trim();
 if(q.length<2)return json({ok:false,error:"Search for an artist by name."},400);
 try{
  const artistSearch=await fetchJson("https://itunes.apple.com/search?term="+encodeURIComponent(q)+"&entity=musicArtist&attribute=artistTerm&limit=50&country=US");
  let artists=Array.isArray(artistSearch?.results)?artistSearch.results.filter(x=>x?.artistName):[];
  // Second catalog route catches major artists that Apple returns inconsistently through musicArtist search.
  if(!artists.some(x=>norm(x.artistName)===norm(q))){
   const songSearch=await fetchJson("https://itunes.apple.com/search?term="+encodeURIComponent(q)+"&entity=song&attribute=artistTerm&limit=50&country=US");
   const byId=new Map(artists.map(x=>[x.artistId,x]));
   for(const t of (songSearch?.results||[])){
    if(t?.artistName&&!byId.has(t.artistId))byId.set(t.artistId,{artistId:t.artistId,artistName:t.artistName,primaryGenreName:t.primaryGenreName});
   }
   artists=[...byId.values()];
  }
  artists.sort((a,b)=>artistScore(b,q)-artistScore(a,q));
  const bestArtist=artists[0]||{artistName:q};
  const best=bestArtist.artistName;
  let music=[];
  if(bestArtist.artistId){
   const ld=await fetchJson("https://itunes.apple.com/lookup?id="+encodeURIComponent(bestArtist.artistId)+"&entity=song&limit=100&country=US");
   music=(ld?.results||[]).filter(x=>x.wrapperType==="track"&&x.trackName).map(x=>({title:x.trackName,album:x.collectionName||"",releaseDate:x.releaseDate||null,artwork:x.artworkUrl100?x.artworkUrl100.replace(/100x100/g,"600x600"):null,apple:x.trackViewUrl||null,genre:x.primaryGenreName||null})).slice(0,40);
  }
  // If lookup is thin, search the artist directly for tracks as a second catalog pass.
  if(music.length<3){
   const fallback=await fetchJson("https://itunes.apple.com/search?term="+encodeURIComponent(best)+"&entity=song&attribute=artistTerm&limit=50&country=US");
   music=(fallback?.results||[]).filter(x=>x.trackName&&(!x.artistName||norm(x.artistName)===norm(best))).map(x=>({title:x.trackName,album:x.collectionName||"",releaseDate:x.releaseDate||null,artwork:x.artworkUrl100?x.artworkUrl100.replace(/100x100/g,"600x600"):null,apple:x.trackViewUrl||null,genre:x.primaryGenreName||null})).slice(0,40);
  }
  const nr=await fetch("https://news.google.com/rss/search?q="+encodeURIComponent('"'+best+'" music')+"&hl=en-US&gl=US&ceid=US:en").catch(()=>null);
  let news=[];
  if(nr?.ok){const xml=await nr.text();news=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,12).map(m=>{const b=m[1];const pick=k=>(b.match(new RegExp("<"+k+">([\\s\\S]*?)</"+k+">"))||[])[1]||"";return{title:clean(pick("title")),link:clean(pick("link")),date:clean(pick("pubDate"))}}).filter(x=>x.title);}
  const firstReleaseYear=music.map(x=>Number(String(x.releaseDate||"").slice(0,4))).filter(Number.isFinite).sort((a,b)=>a-b)[0]||null;
  const era=(firstReleaseYear&&firstReleaseYear<2000)||legacyNames.includes(norm(best))?"legacy":"modern";
  const slug=encodeURIComponent(best).replace(/%20/g,"-");
  const links={apple:bestArtist.artistId?"https://music.apple.com/us/artist/"+slug+"/"+bestArtist.artistId:"https://music.apple.com/us/search?term="+encodeURIComponent(best),spotify:"https://open.spotify.com/search/"+encodeURIComponent(best),youtube:"https://www.youtube.com/results?search_query="+encodeURIComponent(best+" music"),soundcloud:"https://soundcloud.com/search?q="+encodeURIComponent(best),instagram:"https://www.google.com/search?q="+encodeURIComponent(best+" official Instagram")};
  const artistImage=await appleImageFromPage(links.apple);
  // Deployment marker: keep the production Pages build tied to the repaired main-branch function.
  let ai=null;
  if(env?.XAI_API_KEY){
   const prompt="Analyze this artist for a music-news search page. Do not invent facts. Return JSON only with artist,genre,summary,whatToListenTo,whatIsHappeningNow,discoveryTips. Artist: "+best+" Catalog: "+JSON.stringify(music.slice(0,15))+" News: "+JSON.stringify(news.slice(0,8));
   let xr=null;
   try {
    const payload={
     model:"grok-4.1-mini",
     temperature:0.2,
     messages:[
      {role:"system",content:"Return valid JSON only. Never invent facts; use the supplied catalog and news."},
      {role:"user",content:prompt}
     ]
    };
    xr=await fetch("https://api.x.ai/v1/chat/completions",{
     method:"POST",
     headers:{
      "Authorization":"Bearer "+env.XAI_API_KEY,
      "Content-Type":"application/json"
     },
     body:JSON.stringify(payload)
    });
   } catch {}
   if(xr?.ok){
    const xd=await xr.json();
    const raw=xd?.choices?.[0]?.message?.content||"";
    try{
     const cleaned=raw.trim().replace(/^```json\s*/,"").replace(/```$/,"").trim();
     ai=JSON.parse(cleaned);
    }catch{}
   }  }
  if(!ai)ai={artist:best,genre:bestArtist.primaryGenreName||music[0]?.genre||"Music artist",summary:"District Mind assembled catalog music, release artwork and current source-linked coverage for this artist.",whatToListenTo:music.slice(0,5).map(x=>x.title),whatIsHappeningNow:news.slice(0,3).map(x=>x.title),discoveryTips:"Use the listening buttons to keep exploring. Current articles remain source-linked."};
  return json({ok:true,query:q,artist:best,artists:artists.slice(0,12),ai,music,news,links,artistImage,era,firstReleaseYear,artistId:bestArtist.artistId||null,generatedAt:new Date().toISOString()});
 }catch(e){return json({ok:false,error:"The artist intelligence desk is temporarily offline."},502);}
}