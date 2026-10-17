const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const validId = (v) => typeof v === "string" && /^[a-zA-Z0-9_-]{8,80}$/.test(v);
const currentWeek = () => new Date().toISOString().slice(0, 10);
const effectiveSettings = async (db, settings) => {
  if (!settings) return { week_key: currentWeek(), is_open: 0, closes_at: null };
  const closeMs = settings.closes_at ? Date.parse(settings.closes_at) : NaN;
  const openMs = Number.isFinite(closeMs) ? closeMs - 7 * 24 * 60 * 60 * 1000 : NaN;
  const inWindow = Number.isFinite(closeMs) && Date.now() >= openMs && Date.now() < closeMs;
  const isOpen = Number(settings.is_open) === 1 && (Number.isFinite(closeMs) ? inWindow : true);
  if (Number(settings.is_open) === 1 && Number.isFinite(closeMs) && Date.now() >= closeMs) {
    await db.prepare("UPDATE radio_config SET is_open = 0 WHERE id = 1 AND is_open = 1").run();
  }
  return { ...settings, is_open: isOpen ? 1 : 0, mode: isOpen ? "voting" : "submissions" };
};

// Static playback lineup lets the station play even before Cloudflare D1 voting is configured.
// Voting remains closed until the shared database is connected and explicitly opened.
const localTracks = [
  { id: "dm_track_og_dance", title: "OG Dance", artist: "John Michell", audio_url: "/assets/audio/13th-hour/OG_DANCE.mp3", artwork_url: null, sort_order: 1, votes: 0 },
  { id: "dm_track_freeze", title: "Freeze", artist: "John Michell", audio_url: "/assets/audio/13th-hour/Freeze.mp3", artwork_url: null, sort_order: 2, votes: 0 },
  { id: "dm_track_turn_up", title: "Turn Up", artist: "John Michell", audio_url: "/assets/audio/13th-hour/TURN_UP.mp3", artwork_url: null, sort_order: 3, votes: 0 },
  { id: "dm_track_idk_yet_ring", title: "Idk Yet Ring", artist: "John Michell", audio_url: "/assets/audio/13th-hour/Idk_yet_ring.mp3", artwork_url: null, sort_order: 4, votes: 0 },
  { id: "dm_track_what_if", title: "What If", artist: "John Michell", audio_url: "/assets/audio/13th-hour/What_If.mp3", artwork_url: null, sort_order: 5, votes: 0 },
  { id: "dm_track_5", title: "5", artist: "John Michell", audio_url: "/assets/audio/13th-hour/5.mp3", artwork_url: null, sort_order: 6, votes: 0 },
  { id: "dm_track_unfinished", title: "Unfinished", artist: "John Michell", audio_url: "/assets/audio/13th-hour/Unfinished.mp3", artwork_url: null, sort_order: 7, votes: 0 },
  { id: "dm_track_rivers", title: "Rivers", artist: "John Michell", audio_url: "/assets/audio/13th-hour/Rivers.mp3", artwork_url: null, sort_order: 8, votes: 0 },
  { id: "dm_track_like_u", title: "Like U", artist: "John Michell", audio_url: "/assets/audio/13th-hour/Like_U.mp3", artwork_url: null, sort_order: 9, votes: 0 }
];

export async function onRequest({ request, env }) {
  if (!env.DB) {
    if (request.method === "GET") {
      return json({
        ok: true,
        code: "RADIO_PLAYBACK_ONLY",
        message: "Playback is available. Shared voting opens when the Radio database is connected.",
        mode: "setup",
        playback_open: Date.now() < Date.parse("2026-10-23T06:00:00.000Z"),
        submit_url: "/contact.html?subject=Radio%20submission",
        settings: { week_key: "13th-hour-release-2026-10-23", is_open: 0, closes_at: "2026-10-23T06:00:00.000Z" },
        tracks: localTracks,
        total_votes: 0,
        leader_track_id: null
      });
    }
    return json({ ok: false, code: "RADIO_STORAGE_NOT_CONFIGURED", message: "Playback is available, but shared voting and reward entries are offline until the station database is connected." }, 503);
  }
  const db = env.DB;
  if (request.method === "GET") {
    const rawSettings = await db.prepare("SELECT week_key, is_open, closes_at FROM radio_config WHERE id = 1").first();
    const settings = await effectiveSettings(db, rawSettings);
    const { results: tracks } = await db.prepare("SELECT t.id, t.title, t.artist, t.audio_url, t.artwork_url, COALESCE(v.total, 0) AS votes FROM radio_tracks t LEFT JOIN (SELECT track_id, COUNT(*) AS total FROM radio_votes WHERE week_key = ? GROUP BY track_id) v ON v.track_id = t.id WHERE t.is_active = 1 ORDER BY t.sort_order, t.id").bind(settings?.week_key || currentWeek()).all();
    if (!tracks.length) {
      return json({
        ok: true,
        code: "RADIO_PLAYBACK_ONLY",
        message: "No approved tracks are configured for this round. Submit your music for consideration.",
        mode: "submissions",
        submit_url: "/contact.html?subject=Radio%20submission",
        settings: { week_key: settings?.week_key || currentWeek(), is_open: 0, closes_at: settings?.closes_at || null },
        tracks: localTracks,
        total_votes: 0,
        leader_track_id: null
      });
    }
    const audioByTitle = new Map(localTracks.map(t => [t.title.toLowerCase().replace(/[^a-z0-9]/g, ""), t.audio_url]));
    const playableTracks = tracks.map(t => ({
      ...t,
      audio_url: audioByTitle.get(String(t.title || "").toLowerCase().replace(/[^a-z0-9]/g, "")) || t.audio_url
    }));
    const total = playableTracks.reduce((n, t) => n + Number(t.votes || 0), 0);
    const sorted = [...playableTracks].sort((a, b) => Number(b.votes) - Number(a.votes));
    return json({ ok: true, mode: settings?.is_open ? "voting" : "submissions", submit_url: "/contact.html?subject=Radio%20submission", settings: settings || { week_key: currentWeek(), is_open: 0, closes_at: null }, tracks: playableTracks, total_votes: total, leader_track_id: sorted[0]?.votes > 0 ? sorted[0].id : null });
  }
  if (request.method !== "POST") return json({ ok: false, message: "Method not allowed." }, 405);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, message: "Invalid request." }, 400); }
  const rawSettings = await db.prepare("SELECT week_key, is_open, closes_at FROM radio_config WHERE id = 1").first();
  const settings = await effectiveSettings(db, rawSettings);
  if (!settings || !settings.is_open) return json({ ok: false, message: "Voting is closed for this release cycle. Submit your music for a future Radio round." }, 409);
  if (body.action === "vote") {
    if (!validId(body.voter_id) || !validId(body.track_id)) return json({ ok: false, message: "Invalid vote details." }, 400);
    const track = await db.prepare("SELECT id FROM radio_tracks WHERE id = ? AND is_active = 1").bind(body.track_id).first();
    if (!track) return json({ ok: false, message: "That track is not available for this round." }, 404);
    await db.prepare("INSERT INTO radio_votes (week_key, voter_id, track_id, created_at) VALUES (?, ?, ?, ?)").bind(settings.week_key, body.voter_id, body.track_id, new Date().toISOString()).run();
    const result = await db.prepare("SELECT COUNT(*) AS total FROM radio_votes WHERE week_key = ? AND track_id = ?").bind(settings.week_key, body.track_id).first();
    return json({ ok: true, track_id: body.track_id, votes: Number(result.total), message: "Vote counted." }, 201);
  }
  if (body.action === "entry") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!validId(body.voter_id) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || body.consent !== true) return json({ ok: false, message: "Enter a valid email and confirm the optional prize entry." }, 400);
    const prior = await db.prepare("SELECT id FROM radio_votes WHERE week_key = ? AND voter_id = ? LIMIT 1").bind(settings.week_key, body.voter_id).first();
    if (!prior) return json({ ok: false, message: "Vote in this week's round before entering." }, 409);
    try {
      await db.prepare("INSERT INTO radio_entries (week_key, voter_id, email, created_at) VALUES (?, ?, ?, ?)").bind(settings.week_key, body.voter_id, email, new Date().toISOString()).run();
    } catch (e) {
      return json({ ok: false, message: "This email has already been entered for this week's reward." }, 409);
    }
    return json({ ok: true, message: "Your optional prize entry has been recorded." }, 201);
  }
  return json({ ok: false, message: "Unknown action." }, 400);
}