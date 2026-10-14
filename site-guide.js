(() => {


  // One consistent primary navigation across every page.
  const primaryNav = document.querySelector('.primary-nav');
  if (primaryNav) {
    primaryNav.innerHTML = [
      ['Newsroom','/newsroom'],['Radar','/radar'],['Releases','/releases'],
      ['Wayfinder AI','/wayfinder'],['Academy','/academy'],['Culture','/culture'],
      ['About','/about'],['Contact','/contact']
    ].map(([label,href]) => '<a href="' + href + '">' + label + '</a>').join('');
  }

  // Clean up internal legacy .html links and route the old Latest anchor to Newsroom.
  document.querySelectorAll('a[href]').forEach(link => {
    let href = link.getAttribute('href') || '';
    if (href === 'index.html#latest' || href === '/#latest') {
      link.setAttribute('href','/newsroom');
      return;
    }
    if (/^(?:\/?[a-z0-9-]+)\.html(?:#.*)?$/i.test(href)) {
      const match = href.match(/^(?:\/)?([a-z0-9-]+)\.html(.*)$/i);
      if (match) link.setAttribute('href', (match[1] === 'index' ? '/' : '/' + match[1]) + (match[2] || ''));
    }
  });

  // Help Center and My Playlists live in the footer rather than the primary menu.
  const footerLinks = document.querySelector('.footer-links');
  if (footerLinks) {
    [['Help Center','/help'],['My Playlists','/playlists']].forEach(([label,href]) => {
      if (!footerLinks.querySelector('a[href="' + href + '"]')) {
        const link = document.createElement('a'); link.href = href; link.textContent = label; footerLinks.appendChild(link);
      }
    });
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
        transition: background .18s ease, color .18s ease;
      }
      .menu-toggle::before { content: none; }
      .menu-toggle:hover { background: #33332f; }
      .menu-toggle:active { background: #277d3d; color: #fff; }
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
          background: #fff !important; color: #171715 !important; border: 1px solid rgba(17,17,17,.12);
          border-radius: 16px; box-shadow: 0 18px 48px rgba(0,0,0,.18);
          padding: 10px; gap: 3px; align-items: stretch;
        }
        /* Keep dropdown readable on dark-themed pages such as Wayfinder and Artist Desk. */
        .site-header .primary-nav.is-open {
          background: #fff !important; color: #171715 !important;
        }
        .site-header .primary-nav a {
          color: #171715 !important;
        }
        .site-header .primary-nav a:hover,
        .site-header .primary-nav a:active,
        .site-header .primary-nav a[aria-current="page"] {
          background: #f1f0eb !important; color: #111 !important;
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

  // Quiet, consistent interaction: no decorative arrows or emoji on button controls; click feedback is color-only.
  if (!document.getElementById('dm-button-polish')) {
    const style = document.createElement('style');
    style.id = 'dm-button-polish';
    style.textContent = `
      button, .hero-button, .submit-btn, .dm-guide-form button, .dm-guide-trigger, .dm-ecosystem-card a {
        transition: background-color .16s ease, color .16s ease, border-color .16s ease !important;
        transform: none !important; box-shadow: none !important;
        -webkit-tap-highlight-color: transparent;
      }
      button:active, .hero-button:active, .submit-btn:active, .dm-guide-form button:active, .dm-guide-trigger:active, .dm-ecosystem-card a:active {
        background-color: #277d3d !important; color: #fff !important; border-color: #277d3d !important;
        transform: none !important; box-shadow: none !important;
      }
      .hero-button:hover, .submit-btn:hover, .dm-guide-form button:hover, .dm-guide-trigger:hover { transform:none !important; box-shadow:none !important; }
    `;
    document.head.appendChild(style);
  }
  document.querySelectorAll('button, .hero-button, .submit-btn, .dm-guide-form button, .dm-guide-trigger, .dm-ecosystem-card a').forEach(el => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => { node.nodeValue = node.nodeValue.replace(/[\u2190-\u21FF\u25B6\u25C0\u27A1\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/\s{2,}/g, ' ').trim(); });
  });

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
    {title:'DM Coins Lab', href:'dm-coins-lab.html', type:'ACADEMY LAB', tags:'academy demo coins rewards points sandbox test learn earn'},
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
            <button type="submit">Find It </button>
          </form>
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
          cards.push('<a class="dm-guide-result dm-guide-artist-result" href="artists.html?q='+encodeURIComponent(n)+'"><span class="dm-guide-result-type">ARTIST MATCH</span><strong>'+esc(n)+'</strong><small>Open Artist Intelligence </small></a>');
        }
        matches.forEach(x=>cards.push('<a class="dm-guide-result" href="'+esc(x.href)+'"><span class="dm-guide-result-type">'+esc(x.type)+'</span><strong>'+esc(x.title)+'</strong><small>'+esc(x.tags.split(' ').slice(0,8).join(' '))+' · Open </small></a>'));
        if(!cards.length) cards.push('<div class="dm-guide-no-result"><strong>We don’t have a direct match yet.</strong><p>Try the artist’s full name, a few words from the headline, or open the Newsroom to browse current coverage.</p><a href="newsroom.html">Open Newsroom </a></div>');
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

  document.addEventListener('pointerdown',e=>{const n=document.querySelector('.primary-nav.is-open');if(!n||e.target.closest('.primary-nav')||e.target.closest('.menu-toggle'))return;n.classList.remove('is-open');document.querySelector('.menu-toggle[aria-controls="'+n.id+'"]')?.setAttribute('aria-expanded','false');},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const n=document.querySelector('.primary-nav.is-open');if(n){n.classList.remove('is-open');document.querySelector('.menu-toggle[aria-controls="'+n.id+'"]')?.setAttribute('aria-expanded','false');}}});
  window.DistrictMindWayfinder = openGuide;
  document.addEventListener('click',e=>{ const trigger=e.target.closest('[data-open-wayfinder]'); if(trigger){ e.preventDefault(); openGuide(); } });

  if(!document.getElementById('dm-guide-trigger')){
    const b=document.createElement('button');
    b.id='dm-guide-trigger'; b.className='dm-guide-trigger'; b.type='button';
    b.setAttribute('aria-label','Open District Mind site guide');
    b.textContent='WAYFINDER';
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

  // Site-wide appearance: Morning, Day, Night, plus an automatic 00:00–04:30 After Hours universe.
  const root = document.documentElement;
  const themeKey = 'district-mind-theme';
  const allowedThemes = ['morning','day','night','after-hours'];
  let savedTheme = 'night';
  try { const stored = localStorage.getItem(themeKey); if (allowedThemes.includes(stored)) savedTheme = stored; } catch {}
  const localMinutes = () => { const now = new Date(); return now.getHours() * 60 + now.getMinutes(); };
  const isAfterHours = () => localMinutes() < 270;
  let afterHoursManual = false;
  root.dataset.dmTheme = isAfterHours() ? 'after-hours' : (savedTheme === 'after-hours' ? 'night' : savedTheme);
  if (primaryNav && !document.getElementById('dm-theme-control')) {
    const control = document.createElement('div');
    control.id = 'dm-theme-control';
    control.className = 'dm-theme-control';
    control.innerHTML = '<button class="dm-theme-trigger" type="button" aria-expanded="false" aria-haspopup="true">Theme</button><div class="dm-theme-options" hidden><button type="button" data-dm-theme="morning">Morning</button><button type="button" data-dm-theme="day">Day</button><button type="button" data-dm-theme="night">Night</button><button type="button" data-dm-theme="after-hours">After Hours · 12–4:30</button><p class="dm-theme-note">After Hours switches on automatically from midnight to 4:30 AM local time.</p></div>';
    primaryNav.appendChild(control);
    const trigger = control.querySelector('.dm-theme-trigger');
    const options = control.querySelector('.dm-theme-options');
    trigger.addEventListener('click', () => {
      const open = options.hidden;
      options.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
    });
    options.querySelectorAll('[data-dm-theme]').forEach(button => button.addEventListener('click', () => {
      const theme = button.dataset.dmTheme;
      if (!allowedThemes.includes(theme)) return;
      root.dataset.dmTheme = theme;
      window.dispatchEvent(new Event('dm-theme-change'));
      afterHoursManual = theme === 'after-hours';
      try { localStorage.setItem(themeKey, theme); } catch {}
      options.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      control.querySelectorAll('[data-dm-theme]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    }));
    document.addEventListener('pointerdown', event => {
      if (!control.contains(event.target)) { options.hidden = true; trigger.setAttribute('aria-expanded','false'); }
    });
  }
  if (!document.getElementById('dm-theme-styles')) {
    const style = document.createElement('style');
    style.id = 'dm-theme-styles';
    style.textContent = `
      :root[data-dm-theme="morning"]{--bg:#f3e9dc;--panel:#fff8ef;--panel-strong:#e9d6c2;--ink:#2a211d;--muted:#6f5b4d;--soft:#b9a28e;--line:rgba(65,43,29,.15);--dark:#2b211c;--dark-2:#392a24;--light:#fff8ef;--shadow:0 22px 60px rgba(83,49,26,.10);color-scheme:light}
      :root[data-dm-theme="day"]{--bg:#f7f8fa;--panel:#fff;--panel-strong:#e6eaf0;--ink:#18202b;--muted:#596575;--soft:#a3adba;--line:rgba(24,32,43,.13);--dark:#17202b;--dark-2:#263345;--light:#f7f8fa;--shadow:0 22px 60px rgba(20,35,55,.09);color-scheme:light}
      :root[data-dm-theme="night"]{--bg:#111113;--panel:#19191d;--panel-strong:#25252b;--ink:#f4f1ed;--muted:#b1adb0;--soft:#777279;--line:rgba(255,255,255,.14);--dark:#0a0a0c;--dark-2:#171216;--light:#f4f1ed;--shadow:0 25px 70px rgba(0,0,0,.32);color-scheme:dark}
      :root[data-dm-theme="after-hours"]{--bg:#070b1b;--panel:#10172b;--panel-strong:#192442;--ink:#f0f4ff;--muted:#aebbd8;--soft:#66759c;--line:rgba(156,185,255,.2);--dark:#050817;--dark-2:#10152b;--light:#f0f4ff;--shadow:0 25px 70px rgba(0,0,0,.42);color-scheme:dark}
      :root[data-dm-theme="after-hours"] body{background:radial-gradient(ellipse at 18% 8%,rgba(57,84,181,.22),transparent 36%),radial-gradient(ellipse at 82% 28%,rgba(130,54,190,.16),transparent 32%),#070b1b;color:var(--ink)}
      :root[data-dm-theme="after-hours"] body>*{position:relative;z-index:1}
      :root[data-dm-theme="after-hours"] body::before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.65;background-image:radial-gradient(2px 2px at 12% 18%,#fff 50%,transparent 70%),radial-gradient(1px 1px at 30% 70%,#b8c9ff 50%,transparent 70%),radial-gradient(2px 2px at 73% 22%,#fff 50%,transparent 70%),radial-gradient(1px 1px at 86% 65%,#d5b7ff 50%,transparent 70%),radial-gradient(1px 1px at 54% 42%,#fff 50%,transparent 70%),radial-gradient(2px 2px at 41% 12%,#8fa9ff 50%,transparent 70%);background-size:420px 340px;animation:dm-star-drift 80s linear infinite}
      :root[data-dm-theme="after-hours"] .site-header{background:rgba(7,11,27,.82);border-color:var(--line)}
      :root[data-dm-theme="after-hours"] .logo::before{background:#a8c7ff;box-shadow:0 0 16px #8caeff}
      :root[data-dm-theme="after-hours"] .primary-nav a{color:rgba(240,244,255,.82)}
      :root[data-dm-theme="after-hours"] .primary-nav a:hover,:root[data-dm-theme="after-hours"] .primary-nav a[aria-current="page"]{color:#fff}
      :root[data-dm-theme="after-hours"] .primary-nav a::after{background:#a8c7ff}
      :root[data-dm-theme="after-hours"] .menu-toggle{background:#151e3a;color:#f0f4ff;border-color:rgba(168,199,255,.32)}
      :root[data-dm-theme="after-hours"] .content-panel,:root[data-dm-theme="after-hours"] .info-panel,:root[data-dm-theme="after-hours"] .artist-card,:root[data-dm-theme="after-hours"] .contact-card,:root[data-dm-theme="after-hours"] .release-item,:root[data-dm-theme="after-hours"] .story-card,:root[data-dm-theme="after-hours"] .editorial-item,:root[data-dm-theme="after-hours"] .category-card,:root[data-dm-theme="after-hours"] .explore-tile{background:rgba(16,23,43,.88);color:var(--ink);border-color:var(--line);box-shadow:none}
      :root[data-dm-theme="after-hours"] .content-panel p,:root[data-dm-theme="after-hours"] .info-panel p,:root[data-dm-theme="after-hours"] .release-item p,:root[data-dm-theme="after-hours"] .story-card p,:root[data-dm-theme="after-hours"] .editorial-item p,:root[data-dm-theme="after-hours"] .category-card p,:root[data-dm-theme="after-hours"] .explore-tile small{color:var(--muted)}
      :root[data-dm-theme="after-hours"] .hero:not(.hero-media),:root[data-dm-theme="after-hours"] .page-hero{background:linear-gradient(120deg,rgba(5,8,23,.94),rgba(15,22,49,.78)),radial-gradient(circle at 85% 20%,rgba(114,83,222,.22),transparent 30%),#070b1b;color:var(--ink)}
      :root[data-dm-theme="after-hours"] .hero::before{background-image:linear-gradient(rgba(168,199,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(168,199,255,.06) 1px,transparent 1px)}
      :root[data-dm-theme="after-hours"] .hero-button{background:#dbe7ff;color:#0b1022}
      :root[data-dm-theme="after-hours"] .hero-button.secondary{background:transparent;color:#f0f4ff;border-color:rgba(168,199,255,.42)}
      :root[data-dm-theme="after-hours"] .dm-theme-trigger{color:var(--ink)}
      @keyframes dm-star-drift{from{background-position:0 0}to{background-position:420px 340px}}
      .dm-theme-note{padding:8px 12px 10px;max-width:240px;color:var(--muted);font-size:10px;line-height:1.5}

      :root[data-dm-theme="night"] body{background:radial-gradient(circle at top,rgba(90,22,37,.22),transparent 28%),var(--bg);color:var(--ink)}
      :root[data-dm-theme="night"] .site-header{background:rgba(17,17,19,.84);border-color:var(--line)}
      :root[data-dm-theme="night"] .logo::before{background:#f4f1ed}
      :root[data-dm-theme="night"] .primary-nav a{color:rgba(244,241,237,.8)}
      :root[data-dm-theme="night"] .primary-nav a:hover,:root[data-dm-theme="night"] .primary-nav a[aria-current="page"]{color:#fff}
      :root[data-dm-theme="night"] .primary-nav a::after{background:#f4f1ed}
      :root[data-dm-theme="night"] .menu-toggle{background:#202024;color:#f4f1ed;border-color:rgba(255,255,255,.2)}
      :root[data-dm-theme="night"] .content-panel,:root[data-dm-theme="night"] .info-panel,:root[data-dm-theme="night"] .artist-card,:root[data-dm-theme="night"] .contact-card,:root[data-dm-theme="night"] .release-item,:root[data-dm-theme="night"] .story-card,:root[data-dm-theme="night"] .editorial-item,:root[data-dm-theme="night"] .category-card{background:#19191d;border-color:var(--line);box-shadow:none}
      :root[data-dm-theme="night"] .info-panel strong{color:var(--ink)}
      :root[data-dm-theme="night"] .culture-card{background:linear-gradient(135deg,#252126,#18181c);border-color:var(--line)}
      :root[data-dm-theme="night"] .release-card{border-color:rgba(255,255,255,.55)}
      :root[data-dm-theme="night"] .release-card>p:last-child{color:var(--muted)}
      :root[data-dm-theme="morning"] .hero:not(.hero-media),:root[data-dm-theme="day"] .hero:not(.hero-media){background:linear-gradient(120deg,rgba(20,20,20,.93),rgba(20,20,20,.74)),#202020}
      :root[data-dm-theme="morning"] .page-hero,:root[data-dm-theme="day"] .page-hero{background:linear-gradient(135deg,#26211f,#171717);color:#fff}
      .dm-theme-control{position:relative;display:flex;align-items:center;flex-shrink:0;margin-left:4px}
      .dm-theme-trigger{min-height:38px;padding:8px 12px;border:1px solid var(--line);background:transparent;color:var(--ink);font:inherit;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:background-color .16s ease,color .16s ease,border-color .16s ease}
      .dm-theme-trigger:active,.dm-theme-trigger[aria-expanded="true"]{background:#277d3d;color:#fff;border-color:#277d3d}
      .dm-theme-options{position:absolute;right:0;top:calc(100% + 8px);z-index:2000;min-width:138px;padding:5px;background:var(--panel);color:var(--ink);border:1px solid var(--line);box-shadow:0 14px 34px rgba(0,0,0,.16)}
      .dm-theme-options[hidden]{display:none}
      .dm-theme-options button{display:block;width:100%;padding:11px 12px;text-align:left;border:0;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer;transition:background-color .16s ease,color .16s ease}
      .dm-theme-options button:hover,.dm-theme-options button:focus-visible,.dm-theme-options button:active{background:#277d3d;color:#fff;outline:none}
      :root[data-dm-theme="night"] .dm-theme-options{background:#19191d;color:#f4f1ed}
      :root[data-dm-theme="after-hours"] .dm-theme-options{background:#10172b;color:#f0f4ff}
      :root[data-dm-theme="after-hours"] .dm-theme-options button:hover,:root[data-dm-theme="after-hours"] .dm-theme-options button:focus-visible{background:#334b8c;color:#fff}
      @media(max-width:760px){.dm-theme-control{width:100%;margin:8px 0 0;padding-top:8px;border-top:1px solid var(--line)}.dm-theme-trigger{width:100%;text-align:left}.dm-theme-options{left:0;right:auto;top:calc(100% + 5px)}}
      @media(prefers-reduced-motion:reduce){.dm-theme-trigger,.dm-theme-options button{transition:none!important}}
    `;
    document.head.appendChild(style);
  }

  // Optional generated ambient synth: distinct daytime and nighttime soundscapes.
  // Audio starts only after a visitor taps the control; it uses no external files.
  if (!document.getElementById('dm-afterhours-audio')) {
    const audioButton = document.createElement('button');
    audioButton.id = 'dm-afterhours-audio';
    audioButton.type = 'button';
    audioButton.className = 'dm-audio-toggle';
    audioButton.textContent = 'Enable ambient audio';
    audioButton.setAttribute('aria-pressed','false');
    audioButton.setAttribute('aria-label','Enable or mute District Mind day and night ambient music');
    const navContainer = document.querySelector('.nav-container');
    if (navContainer) navContainer.appendChild(audioButton);
    let audioContext = null, masterGain = null, audioNodes = [], audioTimer = null, audioOn = false, noteIndex = 0;
    const isNightSound = () => ['night','after-hours'].includes(root.dataset.dmTheme);
    const stopPads = () => {
      audioNodes.forEach(node => { try { if (node.stop) node.stop(); } catch {} try { node.disconnect(); } catch {} });
      audioNodes = [];
    };
    const buildSoundscape = () => {
      if (!audioContext || !masterGain) return;
      stopPads();
      const night = isNightSound();
      const filter = audioContext.createBiquadFilter();
      filter.type = night ? 'lowpass' : 'lowpass';
      filter.frequency.value = night ? 720 : 1700;
      filter.Q.value = night ? .75 : .45;
      filter.connect(masterGain);
      audioNodes.push(filter);
      const pad = (freq, detune, gain, type='sine') => {
        const osc = audioContext.createOscillator(), amp = audioContext.createGain();
        osc.type = type; osc.frequency.value = freq; osc.detune.value = detune;
        amp.gain.value = gain; osc.connect(amp); amp.connect(filter); osc.start();
        audioNodes.push(osc, amp);
      };
      if (night) {
        // Night / After Hours: deep, spacious, slow-moving cinematic tones.
        pad(55, -4, .23); pad(82.41, 3, .14); pad(110, 0, .085); pad(164.81, -7, .035);
      } else {
        // Morning / Day: warmer, brighter, gently uplifting editorial lounge tones.
        pad(130.81, -3, .13); pad(196, 4, .095); pad(261.63, 0, .06); pad(392, -5, .025);
      }
      noteIndex = 0;
    };
    const stopAudio = () => {
      audioOn = false;
      if (audioTimer) { clearInterval(audioTimer); audioTimer = null; }
      if (masterGain && audioContext) { try { masterGain.gain.setTargetAtTime(0, audioContext.currentTime, .12); } catch {} }
      audioButton.textContent = 'Enable ambient audio';
      audioButton.setAttribute('aria-pressed','false');
    };
    const startAudio = async () => {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) { audioButton.textContent = 'Audio unavailable'; return; }
      if (!audioContext) {
        audioContext = new AudioCtx();
        masterGain = audioContext.createGain();
        masterGain.gain.value = .0001;
        masterGain.connect(audioContext.destination);
      }
      try { await audioContext.resume(); } catch {}
      buildSoundscape();
      masterGain.gain.setTargetAtTime(.095, audioContext.currentTime, .8);
      audioOn = true;
      audioButton.textContent = 'Mute ambient audio';
      audioButton.setAttribute('aria-pressed','true');
      if (!audioTimer) {
        audioTimer = setInterval(() => {
          if (!audioOn || !audioContext) return;
          const night = isNightSound();
          const notes = night
            ? [110,130.81,98,146.83,123.47,87.31,110,164.81]
            : [261.63,329.63,392,293.66,349.23,440,329.63,392];
          const osc = audioContext.createOscillator(), gain = audioContext.createGain();
          osc.type = night ? 'sine' : 'triangle';
          osc.frequency.value = notes[noteIndex++ % notes.length];
          gain.gain.setValueAtTime(.0001,audioContext.currentTime);
          gain.gain.exponentialRampToValueAtTime(night ? .012 : .008,audioContext.currentTime+.22);
          gain.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+(night ? 3.8 : 2.4));
          osc.connect(gain); gain.connect(masterGain); osc.start(); osc.stop(audioContext.currentTime+(night ? 4 : 2.6));
        }, isNightSound() ? 2400 : 1500);
      }
    };
    audioButton.addEventListener('click', () => { if (audioOn) stopAudio(); else startAudio(); });
    // When the visitor changes the theme, smoothly replace the pads while audio is active.
    window.addEventListener('dm-theme-change', () => {
      if (!audioOn || !audioContext || !masterGain) return;
      masterGain.gain.setTargetAtTime(.0001, audioContext.currentTime, .12);
      window.setTimeout(() => {
        if (!audioOn) return;
        buildSoundscape();
        masterGain.gain.setTargetAtTime(.095, audioContext.currentTime, .7);
      }, 180);
    });
    if (!document.getElementById('dm-audio-styles')) {
      const audioStyle = document.createElement('style');
      audioStyle.id = 'dm-audio-styles';
      audioStyle.textContent = '.dm-audio-toggle{min-height:38px;padding:8px 12px;margin-left:8px;border:1px solid var(--line);background:transparent;color:var(--ink);font:inherit;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;touch-action:manipulation}.dm-audio-toggle[aria-pressed="true"]{border-color:#8faeff;background:#152247;color:#eef3ff}@media(max-width:760px){.nav-container{flex-wrap:wrap;padding:10px 0}.dm-audio-toggle{margin:8px 0 0;width:100%}.dm-theme-control{order:5}.dm-audio-toggle{order:6}}@media(prefers-reduced-motion:reduce){:root[data-dm-theme="after-hours"] body::before{animation:none}}';
      document.head.appendChild(audioStyle);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden && audioOn) stopAudio(); });
  }
  // Follow the visitor's device-local clock; no server location or tracking needed.
  const updateTimeTheme = () => {
    const previousTheme = root.dataset.dmTheme;
    if (isAfterHours()) root.dataset.dmTheme = 'after-hours';
    else if (root.dataset.dmTheme === 'after-hours' && !afterHoursManual) {
      let stored = 'night'; try { const candidate = localStorage.getItem(themeKey); if (allowedThemes.includes(candidate) && candidate !== 'after-hours') stored = candidate; } catch {}
      root.dataset.dmTheme = stored;
    }
    if (previousTheme !== root.dataset.dmTheme) window.dispatchEvent(new Event('dm-theme-change'));
  };
  setInterval(updateTimeTheme, 60000);


  // Site-wide button interaction sounds and contrast-safe controls.
  // Audio is synthesized locally and only starts after a visitor clicks; no files or tracking.
  if (!document.getElementById('dm-interaction-polish')) {
    const style = document.createElement('style');
    style.id = 'dm-interaction-polish';
    style.textContent = `
      /* Keep labels readable regardless of the active theme's text variables. */
      .hero-button:not(.secondary), .newsletter-form button, .submit-btn,
      .dm-guide-form button, .dm-guide-trigger, .dm-theme-trigger,
      .dm-audio-toggle, .menu-toggle, button.primary, .button-primary {
        background-color: #f4f4f0;
        color: #111 !important;
        border-color: rgba(17,17,17,.28);
        text-shadow: none;
      }
      .hero-button.secondary { color: #fff !important; }
      :root[data-dm-theme="night"] .hero-button:not(.secondary),
      :root[data-dm-theme="night"] .newsletter-form button,
      :root[data-dm-theme="night"] .submit-btn,
      :root[data-dm-theme="night"] .dm-guide-form button,
      :root[data-dm-theme="after-hours"] .newsletter-form button,
      :root[data-dm-theme="after-hours"] .submit-btn,
      :root[data-dm-theme="after-hours"] .dm-guide-form button {
        background-color: #f4f4f0;
        color: #111 !important;
      }
      :root[data-dm-theme="after-hours"] .hero-button:not(.secondary) {
        background-color: #dbe7ff;
        color: #0b1022 !important;
      }
      :root[data-dm-theme="after-hours"] .hero-button.secondary { color: #f0f4ff !important; }
      button:not(:disabled), [role="button"], .hero-button, .inline-link {
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }
      button:focus-visible, [role="button"]:focus-visible, a:focus-visible {
        outline: 3px solid #39a852 !important;
        outline-offset: 3px;
      }
      button:disabled { cursor: not-allowed; opacity: .58; }
      .dm-theme-options button { background: transparent; color: var(--ink); }
      .dm-theme-options button:hover, .dm-theme-options button:focus-visible,
      .dm-theme-options button:active { background: #277d3d; color: #fff !important; }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; }
      }
    `;
    document.head.appendChild(style);
  }

  // One short, soft UI tick for navigation, buttons, tabs and other real controls.
  // Delegation means dynamically rendered Radar/news cards receive the same feedback.
  let dmClickAudio = null;
  let dmLastClickSoundAt = 0;
  document.addEventListener('click', event => {
    const control = event.target.closest('button, [role="button"], a[href], input[type="submit"], input[type="button"]');
    if (!control || control.disabled || control.getAttribute('aria-disabled') === 'true') return;
    // Do not sound for clicks that merely dismiss overlays/backdrops.
    if (control.matches('[data-dm-close], .dm-guide-backdrop')) return;
    const now = Date.now();
    if (now - dmLastClickSoundAt < 65) return;
    dmLastClickSoundAt = now;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!dmClickAudio) dmClickAudio = new AudioContextClass();
      if (dmClickAudio.state === 'suspended') dmClickAudio.resume().catch(() => {});
      const osc = dmClickAudio.createOscillator();
      const gain = dmClickAudio.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(control.matches('.menu-toggle, .dm-guide-trigger') ? 740 : 920, dmClickAudio.currentTime);
      osc.frequency.exponentialRampToValueAtTime(620, dmClickAudio.currentTime + .045);
      gain.gain.setValueAtTime(.0001, dmClickAudio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.025, dmClickAudio.currentTime + .006);
      gain.gain.exponentialRampToValueAtTime(.0001, dmClickAudio.currentTime + .055);
      osc.connect(gain);
      gain.connect(dmClickAudio.destination);
      osc.start();
      osc.stop(dmClickAudio.currentTime + .06);
    } catch (_) {
      // Sound is enhancement only; controls continue working if audio is unavailable.
    }
  }, true);

})();