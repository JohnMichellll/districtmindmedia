const SOURCES = [
  { name: "TMZ Music", url: "https://www.tmz.com/rss.xml", weight: 1.25 },
  { name: "HipHopDX", url: "https://hiphopdx.com/rss/news.xml", weight: 1.2 },
  { name: "AllHipHop", url: "https://allhiphop.com/feed", weight: 1.1 },
  { name: "No Jumper", url: "https://feeds.megaphone.fm/NJP4856622419", weight: 1.0 }
];

const GOOGLE_QUERIES = [
  "hip-hop OR rap OR rapper",
  "R&B OR soul OR singer",
  "new music OR album OR single",
  "Colorado music OR Denver music OR Denver concerts"
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
  const priority = ["new music","album","single","release","hip hop","hip-hop","rap","r&b","artist","tour","concert","mixtape","music video","interview","culture"];
  return weight + priority.reduce((n, word) => n + (text.includes(word) ? 1 : 0), 0);
}

async function fetchXmlSource(source) {
  try {
    const response = await fetch(source.url, { headers: { "User-Agent": "DistrictMindMedia/1.0" } });
    if (!response.ok) return [];
    const xml = await response.text();
    const blocks = [...xml.matchAll(/<(item|entry)\\b[^>]*>([\\s\\S]*?)<\\/\\1>/gi)].map(m => m[0]);
    return blocks.slice(0,25).map(block => {
      const item = {
        title: tag(block,"title"),
        link: tag(block,"link") || attr(block,"link","href"),
        pubDate: tag(block,"pubDate") || tag(block,"dc:date") || new Date().toUTCString(),
        description: tag(block,"description") || tag(block,"content:encoded"),
        image: image(block),
        source: source.name
      };
      return { ...item, score: score(item, source.weight) };
    }).filter(item => item.title && item.link);
  } catch {
    return [];
  }
}

async function fetchGoogle() {
  const parts = await Promise.all(GOOGLE_QUERIES.map(async query => {
    try {
      const url = "https://news.google.com/rss/search?q=" + encodeURIComponent(query + " when:1d") + "&hl=en-US&gl=US&ceid=US:en";
      const response = await fetch(url, { headers: { "User-Agent": "DistrictMindMedia/1.0" } });
      if (!response.ok) return [];
      const xml = await response.text();
      const blocks = [...xml.matchAll(/<(item|entry)\\b[^>]*>([\\s\\S]*?)<\\/\\1>/gi)].map(m => m[0]);
      return blocks.map(block => {
        const item = {
          title: tag(block,"title"),
          link: tag(block,"link"),
          pubDate: tag(block,"pubDate"),
          description: tag(block,"description"),
          image: image(block),
          source: "Google News / reported source"
        };
        return { ...item, score: score(item, 0.8) };
      });
    } catch {
      return [];
    }
  }));
  return parts.flat();
}

export async function onRequestGet() {
  const [direct, google] = await Promise.all([
    Promise.all(SOURCES.map(fetchXmlSource)).then(parts => parts.flat()),
    fetchGoogle()
  ]);

  const seen = new Set();
  const items = [...direct, ...google]
    .filter(item => item.title && item.link && item.score > -50)
    .sort((a,b) => b.score - a.score || new Date(b.pubDate) - new Date(a.pubDate))
    .filter(item => {
      const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0,18);

  const esc = (value = "") => String(value)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&apos;");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>District Mind Media — Live News Desk</title>
<link>https://district-mind-media.pages.dev/</link>
<description>Live hip-hop, R&amp;B, new music and culture headlines curated by the District Mind newsroom.</description>
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
      "Cache-Control":"public, max-age=300, s-maxage=300"
    }
  });
}
