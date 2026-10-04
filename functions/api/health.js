export async function onRequestGet() {
  return Response.json({
    ok: true,
    service: "District Mind Media News Desk",
    mode: "live multi-source",
    timestamp: new Date().toISOString(),
    bots: [
      "News Scout",
      "Release Scout",
      "Culture Scout",
      "Source Ranker",
      "Duplicate Filter",
      "Editorial QA"
    ],
    sources: ["TMZ Music", "HipHopDX", "AllHipHop", "No Jumper", "Google News discovery"]
  }, { headers: { "Cache-Control": "no-store" } });
}
