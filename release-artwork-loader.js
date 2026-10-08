async function loadReleaseArtwork(){
  const cards=[...document.querySelectorAll('[data-release-artist][data-release-title]')];
  await Promise.all(cards.map(async card=>{
    try{
      const q=new URLSearchParams({artist:card.dataset.releaseArtist,title:card.dataset.releaseTitle});
      const r=await fetch('/api/release-art?'+q.toString());
      if(!r.ok)return;
      const d=await r.json();
      const match=d?.match;
      const sameArtist=match&&String(match.artist||'').toLowerCase().trim()===String(card.dataset.releaseArtist||'').toLowerCase().trim();
      const requested=String(card.dataset.releaseTitle||'').toLowerCase().trim();
      const matchedTitle=String(match?.title||match?.album||'').toLowerCase().trim();
      const sameTitle=match&&matchedTitle===requested;
      if(!d?.artwork||!d?.verified||!sameArtist||!sameTitle)return;
      const safeImage=String(d.artwork).replace(/["']/g,'');
      card.style.setProperty('background-image','linear-gradient(180deg,rgba(17,17,17,.02),rgba(17,17,17,.38)),url("'+safeImage+'")','important');
      card.classList.add('has-release-art');
      card.classList.remove('release-text-card','photo-pending');
      card.setAttribute('aria-label',card.dataset.releaseTitle+' by '+card.dataset.releaseArtist);
      const label=card.querySelector('span');if(label)label.style.opacity='.0';
    }catch{}
  }));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadReleaseArtwork);else loadReleaseArtwork();
