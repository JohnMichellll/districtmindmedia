const headers={"Cache-Control":"public, max-age=300, s-maxage=300","Content-Type":"application/json","Access-Control-Allow-Origin":"*"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const norm=s=>String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const fetchJson=async(url,ms=7000)=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,headers:{"User-Agent":"DistrictMindMedia/1.0 (artist search)","Accept":"application/json"}});if(!r.ok){console.warn("Artist upstream failure",r.status,url);return null;}return await r.json()}catch(e){console.warn("Artist upstream request failed",url,String(e));return null}finally{clearTimeout(t)}};
const score=(name,q)=>{const a=norm(name),b=norm(q);if(a===b)return 100;if(a.startsWith(b))return 65;if(a.includes(b)||b.includes(a))return 35;return 0};
const itunesSong=x=>({trackName:x.trackName,collectionName:x.collectionName||"",releaseDate:x.releaseDate||null,artworkUrl:x.artworkUrl100?x.artworkUrl100.replace(/\d+x\d+bb\./,"600x600bb.").replace(/100x100/g,"600x600"):null,trackViewUrl:x.trackViewUrl||null,primaryGenreName:x.primaryGenreName||null});
const deezerSong=x=>({trackName:x.title,collectionName:x.album?.title||"",releaseDate:x.release_date||null,artworkUrl:x.album?.cover_xl||x.album?.cover_big||x.album?.cover_medium||null,trackViewUrl:x.link||null,primaryGenreName:null});
export async function onRequestGet({request}){
 const q=(new URL(request.url).searchParams.get("q")||"").trim();
 if(q.length<2)return json({ok:false,error:"Search for an artist by name."},400);
 const normalized=norm(q);
 try{
  const [ar,dz]=await Promise.all([
   fetchJson("https://itunes.apple.com/search?term="+encodeURIComponent(q)+"&entity=musicArtist&limit=10&country=US"),
   fetchJson("https://api.deezer.com/search/artist?q="+encodeURIComponent(q)+"&limit=10")
  ]);
  const upstreamAvailable=Boolean(ar||dz);
  const candidates=new Map();
  for(const x of (ar?.results||[]))if(x?.artistName){const key=norm(x.artistName);if(!candidates.has(key))candidates.set(key,{artistName:x.artistName,itunesId:x.artistId||null,artistViewUrl:x.artistLinkUrl||null,artistImage:null,primaryGenreName:x.primaryGenreName||""});}
  for(const x of (dz?.data||[]))if(x?.name){const key=norm(x.name);const prior=candidates.get(key)||{};candidates.set(key,{...prior,artistName:prior.artistName||x.name,deezerId:x.id||null,deezerLink:x.link||null,artistImage:x.picture_xl||x.picture_big||prior.artistImage||null,primaryGenreName:prior.primaryGenreName||""});}
  // The owner's known catalog identity is pinned by its verified Apple Music artist ID.
  if(normalized==="john michell"){
   const key=normalized, prior=candidates.get(key)||{};
   candidates.set(key,{...prior,artistName:"John Michell",itunesId:prior.itunesId||"1720482148",artistViewUrl:prior.artistViewUrl||"https://music.apple.com/us/artist/john-michell/1720482148",primaryGenreName:"Hip-Hop/Rap"});
  }
  const all=[...candidates.values()].map(a=>({...a,matchScore:score(a.artistName,q)})).filter(a=>a.matchScore>0).sort((a,b)=>b.matchScore-a.matchScore);
  const exact=all.filter(a=>norm(a.artistName)===normalized);
  const chosen=exact;
  const suggestions=all.filter(a=>norm(a.artistName)!==normalized).slice(0,8).map(({matchScore,...a})=>({artistName:a.artistName,artistViewUrl:a.artistViewUrl||a.deezerLink||null,artistImage:a.artistImage||null,primaryGenreName:a.primaryGenreName||""}));
  const artists=await Promise.all(chosen.map(async a=>{
   let songs=[],albums=[];
   if(a.itunesId){
    const ld=await fetchJson("https://itunes.apple.com/lookup?id="+encodeURIComponent(a.itunesId)+"&entity=song&limit=100&country=US",7000);
    songs=(ld?.results||[]).filter(x=>x.wrapperType==="track"&&x.trackName).map(itunesSong);
   }
   // iTunes lookup can return zero tracks from Cloudflare egress; use Deezer's free public catalog.
   if((!songs.length||!a.deezerId)&&dz){
    const exactDeezer=(dz.data||[]).find(x=>norm(x.name)===normalized);
    if(exactDeezer){a.deezerId=exactDeezer.id||a.deezerId;a.artistImage=a.artistImage||exactDeezer.picture_xl||exactDeezer.picture_big||null;}
   }
   if(a.deezerId&&(!songs.length||!albums.length)){
    const [top,albumData]=await Promise.all([
     fetchJson("https://api.deezer.com/artist/"+encodeURIComponent(a.deezerId)+"/top?limit=10",7000),
     fetchJson("https://api.deezer.com/artist/"+encodeURIComponent(a.deezerId)+"/albums?limit=20",7000)
    ]);
    if(!songs.length)songs=(top?.data||[]).filter(x=>x?.title).map(deezerSong);
    albums=(albumData?.data||[]).filter(x=>x?.title).map(x=>({collectionName:x.title,releaseDate:x.release_date||null,artworkUrl:x.cover_xl||x.cover_big||x.cover_medium||null,collectionViewUrl:x.link||null}));
   }
   if(!songs.length){
    const sr=await fetchJson("https://itunes.apple.com/search?term="+encodeURIComponent(a.artistName)+"&entity=song&attribute=artistTerm&limit=50&country=US",5000);
    songs=(sr?.results||[]).filter(x=>x.trackName&&norm(x.artistName)===norm(a.artistName)).map(itunesSong);
   }
   if(!albums.length)albums=[...new Map(songs.filter(x=>x.collectionName).map(x=>[norm(x.collectionName),{collectionName:x.collectionName,releaseDate:x.releaseDate,artworkUrl:x.artworkUrl,collectionViewUrl:x.trackViewUrl}])).values()];
   const dates=[...songs,...albums].map(x=>x.releaseDate).filter(Boolean).sort();
   return {artistName:a.artistName,artistId:a.itunesId||null,itunesId:a.itunesId||null,deezerId:a.deezerId||null,artistViewUrl:a.artistViewUrl||a.deezerLink||null,artistImage:a.artistImage||null,primaryGenreName:a.primaryGenreName||songs[0]?.primaryGenreName||"",artworkUrl:songs[0]?.artworkUrl||albums[0]?.artworkUrl||null,catalogTrackCount:songs.length,catalogCountIsLowerBound:songs.length>=50,oldestReleaseDate:dates[0]||null,newestReleaseDate:dates[dates.length-1]||null,catalogSource:a.deezerId&&!a.itunesId?"Deezer public catalog":"Apple Music / Deezer public catalog",distributionStatus:"not-verified",songs:songs.slice(0,12),albums:albums.slice(0,20)};
  }));
  if(!upstreamAvailable)return json({ok:false,error:"upstream_unavailable"},502);
  let news=[];
  const best=artists[0]?.artistName||q;
  try{const nr=await fetch("https://news.google.com/rss/search?q="+encodeURIComponent('"'+best+'" music')+"&hl=en-US&gl=US&ceid=US:en");if(nr.ok){const xml=await nr.text();news=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,8).map(m=>{const b=m[1],pick=k=>(b.match(new RegExp("<"+k+">([\\s\\S]*?)<\\/"+k+">"))||[])[1]||"";return{title:pick("title").replace(/<[^>]+>/g,"").trim(),link:pick("link").trim(),pubDate:pick("pubDate").trim()}}).filter(x=>x.title)}}catch{}
  return json({ok:true,query:q,source:"Apple Music + Deezer public catalogs + Google News",generatedAt:new Date().toISOString(),artists,suggestions,news});
 }catch(e){console.warn("Artist search failed",String(e));return json({ok:false,error:"upstream_unavailable"},502)}
}