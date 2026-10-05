export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (q.length < 2) return Response.json({ ok: false, error: "Search for an artist by name." }, { status: 400 });
  try {
    const api = "https://itunes.apple.com/search?term=" + encodeURIComponent(q) + "&entity=song&attribute=artistTerm&limit=50&country=US";
    const r = await fetch(api);
    if (!r.ok) throw new Error("catalog");
    const data = await r.json();
    let news = [];
    try {
      const nr = await fetch("https://news.google.com/rss/search?q=" + encodeURIComponent('"' + q + '" music') + "&hl=en-US&gl=US&ceid=US:en");
      if (nr.ok) {
        const xml = await nr.text();
        news = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,8).map(m => {
          const block=m[1], pick=k => (block.match(new RegExp("<"+k+">([\\s\\S]*?)<\/"+k+">"))||[])[1] || "";
          return { title: pick("title").replace(/<!\[CDATA\[|\]\]>/g,""), link: pick("link"), pubDate: pick("pubDate") };
        }).filter(x=>x.title);
      }
    } catch {}
    const rows = Array.isArray(data.results) ? data.results : [];
    const artists = [];
    const seen = new Set();
    for (const x of rows) {
      const name = (x.artistName || "").trim();
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      const songs = rows.filter(y => (y.artistName || "").toLowerCase() === name.toLowerCase()).slice(0, 12).map(y => ({
        trackName: y.trackName || "",
        collectionName: y.collectionName || "",
        releaseDate: y.releaseDate || null,
        artworkUrl: y.artworkUrl100 ? y.artworkUrl100.replace("100x100", "600x600") : null,
        trackViewUrl: y.trackViewUrl || null
      }));
      artists.push({
        artistName: name,
        artistId: x.artistId || null,
        artistViewUrl: x.artistViewUrl || null,
        primaryGenreName: x.primaryGenreName || "",
        artworkUrl: songs[0]?.artworkUrl || null,
        songs
      });
    }
    return Response.json({ ok: true, query: q, source: "Apple/iTunes Search API + Google News", generatedAt: new Date().toISOString(), artists, news }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } });
  } catch {
    return Response.json({ ok: false, error: "Artist search is temporarily unavailable." }, { status: 502 });
  }
}