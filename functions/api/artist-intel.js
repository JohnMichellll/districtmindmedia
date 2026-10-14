const headers={"Cache-Control":"no-store, private, max-age=0","Pragma":"no-cache","Content-Type":"application/json","X-Content-Type-Options":"nosniff"};
const clean=v=>String(v??"").replace(/<[^>]*>/g," ")
 .replace(/&#(\d+);/g,(_,n)=>{try{return String.fromCodePoint(Number(n));}catch{return " ";}})
 .replace(/&#x([0-9a-f]+);/gi,(_,h)=>{try{return String.fromCodePoint(parseInt(h,16));}catch{return " ";}})
 .replace(/&nbsp;/gi," ").replace(/&rsquo;/gi,"’").replace(/&lsquo;/gi,"‘")
 .replace(/&ldquo;/gi,"“").replace(/&rdquo;/gi,"”").replace(/&ndash;/gi,"–")
 .replace(/&mdash;/gi,"—").replace(/&hellip;/gi,"…").replace(/&quot;/gi,'"')
 .replace(/&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">")
 .replace(/&amp;/gi,"&")
 .replace(/â€¦/g,"…").replace(/â€™/g,"’").replace(/â€˜/g,"‘").replace(/â€œ/g,"“").replace(/â€/g,"”").replace(/â€“/g,"–").replace(/â€”/g,"—").replace(/Â /g," ")
 .replace(/\s+/g," ").trim();
const pinnedArtists={"drake":{artistId:"160926",artistName:"Drake",primaryGenreName:"Hip-Hop/Rap"},"ray charles":{artistId:"518462",artistName:"Ray Charles",primaryGenreName:"R&B/Soul"}};
const legacyNames=["ray charles","louis armstrong","aretha franklin","ella fitzgerald","nat king cole","sam cooke","billie holiday","nina simone","john coltrane","miles davis","duke ellington","charlie parker","frank sinatra","marvin gaye","stevie wonder","james brown","otis redding","the beatles","elvis presley","buddy holly","muddy waters","howlin wolf","chuck berry","little richard","b.b. king","bb king"];
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const fetchJson=async(url,ms=7000)=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,headers:{"User-Agent":"DistrictMindMedia/1.0 (artist intelligence)","Accept":"application/json"}});if(!r.ok){const body=(await r.text()).slice(0,500);console.warn("Artist intelligence upstream failure",r.status,url,body);return null;}return await r.json()}catch(e){console.warn("Artist intelligence upstream request failed",url,String(e));return null}finally{clearTimeout(t)}};
const norm=s=>String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const artistScore=(a,q)=>{const n=norm(a.artistName),x=norm(q);if(n===x)return 100;if(n.startsWith(x))return 85;if(n.includes(x))return 70;return 0};
function artistQueryFromText(raw){
 let q=String(raw||"").trim().replace(/[?!.]+$/g,"").trim();
 const releaseQuestion=q.match(/^(?:what(?:\s+is|[’\x27]s)|tell\s+me)\s+(.+?)[’\x27]s\s+(?:latest\s+release|newest\s+song|discography|music|news|career)$/i);
 if(releaseQuestion) return releaseQuestion[1].trim();
 const prefixes=[/^(?:can\s+you\s+)?(?:please\s+)?(?:tell\s+me\s+about|who\s+is|what\s+should\s+i\s+know\s+about|what\s+do\s+i\s+need\s+to\s+know\s+about|what[’\x27]s\s+new\s+with|what\s+is\s+happening\s+with|give\s+me\s+(?:a\s+)?(?:briefing|overview)\s+on|show\s+me|look\s+up|search\s+for|find|music\s+by|artist|about)\s+/i];
 for(const pattern of prefixes) q=q.replace(pattern,"").trim();
 q=q.replace(/\s+(?:artist\s+)?(?:overview|briefing|biography|bio)$/i,"").trim();
 return q;
}
export async function onRequestGet({request,env}){
 const requestUrl=new URL(request.url);
 const origin=request.headers.get("Origin");
 if(origin){try{if(new URL(origin).origin!==requestUrl.origin)return json({ok:false,error:"Origin not allowed."},403)}catch{return json({ok:false,error:"Invalid origin."},403)}}
 const rawQuery=(requestUrl.searchParams.get("q")||"").trim();
 if(rawQuery.length>180)return json({ok:false,error:"Search query is too long."},400);
 const q=artistQueryFromText(rawQuery);
 if(q.length<2)return json({ok:false,error:"Search for an artist or ask a question about one."},400);
 try{
  const pinned=pinnedArtists[norm(q)];
  const artistSearch=pinned?null:await fetchJson("https://itunes.apple.com/search?term="+encodeURIComponent(q)+"&entity=musicArtist&limit=5&country=US");
  let artists=pinned?[pinned]:(Array.isArray(artistSearch?.results)?artistSearch.results.filter(x=>x?.artistName):[]);
  if(!pinned&&!artists.length){const dz=await fetchJson("https://api.deezer.com/search/artist?q="+encodeURIComponent(q)+"&limit=5");artists=(dz?.data||[]).filter(x=>x?.name).map(x=>({deezerId:x.id||null,artistName:x.name,artistLinkUrl:x.link||null,deezerImage:x.picture_xl||x.picture_big||null,primaryGenreName:""}));}
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
   return json({ok:false,error:"No close artist match found. Try the full artist name or another spelling.",query:rawQuery});
  }
  if(pinnedArtists[norm(q)]&&!artists.some(a=>norm(a.artistName)===norm(q)))artists.unshift(pinnedArtists[norm(q)]);
  const bestArtist=norm(q)==="john michell"
   ? {artistId:"1720482148",artistName:"John Michell",primaryGenreName:"Hip-Hop/Rap"}
   : (pinnedArtists[norm(q)]||artists.find(a=>norm(a.artistName)===norm(q))||artists[0]);
  const best=bestArtist.artistName;
  let music=[];
  let albums=[];
  let dzArtistRecord=null;
  // Ask Apple and Deezer in parallel so a slow/empty Apple lookup does not delay the fallback.
  const [ld,dzSearchInitial]=await Promise.all([
   bestArtist.artistId
    ? fetchJson("https://itunes.apple.com/lookup?id="+encodeURIComponent(bestArtist.artistId)+"&entity=song&limit=100&country=US",4500)
    : Promise.resolve(null),
   fetchJson("https://api.deezer.com/search/artist?q="+encodeURIComponent(best)+"&limit=25",4500)
  ]);
  music=(ld?.results||[]).filter(x=>x.wrapperType==="track"&&x.trackName).map(x=>({title:x.trackName,album:x.collectionName||"",releaseDate:x.releaseDate||null,artwork:x.artworkUrl100?x.artworkUrl100.replace(/100x100/g,"1000x1000"):null,apple:x.trackViewUrl||null,genre:x.primaryGenreName||null})).slice(0,40);
  const dzRows=Array.isArray(dzSearchInitial?.data)?dzSearchInitial.data:[];
  dzArtistRecord=dzRows.find(x=>norm(x.name)===norm(best))||null;
  // If Apple returns no tracks, use Deezer top tracks and albums. Keep all fallback calls parallel.
  const [top,albumResult,fallbackSearch]=await Promise.all([
   !music.length&&dzArtistRecord?fetchJson("https://api.deezer.com/artist/"+encodeURIComponent(dzArtistRecord.id)+"/top?limit=10",4500):Promise.resolve(null),
   !albums.length&&dzArtistRecord?fetchJson("https://api.deezer.com/artist/"+encodeURIComponent(dzArtistRecord.id)+"/albums?limit=20",4500):Promise.resolve(null),
   !music.length?fetchJson("https://itunes.apple.com/search?term="+encodeURIComponent(best)+"&entity=song&attribute=artistTerm&limit=50&country=US",4500):Promise.resolve(null)
  ]);
  if(!music.length)music=(top?.data||[]).filter(x=>x?.title).map(x=>({title:x.title,album:x.album?.title||"",releaseDate:x.release_date||null,artwork:x.album?.cover_xl||x.album?.cover_big||x.album?.cover_medium||null,apple:x.link||null,genre:null,source:"Deezer"})).slice(0,40);
  if(!music.length)music=(fallbackSearch?.results||[]).filter(x=>x.trackName&&x.artistName&&norm(x.artistName)===norm(best)).map(x=>({title:x.trackName,album:x.collectionName||"",releaseDate:x.releaseDate||null,artwork:x.artworkUrl100?x.artworkUrl100.replace(/100x100/g,"1000x1000"):null,apple:x.trackViewUrl||null,genre:x.primaryGenreName||null})).slice(0,40);
  if(!albums.length)albums=(albumResult?.data||[]).filter(x=>x?.title).map(x=>({title:x.title,releaseDate:x.release_date||null,artwork:x.cover_xl||x.cover_big||x.cover_medium||null,url:x.link||null,source:"Deezer"}));
  if(!albums.length)albums=[...new Map(music.filter(x=>x.album).map(x=>[norm(x.album),{title:x.album,releaseDate:x.releaseDate,artwork:x.artwork,url:x.apple||null,source:x.source||"Apple Music"}])).values()];
  // Wayfinder only needs the verified catalog/profile cards. Skip news and optional AI work on this fast path.
  if(new URL(request.url).searchParams.get("brief")==="1"){
   const firstYear=music.map(x=>Number(String(x.releaseDate||"").slice(0,4))).filter(Number.isFinite).sort((a,b)=>a-b)[0]||null;
   const era=(firstYear&&firstYear<2000)||legacyNames.includes(norm(best))?"legacy":"modern";
   const slug=encodeURIComponent(best).replace(/%20/g,"-");
   const links={apple:bestArtist.artistId?"https://music.apple.com/us/artist/"+slug+"/"+bestArtist.artistId:"https://music.apple.com/us/search?term="+encodeURIComponent(best),spotify:"https://open.spotify.com/search/"+encodeURIComponent(best),youtube:"https://www.youtube.com/results?search_query="+encodeURIComponent(best+" music"),soundcloud:"https://soundcloud.com/search?q="+encodeURIComponent(best),instagram:"https://www.google.com/search?q="+encodeURIComponent(best+" official Instagram")};
   const artistImage=dzArtistRecord?.picture_xl||dzArtistRecord?.picture_big||dzArtistRecord?.picture_medium||null;
   return json({ok:true,query:rawQuery,normalizedQuery:q,artist:best,artists:[bestArtist],ai:{genre:bestArtist.primaryGenreName||music[0]?.genre||"Music artist",summary:"Verified catalog results are shown below. Open the source to confirm release details.",whatToListenTo:music.slice(0,5).map(x=>x.title),whatIsHappeningNow:[],discoveryTips:"Explore the linked catalog. Details not supported by the public catalog are left out."},aiEnabled:false,music,albums,news:[],links,artistImage,artistImageSource:artistImage?"Deezer exact artist entity":null,artistImageKind:artistImage?"artist-portrait":"unavailable",era,firstReleaseYear:firstYear,artistId:bestArtist.artistId||null,generatedAt:new Date().toISOString()});
  }
  const nr=await fetch("https://news.google.com/rss/search?q="+encodeURIComponent('"'+best+'" music when:7d')+"&hl=en-US&gl=US&ceid=US:en",{signal:AbortSignal.timeout(4000)}).catch(()=>null);
  let news=[];
  if(nr?.ok){const xml=await nr.text();news=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,12).map(m=>{const b=m[1];const pick=k=>(b.match(new RegExp("<"+k+">([\\s\\S]*?)</"+k+">"))||[])[1]||"";return{title:clean(pick("title")),link:clean(pick("link")),date:clean(pick("pubDate"))}}).filter(x=>x.title && x.link).filter(x=>{const t=Date.parse(x.date||"");return !Number.isNaN(t) && Date.now()-t<=7*24*3600000;});}
  const firstReleaseYear=music.map(x=>Number(String(x.releaseDate||"").slice(0,4))).filter(Number.isFinite).sort((a,b)=>a-b)[0]||null;
  const era=(firstReleaseYear&&firstReleaseYear<2000)||legacyNames.includes(norm(best))?"legacy":"modern";
  const slug=encodeURIComponent(best).replace(/%20/g,"-");
  const links={apple:bestArtist.artistId?"https://music.apple.com/us/artist/"+slug+"/"+bestArtist.artistId:"https://music.apple.com/us/search?term="+encodeURIComponent(best),spotify:"https://open.spotify.com/search/"+encodeURIComponent(best),youtube:"https://www.youtube.com/results?search_query="+encodeURIComponent(best+" music"),soundcloud:"https://soundcloud.com/search?q="+encodeURIComponent(best),instagram:"https://www.google.com/search?q="+encodeURIComponent(best+" official Instagram")};
  // Artist portraits must come from an exact artist-entity match, never a song/album og:image.
  // Deezer returns artist-entity portraits separately from release artwork. If there is no exact match,
  // show the site's neutral fallback instead of assigning an unrelated face or album cover.
  let artistImage=dzArtistRecord?.picture_xl||dzArtistRecord?.picture_big||dzArtistRecord?.picture_medium||null;
  let artistImageSource=artistImage?"Deezer exact artist entity":null;
  // Use Cloudflare Workers AI when a binding is enabled; keep the xAI key as a supported fallback.
  let ai=null;
  let aiSource=null;
  const prompt="You are the District Mind music research assistant. Answer the viewer\u0027s intent as closely as the available evidence allows. User query: "+rawQuery+". Use ONLY the supplied catalog and current source-linked headlines for factual claims. Do not invent biography, dates, discography, awards, or current events. If evidence is missing, say so plainly. Return JSON with keys genre, summary, whatToListenTo, whatIsHappeningNow, discoveryTips. Artist: "+best+"; verified catalog: "+JSON.stringify(music.slice(0,15))+"; current headlines: "+JSON.stringify(news.slice(0,8))+". Make the summary useful to the specific question and viewer discovering this artist.";
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
    const xr=await fetch("https://api.x.ai/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+env.XAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:"grok-4.1-mini",temperature:0.2,messages:[{role:"system",content:"Return valid JSON only. Never invent facts; use only the supplied catalog and headlines."},{role:"user",content:prompt}]}),signal:AbortSignal.timeout(8000)});
    if(xr.ok){
     const xd=await xr.json();
     const raw=xd?.choices?.[0]?.message?.content||"";
     ai=JSON.parse(raw.trim().replace(/^\`\`\`json\s*/,"").replace(/\`\`\`$/,"").trim());
     if(ai&&typeof ai==="object")aiSource="xAI";
    }
   }catch{}
  }
  if(!ai)ai={artist:best,genre:bestArtist.primaryGenreName||music[0]?.genre||"Music artist",summary:"Verified catalog results are shown below. AI-generated analysis is temporarily unavailable, so this page avoids guessing about the artist.",whatToListenTo:music.slice(0,5).map(x=>x.title),whatIsHappeningNow:news.slice(0,3).map(x=>x.title),discoveryTips:"Explore the linked music catalog and current source-linked headlines. Unverified details are left out."};
  return json({ok:true,query:rawQuery,normalizedQuery:q,artist:best,artists:artists.slice(0,12),ai,aiSource,aiEnabled:Boolean(aiSource),music,albums,news,links,artistImage,artistImageSource,artistImageKind:artistImage?"artist-portrait":"unavailable",era,firstReleaseYear,artistId:bestArtist.artistId||null,generatedAt:new Date().toISOString()});
 }catch(e){return json({ok:false,error:"The artist intelligence desk is temporarily offline."},502);}
}