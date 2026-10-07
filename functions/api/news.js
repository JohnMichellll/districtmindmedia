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

function clean(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[/gi, "")
    .replace(/\]\]>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}

function tag(block, name) {
  const safe = name.replace(/[:]/g, "\\:");
  const match = block.match(new RegExp("<" + safe + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + safe + ">", "i"));
  return match ? clean(match[1]) : "";
}

function attr(block, tagName, attrName) {
  const match = block.match(new RegExp("<" + tagName.replace(":","\\:") + "\\b[^>]*\\b" + attrName + '=["\\\']([^"\\\']+)["\\\']', "i"));
  return match ? match[1] : "";
}

function image(block) {
  return attr(block,"enclosure","url") ||
    attr(block,"media:content","url") ||
    attr(block,"media:thumbnail","url") ||
    ((block.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] || "");
}

function score(item, weight = 1) {
  const text = (item.title + " " + item.description).toLowerCase();
  if (BLOCKED.some(word => text.includes(word))) return -100;
  const priority = ["breaking","drama","beef","feud","response","responds","controversy","statement","apology","viral","trending","spotted","wearing","outfit","style","crocs","shoes","hip hop","hip-hop","rap","r&b","artist","tour","concert","mixtape","music video","interview","culture","release","album","single","new music"];
  return weight + priority.reduce((n, word) => n + (text.includes(word) ? 1 : 0), 0);
}

const extractBlocks = xml => [
  ...xml.split(/<item\b/i).slice(1).map(part => part.split(/<\/item>/i)[0]),
  ...xml.split(/<entry\b/i).slice(1).map(part => part.split(/<\/entry>/i)[0])
].filter(Boolean);

async function fetchXmlSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(source.url, {
      headers: { "User-Agent": "DistrictMindMedia/1.0" },
      signal: controller.signal
    });
    if (!response.ok) return [];
    const xml = await response.text();
    const blocks = extractBlocks(xml);
    return blocks.slice(0,25).map(block => {
      const item = {
        title: tag(block,"title"),
        link: tag(block,"link") || attr(block,"link","href"),
        pubDate: tag(block,"pubDate") || tag(block,"dc:date") || tag(block,"published") || tag(block,"updated") || new Date().toUTCString(),
        description: tag(block,"description") || tag(block,"content:encoded") || tag(block,"summary"),
        image: image(block),
        source: source.name
      };
      return { ...item, score: score(item, source.weight) };
    }).filter(item => item.title && item.link);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchGoogle(googleWindow, localQuery = "") {
  const queries = localQuery ? [
    `concert OR tour OR live music ${localQuery}`,
    `hip-hop OR rap OR R&B artist ${localQuery}`,
    `music culture OR artist spotted OR artist wearing ${localQuery}`,
    `music festival OR concert lineup ${localQuery}`
  ] : BASE_GOOGLE_QUERIES;
  const parts = await Promise.all(queries.map(async query => {
    try {
      const url = "https://news.google.com/rss/search?q=" + encodeURIComponent(query + " when:" + googleWindow + "d") + "&hl=en-US&gl=US&ceid=US:en";
      const response = await fetch(url, { headers: { "User-Agent": "DistrictMindMedia/1.0" } });
      if (!response.ok) return [];
      const xml = await response.text();
      const blocks = extractBlocks(xml);
      return blocks.map(block => {
        const item = {
          title: tag(block,"title"),
          link: tag(block,"link") || attr(block,"link","href"),
          pubDate: tag(block,"pubDate") || tag(block,"published") || tag(block,"updated"),
          description: tag(block,"description") || tag(block,"summary"),
          image: image(block),
          source: "Google News / reported source"
        };
        return { ...item, score: score(item, 0.8) };
      }).filter(item => item.title && item.link);
    } catch {
      return [];
    }
  }));
  return parts.flat();
}

export async function onRequestGet({ request }) {
  const requestUrl = new URL(request.url);
  const mode = requestUrl.searchParams.get("mode") || "latest";
  const local = String(requestUrl.searchParams.get("local") || "").trim();
  const hours = mode === "archive"
    ? 168
    : Math.min(Math.max(Number(requestUrl.searchParams.get("hours") || (local ? 168 : 24)), 24), 168);
  const limit = Math.min(Math.max(Number(requestUrl.searchParams.get("limit") || 36), 12), 60);
  const googleWindow = Math.min(7, Math.ceil(hours / 24));
  const [direct, google] = await Promise.all([
    Promise.all(SOURCES.map(fetchXmlSource)).then(parts => parts.flat()),
    fetchGoogle(googleWindow, local ? `in ${local}` : "")
  ]);

  const seen = new Set();
  const localNeedle = local.toLowerCase();
  const items = [...(local ? [] : direct), ...google]
    .filter(item => item.title && item.link && item.score > -50)
    .filter(item => {
      if (!local) return true;
      const haystack = (item.title + " " + item.description + " " + item.source).toLowerCase();
      return haystack.includes(localNeedle);
    })
    .sort((a,b) => b.score - a.score || new Date(b.pubDate) - new Date(a.pubDate))
    .filter(item => {
      const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .filter(item => { const t = new Date(item.pubDate).getTime(); return !Number.isNaN(t) && (Date.now() - t) <= hours * 3600000; })
    .slice(0,limit);

  const esc = (value = "") => String(value)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&apos;");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>District Mind Media — Live News Desk</title>
<link>https://district-mind-media.pages.dev/</link>
<description>Live hip-hop, R&amp;B, new music, culture and location-aware headlines curated by the District Mind newsroom.</description>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items.map(item => `<item>
<title>${esc(item.title)}</title>
<link>${esc(item.link)}</link>
<guid isPermaLink="false">${esc(item.link)}</guid>
<pubDate>${esc(new Date(item.pubDate).toUTCString())}</pubDate>
<description>${esc((item.description || "").slice(0,600))}</description>
<category>${esc(item.source)}</category>
${item.image ? `<enclosure url="${esc(item.image)}" type="image/jpeg"/>` : ""}
</item>`).join("\n")}
</channel></rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type":"application/rss+xml; charset=UTF-8",
      "Cache-Control":"public, max-age=60, s-maxage=60"
    }
  });
}
