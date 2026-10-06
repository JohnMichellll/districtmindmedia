/* District Mind editorial polish: presentation layer only. */
(() => {
  const sourceNames = ['Billboard','HipHopDX','AllHipHop','Rolling Stone','Pitchfork','Variety','TMZ','No Jumper','Complex','XXL','VIBE','HotNewHipHop'];
  const decodeEntities = value => { const area=document.createElement('textarea'); area.innerHTML=String(value ?? ''); return area.value; };
  const polishHeadline = value => {
    let s=decodeEntities(value).replace(/\s+/g,' ').trim();
    const sourcePattern=new RegExp('\\s+(?:[-–—|:]\\s*)?(?:'+sourceNames.join('|')+')\\s*$','i');
    s=s.replace(sourcePattern,'');
    s=s.replace(/^\s*(?:BREAKING|EXCLUSIVE|JUST IN)\s*[:|]\s*/i,'');
    s=s.replace(/\s*[–—]\s*/g,': ');
    s=s.replace(/\s+-\s+/g,': ');
    s=s.replace(/\s*:\s*:\s*/g,': ');
    return s.replace(/[\s:|]+$/,'').replace(/\s+/g,' ').trim();
  };
  const polishDeck = value => decodeEntities(value).replace(/\s+/g,' ').replace(/\s*[–—]\s*/g,', ').replace(/\s+-\s+/g,', ').replace(/\s+/g,' ').trim();
  window.DistrictMindEditorial={polishHeadline,polishDeck};
})();
