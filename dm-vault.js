(() => {
  'use strict';
  if (window.__dmVaultLoaded) return;
  window.__dmVaultLoaded = true;
  const tracks = {
    fuma: { title: 'Fuma', src: '/assets/audio/vault/fuma.mp3', clue: 'The Hidden Frequency' },
    tropical: { title: 'Tropical Breeze', src: '/assets/audio/vault/tropical-breeze.mp3', clue: 'The Lost Session' }
  };
  const unlocked = new Set();
  let panel, status, audio, heading;
  const style = document.createElement('style');
  style.id = 'dm-vault-styles';
  style.textContent = '.dm-vault-panel{position:fixed;z-index:1401;right:14px;bottom:84px;width:min(340px,calc(100vw - 28px));padding:18px;border:1px solid rgba(68,145,93,.42);border-radius:18px;background:#f5f4ef;color:#171715;box-shadow:0 18px 54px rgba(0,0,0,.3);display:none}.dm-vault-panel.is-open{display:block;animation:dm-vault-in .18s ease-out}.dm-vault-panel *{box-sizing:border-box}.dm-vault-kicker{font-size:9px;letter-spacing:.17em;font-weight:800;color:#277d49;margin:0 0 8px}.dm-vault-panel h2{font-size:20px;line-height:1.1;letter-spacing:-.035em;margin:0 0 7px;color:inherit}.dm-vault-copy{font-size:12px;line-height:1.55;color:#5d5c56;margin:0 0 14px}.dm-vault-track{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid rgba(23,23,21,.12)}.dm-vault-track strong{display:block;font-size:13px;line-height:1.3}.dm-vault-track small{display:block;font-size:10px;color:#66645e;margin-top:3px}.dm-vault-track button,.dm-vault-close{appearance:none;border:1px solid #c9c8c0;border-radius:999px;background:#fff;color:#171715;padding:9px 13px;font-size:10px;font-weight:800;letter-spacing:.08em;cursor:pointer;transition:background-color .16s ease,color .16s ease,border-color .16s ease}.dm-vault-track button:hover,.dm-vault-close:hover{background:#277d49;color:#fff;border-color:#277d49}.dm-vault-track button:focus-visible,.dm-vault-close:focus-visible{outline:3px solid #277d49;outline-offset:3px}.dm-vault-track button:disabled{opacity:.5;cursor:not-allowed}.dm-vault-status{font-size:11px;line-height:1.45;color:#56554f;margin:12px 0 0;min-height:16px}.dm-vault-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:4px}.dm-vault-close{width:32px;height:32px;flex:0 0 32px;padding:0;font-size:12px}.dm-vault-audio{width:100%;height:34px;margin-top:10px;display:none}.dm-vault-audio.is-visible{display:block}.dm-vault-hint{font-size:9px;letter-spacing:.04em;color:#77756f;margin:10px 0 0}:root[data-dm-theme="after-hours"] .dm-vault-panel{background:#111a31;color:#f0f4ff;border-color:rgba(168,199,255,.28)}:root[data-dm-theme="after-hours"] .dm-vault-copy,:root[data-dm-theme="after-hours"] .dm-vault-track small,:root[data-dm-theme="after-hours"] .dm-vault-status,:root[data-dm-theme="after-hours"] .dm-vault-hint{color:#c4cce0}:root[data-dm-theme="after-hours"] .dm-vault-track{border-color:rgba(255,255,255,.13)}:root[data-dm-theme="after-hours"] .dm-vault-track button,:root[data-dm-theme="after-hours"] .dm-vault-close{background:#1c2948;color:#f0f4ff;border-color:#46577f}@keyframes dm-vault-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}@media(max-width:520px){.dm-vault-panel{right:8px;bottom:68px;width:calc(100vw - 16px);padding:15px;max-height:calc(100dvh - 90px);overflow:auto}}@media(prefers-reduced-motion:reduce){.dm-vault-panel{animation:none}.dm-vault-panel *{transition:none!important}}';
  document.head.appendChild(style);

  function mount() {
    if (document.getElementById('dm-vault-panel')) return true;
    const radio = document.getElementById('dm-radio-control');
    if (!radio) return false;
    const dot = radio.querySelector('.dm-radio-live-dot');
    const trackButton = radio.querySelector('.dm-radio-track');
    if (!dot || !trackButton) return false;
    dot.setAttribute('role','button');
    dot.setAttribute('tabindex','0');
    dot.setAttribute('aria-label','Check for a hidden frequency');
    dot.title = 'Check for a hidden frequency';
    dot.style.cursor = 'pointer';
    const node = document.createElement('section');
    node.id = 'dm-vault-panel';
    node.className = 'dm-vault-panel';
    node.setAttribute('aria-label','District Mind Vault');
    node.setAttribute('aria-hidden','true');
    node.innerHTML = [
      '<div class="dm-vault-top"><div><p class="dm-vault-kicker">DISTRICT MIND / PRIVATE LISTENING ROOM</p><h2>District Mind Vault</h2></div><button type="button" class="dm-vault-close" aria-label="Close vault">Close</button></div>',
      '<p class="dm-vault-copy">Two unreleased sessions, kept separate from the regular radio rotation. Find each signal to unlock its listening room.</p>',
      '<div class="dm-vault-track" data-vault-track="fuma"><div><strong>Sealed Session 01</strong><small>Hidden Frequency</small></div><button type="button" disabled>Locked</button></div>',
      '<div class="dm-vault-track" data-vault-track="tropical"><div><strong>Sealed Session 02</strong><small>Lost Session</small></div><button type="button" disabled>Locked</button></div>',
      '<audio class="dm-vault-audio" controls preload="none"></audio>',
      '<p class="dm-vault-status" role="status" aria-live="polite">The vault is waiting for both signals.</p>',
      '<p class="dm-vault-hint">The hidden sessions never enter District Mind Radio\'s regular rotation.</p>'
    ].join('');
    document.body.appendChild(node);
    panel = node;
    status = node.querySelector('.dm-vault-status');
    audio = node.querySelector('.dm-vault-audio');
    heading = node.querySelector('h2');
    const open = () => { panel.classList.add('is-open'); panel.setAttribute('aria-hidden','false'); };
    const close = () => { panel.classList.remove('is-open'); panel.setAttribute('aria-hidden','true'); audio.pause(); };
    node.querySelector('.dm-vault-close').addEventListener('click', close);
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && panel.classList.contains('is-open')) close(); });

    function unlock(key) {
      if (unlocked.has(key)) {
        open();
        status.textContent = tracks[key].title + ' is already unlocked. Select Listen to open the session.';
        return;
      }
      unlocked.add(key);
      const row = panel.querySelector('[data-vault-track="' + key + '"]');
      const button = row.querySelector('button');
      row.querySelector('strong').textContent = tracks[key].title;
      row.querySelector('small').textContent = tracks[key].clue;
      button.disabled = false;
      button.textContent = 'Listen';
      button.setAttribute('aria-label','Listen to ' + tracks[key].title);
      button.addEventListener('click', () => {
        audio.pause();
        audio.src = tracks[key].src;
        audio.classList.add('is-visible');
        audio.load();
        heading.textContent = tracks[key].title;
        status.textContent = 'Unlocked. Press play to listen.';
        audio.play().then(() => {
          status.textContent = 'Now playing ' + tracks[key].title + '.';
        }).catch(() => {
          status.textContent = 'This session is unlocked, but its audio file is not available yet. The vault player is ready for the approved master.';
        });
      });
      open();
      status.textContent = tracks[key].title + ' unlocked. The session is now available in the vault.';
    }

    let dotTaps = [];
    const tapDot = () => {
      const now = Date.now();
      dotTaps = dotTaps.filter(time => now - time < 2600);
      dotTaps.push(now);
      if (dotTaps.length >= 5) { dotTaps = []; unlock('fuma'); }
    };
    dot.addEventListener('click', tapDot);
    dot.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); tapDot(); }
    });

    let labelTaps = [];
    trackButton.addEventListener('click', event => {
      const now = Date.now();
      labelTaps = labelTaps.filter(time => now - time < 3200);
      labelTaps.push(now);
      if (labelTaps.length >= 7) {
        labelTaps = [];
        event.preventDefault();
        event.stopImmediatePropagation();
        unlock('tropical');
      }
    }, true);

    const polish = document.createElement('style');
    polish.id = 'dm-global-control-polish';
    polish.textContent = 'button,input[type="button"],input[type="submit"],.hero-button,.submit-btn,.streaming-link,.dm-guide-trigger,.dm-theme-trigger,.dm-audio-toggle{-webkit-tap-highlight-color:transparent;transition:background-color .16s ease,color .16s ease,border-color .16s ease!important}button:active,input[type="button"]:active,input[type="submit"]:active,.hero-button:active,.submit-btn:active,.streaming-link:active,.dm-guide-trigger:active,.dm-theme-trigger:active,.dm-audio-toggle:active{background-color:#277d49!important;color:#fff!important;border-color:#277d49!important;transform:none!important;box-shadow:none!important}button:hover:not(:disabled),input[type="button"]:hover,input[type="submit"]:hover,.hero-button:hover,.submit-btn:hover,.streaming-link:hover,.dm-guide-trigger:hover,.dm-theme-trigger:hover,.dm-audio-toggle:hover{transform:none!important;box-shadow:none!important}';
    document.head.appendChild(polish);
    return true;
  }
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (mount() || attempts >= 30) window.clearInterval(timer);
  }, 250);
})();