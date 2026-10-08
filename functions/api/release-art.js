const headers={"Cache-Control":"public, max-age=900, s-maxage=900, stale-while-revalidate=3600","Content-Type":"application/json","Access-Control-Allow-Origin":"*"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const clean=v=>String(v??"").trim();
const fetchJson=async(url)=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),7000);try{const r=await fetch(url,{signal:c.signal});return r.ok?await r.json():null}catch{return null}finally{clearTimeout(t)}};
const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const score=(artist,title,x)=>{const an=norm(x.artistName||x.artist?.name),tn=norm(x.trackName||x.collectionName||x.title);const na=norm(artist),nt=norm(title);let s=0;if(an===na)s+=100;else if(an.includes(na)||na.includes(an))s+=45;if(tn===nt)s+=100;else if(tn.includes(nt)||nt.includes(tn))s+=55;return s};
async function apple(artist,title){
 const term=encodeURIComponent(artist+" "+title);
 const song=await fetchJson("https://itunes.apple.com/search?term="+term+"&entity=song&attribute=songTerm&limit=50&country=US");
 const rows=Array.isArray(song?.results)?song.results:[];
 const hit=rows.map(x=>({...x,_score:score(artist,title,x)})).sort((a,b)=>b._score-a._score).find(x=>x._score>=200);
 if(hit?.artworkUrl100)return {artwork:hit.artworkUrl100.replace(/100x100/g,"1000x1000"),match:{artist:hit.artistName||"",title:hit.trackName||"",album:hit.collectionName||"",releaseDate:hit.releaseDate||null,apple:hit.trackViewUrl||null}};
 const album=await fetchJson("https://itunes.apple.com/search?term="+term+"&entity=album&limit=50&country=US");
 const ar=Array.isArray(album?.results)?album.results:[];
 const ah=ar.map(x=>({...x,_score:score(artist,title,x)})).sort((a,b)=>b._score-a._score).find(x=>x._score>=200);
 return ah?.artworkUrl100?{artwork:ah.artworkUrl100.replace(/100x100/g,"1000x1000"),match:{artist:ah.artistName||"",title:ah.collectionName||"",releaseDate:ah.releaseDate||null,apple:ah.collectionViewUrl||null}}:null;
}
async function deezer(artist,title){
 const aq=encodeURIComponent(artist+" "+title);
 const a=await fetchJson("https://api.deezer.com/search/track?q="+aq+"&limit=50");
 const rows=Array.isArray(a?.data)?a.data:[];
 const hit=rows.map(x=>({...x,_score:score(artist,title,x)})).sort((a,b)=>b._score-a._score).find(x=>x._score>=200);
 const ar=await fetchJson("https://api.deezer.com/search/artist?q="+encodeURIComponent(artist)+"&limit=10");
 const artists=Array.isArray(ar?.data)?ar.data:[];
 const na=norm(artist);
 const ah=artists.find(x=>norm(x.name)===na)||artists[0];
 return {artwork:hit?.album?.cover_xl||hit?.album?.cover_big||hit?.album?.cover_medium||null,artistImage:ah?.picture_xl||ah?.picture_big||ah?.picture_medium||null,match:hit?{artist:hit.artist?.name||"",title:hit.title||"",deezer:hit.link||null}:null};
}
export async function onRequestGet({request}){
 const u=new URL(request.url),artist=clean(u.searchParams.get("artist")),title=clean(u.searchParams.get("title"));
 if(artist.length<2||title.length<2)return json({ok:false,error:"Artist and release title are required."},400);
 try{
  const a=await apple(artist,title);
  if(a?.artwork&&a?.match)return json({ok:true,artist,title,artwork:a.artwork,artistArtwork:null,source:"Apple Music",match:a.match,verified:true});
  const d=await deezer(artist,title);
  if(d?.artwork&&d?.match) return json({ok:true,artist,title,artwork:d.artwork,artistArtwork:null,source:"Deezer",match:d.match});
  return json({ok:true,artist,title,artwork:null,artistArtwork:null,source:null,match:null,verified:false});
 }catch{return json({ok:false,error:"Release artwork lookup is temporarily unavailable."},502);}
}