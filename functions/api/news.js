function textOf(item, tag) {
  const m = item.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">"));
  return m ? m[1].replace(/<!\\[CDATA\\[|\\]\\]>/g, "").trim() : "";
}

function decode(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

export async function onRequestGet(context) {
  const queries = [
    "hip-hop OR rap OR rapper",
    "R&B OR soul OR singer",
    "new music OR album OR single",
    "Colorado music OR Denver music OR Denver concerts"
  ];

  try {
    const feeds = await Promise.all(queries.map(async (query) => {
      const url = "https://news.google.com/rss/search?q=" + encodeURIComponent(query + " when:1d") + "&hl=en-US&gl=US&ceid=US:en";
      const response = await fetch(url, {
        headers: { "User-Agent": "DistrictMindMedia/1.0" },
        cf: { cacheTtl: 300, cacheEverything: true }
      });
      if (!response.ok) return "";
      return response.text();
    }));

    const items = feeds.flatMap(xml => {
      const matches = xml.match(/<item>[\\s\\S]*?<\\/item>/g) || [];
      return matches.map(item => ({
        title: decode(textOf(item, "title")),
        link: decode(textOf(item, "link")),
        pubDate: textOf(item, "pubDate"),
        description: decode(textOf(item, "description"))
      }));
    });

    const seen = new Set();
    const clean = items
      .filter(item => item.title && item.link)
      .filter(item => {
        const key = item.title.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, 12);

    const xml = '<?xml version="1.0" encoding="UTF-8"?>' +
      '<rss version="2.0"><channel>' +
      '<title>District Mind Media — Live Music Desk</title>' +
      '<link>https://district-mind-media.pages.dev/</link>' +
      '<description>Fresh hip-hop, R&B, music and Colorado culture headlines.</description>' +
      clean.map(item =>
        '<item><title><![CDATA[' + item.title + ']]></title>' +
        '<link>' + item.link + '</link>' +
        '<pubDate>' + item.pubDate + '</pubDate>' +
        '<description><![CDATA[' + item.description + ']]></description></item>'
      ).join("") +
      '</channel></rss>';

    return new Response(xml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=UTF-8",
        "Cache-Control": "public, max-age=300"
      }
    });
  } catch (error) {
    return new Response("News feed unavailable", { status: 502 });
  }
}
