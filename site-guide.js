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
  if (!document.getElementById('dm-theme-control')) {
    const control = document.createElement('div');
    control.id = 'dm-theme-control';
    control.className = 'dm-theme-control';
    control.innerHTML = '<button class="dm-theme-trigger" type="button" aria-expanded="false" aria-haspopup="dialog">Appearance</button><section class="dm-theme-options dm-theme-guide" role="dialog" aria-modal="false" aria-labelledby="dm-theme-guide-title" hidden><div class="dm-theme-guide-head"><div><p class="dm-theme-kicker">MAKE IT YOURS</p><h2 id="dm-theme-guide-title">Choose your look</h2><p class="dm-theme-intro">Three quick steps: pick a style, tap a card, and keep browsing. Your choice is saved on this device.</p></div><button class="dm-theme-guide-close" type="button" aria-label="Close appearance settings">×</button></div><div class="dm-theme-steps"><span><b>1</b> Choose a vibe</span><span><b>2</b> Tap a look</span><span><b>3</b> Keep exploring</span></div><div class="dm-theme-choice-grid"><button type="button" class="dm-theme-choice" data-dm-theme="morning"><span class="dm-theme-swatch dm-swatch-morning"></span><span class="dm-theme-choice-copy"><strong>Morning</strong><small>Warm cream · relaxed editorial</small></span><span class="dm-theme-check" aria-hidden="true">✓</span></button><button type="button" class="dm-theme-choice" data-dm-theme="day"><span class="dm-theme-swatch dm-swatch-day"></span><span class="dm-theme-choice-copy"><strong>Day</strong><small>Clean light · crisp and clear</small></span><span class="dm-theme-check" aria-hidden="true">✓</span></button><button type="button" class="dm-theme-choice" data-dm-theme="night"><span class="dm-theme-swatch dm-swatch-night"></span><span class="dm-theme-choice-copy"><strong>Night</strong><small>Charcoal · premium after-dark</small></span><span class="dm-theme-check" aria-hidden="true">✓</span></button><button type="button" class="dm-theme-choice" data-dm-theme="after-hours"><span class="dm-theme-swatch dm-swatch-space"></span><span class="dm-theme-choice-copy"><strong>After Hours</strong><small>Midnight space · 12–4:30 AM</small></span><span class="dm-theme-check" aria-hidden="true">✓</span></button></div><p class="dm-theme-note">After Hours also switches on automatically from midnight to 4:30 AM local time.</p><p class="dm-theme-saved" aria-live="polite">Current look: <strong></strong></p></section>';
    document.body.appendChild(control);
    const trigger = control.querySelector('.dm-theme-trigger');
    const options = control.querySelector('.dm-theme-options');
    const closeButton = control.querySelector('.dm-theme-guide-close');
    const savedLabel = control.querySelector('.dm-theme-saved strong');
    const labels = {morning:'Morning',day:'Day',night:'Night', 'after-hours':'After Hours'};
    const syncThemeChoices = () => {
      const current = root.dataset.dmTheme || 'night';
      control.querySelectorAll('[data-dm-theme]').forEach(button => {
        const selected = button.dataset.dmTheme === current;
        button.setAttribute('aria-pressed', String(selected));
        button.classList.toggle('is-selected', selected);
      });
      if (savedLabel) savedLabel.textContent = labels[current] || 'Night';
    };
    const setOpen = open => {
      options.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
      if (open) closeButton.focus();
      else trigger.focus();
    };
    trigger.addEventListener('click', () => setOpen(options.hidden));
    closeButton.addEventListener('click', () => setOpen(false));
    options.querySelectorAll('[data-dm-theme]').forEach(button => button.addEventListener('click', () => {
      const theme = button.dataset.dmTheme;
      if (!allowedThemes.includes(theme)) return;
      root.dataset.dmTheme = theme;
      window.dispatchEvent(new Event('dm-theme-change'));
      afterHoursManual = theme === 'after-hours';
      try { localStorage.setItem(themeKey, theme); } catch {}
      syncThemeChoices();
      trigger.setAttribute('aria-expanded', 'false');
      options.hidden = true;
      trigger.focus();
    }));
    document.addEventListener('pointerdown', event => {
      if (!control.contains(event.target)) { options.hidden = true; trigger.setAttribute('aria-expanded','false'); }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !options.hidden) { options.hidden = true; trigger.setAttribute('aria-expanded','false'); trigger.focus(); }
    });
    syncThemeChoices();
  }
  if (!document.getElementById('dm-theme-styles')) {
    const style = document.createElement('style');
    style.id = 'dm-theme-styles';
    style.textContent = `
      :root[data-dm-theme="morning"]{--bg:#f2e9de;--panel:#fffaf3;--panel-strong:#e8d9c9;--ink:#29221d;--muted:#68584d;--soft:#b7a18e;--line:rgba(65,43,29,.16);--dark:#2b211c;--dark-2:#392a24;--light:#fffaf3;--shadow:0 22px 60px rgba(83,49,26,.10);color-scheme:light}
      :root[data-dm-theme="day"]{--bg:#f3f6f8;--panel:#ffffff;--panel-strong:#e2e9ef;--ink:#182432;--muted:#536273;--soft:#9aa9b7;--line:rgba(24,36,50,.14);--dark:#17202b;--dark-2:#263345;--light:#f3f6f8;--shadow:0 22px 60px rgba(20,35,55,.09);color-scheme:light}
      :root[data-dm-theme="night"]{--bg:#111216;--panel:#1b1d23;--panel-strong:#292c35;--ink:#f4f3f0;--muted:#b7bbc4;--soft:#818794;--line:rgba(255,255,255,.14);--dark:#0b0d12;--dark-2:#1a1c24;--light:#f4f3f0;--shadow:0 25px 70px rgba(0,0,0,.32);color-scheme:dark}
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

  // Visitor-friendly appearance guide: visible on every page, readable in every theme, and mobile-safe.
  if (!document.getElementById('dm-theme-guide-styles')) {
    const guideStyle = document.createElement('style');
    guideStyle.id = 'dm-theme-guide-styles';
    guideStyle.textContent = `
      .dm-theme-control{position:fixed!important;left:16px;bottom:18px;z-index:1400;display:block!important;margin:0!important;width:auto!important;padding:0!important;border:0!important}
      .dm-theme-trigger{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 17px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:#17191f;color:#fff!important;box-shadow:0 8px 28px rgba(0,0,0,.2);font-size:12px;letter-spacing:.04em;text-transform:none}
      .dm-theme-trigger::before{content:'◐';font-size:15px;line-height:1}
      .dm-theme-trigger:hover,.dm-theme-trigger:focus-visible{background:#2c5144;color:#fff!important}
      .dm-theme-guide{position:fixed!important;left:16px!important;bottom:74px!important;top:auto!important;right:auto!important;width:min(420px,calc(100vw - 32px));max-height:min(78dvh,650px);overflow:auto;padding:20px!important;border:1px solid var(--line)!important;border-radius:20px!important;background:var(--panel)!important;color:var(--ink)!important;box-shadow:0 24px 80px rgba(0,0,0,.28)!important}
      .dm-theme-guide[hidden]{display:none!important}
      .dm-theme-guide-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}
      .dm-theme-kicker{font-size:10px;font-weight:850;letter-spacing:.16em;color:var(--muted);margin:0 0 7px}
      .dm-theme-guide-head h2{font-size:clamp(24px,5vw,32px);line-height:1.05;letter-spacing:-.045em;margin:0 0 8px;color:var(--ink)}
      .dm-theme-intro{max-width:290px;font-size:13px;line-height:1.5;color:var(--muted);margin:0}
      .dm-theme-guide-close{width:38px;height:38px;flex:0 0 38px;border:1px solid var(--line);border-radius:50%;background:var(--panel-strong);color:var(--ink);font-size:24px;cursor:pointer}
      .dm-theme-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:16px 0}
      .dm-theme-steps span{display:flex;align-items:center;gap:6px;padding:8px 7px;border:1px solid var(--line);border-radius:10px;color:var(--muted);font-size:10px;line-height:1.25}
      .dm-theme-steps b{display:grid;place-items:center;flex:0 0 20px;width:20px;height:20px;border-radius:50%;background:#2c5144;color:#fff;font-size:11px}
      .dm-theme-choice-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .dm-theme-options .dm-theme-choice{position:relative;display:flex;width:auto;align-items:center;gap:10px;min-width:0;min-height:78px;padding:11px;text-align:left;border:1px solid var(--line);border-radius:13px;background:var(--bg);color:var(--ink);cursor:pointer;transition:border-color .16s,background-color .16s}
      .dm-theme-options .dm-theme-choice:hover,.dm-theme-options .dm-theme-choice:focus-visible{background:var(--panel-strong);color:var(--ink);border-color:#47866b;outline:2px solid rgba(71,134,107,.25);outline-offset:1px}
      .dm-theme-options .dm-theme-choice.is-selected{background:var(--bg);color:var(--ink);border-color:#47866b;box-shadow:inset 0 0 0 1px #47866b}
      .dm-theme-swatch{display:block;flex:0 0 38px;width:38px;height:48px;border-radius:8px;border:1px solid rgba(127,127,127,.25);background:#f0e4d5;position:relative;overflow:hidden}
      .dm-theme-swatch::before,.dm-theme-swatch::after{content:'';position:absolute;left:6px;right:6px;height:4px;border-radius:3px;background:rgba(45,37,31,.55)}
      .dm-theme-swatch::before{top:10px}.dm-theme-swatch::after{top:20px;right:13px}
      .dm-swatch-morning{background:linear-gradient(145deg,#f8efe2,#e4cdb6)}
      .dm-swatch-day{background:linear-gradient(145deg,#f8fafc,#dce6ef)}
      .dm-swatch-night{background:linear-gradient(145deg,#24242b,#111116)}
      .dm-swatch-night::before,.dm-swatch-night::after,.dm-swatch-space::before,.dm-swatch-space::after{background:rgba(235,238,255,.7)}
      .dm-swatch-space{background:radial-gradient(circle at 70% 20%,#8a7ce0 0 2px,transparent 3px),linear-gradient(145deg,#111a38,#080b1b)}
      .dm-theme-choice-copy{display:flex;flex-direction:column;gap:4px;min-width:0}
      .dm-theme-choice-copy strong{font-size:13px;line-height:1.2;color:var(--ink)}
      .dm-theme-choice-copy small{font-size:10px;line-height:1.35;color:var(--muted)}
      .dm-theme-check{display:none;position:absolute;top:7px;right:8px;color:#2c7653;font-size:13px;font-weight:900}
      .dm-theme-choice.is-selected .dm-theme-check{display:block}
      .dm-theme-note{padding:12px 0 0!important;margin:0!important;max-width:none!important;font-size:11px!important;line-height:1.5!important;color:var(--muted)!important}
      .dm-theme-saved{margin:12px 0 0;padding:10px 12px;border-radius:10px;background:var(--panel-strong);color:var(--muted);font-size:12px}
      .dm-theme-saved strong{color:var(--ink)}
      :root[data-dm-theme="morning"] .dm-theme-trigger{background:#49372b;color:#fff!important}
      :root[data-dm-theme="day"] .dm-theme-trigger{background:#263b50;color:#fff!important}
      :root[data-dm-theme="night"] .dm-theme-trigger{background:#29252d;color:#fff!important}
      :root[data-dm-theme="after-hours"] .dm-theme-trigger{background:#19264d;color:#f0f4ff!important;border-color:rgba(168,199,255,.4)}
      @media(max-width:520px){.dm-theme-control{left:12px;bottom:12px}.dm-theme-trigger{min-height:44px;padding:0 14px}.dm-theme-guide{left:8px!important;bottom:66px!important;width:calc(100vw - 16px);max-height:calc(100dvh - 84px);padding:16px!important}.dm-theme-steps{gap:4px}.dm-theme-steps span{font-size:9px;padding:7px 5px;gap:4px}.dm-theme-choice{padding:9px;gap:8px;min-height:74px}.dm-theme-swatch{flex-basis:30px;width:30px;height:42px}.dm-theme-choice-copy small{font-size:9px}}
      @media(prefers-reduced-motion:reduce){.dm-theme-choice,.dm-theme-trigger{transition:none!important}}
    `;
    document.head.appendChild(guideStyle);
  }

  // District Mind Radio: compact controls with a persistent YouTube player instance.
  // Playback starts only after the visitor presses Play (browser autoplay policy).
  if (!document.getElementById('dm-radio-control')) {
    const radioControl = document.createElement('div');
    radioControl.id = 'dm-radio-control';
    radioControl.className = 'dm-radio-control';
    radioControl.innerHTML = `
      <section id="dm-radio-panel" class="dm-radio-panel" aria-label="District Mind Radio player" aria-hidden="true">
        <div class="dm-radio-heading">
          <div><p class="dm-radio-kicker">DISTRICT MIND RECORDS</p><h2>District Mind Radio</h2><p>John Michell — Drivin Crazy</p></div>
          <button type="button" class="dm-radio-close" aria-label="Close radio details">×</button>
        </div>
        <div class="dm-radio-embed"><div id="dm-radio-youtube-player"></div></div>
        <div class="dm-radio-footer"><span>Free YouTube playback. YouTube may show ads.</span><a href="https://youtu.be/Ytt_s7M9TeQ" target="_blank" rel="noopener noreferrer">Open track on YouTube ↗</a></div>
      </section>
      <div class="dm-radio-dock" role="group" aria-label="District Mind Radio controls">
        <span class="dm-radio-live-dot" aria-hidden="true"></span>
        <button type="button" class="dm-radio-track" aria-label="Open radio details" aria-expanded="false"><strong>DISTRICT MIND RADIO</strong><small>Drivin Crazy · John Michell</small></button>
        <button type="button" class="dm-radio-control-btn dm-radio-play" aria-label="Play music" title="Play music">▶</button>
        <button type="button" class="dm-radio-control-btn dm-radio-stop" aria-label="Stop music" title="Stop music">■</button>
        <button type="button" class="dm-radio-control-btn dm-radio-next" aria-label="Next track" title="Next track" disabled>»</button>
      </div>`;
    document.body.appendChild(radioControl);
    const radioPanel = radioControl.querySelector('.dm-radio-panel');
    const radioClose = radioControl.querySelector('.dm-radio-close');
    const radioTrack = radioControl.querySelector('.dm-radio-track');
    const playButton = radioControl.querySelector('.dm-radio-play');
    const stopButton = radioControl.querySelector('.dm-radio-stop');
    const nextButton = radioControl.querySelector('.dm-radio-next');
    const radioStatus = radioControl.querySelector('.dm-radio-footer span');
    let radioPlayer = null;
    let radioReady = false;
    let radioPlaying = false;
    const setRadioDetailsOpen = open => {
      radioPanel.classList.toggle('is-open', open);
      radioPanel.setAttribute('aria-hidden', String(!open));
      radioTrack.setAttribute('aria-expanded', String(open));
    };
    const updateRadioPlayButton = playing => {
      radioPlaying = playing;
      playButton.textContent = playing ? 'Ⅱ' : '▶';
      playButton.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
      playButton.title = playing ? 'Pause music' : 'Play music';
      radioControl.classList.toggle('is-playing', playing);
    };
    radioTrack.addEventListener('click', () => setRadioDetailsOpen(!radioPanel.classList.contains('is-open')));
    radioClose.addEventListener('click', () => setRadioDetailsOpen(false));
    let radioPlayRequested = false;
    playButton.addEventListener('click', () => {
      setRadioDetailsOpen(true);
      if (!radioReady || !radioPlayer) {
        radioPlayRequested = true;
        playButton.textContent = '…';
        playButton.title = 'Loading music';
        playButton.setAttribute('aria-label', 'Loading music');
        return;
      }
      if (radioPlaying) radioPlayer.pauseVideo();
      else {
        try { radioPlayer.playVideo(); }
        catch (_) { radioStatus.textContent = 'Playback could not start. Try opening the track on YouTube.'; }
      }
    });
    stopButton.addEventListener('click', () => { if (radioReady && radioPlayer) { radioPlayer.stopVideo(); updateRadioPlayButton(false); } });
    // Only one exact John Michell YouTube upload is verified so far; don't skip to an unrelated song.
    nextButton.disabled = true;
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && radioPanel.classList.contains('is-open')) setRadioDetailsOpen(false);
    });
    if (!document.getElementById('dm-radio-styles')) {
      const radioStyle = document.createElement('style');
      radioStyle.id = 'dm-radio-styles';
      radioStyle.textContent = `
        .dm-radio-control{position:fixed;right:14px;bottom:14px;z-index:1400;font-family:inherit;color:var(--ink,#171715);max-width:calc(100vw - 20px)}
        .dm-radio-dock{display:flex;align-items:center;gap:8px;min-height:54px;padding:7px 9px;border:1px solid rgba(46,125,78,.45);border-radius:18px;background:#10271d;color:#f5fff7;box-shadow:0 8px 28px rgba(0,0,0,.22)}
        .dm-radio-live-dot{width:8px;height:8px;flex:0 0 8px;border-radius:50%;background:#7a8a80}
        .dm-radio-control.is-playing .dm-radio-live-dot{background:#52df8b;box-shadow:0 0 0 4px rgba(82,223,139,.14);animation:dm-radio-pulse 2s ease-in-out infinite}
        .dm-radio-track{min-width:0;flex:1;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer;padding:3px 2px}
        .dm-radio-track strong{display:block;font-size:9px;letter-spacing:.09em;line-height:1.4;white-space:nowrap}
        .dm-radio-track small{display:block;font-size:10px;opacity:.78;margin-top:2px;white-space:nowrap}
        .dm-radio-control-btn{width:32px;height:32px;flex:0 0 32px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.2);border-radius:50%;background:rgba(255,255,255,.08);color:#fff;font-size:14px;cursor:pointer;touch-action:manipulation}
        .dm-radio-control-btn:hover:not(:disabled),.dm-radio-control-btn:focus-visible{background:#277d49;outline:2px solid #52df8b;outline-offset:2px}
        .dm-radio-control-btn:disabled{opacity:.35;cursor:not-allowed}
        .dm-radio-panel{position:absolute;right:0;bottom:58px;width:min(260px,calc(100vw - 24px));padding:10px;border:1px solid var(--line,#d9d9d1);border-radius:16px;background:var(--surface,#f4f4f0);color:var(--ink,#171715);box-shadow:0 18px 45px rgba(0,0,0,.25);opacity:0;visibility:hidden;transform:translateY(8px) scale(.98);pointer-events:none;transition:opacity .18s ease,transform .18s ease,visibility .18s}
        .dm-radio-panel.is-open{opacity:1;visibility:visible;transform:translateY(0) scale(1);pointer-events:auto}
        .dm-radio-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}
        .dm-radio-heading h2{font-size:14px;line-height:1.15;margin:0 0 5px;color:var(--ink,#171715)}
        .dm-radio-heading p:last-child{font-size:11px;line-height:1.4;margin:0;color:var(--muted,#555)}
        .dm-radio-kicker{font-size:8px;letter-spacing:.14em;font-weight:800;margin:0 0 5px;color:#287849}
        .dm-radio-close{flex:0 0 30px;width:30px;height:30px;border-radius:50%;border:1px solid var(--line,#d9d9d1);background:var(--panel,#fff);color:var(--ink,#171715);font-size:21px;line-height:1;cursor:pointer}
        .dm-radio-embed{width:100%;aspect-ratio:16/9;min-height:120px;border-radius:10px;overflow:hidden;background:#000}
        .dm-radio-embed iframe{display:block;width:100%;height:100%;border:0}
        .dm-radio-footer{display:flex;flex-direction:column;gap:7px;margin-top:9px;font-size:10px;line-height:1.4;color:var(--muted,#555)}
        .dm-radio-footer a{font-weight:800;color:var(--ink,#171715);text-decoration:underline;text-underline-offset:3px}
        :root[data-dm-theme="after-hours"] .dm-radio-panel{background:#10172d;color:#f0f4ff;border-color:rgba(168,199,255,.28)}
        :root[data-dm-theme="after-hours"] .dm-radio-heading h2,:root[data-dm-theme="after-hours"] .dm-radio-close,:root[data-dm-theme="after-hours"] .dm-radio-footer a{color:#f0f4ff}
        :root[data-dm-theme="after-hours"] .dm-radio-close{background:#182344;border-color:#34436a}
        @keyframes dm-radio-pulse{0%,100%{box-shadow:0 0 0 3px rgba(82,223,139,.1)}50%{box-shadow:0 0 0 5px rgba(82,223,139,.22)}}
        @media(max-width:520px){.dm-radio-control{right:8px;bottom:8px;max-width:calc(100vw - 16px)}.dm-radio-dock{gap:6px;min-height:48px;padding:6px 7px;border-radius:16px}.dm-radio-track strong{font-size:8px}.dm-radio-track small{font-size:9px}.dm-radio-control-btn{width:30px;height:30px;flex-basis:30px}.dm-radio-panel{bottom:58px;width:calc(100vw - 16px);padding:10px}.dm-radio-embed{min-height:120px}}
        @media(prefers-reduced-motion:reduce){.dm-radio-control *{transition:none!important;animation:none!important}}
      `;
      document.head.appendChild(radioStyle);
    }
    const createRadioPlayer = () => {
      if (!window.YT || !window.YT.Player || radioPlayer) return;
      radioPlayer = new window.YT.Player('dm-radio-youtube-player', {
        width: '260', height: '146', videoId: 'Ytt_s7M9TeQ',
        playerVars: {playsinline:1, rel:0, origin:window.location.origin},
        events: {
          onReady: () => {
            radioReady = true;
            playButton.textContent = '▶';
            playButton.title = 'Play music';
            playButton.setAttribute('aria-label', 'Play music');
            if (radioPlayRequested) {
              radioPlayRequested = false;
              try { radioPlayer.playVideo(); }
              catch (_) { if (radioStatus) radioStatus.textContent = 'Playback could not start. Open the track on YouTube.'; }
            }
          },
          onStateChange: event => {
            if (event.data === window.YT.PlayerState.PLAYING) updateRadioPlayButton(true);
            if ([window.YT.PlayerState.PAUSED, window.YT.PlayerState.ENDED, window.YT.PlayerState.CUED].includes(event.data)) updateRadioPlayButton(false);
          },
          onError: () => {
            radioPlayRequested = false;
            updateRadioPlayButton(false);
            if (radioStatus) radioStatus.textContent = 'This track could not play here. Open it on YouTube or use the Apple Music catalog.';
          }
        }
      });
    };
    if (window.YT && window.YT.Player) createRadioPlayer();
    else {
      const previousYouTubeReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previousYouTubeReady === 'function') previousYouTubeReady();
        createRadioPlayer();
      };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const apiScript = document.createElement('script');
        apiScript.src = 'https://www.youtube.com/iframe_api';
        apiScript.async = true;
        document.head.appendChild(apiScript);
      }
    }
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