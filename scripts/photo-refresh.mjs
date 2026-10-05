import fs from "node:fs/promises";

const manifestPath = "assets/photo-manifest.json";
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

/*
  DISTRICT MIND PHOTO IDENTITY RULE:
  - The named artist/story is the source of truth.
  - Automated discovery may search broadly, but publication only accepts
    rights-cleared imagery whose metadata independently identifies the same artist.
  - Instagram/Meta/Google may be used for discovery or owner-supplied assets,
    but this bot does NOT scrape/re-publish copyrighted social images without permission.
  - If identity or rights are uncertain: leave the image blank.
*/
const ARTISTS = [
  { key: "earl-sweatshirt", name: "Earl Sweatshirt", query: "Earl Sweatshirt", blocked: ["Doja Cat","Victoria Monét","Quavo","JPEGMAFIA"] },
  { key: "victoria-monet", name: "Victoria Monét", query: "Victoria Monét", blocked: ["Doja Cat","Quavo","Earl Sweatshirt","JPEGMAFIA"] },
  { key: "quavo", name: "Quavo", query: "Quavo", blocked: ["Doja Cat","Victoria Monét","Earl Sweatshirt","JPEGMAFIA"] },
  { key: "doja-cat", name: "Doja Cat", query: "Doja Cat", blocked: ["Quavo","Victoria Monét","Earl Sweatshirt","JPEGMAFIA"] },
  { key: "jpegmafia", name: "JPEGMAFIA", query: "JPEGMAFIA", blocked: ["Doja Cat","Quavo","Victoria Monét","Earl Sweatshirt"] }
];

const esc = s => encodeURIComponent(s);
const clean = s => String(s || "").replace(/<[^>]+>/g, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();

async function commonsSearch(query) {
  const url = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=" +
    esc(query) +
    "&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|extmetadata&iilimit=12&iiurlwidth=1600&format=json&origin=*";
  const r = await fetch(url, { headers: { "User-Agent": "DistrictMindMediaPhotoScout/1.1" } });
  if (!r.ok) return [];
  const data = await r.json();
  return Object.values(data.query?.pages || {}).map(p => {
    const info = p.imageinfo?.[0] || {};
    const meta = info.extmetadata || {};
    return {
      title: clean(p.title),
      url: info.thumburl || info.url || "",
      license: clean(meta.LicenseShortName?.value || meta.License?.value),
      artist: clean(meta.Artist?.value),
      description: clean(meta.ImageDescription?.value),
      sourceUrl: info.descriptionurl || ""
    };
  });
}

function isReusable(item) {
  const l = item.license.toLowerCase();
  return l.includes("cc by") || l.includes("cc0") || l.includes("public domain");
}

function identityScore(item, artist) {
  const title = item.title.toLowerCase();
  const description = item.description.toLowerCase();
  const expected = artist.name.toLowerCase();
  const blocked = artist.blocked.some(b => {
    const x = b.toLowerCase();
    return title.includes(x) || description.includes(x);
  });
  if (blocked) return -1;

  // Strongest proof: the artist is named in the file title or image description.
  if (title.includes(expected) || description.includes(expected)) return 3;

  // Metadata photographer/creator fields alone do NOT prove who is pictured.
  return 0;
}

for (const artist of ARTISTS) {
  const candidates = await commonsSearch(artist.query);
  const match = candidates
    .filter(c => isReusable(c))
    .map(c => ({ ...c, score: identityScore(c, artist) }))
    .filter(c => c.score >= 3)
    .sort((a,b) => b.score - a.score)[0];

  if (match) {
    manifest.photos[artist.key] = {
      subject: artist.name,
      url: match.url,
      alt: artist.name,
      credit: `${match.artist || "Wikimedia Commons"} / Wikimedia Commons — ${match.license}`,
      license: match.license,
      source: "Wikimedia Commons",
      sourceUrl: match.sourceUrl,
      identity: "metadata-name-match",
      verifiedAt: new Date().toISOString()
    };
  } else if (manifest.photos[artist.key]?.url && manifest.photos[artist.key]?.identity) {
    // Keep a previously curated/verified photo if today's scout cannot find a replacement.
    // This prevents a temporary source outage from removing a known-good artist image.
    manifest.photos[artist.key].subject = artist.name;
    manifest.photos[artist.key].verifiedAt = manifest.photos[artist.key].verifiedAt || new Date().toISOString();
    console.log(`No replacement found for ${artist.name}; keeping the existing verified photo.`);
  } else {
    manifest.photos[artist.key] = {
      ...(manifest.photos[artist.key] || {}),
      subject: artist.name,
      url: "",
      identity: "unverified",
      verifiedAt: new Date().toISOString()
    };
    console.log(`No safely verified photo for ${artist.name}; keeping branded placeholder.`);
  }
}

// John Michell and his releases remain owner-supplied only.
// Never auto-fill them with another artist's face.
for (const key of ["john-michell","john-michell-drivin-crazy","john-michell-who-is-you","john-michell-u"]) {
  if (manifest.photos[key]) {
    manifest.photos[key].subject = manifest.photos[key].subject || manifest.photos[key].alt;
    if (!manifest.photos[key].url) manifest.photos[key].identity = "owner-supplied-only";
  }
}

manifest.generatedAt = new Date().toISOString();
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log("District Mind photo manifest refreshed:", manifest.generatedAt);
