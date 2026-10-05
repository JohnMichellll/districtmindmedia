import { EDITORIAL_PIPELINE, normalizeStory } from "../../newsroom/data.js";

export async function onRequestGet() {
  return Response.json({
    ok: true,
    service: "District Mind Media News Desk",
    pipeline: EDITORIAL_PIPELINE,
    generatedAt: new Date().toISOString(),
    note: "Live sources are scouting inputs. Original District Mind stories should be published as permanent article pages."
  }, { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } });
}
