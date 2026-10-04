export async function onRequestGet(context) {
  const rss = "https://news.google.com/rss/search?q=music%20OR%20hip-hop%20OR%20R%26B%20when%3A1d&hl=en-US&gl=US&ceid=US%3Aen";
  try {
    const response = await fetch(rss, {
      headers: { "User-Agent": "DistrictMindMedia/1.0" },
      cf: { cacheTtl: 300, cacheEverything: true }
    });
    if (!response.ok) {
      return new Response("News feed unavailable", { status: 502 });
    }
    const body = await response.text();
    return new Response(body, {
      headers: {
        "Content-Type": "application/rss+xml; charset=UTF-8",
        "Cache-Control": "public, max-age=300"
      }
    });
  } catch (error) {
    return new Response("News feed unavailable", { status: 502 });
  }
}
