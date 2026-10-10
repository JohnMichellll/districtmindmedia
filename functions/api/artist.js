const headers={"Cache-Control":"public, max-age=300, s-maxage=300","Content-Type":"application/json","Access-Control-Allow-Origin":"*"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const fetchJson=async(url,ms=7000)=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal});return r.ok?await r.json():null}catch{return null}finally{clearTimeout(t)}};
const score=(name,q)=>{const a=norm(name),b=norm(q);if(a===b)return 100;if(a.startsWith(b))return 85;if(a.includes(b))return 70;return 0};
export async function onRequestGet({request}){
 const q=(new URL(request.url).searchParams.get("q")||"").trim();
 if(q.length<2)return json({ok:false,error:"Search for an artist by name."},400);
 try{
  const ar=await fetchJson("https://itunes.apple.com/search?term="+encodeURIComponent(q)+"&entity=musicArtist&attribute=artistTerm&limit=50&country=US");
  let matches=Array.isArray(ar?.results)?ar.results.filter(x=>x?.artistName):[];
  const exact=matches.some(x=>norm(x.artistName)===norm(q));
  if(!exact){
   const sr=await fetchJson("https://itunes.apple.com/search?term="+encodeURIComponent(q)+"&entity=song&attribute=artistTerm&limit=50&country=US");
   const map=new Map(matches.map(x=>[String(x.artistId),x]));
   for(const x of (sr?.results||[]))if(x?.artistName){const id=String(x.artistId||x.artistName);if(!map.has(id))map.set(id,{artistId:x.artistId||null,artistName:x.artistName,primaryGenreName:x.primaryGenreName||""});}
   matches=[...map.values()];
  }
  matches.sort((a,b)=>score(b.artistName,q)-score(a.artistName,q));
  const artists=[];
  for(const a of matches.slice(0,12)){
   let songs=[];
   if(a.artistId){
    const ld=await fetchJson("https://itunes.apple.com/lookup?id="+encodeURIComponent(a.artistId)+"&entity=song&limit=50&country=US");
    songs=(ld?.results||[]).filter(x=>x.wrapperType==="track"&&x.trackName).map(x=>({trackName:x.trackName,collectionName:x.collectionName||"",releaseDate:x.releaseDate||null,artworkUrl:x.artworkUrl100?x.artworkUrl100.replace(/100x100/g,"600x600"):null,trackViewUrl:x.trackViewUrl||null}));
   }
   if(songs.length<3){
    const sr=await fetchJson("https://itunes.apple.com/search?term="+encodeURIComponent(a.artistName)+"&entity=song&attribute=artistTerm&limit=50&country=US");
    songs=(sr?.results||[]).filter(x=>x.trackName&&norm(x.artistName)===norm(a.artistName)).map(x=>({trackName:x.trackName,collectionName:x.collectionName||"",releaseDate:x.releaseDate||null,artworkUrl:x.artworkUrl100?x.artworkUrl100.replace(/100x100/g,"600x600"):null,trackViewUrl:x.trackViewUrl||null})).slice(0,12);
   }
   const datedSongs=songs.map(x=>x.releaseDate).filter(Boolean).sort();
   const catalogTrackCount=songs.length;
   artists.push({artistName:a.artistName,artistId:a.artistId||null,artistViewUrl:a.artistViewUrl||null,primaryGenreName:a.primaryGenreName||songs[0]?.primaryGenreName||"",artworkUrl:songs[0]?.artworkUrl||null,catalogTrackCount,catalogCountIsLowerBound:catalogTrackCount>=50,oldestReleaseDate:datedSongs[0]||null,newestReleaseDate:datedSongs[datedSongs.length-1]||null,catalogSource:"Apple Music search catalog",distributionStatus:"not-verified",songs:songs.slice(0,12)});
  }
  const best=artists[0]?.artistName||q;
  let news=[];
  try{const nr=await fetch("https://news.google.com/rss/search?q="+encodeURIComponent('"'+best+'" music')+"&hl=en-US&gl=US&ceid=US:en");if(nr.ok){const xml=await nr.text();news=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,8).map(m=>{const b=m[1],pick=k=>(b.match(new RegExp("<"+k+">([\\s\\S]*?)<\\/"+k+">"))||[])[1]||"";return{title:pick("title").replace(/<[^>]+>/g,"").trim(),link:pick("link").trim(),pubDate:pick("pubDate").trim()}}).filter(x=>x.title)}}catch{}
  return json({ok:true,query:q,source:"Apple/iTunes Search API + Google News",generatedAt:new Date().toISOString(),artists,news});
 }catch{return json({ok:false,error:"Artist search is temporarily unavailable."},502)}
}