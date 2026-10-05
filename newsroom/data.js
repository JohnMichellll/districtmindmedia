// District Mind editorial operating model.
// Sources are intelligence inputs; District Mind publishes original reporting/summaries,
// with clear attribution and links back to the reporting source.
// This file is intentionally provider-neutral so future AI/editor providers can plug in.

export const EDITORIAL_PIPELINE = {
  scouts: [
    { id:"breaking", label:"Breaking News Scout", focus:["hip-hop","rap","R&B","music"] },
    { id:"release", label:"New Music Friday Scout", focus:["album","single","EP","mixtape","release"] },
    { id:"culture", label:"Culture Scout", focus:["interviews","tours","live music","internet culture"] },
    { id:"colorado", label:"Colorado Scout", focus:["Denver","Colorado Springs","Front Range","Colorado music"] }
  ],
  processing: ["Source Ranker","Duplicate Filter","Editorial QA","SEO/QC"],
  publishing: ["Permanent Article Page","Newsroom","Homepage","Section Pages","RSS","Sitemap"]
};

export const SOURCE_RULES = {
  tmz: "Use as a source for reported entertainment news; do not republish its article text or imply ownership of its photography.",
  noJumper: "Use as a source for hip-hop interviews, conversations and culture; link to the source when referenced.",
  hiphopdx: "Use as a source for music news, releases and artist reporting.",
  allhiphop: "Use as a source for hip-hop news and culture.",
  googleNews: "Discovery layer only; verify the originating report before publishing."
};

export const AI_PROVIDER_ADAPTERS = {
  chatgpt: { enabled:false, note:"Adapter-ready; no external API key is assumed." },
  grok: { enabled:false, note:"Adapter-ready; no external API key is assumed." },
  copilot: { enabled:false, note:"Adapter-ready; no external API key is assumed." }
};

export function normalizeStory(story) {
  return {
    title: String(story.title || "").trim(),
    source: String(story.source || "").trim(),
    sourceUrl: String(story.sourceUrl || story.link || "").trim(),
    publishedAt: story.publishedAt || story.pubDate || new Date().toISOString(),
    category: String(story.category || "NEWS").trim(),
    image: String(story.image || "").trim(),
    status: "scouted"
  };
}
