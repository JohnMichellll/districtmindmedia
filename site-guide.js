(() => {


  // Normalize the shared menu on every page: one Academy destination and one Help Center.
  const primaryNav = document.querySelector('.primary-nav');
  if (primaryNav) {
    primaryNav.querySelectorAll('a[href="account.html"], a[href="academy.html#account-help"]').forEach(link => link.remove());
    const helpLinks = [...primaryNav.querySelectorAll('a[href="help.html"]')];
    helpLinks.forEach((link, index) => {
      if (index > 0) link.remove();
      else link.textContent = 'Help Center';
    });
    const academyLink = primaryNav.querySelector('a[href="academy.html"]');
    if (academyLink) academyLink.textContent = 'Academy & Account';
    if (!primaryNav.querySelector('a[href="help.html"]')) {
      const link = document.createElement('a');
      link.href = 'help.html';
      link.textContent = 'Help Center';
      primaryNav.appendChild(link);
    }
    if (!primaryNav.querySelector('a[href="playlists.html"]')) {
      const link = document.createElement('a');
      link.href = 'playlists.html';
      link.textContent = 'My Playlists';
      primaryNav.appendChild(link);
    }
  }

  // Mobile-first, high-contrast menu controls with a smooth dropdown and larger tap targets.
  if (!document.getElementById('dm-nav-polish')) {
    const style = document.createElement('style');
    style.id = 'dm-nav-polish';
    style.textContent = `
      .site-header { z-index: 1000; }
      .nav-container { position: relative; }
      .menu-toggle {
        min-width: 48px; min-height: 48px; padding: 0 15px;
        gap: 9px; border: 1px solid rgba(20,20,20,.18); border-radius: 999px;
        background: #171715; color: #fff; font: inherit; font-weight: 750;
        line-height: 1; cursor: pointer; touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        transition: background .18s ease, transform .18s ease, box-shadow .18s ease;
      }
      .menu-toggle::before { content: '☰'; font-size: 17px; line-height: 1; }
      .menu-toggle:hover { background: #33332f; box-shadow: 0 5px 16px rgba(0,0,0,.12); }
      .menu-toggle:active { transform: scale(.97); }
      .menu-toggle:focus-visible, .primary-nav a:focus-visible {
        outline: 3px solid #277d3d; outline-offset: 3px;
      }
      @media (max-width: 760px) {
        .primary-nav {
          display: flex !important; visibility: hidden; opacity: 0; pointer-events: none;
          transform: translateY(-7px); transition: opacity .18s ease, transform .18s ease, visibility .18s;
          position: absolute; top: calc(100% + 8px); right: 0;
          width: min(340px, calc(100vw - 28px)); max-height: min(72dvh, 560px);
          overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
          background: #fff; color: #171715; border: 1px solid rgba(17,17,17,.12);
          border-radius: 16px; box-shadow: 0 18px 48px rgba(0,0,0,.18);
          padding: 10px; gap: 3px; align-items: stretch;
        }
        .primary-nav.is-open {
          visibility: visible; opacity: 1; pointer-events: auto; transform: translateY(0);
        }
        .primary-nav a {
          display: flex; align-items: center; min-height: 46px; width: 100%;
          padding: 12px 14px; border-radius: 10px; font-size: 14px;
          line-height: 1.35; letter-spacing: .04em; text-decoration: none;
          color: #171715; touch-action: manipulation;
        }
        .primary-nav a:hover, .primary-nav a:active, .primary-nav a[aria-current="page"] {
          background: #f1f0eb; color: #111;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .menu-toggle, .primary-nav { transition: none !important; }
      }
    `;
    document.head.appendChild(style);
  }

  // Global, delegated navigation control: works on every page, including pages with legacy inline handlers.
  // Capture and stop the legacy click handler so the menu cannot toggle open and immediately close.
  document.addEventListener('click', e => {
    const toggle = e.target.closest('.menu-toggle');
    if (toggle) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const nav = document.getElementById(toggle.getAttribute('aria-controls') || 'primary-nav');
      if (!nav) return;
      const open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      return;
    }
    const link = e.target.closest('.primary-nav a');
    if (link) {
      const nav = link.closest('.primary-nav');
      if (nav && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        const toggle = document.querySelector('.menu-toggle[aria-controls="' + nav.id + '"]');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }
    }
  }, true);

  const routes = [
    {title:'Wayfinder', href:'wayfinder.html', type:'WAYFINDER', tags:'navigation search find artist article hometown local state discovery guide concerts shows tickets events'},
    {title:'Local Watch', href:'local.html', type:'LOCAL', tags:'state city local concerts shows touring artists culture recent reports archive'} ,
    {title:'Local Watch', href:'local.html', type:'LOCAL', tags:'state city local concerts shows touring artists culture recent reports archive'} ,
    {title:'Radar', href:'radar.html', type:'RADAR', tags:'breaking drama culture artist viral trending live reports swipe scroll latest news source'},
    {title:'Newsroom', href:'newsroom.html', type:'NEWS', tags:'news headlines live desk current reporting scoop sources'},
    {title:'Artist Intelligence Hub', href:'artists.html', type:'ARTISTS', tags:'artist singer rapper band biography catalog music search artist profile'},
    {title:'Artist Registry', href:'artist-registry.html', type:'REGISTRY', tags:'artist independent diy DistroKid catalog archive inactive profile submit discover music creator'},
    {title:'Releases', href:'releases.html', type:'MUSIC', tags:'new music albums singles release calendar songs listen'},
    {title:'Concerts Near You', href:'concerts.html', type:'LIVE', tags:'concerts shows live music events tickets venue tour nearby near me local'},
    {title:'Culture', href:'culture.html', type:'CULTURE', tags:'culture lifestyle rooms fashion moments'},
    {title:'Explore Media', href:'explore.html', type:'EXPLORE', tags:'explore discovery everything media'},
    {title:'District Mind Academy', href:'academy.html', type:'ACADEMY', tags:'learn class education start from zero'},
    {title:'John Michell', href:'john-michell.html', type:'ARTIST', tags:'john michell district mind records drivin crazy who is you'},
    {title:'About District Mind Media', href:'about.html', type:'ABOUT', tags:'about mission independent media'},
    {title:'Contact', href:'contact.html', type:'CONTACT', tags:'contact submit tip reach newsroom'},
    {title:'Editorial', href:'editorial.html', type:'EDITORIAL', tags:'editorial standards newsroom process'},
    {title:'Editorial Policy', href:'editorial-policy.html', type:'POLICY', tags:'policy verification sources corrections'},
    {title:'Contributors', href:'contributors.html', type:'PEOPLE', tags:'contributors writers photographers'},
  ];
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const tokens = q => norm(q).split(' ').filter(x => x.length > 1);
  const score = (item,q) => {
    const hay = norm([item.title,item.type,item.tags,item.description].join(' '));
    return tokens(q).reduce((n,t) => n + (hay.includes(t) ? (norm(item.title).includes(t) ? 5 : 2) : 0), 0);
  };

  function openGuide(prefill='') {
    let modal = document.getElementById('dm-guide-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'dm-guide-modal';
      modal.className = 'dm-guide-modal';
      modal.innerHTML = `
        <div class="dm-guide-backdrop" data-dm-close></div>
        <section class="dm-guide-panel" role="dialog" aria-modal="true" aria-labelledby="dm-guide-title">
          <div class="dm-guide-top">
            <div><p class="dm-guide-kicker">DISTRICT MIND / WAYFINDER</p><h2 id="dm-guide-title">Where do you want to go?</h2><p class="dm-guide-sub">Search an artist, paste part of a headline you saw on Instagram, or tell us what you’re trying to find.</p></div>
            <button class="dm-guide-close" type="button" aria-label="Close guide" data-dm-close>×</button>
          </div>
          <form class="dm-guide-form" id="dm-guide-form">
            <input id="dm-guide-input" type="search" autocomplete="off" placeholder="Try: Drake, JPEGMAFIA, Colorado story, new music…" aria-label="Search District Mind Media">
            <button type="submit">Find It →</button>
          </form>
          <div class="dm-guide-quick">
            <button type="button" data-q="artist">Find an artist</button><button type="button" data-go="artist-registry.html">Artist Registry →</button>
            <button type="button" data-q="article">Find an article</button>
            <button type="button" data-q="new music">Find new music</button>
            <button type="button" data-q="concerts">Concerts near you</button>
          </div>
          <div id="dm-guide-status" class="dm-guide-status" aria-live="polite">SEARCH THE WHOLE DESK.</div>
          <div id="dm-guide-results" class="dm-guide-results"></div>
          <div class="dm-guide-help"><strong>Still lost?</strong><span>Start with <a href="artists.html">Artist Hub</a> for a person, <a href="newsroom.html">Newsroom</a> for a story, or <a href="releases.html">Releases</a> for music.</span></div>
        </section>`;
      document.body.appendChild(modal);
      const input = modal.querySelector('#dm-guide-input');
      const results = modal.querySelector('#dm-guide-results');
      const status = modal.querySelector('#dm-guide-status');
      const run = async q => {
        q = q.trim();
        if (!q) { status.textContent='SEARCH THE WHOLE DESK.'; results.innerHTML=''; return; }
        status.textContent='SCANNING THE DESK…';
        const concertIntent=/\b(concert|concerts|show|shows|live music|tour|tours|tickets|gig|gigs|event|events)\b/i.test(q);
        if(concertIntent){
          status.textContent='LIVE EVENTS / LOCATION DESK';
          results.innerHTML='<a class="dm-guide-result dm-guide-live-result" href="concerts.html"><span class="dm-guide-result-type">LIVE / NEAR YOU</span><strong>Concerts Near You</strong><small>Open the dedicated concert finder — location, date, genre and ticket routes.</small></a>';
          return;
        }
        const matches = routes.map(x=>({...x,_score:score(x,q)})).filter(x=>x._score>0).sort((a,b)=>b._score-a._score).slice(0,7);
        let artist = null;
        if (tokens(q).length && !/^(article|artist|new music|colorado)$/i.test(q)) {
          try {
            const r = await fetch('/api/artist-intel?q='+encodeURIComponent(q),{cache:'default'});
            if(r.ok){ const d=await r.json(); if(d.ok && d.artist) artist=d; }
          } catch {}
        }
        const cards=[];
        if(artist){
          const n=artist.artist;
          cards.push('<a class="dm-guide-result dm-guide-artist-result" href="artists.html?q='+encodeURIComponent(n)+'"><span class="dm-guide-result-type">ARTIST MATCH</span><strong>'+esc(n)+'</strong><small>Open Artist Intelligence →</small></a>');
        }
        matches.forEach(x=>cards.push('<a class="dm-guide-result" href="'+esc(x.href)+'"><span class="dm-guide-result-type">'+esc(x.type)+'</span><strong>'+esc(x.title)+'</strong><small>'+esc(x.tags.split(' ').slice(0,8).join(' '))+' · Open →</small></a>'));
        if(!cards.length) cards.push('<div class="dm-guide-no-result"><strong>We don’t have a direct match yet.</strong><p>Try the artist’s full name, a few words from the headline, or open the Newsroom to browse current coverage.</p><a href="newsroom.html">Open Newsroom →</a></div>');
        results.innerHTML=cards.join('');
        status.textContent=artist ? 'ARTIST MATCH + SITE ROUTES FOUND.' : (matches.length+' ROUTES FOUND.');
      };
      modal.querySelector('#dm-guide-form').addEventListener('submit', e => {e.preventDefault(); run(input.value);});
      modal.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {input.value=b.dataset.q; run(b.dataset.q);}));
      // Destination shortcuts navigate immediately; never stuff a destination label into the search field.
      modal.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { window.location.href=b.dataset.go; }));
      modal.querySelectorAll('[data-dm-close]').forEach(b => b.addEventListener('click', closeGuide));
    }
    modal.classList.add('is-open');
    document.body.classList.add('dm-guide-open');
    const input = modal.querySelector('#dm-guide-input');
    input.value = prefill;
    setTimeout(()=>{input.focus(); if(prefill) modal.querySelector('#dm-guide-form').dispatchEvent(new Event('submit',{cancelable:true}));},40);
  }
  function closeGuide(){ document.getElementById('dm-guide-modal')?.classList.remove('is-open'); document.body.classList.remove('dm-guide-open'); }

  window.DistrictMindWayfinder = openGuide;
  document.addEventListener('click',e=>{ const trigger=e.target.closest('[data-open-wayfinder]'); if(trigger){ e.preventDefault(); openGuide(); } });

  if(!document.getElementById('dm-guide-trigger')){
    const b=document.createElement('button');
    b.id='dm-guide-trigger'; b.className='dm-guide-trigger'; b.type='button';
    b.setAttribute('aria-label','Open District Mind site guide');
    b.innerHTML='<span class="dm-guide-trigger-icon">⌕</span><span>WAYFINDER</span><kbd>/</kbd>';
    b.addEventListener('click',()=>openGuide());
    document.body.appendChild(b);
  }
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape') closeGuide();
    if(e.key==='/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)){e.preventDefault();openGuide();}
  });

  // Give the guide a head start when the visitor arrives with a search query.
  const q=new URLSearchParams(location.search).get('find');
  if(q) setTimeout(()=>openGuide(q),250);
})();