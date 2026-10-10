import fs from "node:fs/promises";

const BASE = process.env.SITE_URL || "https://district-mind-media.pages.dev";
const manifestPath = "assets/photo-manifest.json";
const registryPath = "assets/artist-registry.json";
const failures = [];
const warnings = [];
const checks = [];
const timeoutMs = 9000;

async function readJson(path) {
  return JSON.parse(await fs.readFile(path, "utf8"));
}
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}
function record(level, code, subject, detail) {
  const item = { level, code, subject, detail };
  (level === "FAIL" ? failures : warnings).push(item);
}
function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return (u.protocol === "https:" || u.protocol === "http:") && !u.username && !u.password;
  } catch {
    return false;
  }
}

let manifest;
let registry;
try { manifest = await readJson(manifestPath); checks.push({ name: "photo manifest JSON", status: "PASS" }); }
catch (e) { record("FAIL", "manifest_invalid", manifestPath, e.message); }
try { registry = await readJson(registryPath); checks.push({ name: "artist registry JSON", status: "PASS" }); }
catch (e) { record("FAIL", "registry_invalid", registryPath, e.message); }

if (manifest && registry) {
  const photos = manifest.photos || {};
  const artistIds = new Set();
  for (const artist of registry.artists || []) {
    if (!artist.id || !artist.name || artistIds.has(artist.id)) {
      record("FAIL", "artist_identity_invalid", artist.id || "unknown", "Missing name/id or duplicate canonical artist ID.");
      continue;
    }
    artistIds.add(artist.id);
    if (artist.portraitAssetKey && !photos[artist.portraitAssetKey]) {
      record("FAIL", "portrait_key_missing", artist.name, `Manifest key "${artist.portraitAssetKey}" is absent.`);
    }
    if (artist.portraitAssetKey && photos[artist.portraitAssetKey] && !photos[artist.portraitAssetKey].url) {
      record("WARN", "portrait_pending", artist.name, "No verified portrait URL is configured. Do not substitute another artist.");
    }
    if (artist.officialCatalogUrl && !isHttpUrl(artist.officialCatalogUrl)) {
      record("FAIL", "catalog_url_invalid", artist.name, artist.officialCatalogUrl);
    }
    for (const release of artist.releases || []) {
      if (!release.id || !release.title || !release.assetKey) {
        record("FAIL", "release_record_invalid", artist.name, "Release is missing id, title, or assetKey.");
        continue;
      }
      if (!photos[release.assetKey]) {
        record("FAIL", "release_art_key_missing", release.title, `Manifest key "${release.assetKey}" is absent.`);
      } else if (!photos[release.assetKey].url) {
        record("WARN", "release_art_pending", release.title, "Official artwork URL is not configured; catalog fallback should be used.");
      }
      if (release.fallbackCatalogUrl && !isHttpUrl(release.fallbackCatalogUrl)) {
        record("FAIL", "release_fallback_invalid", release.title, release.fallbackCatalogUrl);
      }
    }
  }

  for (const [key, asset] of Object.entries(photos)) {
    if (!asset || typeof asset !== "object") {
      record("FAIL", "asset_record_invalid", key, "Asset record is not an object.");
      continue;
    }
    if (!asset.url) {
      if (!String(asset.license || "").includes("owner-supplied")) {
        record("WARN", "asset_url_missing", key, "No URL configured.");
      }
      continue;
    }
    if (!isHttpUrl(asset.url)) {
      record("FAIL", "asset_url_invalid", key, asset.url);
      continue;
    }
    if (!asset.subject || !asset.alt || !asset.license || !asset.credit) {
      record("FAIL", "asset_provenance_missing", key, "Configured asset needs subject, alt text, license, and credit.");
      continue;
    }
    try {
      const response = await fetchWithTimeout(asset.url, { method: "GET", headers: { "User-Agent": "DistrictMindMediaMediaSentinel/1.0", "Range": "bytes=0-0" } });
      if (!response.ok) {
        record("FAIL", "asset_http_failure", key, `HTTP ${response.status} from configured media URL.`);
      } else {
        const type = response.headers.get("content-type") || "";
        if (!type.startsWith("image/")) {
          record("FAIL", "asset_not_image", key, `Expected image/* but received "${type || "unknown"}".`);
        } else {
          checks.push({ name: "asset URL", subject: key, status: "PASS", httpStatus: response.status, contentType: type });
        }
      }
      if (response.body) await response.body.cancel().catch(() => {});
    } catch (e) {
      record("WARN", "asset_check_unavailable", key, `Could not verify remote asset: ${e.message}`);
    }
  }
}

const routes = ["/", "/artists.html", "/releases.html", "/john-michell.html", "/newsroom.html"];
for (const route of routes) {
  try {
    const response = await fetchWithTimeout(new URL(route, BASE).toString(), { method: "GET", headers: { "User-Agent": "DistrictMindMediaMediaSentinel/1.0" } });
    if (!response.ok) record("FAIL", "production_route_failed", route, `HTTP ${response.status}`);
    else {
      checks.push({ name: "production route", subject: route, status: "PASS", httpStatus: response.status });
      await response.body?.cancel().catch(() => {});
    }
  } catch (e) {
    record("FAIL", "production_route_unreachable", route, e.message);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  target: BASE,
  system: "District Mind Media Next — identity-first media integrity",
  status: failures.length ? "FAIL" : warnings.length ? "WARN" : "PASS",
  summary: {
    checksPassed: checks.length,
    failures: failures.length,
    warnings: warnings.length,
    ownerPortraitsPending: warnings.filter(x => x.code === "portrait_pending").length,
    releaseArtworkPending: warnings.filter(x => x.code === "release_art_pending").length,
    configuredMediaFailures: failures.filter(x => x.code.startsWith("asset_")).length
  },
  checks,
  failures,
  warnings,
  rules: [
    "Never substitute a different artist's image.",
    "Pending owner assets are warnings until a verified source is supplied.",
    "External media failures are reported; this job does not silently rewrite asset URLs.",
    "A PASS only means these checks passed at this timestamp."
  ]
};
await fs.mkdir("reports", { recursive: true });
await fs.writeFile("reports/media-integrity-latest.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
if (failures.length) process.exitCode = 1;
