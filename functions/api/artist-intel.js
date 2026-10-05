const headers={"Cache-Control":"public, max-age=300, s-maxage=300","Content-Type":"application/json"};
const clean=v=>String(v||"").replace(/<[^>]*>/g,"").trim();
const legacyNames=["ray charles","louis armstrong","aretha franklin","ella fitzgerald","nat king cole","sam cooke","billie holiday","nina simone","john coltrane","miles davis","duke ellington","charlie parker","frank sinatra","marvin gaye","stevie wonder","james brown","otis redding","the beatles","elvis presley","buddy holly","muddy waters","howlin wolf","chuck berry","little richard","b.b. king","bb king"];
export async function onRequestGet({request,env}){
 const q=(new URL(request.url).searchParams.get("q")||"").trim();
 if(q.length<2)return new Response(JSON.stringify({ok:false,error:"Search for an artist by name."}),{status:400,headers});
 try{
  const artistUrl="https://itunes.apple.com/search?term="+encodeURIComponent(q)+"&entity=musicArtist&attribute=artistTerm&limit=25&country=US";
  const mr=await fetch(artistUrl); const md=mr.ok?await mr.json():{results:[]};
  const artists=Array.isArray(md.results)?md.results.filter(x=>x.artistName):[];
  const exact=artists.find(x=>x.artistName.toLowerCase()===q.toLowerCase());
  const bestArtist=exact||artists[0]||{artistName:q};
  const best=bestArtist.artistName;
  let music=[];
  if(bestArtist.artistId){
   const lr=await fetch("https://itunes.apple.com/lookup?id="+encodeURIComponent(bestArtist.artistId)+"&entity=song&limit=50&country=US");
   const ld=lr.ok?await lr.json():{results:[]};
   music=(ld.results||[]).filter(x=>x.wrapperType==="track"&&x.trackName).slice(0,25).map(x=>({title:x.trackName||"",album:x.collectionName||"",releaseDate:x.releaseDate||null,artwork:x.artworkUrl100?x.artworkUrl100.replace(/100x100/g,"600x600"):null,apple:x.trackViewUrl||null}));
  }
  const nr=await fetch("https://news.google.com/rss/search?q="+encodeURIComponent('"'+best+'" music')+"&hl=en-US&gl=US&ceid=US:en");
  let news=[]; if(nr.ok){const xml=await nr.text();news=[...xml.matchAll(/<item>([\\s\\S]*?)<\\/item>/g)].slice(0,10).map(m=>{const b=m[1],t=(b.match(/<title>([\\s\\S]*?)<\\/title>/)||[])[1]||"",l=(b.match(/<link>([\\s\\S]*?)<\\/link>/)||[])[1]||"",d=(b.match(/<pubDate>([\\s\\S]*?)<\\/pubDate>/)||[])[1]||"";return{title:clean(t),link:clean(l),date:clean(d)}}).filter(x=>x.title);}
  const firstReleaseYear=music.map(x=>{const m=String(x.releaseDate||"").match(/^(\\d{4})/);return m?Number(m[1]):null}).filter(Boolean).sort((a,b)=>a-b)[0]||null;
  const era=(firstReleaseYear&&firstReleaseYear<2000)||legacyNames.includes(best.toLowerCase())?"legacy":"modern";
  const links={apple:bestArtist.artistId?"https://music.apple.com/us/artist/"+encodeURIComponent(best)+"/"+bestArtist.artistId:"https://music.apple.com/us/search?term="+encodeURIComponent(best),spotify:"https://open.spotify.com/search/"+encodeURIComponent(best),youtube:"https://www.youtube.com/results?search_query="+encodeURIComponent(best+" music"),soundcloud:"https://soundcloud.com/search?q="+encodeURIComponent(best),instagram:"https://www.google.com/search?q="+encodeURIComponent(best+" official Instagram")};
  let ai=null;
  if(env?.XAI_API_KEY){const prompt="Analyze this artist for a music-news search page. Do not invent facts. Return JSON with artist,genre,summary,whatToListenTo,whatIsHappeningNow,discoveryTips. Artist: "+best+" Catalog: "+JSON.stringify(music.slice(0,12))+" News: "+JSON.stringify(news.slice(0,8));const xr=await fetch("https://api.x.ai/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+env.XAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:"grok-4.1-mini",temperature:0.2,messages:[{role:"system",content:"Return valid JSON only."},{role:"user",content:prompt}]})});if(xr.ok){const xd=await xr.json();const raw=xd?.choices?.[0]?.message?.content||"";try{ai=JSON.parse(raw.replace(/^```json\\s*|\\s*```$/g,""));}catch{}}}
  if(!ai)ai={artist:best,genre:bestArtist.primaryGenreName||"Music artist",summary:"District Mind found music, releases, artwork and current coverage for this artist.",whatToListenTo:music.slice(0,5).map(x=>x.title),whatIsHappeningNow:news.slice(0,3).map(x=>x.title),discoveryTips:"Use the listening buttons to keep exploring. News remains source-linked."};
  return new Response(JSON.stringify({ok:true,query:q,artist:best,artists:artists.slice(0,12),ai,music,news,links,era,firstReleaseYear,artistId:bestArtist.artistId||null,generatedAt:new Date().toISOString()}),{headers});
 }catch(e){return new Response(JSON.stringify({ok:false,error:"The artist intelligence desk is temporarily offline."}),{status:502,headers});}
}