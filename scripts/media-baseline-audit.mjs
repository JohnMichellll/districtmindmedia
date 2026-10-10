import fs from "node:fs/promises";

const BASE = process.env.SITE_URL || "https://district-mind-media.pages.dev";
const results = [];
const add = (name, status, detail) => results.push({ name, status, detail });

let manifest;
try {
  manifest = JSON.parse(await fs.readFile("assets/photo-manifest.json", "utf8"));
  add("photo manifest parses", "PASS", "Valid JSON");
} catch (error) {
  add("photo manifest parses", "FAIL", error.message);
}

if (manifest) {
  const photos = Object.entries(manifest.photos || {});
  add("manifest has records", photos.length ? "PASS" : "FAIL", `${photos.length} records`);
  for (const [key, asset] of photos) {
    if (!asset.url) {
      add(`asset URL: ${key}`, "WARN", "URL is empty");
      continue;
    }
    try {
      const url = new URL(asset.url);
      if (!["https:", "http:"].includes(url.protocol)) {
        add(`asset URL: ${key}`, "FAIL", "Unsupported URL protocol");
        continue;
      }
      const response = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0", "User-Agent": "DistrictMindBaselineAudit/1.0" }, signal: AbortSignal.timeout(9000) });
      add(`asset URL: ${key}`, response.ok ? "PASS" : "FAIL", `HTTP ${response.status}`);
      await response.body?.cancel().catch(() => {});
    } catch (error) {
      add(`asset URL: ${key}`, "FAIL", error.message);
    }
  }
}

for (const route of ["/", "/artists.html", "/releases.html", "/john-michell.html", "/newsroom.html"]) {
  try {
    const response = await fetch(new URL(route, BASE), { signal: AbortSignal.timeout(9000) });
    add(`production route: ${route}`, response.ok ? "PASS" : "FAIL", `HTTP ${response.status}`);
    await response.body?.cancel().catch(() => {});
  } catch (error) {
    add(`production route: ${route}`, "FAIL", error.message);
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  target: BASE,
  system: "System A — baseline publisher media audit",
  counts: {
    pass: results.filter(x => x.status === "PASS").length,
    warn: results.filter(x => x.status === "WARN").length,
    fail: results.filter(x => x.status === "FAIL").length
  },
  results
};
await fs.mkdir("reports", { recursive: true });
await fs.writeFile("reports/media-baseline-audit.json", JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary.counts, null, 2));
if (summary.counts.fail) process.exitCode = 1;
