const SOURCES = [
  { name: "HipHopDX", url: "https://hiphopdx.com/rss/news.xml", weight: 1.25 },
  { name: "AllHipHop", url: "https://allhiphop.com/feed", weight: 1.2 },
  { name: "Billboard", url: "https://www.billboard.com/feed/", weight: 1.15 },
  { name: "Pitchfork", url: "https://pitchfork.com/feed/feed-news/rss", weight: 1.1 },
  { name: "Rolling Stone — Music", url: "https://www.rollingstone.com/music/music-news/feed/", weight: 1.1 },
  { name: "Variety — Music", url: "https://variety.com/v/music/feed/", weight: 1.05 },
  { name: "TMZ Music", url: "https://www.tmz.com/rss.xml", weight: 1.0 },
  { name: "No Jumper", url: "https://feeds.megaphone.fm/NJP4856622419", weight: 0.95 }
];
const BASE_GOOGLE_QUERIES = [
  "hip-hop OR rap OR rapper",
  "R&B OR soul OR singer",
  "hip-hop drama OR rapper beef OR artist responds OR artist controversy",
  "music culture OR viral artist OR celebrity music",
  "rapper outfit viral OR artist spotted OR artist wearing OR celebrity style",
  "new music OR album OR single",
  "concert OR tour OR live music"
];
const BLOCKED = ["casino","betting","odds","coupon","lottery","horoscope"];
const LAUNCH_MUSIC_TERMS = ["music","album","single","song","tour","concert","rapper","singer","r&b","hip-hop","hip hop","producer","festival","grammy","chart","billboard","release","mixtape","ep","record label","music video","dj","discography","track","live performance","new music","studio","vocal","beat"];
const LAUNCH_ARTIST_NAMES = ["drake","kendrick lamar","beyonce","taylor swift","john michell","chief keef","travis scott","doja cat","ray charles","louis armstrong","future","sza","j. cole","tyler the creator","lil wayne","playboi carti","bad bunny","metro boomin","earl sweatshirt","victoria monet","jpegmafia","quavo","dawn richard","danielle ponder","nicki minaj","cardi b","rihanna","the weeknd","21 savage","lil baby","megan thee stallion","ice spice"];
const LAUNCH_BLOCK_TERMS = ["politics","election","trump","zelensky","war","murder","killed","mauled","zoo","formula 1","nfl","nba"];
const escapeRegex = value => String(value).replace(/[|\\{}()[\]^$+*?.-]/g, "\\$&");
const hasTerm = (text, terms) => terms.some(term => new RegExp("\\b" + escapeRegex(term) + "\\b", "i").test(text));
function launchMusicRelevant(item) {
  const title = String(item.title || "");
  const evidence = title + " " + String(item.description || "").slice(0, 200);
  const knownArtistInTitle = hasTerm(title, LAUNCH_ARTIST_NAMES);
  if (hasTerm(evidence, LAUNCH_BLOCK_TERMS) && !knownArtistInTitle) return false;
  return hasTerm(evidence, LAUNCH_MUSIC_TERMS) || knownArtistInTitle;
}
function clean(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[/gi, "")
    .replace(/\]\]>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(Number(n)); } catch { return " "; } })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return " "; } })
    .replace(/&nbsp;/gi, "\u00a0")
    .replace(/&rsquo;/gi, "’").replace(/&lsquo;/gi, "‘")
    .replace(/&ldquo;/gi, "“").replace(/&rdquo;/gi, "”")
    .replace(/&ndash;/gi, "–").replace(/&mdash;/gi, "—").replace(/&hellip;/gi, "…")
    .replace(/&quot;/gi, '"').replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ").trim();
}
function tag(block, name) {
  const safe = name.replace(/[:]/g, "\\:");
  const match = block.match(new RegExp("<" + safe + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + safe + ">", "i"));
  return match ? clean(match[1]) : "";
}
function attr(block, tagName, attrName) {
  const match = block.match(new RegExp("<" + tagName.replace(":","\\:") + "\\b[^>]*\\b" + attrName + '=["\\']([^"\\']+)["\\']', "i"));
  return match ? match[1] : "";
}
function image(block) {
  return attr(block,"enclosure","url") || attr(block,"media:content","url") || attr(block,"media:thumbnail","url") || ((block.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || "");
}
function score(item, weight = 1) {
  const text = (item.title + " " + item.description).toLowerCase();
  if (hasTerm(text, BLOCKED)) return -100;
  const priority = ["breaking","drama","beef","feud","response","responds","controversy","statement","apology","viral","trending","spotted","wearing","outfit","style","hip hop","hip-hop","rap","r&b","artist","tour","concert","mixtape","music video","interview","culture","release","album","single","new music"];
  return weight + priority.reduce((n, word) => n + (hasTerm(text, [word]) ? 1 : 0), 0);
}
const extractBlocks = xml => [
  ...xml.split(/<item\b/i).slice(1).map(part => part.split(/<\/item>/i)[0]),
  ...xml.split(/<entry\b/i).slice(1).map(part => part.split(/<\/entry>/i)[0])
].filter(Boolean);
async function fetchXmlSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(source.url, { headers: { "User-Agent": "DistrictMindMedia/1.0" }, signal: controller.signal });
    if (!response.ok) return [];
    const xml = await response.text();
    return extractBlocks(xml).slice(0,25).map(block => {
      const item = { title: tag(block,"title"), link: tag(block,"link") || attr(block,"link","href"), pubDate: tag(block,"pubDate") || tag(block,"dc:date") || tag(block,"published") || tag(block,"updated"), description: tag(block,"description") || tag(block,"content:encoded") || tag(block,"summary"), image: image(block), source: source.name };
      return { ...item, score: score(item, source.weight) };
    }).filter(item => item.title && item.link);
  } catch { return []; } finally { clearTimeout(timeout); }
}
async function fetchGoogle(googleWindow, localQuery = "") {
  const city = String(localQuery || "").split(",")[0].trim();
  const queries = localQuery ? [
    '"' + city + '" music OR "' + city + '" concert',
    '"' + city + '" live music',
    '"' + city + '" concert lineup OR festival',
    '"' + localQuery + '" music events'
  ] : BASE_GOOGLE_QUERIES;
  const settled = await Promise.allSettled(queries.map(async query => {
    try {
      const url = "https://news.google.com/rss/search?q=" + encodeURIComponent(query + " when:" + googleWindow + "d") + "&hl=en-US&gl=US&ceid=US:en";
      const response = await fetch(url, { headers: { "User-Agent": "DistrictMindMedia/1.0" }, signal: AbortSignal.timeout(4000) });
      if (!response.ok) return [];
      const xml = await response.text();
      return extractBlocks(xml).map(block => {
        const item = { title: tag(block,"title"), link: tag(block,"link") || attr(block,"link","href"), pubDate: tag(block,"pubDate") || tag(block,"published") || tag(block,"updated"), description: tag(block,"description") || tag(block,"summary"), image: image(block), source: "Google News / reported source" };
        return { ...item, score: score(item, 0.8) };
      }).filter(item => item.title && item.link);
    } catch { return []; }
  }));
  return settled.flatMap(result => result.status === "fulfilled" ? result.value : []);
}
async function buildNewsResponse(requestUrl) {
  const mode = requestUrl.searchParams.get("mode") || "latest";
  let local = String(requestUrl.searchParams.get("local") || "").trim();
  let localState = "", localStateCode = "";
  if (/^\d{5}$/.test(local)) {
    try {
      const z = await fetch("https://api.zippopotam.us/us/" + local, { signal: AbortSignal.timeout(4000) });
      if (z.ok) {
        const data = await z.json(), place = data.places?.[0];
        if (place) { local = place["place name"] || local; localState = place.state || ""; localStateCode = place["state abbreviation"] || ""; }
      }
    } catch {}
  }
  const hours = mode === "archive" ? 168 : Math.min(Math.max(Number(requestUrl.searchParams.get("hours") || (local ? 168 : 24)), 24), 168);
  const limit = Math.min(Math.max(Number(requestUrl.searchParams.get("limit") || 36), 12), 60);
  const googleWindow = Math.min(7, Math.ceil(hours / 24));
  const directPromise = Promise.allSettled(SOURCES.map(fetchXmlSource)).then(results => results.flatMap(r => r.status === "fulfilled" ? r.value : []));
  const googlePromise = fetchGoogle(googleWindow, local ? [local, localStateCode].filter(Boolean).join(", ") : "");
  const settled = await Promise.allSettled([directPromise, googlePromise]);
  const direct = settled[0].status === "fulfilled" ? settled[0].value : [];
  const google = settled[1].status === "fulfilled" ? settled[1].value : [];
  const seen = new Set();
  const localWords = [local, localState, localStateCode].filter(Boolean).map(x => String(x).toLowerCase());
  const items = [...(local ? [] : direct), ...google]
    .filter(item => item.title && item.link && item.score > -50)
    .filter(launchMusicRelevant)
    .filter(item => {
      if (!local) return true;
      const haystack = (item.title + " " + item.description).toLowerCase();
      return localWords.some(word => new RegExp("\\b" + escapeRegex(word) + "\\b", "i").test(haystack));
    })
    .sort((a,b) => b.score - a.score || new Date(b.pubDate) - new Date(a.pubDate))
    .filter(item => { const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g," ").trim(); if (seen.has(key)) return false; seen.add(key); return true; })
    .filter(item => { const t = new Date(item.pubDate).getTime(); return !Number.isNaN(t) && (Date.now() - t) <= hours * 3600000; })
    .slice(0,limit);
  const esc = (value = "") => String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n<title>District Mind Media — Live News Desk</title>\n<link>https://district-mind-media.pages.dev/</link>\n<description>Live hip-hop, R&amp;B, new music, culture and location-aware headlines curated by the District Mind newsroom.</description>\n<lastBuildDate>' + new Date().toUTCString() + '</lastBuildDate>\n' +
    items.map(item => '<item>\n<title>' + esc(item.title) + '</title>\n<link>' + esc(item.link) + '</link>\n<guid isPermaLink="false">' + esc(item.link) + '</guid>\n<pubDate>' + esc(new Date(item.pubDate).toUTCString()) + '</pubDate>\n<description>' + esc((item.description || "").slice(0,600)) + '</description>\n<category>' + esc(item.source) + '</category>\n' + (item.image ? '<enclosure url="' + esc(item.image) + '" type="image/jpeg"/>' : "") + '\n</item>').join("\n") +
    '\n</channel></rss>';
  return new Response(xml, { headers: { "Content-Type":"application/rss+xml; charset=UTF-8", "Cache-Control":"public, max-age=600, s-maxage=600, stale-while-revalidate=1800" } });
}
export async function onRequestGet({ request, context }) {
  const requestUrl = new URL(request.url);
  const params = [...requestUrl.searchParams.entries()].sort(([a],[b]) => a.localeCompare(b));
  const normalizedQuery = new URLSearchParams(params).toString();
  const cacheKey = new Request(requestUrl.origin + "/__districtmind_cache/news?" + normalizedQuery, { method: "GET" });
  const cache = caches.default;
  const now = Date.now();
  if (cache) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) {
        const storedAt = Number(cached.headers.get("x-dm-stored-at") || 0);
        const age = storedAt ? now - storedAt : Infinity;
        if (age < 600000) return cached;
        if (age < 1800000 && context?.waitUntil) {
          context.waitUntil(buildNewsResponse(new URL(requestUrl.toString())).then(async response => {
            const body = await response.text();
            await cache.put(cacheKey, new Response(body, { status: response.status, headers: { "Content-Type":"application/rss+xml; charset=UTF-8", "Cache-Control":"public, max-age=1800", "x-dm-stored-at":String(Date.now()) } }));
          }).catch(error => console.warn("News cache refresh failed", String(error))));
          return cached;
        }
      }
    } catch (error) { console.warn("News cache read failed", String(error)); }
  }
  const response = await buildNewsResponse(requestUrl);
  if (cache && response.ok) {
    try {
      const body = await response.clone().text();
      const saved = new Response(body, { status: response.status, headers: { "Content-Type":"application/rss+xml; charset=UTF-8", "Cache-Control":"public, max-age=1800", "x-dm-stored-at":String(Date.now()) } });
      if (context?.waitUntil) context.waitUntil(cache.put(cacheKey, saved)); else await cache.put(cacheKey, saved);
    } catch (error) { console.warn("News cache write failed", String(error)); }
  }
  return response;
}
