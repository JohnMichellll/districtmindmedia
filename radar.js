(() => {
  const feed=document.getElementById('radar-feed');\n  const editorialScript=document.createElement('script'); editorialScript.src='editorial-polish.js'; document.head.appendChild(editorialScript);
  const refresh=document.getElementById('radar-refresh');
  const status=document.getElementById('radar-status');
  const pull=document.getElementById('radar-pull');
  const aiNote=document.getElementById('radar-ai-note');
  if(!feed)return;
  const polishHeadline=v=>window.DistrictMindEditorial?.polishHeadline(v)||String(v??'');\n  const polishDeck=v=>window.DistrictMindEditorial?.polishDeck(v)||String(v??'');\n  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const decode=v=>{let s=String(v??'');for(let i=0;i<3;i++){const t=document.createElement('textarea');t.innerHTML=s;s=t.value;if(!/[&](?:#\\d+|#x[0-9a-f]+|amp|quot|apos|rsquo|lsquo|rdquo|ldquo|ndash|mdash|hellip);/i.test(s))break;}return s;};
  const strip=v=>String(v??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  let allStories=[], activeFilter='all', refreshing=false, touchStartX=0, touchDistanceX=0, batchOffset=0;
  const tz=Intl.DateTimeFormat().resolvedOptions().timeZone || 'LOCAL TIME';
  const localHour=d=>Number(new Intl.DateTimeFormat('en-US',{hour:'numeric',hour12:false,timeZone:tz}).format(d));
  const ageHours=d=>(Date.now()-d.getTime())/3600000;
  const categoryOf=s=>{
    const t=(s.title+' '+s.description).toLowerCase();
    if(/breaking|arrest|charged|dies|death|dead|hospital|shooting|responds|response|beef|feud|controversy|apology|lawsuit|alleged/.test(t))return 'BREAKING';
    if(/tour|concert|festival|show|arena|theatre|tickets|live/.test(t))return 'SHOWS';
    if(/album|single|ep|mixtape|release|drops|released|stream|song|track/.test(t))return 'MUSIC';
    if(/artist|rapper|singer|rapper|producer|dj|actor|celebrity/.test(t))return 'ARTISTS';
    return 'CULTURE';
  };
  const dayKey=d=>new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  const reasonOf=(s,age)=>{
    const today=dayKey(new Date()), storyDay=dayKey(new Date(s.pubDate));
    if(storyDay===today && age<3)return 'MOVING NOW';
    if(storyDay===today)return 'TODAY / FRESH';
    if(age<48)return 'EARLIER / LOCAL';
    return 'LATEST UPDATE';
  };
  const render=stories=>{
    if(!stories.length){feed.innerHTML='<div class="radar-empty"><div><p class="eyebrow">RADAR QUIET</p><h2>Nothing new?</h2><p>We expanded the window. Keep scrolling — the desk will surface the latest verified signal available, including smaller culture moments.</p><button class="radar-action primary" id="radar-empty-refresh">Scan Again →︎</button></div></div>';document.getElementById('radar-empty-refresh')?.addEventListener('click',load);return;}
    feed.innerHTML=stories.map((s,i)=>{
      const d=new Date(s.pubDate), cat=categoryOf(s), age=Math.max(0,ageHours(d)), reason=reasonOf(s,age);
      const image=s.image ? ' style="background-image:url(\''+esc(s.image).replace(/'/g,'%27')+'\')"' : '';
      const desc=polishDeck(strip(decode(s.description))).slice(0,300);
      const source=esc(decode(s.source||'LIVE'));
      return '<article class="radar-card" role="link" tabindex="0" data-category="'+cat.toLowerCase()+'" data-index="'+i+'" data-href="'+esc(s.link)+'"><div class="radar-card-media '+(s.image?'':'radar-card-no-image')+'"'+image+'></div><div class="radar-card-body"><div class="radar-kicker"><span class="radar-pill">'+cat+'</span><span class="radar-pill">'+esc(reason)+'</span><span class="radar-pill">'+esc(tz.replace(/_/g,' '))+'</span></div><h2>'+esc(polishHeadline(s.title))+'</h2><p class="radar-card-description">'+esc(desc||'District Mind is tracking the report and the conversation around it.')+'</p><div class="radar-meta"><span>'+source+'</span><span>'+esc(d.toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}))+'</span></div></div><div class="radar-rail"><button type="button" data-up aria-label="Previous story" >↑︎</button><button type="button" data-down aria-label="Next story" >↓︎</button></div></article>';
    }).join('');
    feed.querySelectorAll('.radar-card').forEach(card=>{const open=()=>{const href=card.dataset.href;if(href)window.open(href,'_blank','noopener,noreferrer');};card.addEventListener('click',e=>{if(e.target.closest('button'))return;open();});card.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button')){e.preventDefault();open();}});});
    feed.querySelectorAll('[data-down]').forEach(b=>b.addEventListener('click',()=>b.closest('.radar-card')?.nextElementSibling?.scrollIntoView({behavior:'smooth'})));
    feed.querySelectorAll('[data-up]').forEach(b=>b.addEventListener('click',()=>b.closest('.radar-card')?.previousElementSibling?.scrollIntoView({behavior:'smooth'})));
    
  };
  const parseXml=xml=>{
    const doc=new DOMParser().parseFromString(xml,'application/xml');
    return [...doc.querySelectorAll('item')].map(i=>({title:decode(i.querySelector('title')?.textContent||'Untitled'),link:i.querySelector('link')?.textContent||'#',pubDate:i.querySelector('pubDate')?.textContent||new Date().toISOString(),description:i.querySelector('description')?.textContent||'',source:i.querySelector('category')?.textContent||'LIVE',image:i.querySelector('enclosure')?.getAttribute('url')||''})).filter(x=>x.title&&x.link);
  };
  function filtered(){
    const pool=activeFilter==='all'?allStories:allStories.filter(s=>categoryOf(s).toLowerCase()===activeFilter);
    if(pool.length<=24)return pool;
    const start=batchOffset%pool.length;
    return Array.from({length:24},(_,n)=>pool[(start+n)%pool.length]);
  }
  async function load(){
    if(refreshing)return; refreshing=true; refresh.disabled=true; status.textContent='SCANNING / '+tz.toUpperCase();
    try{
      const r=await fetch('/api/news?hours=168&limit=60&ts='+Date.now(),{cache:'no-store'});
      if(!r.ok)throw new Error('feed');
      const incoming=parseXml(await r.text());
      const seen=new Set();
      allStories=incoming.filter(s=>{const k=s.title.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();if(seen.has(k))return false;seen.add(k);return true;});
      if(!allStories.length)throw new Error('empty');
      batchOffset=(batchOffset+24)%Math.max(1,allStories.length);
      render(filtered());
      const newest=new Date(allStories[0].pubDate);
      const fresh=allStories.filter(s=>ageHours(new Date(s.pubDate))<18).length;
      status.textContent=fresh+' FRESH / '+tz.toUpperCase();
      aiNote.textContent='AI ASSIST / SOURCE TRIAGE ACTIVE · '+(fresh?'FRESH SIGNALS FOUND':'USING THE LATEST AVAILABLE SIGNALS')+' · HUMAN EDITORIAL JUDGMENT REMAINS REQUIRED FOR PUBLISHED REPORTING.';
      feed.scrollTo({top:0,behavior:'auto'});
    }catch(e){
      if(!allStories.length)render([]);
      status.textContent='LIVE FEED / FALLBACK MODE';
      aiNote.textContent='AI ASSIST / FALLBACK ACTIVE · THE RADAR REMAINS USABLE WHEN A SOURCE IS TEMPORARILY UNAVAILABLE.';
    }finally{refreshing=false;refresh.disabled=false;}
  }
  document.querySelectorAll('.radar-filter').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.radar-filter').forEach(x=>x.classList.remove('is-active'));b.classList.add('is-active');activeFilter=b.dataset.filter;render(filtered());feed.scrollTo({top:0,behavior:'smooth'});}));
  refresh.addEventListener('click',()=>{batchOffset+=24;load();});
  let lastSwipe=0;
  feed.addEventListener('touchstart',e=>{
    touchStartX=e.touches[0].clientX;
    touchDistanceX=0;
  },{passive:true});
  feed.addEventListener('touchmove',e=>{
    if(!touchStartX)return;
    touchDistanceX=e.touches[0].clientX-touchStartX;
    if(touchDistanceX>18){
      pull.classList.add('is-visible');
      pull.textContent=touchDistanceX>85?'Release to refresh':'Swipe right to refresh';
    }
  },{passive:true});
  feed.addEventListener('touchend',()=>{
    if(touchDistanceX>85&&Date.now()-lastSwipe>1200){
      lastSwipe=Date.now();
      pull.textContent='Refreshing Radar…';
      load();
    }else{
      pull.classList.remove('is-visible');
    }
    touchStartX=0;
    touchDistanceX=0;
  },{passive:true});
  load();
})();