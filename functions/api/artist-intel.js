const headers={"Cache-Control":"public, max-age=300, s-maxage=300","Content-Type":"application/json"};
const clean=v=>String(v||"").replace(/<[^>]*>/g,"").trim();
export async function onRequestGet({request,env}){
 const q=(new URL(request.url).searchParams.get("q")||"").trim();
 if(q.length<2)return new Response(JSON.stringify({ok:false,error:"Search for an artist by name."}),{status:400,headers});
 try{
  const [mr,nr]=await Promise.all([fetch("https://itunes.apple.com/search?term="+encodeURIComponent(q)+"&entity=song&attribute=artistTerm&limit=50&country=US"),fetch("https://news.google.com/rss/search?q="+encodeURIComponent('"'+q+'" music')+"&hl=en-US&gl=US&ceid=US:en")]);
  const md=mr.ok?await mr.json():{results:[]}; const rows=Array.isArray(md.results)?md.results:[];
  const names=[...new Set(rows.map(x=>(x.artistName||"").trim()).filter(Boolean))]; const best=names.find(n=>n.toLowerCase()===q.toLowerCase())||names[0]||q;
  const music=rows.filter(x=>(x.artistName||"").toLowerCase()===best.toLowerCase()).slice(0,15).map(x=>({title:x.trackName||"",album:x.collectionName||"",releaseDate:x.releaseDate||null,artwork:x.artworkUrl100?x.artworkUrl100.replace("100x100","600x600"):null,apple:x.trackViewUrl||null}));\n  const firstReleaseYear=music.map(x=>{const m=String(x.releaseDate||"").match(/^(\\d{4})/);return m?Number(m[1]):null}).filter(Boolean).sort((a,b)=>a-b)[0]||null;\n  const legacyNames=["ray charles","louis armstrong","aretha franklin","ella fitzgerald","nat king cole","sam cooke","billie holiday","nina simone","john coltrane","miles davis","duke ellington","charlie parker","frank sinatra","marvin gaye","stevie wonder","james brown","otis redding","the beatles","elvis presley","buddy holly","muddy waters","howlin wolf","chuck berry","little richard","b.b. king","bb king"];\n  const era=(firstReleaseYear&&firstReleaseYear<2000)||legacyNames.includes(best.toLowerCase())?"legacy":"modern";
  let news=[]; if(nr.ok){const xml=await nr.text(); news=[...xml.matchAll(/<item>([\\s\\S]*?)<\\/item>/g)].slice(0,8).map(m=>{const b=m[1],t=(b.match(/<title>([\\s\\S]*?)<\\/title>/)||[])[1]||"",l=(b.match(/<link>([\\s\\S]*?)<\\/link>/)||[])[1]||"",d=(b.match(/<pubDate>([\\s\\S]*?)<\\/pubDate>/)||[])[1]||"";return {title:clean(t),link:clean(l),date:clean(d)}}).filter(x=>x.title);}
  const links={apple:"https://music.apple.com/us/search?term="+encodeURIComponent(best),spotify:"https://open.spotify.com/search/"+encodeURIComponent(best),youtube:"https://www.youtube.com/results?search_query="+encodeURIComponent(best+" music"),soundcloud:"https://soundcloud.com/search?q="+encodeURIComponent(best),instagram:"https://www.google.com/search?q="+encodeURIComponent(best+" official Instagram")};
  let ai=null;
  if(env?.XAI_API_KEY){
   const prompt="Analyze this artist for a music-news search page. Do not invent facts. Return JSON with artist,genre,summary,whatToListenTo,whatIsHappeningNow,discoveryTips. Artist: "+best+" Catalog: "+JSON.stringify(music)+" News: "+JSON.stringify(news);
   const xr=await fetch("https://api.x.ai/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+env.XAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:"grok-4.1-mini",temperature:0.2,messages:[{role:"system",content:"Return valid JSON only."},{role:"user",content:prompt}]})});
   if(xr.ok){const xd=await xr.json();const raw=xd?.choices?.[0]?.message?.content||"";try{ai=JSON.parse(raw.replace(/^```json\\s*|\\s*```$/g,""));}catch{}}
  }
  if(!ai)ai={artist:best,genre:"Music artist",summary:"District Mind found music, release artwork and current coverage for this artist.",whatToListenTo:music.slice(0,5).map(x=>x.title),whatIsHappeningNow:news.slice(0,3).map(x=>x.title),discoveryTips:"Use the streaming buttons below to keep listening. News remains source-linked."};
  return new Response(JSON.stringify({ok:true,query:q,artist:best,ai,music,news,links,era,firstReleaseYear,generatedAt:new Date().toISOString()}),{headers});
 }catch{return new Response(JSON.stringify({ok:false,error:"The artist intelligence desk is temporarily offline."}),{status:502,headers});}
}