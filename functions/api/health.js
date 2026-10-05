export async function onRequestGet() {
  return Response.json({
    ok: true,
    service: "District Mind Media News Desk",
    mode: "live multi-source",
    timestamp: new Date().toISOString(),
    deploymentTarget: "Cloudflare Pages",
    productionUrl: "https://district-mind-media.pages.dev/",
    bots: [
      "News Scout",
      "Release Scout",
      "Culture Scout",
      "Source Ranker",
      "Duplicate Filter",
      "Editorial QA"
    ],
    sources: [
      "HipHopDX",
      "AllHipHop",
      "Billboard",
      "Pitchfork",
      "Rolling Stone — Music",
      "Variety — Music",
      "TMZ Music",
      "No Jumper",
      "Google News discovery"
    ]
  }, { headers: { "Cache-Control": "no-store" } });
}