import fs from "node:fs/promises";

const manifestPath = "assets/photo-manifest.json";
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

const ARTISTS = [
  { key: "earl-sweatshirt", query: "Earl Sweatshirt", blocked: ["Doja","Victoria Monét","Quavo"] },
  { key: "victoria-monet", query: "Victoria Monét", blocked: ["Doja","Quavo","Earl Sweatshirt"] },
  { key: "quavo", query: "Quavo rapper", blocked: ["Doja","Victoria Monét","Earl Sweatshirt"] },
  { key: "doja-cat", query: "Doja Cat", blocked: ["Quavo","Victoria Monét","Earl Sweatshirt"] },
  { key: "jpegmafia", query: "JPEGMAFIA", blocked: ["Doja","Quavo","Victoria Monét","Earl Sweatshirt"] }
];

const esc = s => encodeURIComponent(s);

async function commonsSearch(query) {
  const url = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=" +
    esc(query) +
    "&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|extmetadata&iilimit=8&iiurlwidth=1400&format=json&origin=*";
  const r = await fetch(url, { headers: { "User-Agent": "DistrictMindMediaPhotoScout/1.0" } });
  if (!r.ok) return [];
  const data = await r.json();
  return Object.values(data.query?.pages || {}).map(p => {
    const info = p.imageinfo?.[0] || {};
    const meta = info.extmetadata || {};
    const license = String(meta.LicenseShortName?.value || meta.License?.value || "").replace(/<[^>]+>/g,"").trim();
    const artist = String(meta.Artist?.value || "").replace(/<[^>]+>/g,"").trim();
    return {
      title: p.title || "",
      url: info.thumburl || info.url || "",
      license,
      artist,
      description: String(meta.ImageDescription?.value || "").replace(/<[^>]+>/g,"").trim()
    };
  });
}

function isReusable(item) {
  const l = item.license.toLowerCase();
  return l.includes("cc by") || l.includes("cc0") || l.includes("public domain");
}

function matchesArtist(item, artist) {
  const hay = (item.title + " " + item.description + " " + item.artist).toLowerCase();
  const tokens = artist.query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.every(t => hay.includes(t))) return false;
  return !artist.blocked.some(b => hay.includes(b.toLowerCase()));
}

for (const artist of ARTISTS) {
  const candidates = await commonsSearch(artist.query);
  const match = candidates.find(c => isReusable(c) && matchesArtist(c, artist));
  if (match) {
    manifest.photos[artist.key] = {
      url: match.url,
      alt: artist.query,
      credit: `${match.artist || "Wikimedia Commons"} / Wikimedia Commons — ${match.license}`,
      license: match.license,
      source: "Wikimedia Commons"
    };
  }
}

// Never auto-fill John Michell or his releases with another artist.
// Those keys intentionally remain blank until an official/owner-supplied image is provided,
// or an AI provider is explicitly configured to create original artwork rather than impersonate a photo.

manifest.generatedAt = new Date().toISOString();
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log("District Mind photo manifest refreshed:", manifest.generatedAt);
