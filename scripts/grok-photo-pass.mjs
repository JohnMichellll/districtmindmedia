import fs from "node:fs/promises";

const key = process.env.XAI_API_KEY;
if (!key) process.exit(0);

const path = "assets/photo-manifest.json";
const manifest = JSON.parse(await fs.readFile(path, "utf8"));

const prompt = `You are the District Mind Media photo editor. Review this JSON photo manifest.
Rules:
1. Never put the wrong artist's photo on a named artist or release.
2. Never use stock concert photography for a named artist.
3. Prefer current official/owner-supplied artwork or rights-cleared imagery.
4. Do not invent a photographer, license, source, URL, or credit.
5. If you cannot verify an image, leave the URL blank.
6. John Michell and his releases must never be represented by another artist.
Return ONLY valid JSON with the same top-level shape and only verified changes.

MANIFEST:
${JSON.stringify(manifest, null, 2)}`;

const r = await fetch("https://api.x.ai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "grok-4",
    temperature: 0,
    messages: [
      { role: "system", content: "You are a conservative newsroom photo-rights checker." },
      { role: "user", content: prompt }
    ]
  })
});

if (!r.ok) throw new Error(`xAI request failed: ${r.status}`);
const data = await r.json();
const raw = data.choices?.[0]?.message?.content || "";
const match = raw.match(/\\{[\\s\\S]*\\}/);
if (!match) throw new Error("Grok returned no JSON");

const next = JSON.parse(match[0]);
if (!next.photos) throw new Error("Invalid Grok manifest");

for (const [name, photo] of Object.entries(next.photos)) {
  if (!photo || typeof photo !== "object") continue;
  // Grok can validate; it cannot override the no-wrong-artist safety rule.
  if (/john-michell/i.test(name)) {
    photo.url = "";
    photo.credit = "John Michell / District Mind Records — official release image pending";
    photo.license = "owner-supplied only";
  }
  manifest.photos[name] = photo;
}

manifest.generatedAt = new Date().toISOString();
await fs.writeFile(path, JSON.stringify(manifest, null, 2) + "\n");
console.log("Grok photo/editor pass complete.");
