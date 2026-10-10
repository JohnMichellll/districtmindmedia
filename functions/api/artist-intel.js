const headers={"Cache-Control":"no-store, private, max-age=0","Pragma":"no-cache","Content-Type":"application/json","Access-Control-Allow-Origin":"*"};
const clean=v=>String(v??"").replace(/<[^>]*>/g,"").trim();
const pinnedArtists={"ray charles":{artistId:"160926",artistName:"Ray Charles",primaryGenreName:"R&B/Soul"},"louis armstrong":{artistId:"518462",artistName:"Louis Armstrong",primaryGenreName:"Jazz"}};
const legacyNames=["ray charles","louis armstrong","aretha franklin","ella fitzgerald","nat king cole","sam cooke","billie holiday","nina simone","john coltrane","miles davis","duke ellington","charlie parker","frank sinatra","marvin gaye","stevie wonder","james brown","otis redding","the beatles","elvis presley","buddy holly","muddy waters","howlin wolf","chuck berry","little richard","b.b. king","bb king"];
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const fetchJson=async(url,ms=7000)=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal});return r.ok?await r.json():null}catch{return null}finally{clearTimeout(t)}};
const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const artistScore=(a,q)=>{const n=norm(a.artistName),x=norm(q);if(n===x)return 100;if(n.startsWith(x))return 85;if(n.includes(x))return 70;return 0};
export async function onRequestGet({request,env}){
 const q=(new URL(request.url).searchParams.get("q")||"").trim();
 if(q.length<2)return json({ok:false,error:"Search for an artist by name."},400);
 try{
  const pinned=pinnedArtists[norm(q)];
  const artistSearch=pinned?null:await fetchJson("https://itunes.apple.com/search?term="+encodeURIComponent(q)+"&entity=musicArtist&attribute=artistTerm&limit=50&country=US");
  let artists=pinned?[pinned]:(Array.isArray(artistSearch?.results)?artistSearch.results.filter(x=>x?.artistName):[]);
  // Second catalog route catches major artists that Apple returns inconsistently through musicArtist search.
  if(!artists.some(x=>norm(x.artistName)===norm(q))){
   const songSearch=await fetchJson("https://itunes.apple.com/search?term="+encodeURIComponent(q)+"&entity=song&attribute=artistTerm&limit=50&country=US");
   const byId=new Map(artists.map(x=>[x.artistId,x]));
   for(const t of (songSearch?.results||[])){
    if(t?.artistName&&!byId.has(t.artistId))byId.set(t.artistId,{artistId:t.artistId,artistName:t.artistName,primaryGenreName:t.primaryGenreName});
   }
   artists=[...byId.values()];
  }
  // Reject zero-score candidates: never silently turn an unrelated query into a random artist.
  artists=artists.filter(a=>artistScore(a,q)>0);
  artists.sort((a,b)=>artistScore(b,q)-artistScore(a,q));
  // Pin the owner search to the District Mind Records artist catalog.
  if(norm(q)!=="john michell"&&!artists.length){
   return json({ok:false,error:"No close artist match found. Try the full artist name or another spelling.",query:q});
  }
  const bestArtist=norm(q)==="john michell"
   ? {artistId:"1720482148",artistName:"John Michell",primaryGenreName:"Hip-Hop/Rap"}
   : artists[0];
  const best=bestArtist.artistName;
  let music=[];
  if(bestArtist.artistId){
   const ld=await fetchJson("https://itunes.apple.com/lookup?id="+encodeURIComponent(bestArtist.artistId)+"&entity=song&limit=100&country=US");
   music=(ld?.results||[]).filter(x=>x.wrapperType==="track"&&x.trackName).map(x=>({title:x.trackName,album:x.collectionName||"",releaseDate:x.releaseDate||null,artwork:x.artworkUrl100?x.artworkUrl100.replace(/100x100/g,"1000x1000"):null,apple:x.trackViewUrl||null,genre:x.primaryGenreName||null})).slice(0,40);
  }
  // If lookup is thin, search the artist directly for tracks as a second catalog pass.
  if(music.length<3){
   const fallback=await fetchJson("https://itunes.apple.com/search?term="+encodeURIComponent(best)+"&entity=song&attribute=artistTerm&limit=50&country=US");
   music=(fallback?.results||[]).filter(x=>x.trackName&&(!x.artistName||norm(x.artistName)===norm(best))).map(x=>({title:x.trackName,album:x.collectionName||"",releaseDate:x.releaseDate||null,artwork:x.artworkUrl100?x.artworkUrl100.replace(/100x100/g,"1000x1000"):null,apple:x.trackViewUrl||null,genre:x.primaryGenreName||null})).slice(0,40);
  }
  const nr=await fetch("https://news.google.com/rss/search?q="+encodeURIComponent('"'+best+'" music when:7d')+"&hl=en-US&gl=US&ceid=US:en").catch(()=>null);
  let news=[];
  if(nr?.ok){const xml=await nr.text();news=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,12).map(m=>{const b=m[1];const pick=k=>(b.match(new RegExp("<"+k+">([\\s\\S]*?)</"+k+">"))||[])[1]||"";return{title:clean(pick("title")),link:clean(pick("link")),date:clean(pick("pubDate"))}}).filter(x=>x.title && x.link).filter(x=>{const t=Date.parse(x.date||"");return !Number.isNaN(t) && Date.now()-t<=7*24*3600000;});}
  const firstReleaseYear=music.map(x=>Number(String(x.releaseDate||"").slice(0,4))).filter(Number.isFinite).sort((a,b)=>a-b)[0]||null;
  const era=(firstReleaseYear&&firstReleaseYear<2000)||legacyNames.includes(norm(best))?"legacy":"modern";
  const slug=encodeURIComponent(best).replace(/%20/g,"-");
  const links={apple:bestArtist.artistId?"https://music.apple.com/us/artist/"+slug+"/"+bestArtist.artistId:"https://music.apple.com/us/search?term="+encodeURIComponent(best),spotify:"https://open.spotify.com/search/"+encodeURIComponent(best),youtube:"https://www.youtube.com/results?search_query="+encodeURIComponent(best+" music"),soundcloud:"https://soundcloud.com/search?q="+encodeURIComponent(best),instagram:"https://www.google.com/search?q="+encodeURIComponent(best+" official Instagram")};
  // Artist portraits must come from an exact artist-entity match, never a song/album og:image.
  // Deezer returns artist-entity portraits separately from release artwork. If there is no exact match,
  // show the site's neutral fallback instead of assigning an unrelated face or album cover.
  let artistImage=null;
  let artistImageSource=null;
  try{
   const dz=await fetchJson("https://api.deezer.com/search/artist?q="+encodeURIComponent(best)+"&limit=25");
   const dzRows=Array.isArray(dz?.data)?dz.data:[];
   const exact=dzRows.find(x=>norm(x.name)===norm(best));
   if(exact){
    artistImage=exact.picture_xl||exact.picture_big||exact.picture_medium||null;
    if(artistImage)artistImageSource="Deezer exact artist entity";
   }
  }catch{}
  // Use Cloudflare Workers AI when a binding is enabled; keep the xAI key as a supported fallback.
  let ai=null;
  let aiSource=null;
  const prompt="You are the District Mind music research assistant. Use ONLY the supplied catalog and current source-linked headlines for factual claims. Do not invent biography, dates, discography, awards, or current events. If evidence is missing, say so plainly. Return JSON with keys genre, summary, whatToListenTo, whatIsHappeningNow, discoveryTips. Artist: "+best+"; first catalog year: "+firstReleaseYear+"; verified catalog: "+JSON.stringify(music.slice(0,15))+"; current headlines: "+JSON.stringify(news.slice(0,8))+". Make the summary useful to a viewer discovering this artist.";
  if(env?.AI?.run){
   try{
    const out=await env.AI.run("@cf/meta/llama-3.1-8b-instruct",{prompt:"Return valid JSON only. "+prompt,max_tokens:500,temperature:0.2});
    const raw=typeof out==="string"?out:(out?.response||out?.result||"");
    const cleaned=String(raw).trim().replace(/^\`\`\`json\s*/,"").replace(/\`\`\`$/,"").trim();
    ai=JSON.parse(cleaned);
    if(ai&&typeof ai==="object")aiSource="Cloudflare Workers AI";
   }catch{}
  }
  if(!ai&&env?.XAI_API_KEY){
   try{
    const xr=await fetch("https://api.x.ai/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+env.XAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:"grok-4.1-mini",temperature:0.2,messages:[{role:"system",content:"Return valid JSON only. Never invent facts; use only the supplied catalog and headlines."},{role:"user",content:prompt}]})});
    if(xr.ok){
     const xd=await xr.json();
     const raw=xd?.choices?.[0]?.message?.content||"";
     ai=JSON.parse(raw.trim().replace(/^\`\`\`json\s*/,"").replace(/\`\`\`$/,"").trim());
     if(ai&&typeof ai==="object")aiSource="xAI";
    }
   }catch{}
  }
  if(!ai)ai={artist:best,genre:bestArtist.primaryGenreName||music[0]?.genre||"Music artist",summary:"Verified catalog results are shown below. AI-generated analysis is temporarily unavailable, so this page avoids guessing about the artist.",whatToListenTo:music.slice(0,5).map(x=>x.title),whatIsHappeningNow:news.slice(0,3).map(x=>x.title),discoveryTips:"Explore the linked music catalog and current source-linked headlines. Unverified details are left out."};
  return json({ok:true,query:q,artist:best,artists:artists.slice(0,12),ai,aiSource,aiEnabled:Boolean(aiSource),music,news,links,artistImage,artistImageSource,artistImageKind:artistImage?"artist-portrait":"unavailable",era,firstReleaseYear,artistId:bestArtist.artistId||null,generatedAt:new Date().toISOString()});
 }catch(e){return json({ok:false,error:"The artist intelligence desk is temporarily offline."},502);}
}