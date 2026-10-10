const headers={"Cache-Control":"public, max-age=300, s-maxage=1800, stale-while-revalidate=3600","Content-Type":"application/json","Access-Control-Allow-Origin":"*"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const clean=v=>String(v??"").replace(/<[^>]*>/g,"").trim().slice(0,180);
const norm=s=>String(s||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const fetchJson=async(url,ms=4500)=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,headers:{"Accept":"application/json"}});return r.ok?await r.json():null}catch{return null}finally{clearTimeout(t)}};
const exact=(artist,title,x)=>norm(x.artistName||x.artist?.name)===norm(artist)&&norm(x.trackName||x.title)===norm(title);
const johnCatalogIds={
 "drivin crazy":"6787327121",
 "who is you":"1837928296",
 "u":"1819200665",
 "eyes open":"1727068645",
 "cherrywood":"1720659104"
};
async function appleKnownId(artist,title){
 if(norm(artist)!=="john michell")return null;
 const id=johnCatalogIds[norm(title)];
 if(!id)return null;
 const d=await fetchJson("https://itunes.apple.com/lookup?id="+encodeURIComponent(id)+"&entity=song&country=US");
 const rows=Array.isArray(d?.results)?d.results:[];
 const hit=rows.find(x=>x.wrapperType==="track"&&norm(x.artistName)===norm(artist)&&norm(x.trackName)===norm(title)&&x.artworkUrl100);
 if(hit)return {artwork:hit.artworkUrl100.replace(/100x100/g,"1000x1000"),match:{artist:hit.artistName,title:hit.trackName,album:hit.collectionName||"",releaseDate:hit.releaseDate||null,apple:hit.trackViewUrl||null},source:"Apple Music catalog ID"};
 // Some pinned Apple Music IDs are collection IDs, not track IDs. Accept an exact artist
 // and a release title that begins with the requested title (e.g. "U - Single").
 const collection=rows.find(x=>(x.wrapperType==="collection"||x.collectionType)&&norm(x.artistName)===norm(artist)&&x.artworkUrl100&&(norm(x.collectionName||"")===norm(title)||norm(x.collectionName||"").startsWith(norm(title)+" ")));
 return collection?{artwork:collection.artworkUrl100.replace(/100x100/g,"1000x1000"),match:{artist:collection.artistName,title,album:collection.collectionName||"",releaseDate:collection.releaseDate||null,apple:collection.collectionViewUrl||null},source:"Apple Music catalog collection ID"}:null;
}
const knownAlbumIds={
 "victoria monet|frequency of love":"6791645195",
 "quavo|qromelife":"6809921222",
 "danielle ponder|everything has changed":"6790523443",
 "dawn richard|creole culture":"6784811773",
 "joyce wrice|machiko":"6804892827"
};
async function appleKnownAlbumId(artist,title){
 const id=knownAlbumIds[norm(artist)+"|"+norm(title)];
 if(!id)return null;
 const d=await fetchJson("https://itunes.apple.com/lookup?id="+encodeURIComponent(id)+"&country=US");
 const rows=Array.isArray(d?.results)?d.results:[];
 const hit=rows.find(x=>(x.wrapperType==="collection"||x.collectionType)&&norm(x.artistName)===norm(artist)&&norm(x.collectionName||x.trackName)===norm(title)&&x.artworkUrl100);
 return hit?{artwork:hit.artworkUrl100.replace(/100x100/g,"1000x1000"),match:{artist:hit.artistName,title:hit.collectionName||hit.trackName,album:hit.collectionName||hit.trackName,releaseDate:hit.releaseDate||null,apple:hit.collectionViewUrl||null},source:"Apple Music verified album ID"}:null;
}
async function appleSong(artist,title){
 const d=await fetchJson("https://itunes.apple.com/search?term="+encodeURIComponent(artist+" "+title)+"&entity=song&limit=50&country=US");
 const rows=Array.isArray(d?.results)?d.results:[];
 const hit=rows.find(x=>exact(artist,title,x)&&x.artworkUrl100);
 return hit?{artwork:hit.artworkUrl100.replace(/100x100/g,"1000x1000"),match:{artist:hit.artistName,title:hit.trackName,album:hit.collectionName||"",releaseDate:hit.releaseDate||null,apple:hit.trackViewUrl||null},source:"Apple Music"}:null;
}
async function appleAlbum(artist,title){
 const d=await fetchJson("https://itunes.apple.com/search?term="+encodeURIComponent(artist+" "+title)+"&entity=album&limit=50&country=US");
 const rows=Array.isArray(d?.results)?d.results:[];
 const hit=rows.find(x=>norm(x.artistName)===norm(artist)&&norm(x.collectionName)===norm(title)&&x.artworkUrl100);
 return hit?{artwork:hit.artworkUrl100.replace(/100x100/g,"1000x1000"),match:{artist:hit.artistName,title:hit.collectionName,album:hit.collectionName,releaseDate:hit.releaseDate||null,apple:hit.collectionViewUrl||null},source:"Apple Music"}:null;
}
async function deezerTrack(artist,title){
 const d=await fetchJson("https://api.deezer.com/search/track?q="+encodeURIComponent('artist:"'+artist+'" track:"'+title+'"')+"&limit=50");
 const rows=Array.isArray(d?.data)?d.data:[];
 const hit=rows.find(x=>norm(x.artist?.name)===norm(artist)&&norm(x.title)===norm(title)&& (x.album?.cover_xl||x.album?.cover_big||x.album?.cover_medium));
 return hit?{artwork:hit.album.cover_xl||hit.album.cover_big||hit.album.cover_medium,match:{artist:hit.artist.name,title:hit.title,album:hit.album?.title||"",deezer:hit.link||null},source:"Deezer"}:null;
}
export async function onRequestGet({request}){
 const u=new URL(request.url),artist=clean(u.searchParams.get("artist")),title=clean(u.searchParams.get("title"));
 if(artist.length<2||title.length<1)return json({ok:false,error:"Artist and release title are required."},400);
 try{
  // Prefer pinned, exact catalog IDs first. The previous all-at-once fan-out called up to
  // five providers for every card, multiplying load across a release grid and triggering
  // provider timeouts/rate limits. Fall through only when the higher-confidence source misses.
  const pinnedTrack=await appleKnownId(artist,title);
  if(pinnedTrack)return json({ok:true,artist,title,...pinnedTrack,artistArtwork:null,verified:true});
  const pinnedAlbum=await appleKnownAlbumId(artist,title);
  if(pinnedAlbum)return json({ok:true,artist,title,...pinnedAlbum,artistArtwork:null,verified:true});
  const [song,album]=await Promise.all([appleSong(artist,title),appleAlbum(artist,title)]);
  const appleHit=song||album;
  if(appleHit)return json({ok:true,artist,title,...appleHit,artistArtwork:null,verified:true});
  const deezer=await deezerTrack(artist,title);
  if(deezer)return json({ok:true,artist,title,...deezer,artistArtwork:null,verified:true});
  return json({ok:true,artist,title,artwork:null,artistArtwork:null,source:null,match:null,verified:false});
 }catch{return json({ok:false,error:"Release artwork lookup is temporarily unavailable."},502);}
}
