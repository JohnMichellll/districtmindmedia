const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const validId = (v) => typeof v === "string" && /^[a-zA-Z0-9_-]{8,80}$/.test(v);
const currentWeek = () => new Date().toISOString().slice(0, 10);

export async function onRequest({ request, env }) {
  if (!env.DB) return json({ ok: false, code: "RADIO_STORAGE_NOT_CONFIGURED", message: "Radio voting is being prepared. Shared voting will open once the station database is connected." }, 503);
  const db = env.DB;
  if (request.method === "GET") {
    const settings = await db.prepare("SELECT week_key, is_open, closes_at FROM radio_config WHERE id = 1").first();
    const { results: tracks } = await db.prepare("SELECT t.id, t.title, t.artist, t.audio_url, t.artwork_url, COALESCE(v.total, 0) AS votes FROM radio_tracks t LEFT JOIN (SELECT track_id, COUNT(*) AS total FROM radio_votes WHERE week_key = ? GROUP BY track_id) v ON v.track_id = t.id WHERE t.is_active = 1 ORDER BY t.sort_order, t.id").bind(settings?.week_key || currentWeek()).all();
    const total = tracks.reduce((n, t) => n + Number(t.votes || 0), 0);
    const sorted = [...tracks].sort((a, b) => Number(b.votes) - Number(a.votes));
    return json({ ok: true, settings: settings || { week_key: currentWeek(), is_open: 0, closes_at: null }, tracks, total_votes: total, leader_track_id: sorted[0]?.votes > 0 ? sorted[0].id : null });
  }
  if (request.method !== "POST") return json({ ok: false, message: "Method not allowed." }, 405);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, message: "Invalid request." }, 400); }
  const settings = await db.prepare("SELECT week_key, is_open, closes_at FROM radio_config WHERE id = 1").first();
  if (!settings || !settings.is_open) return json({ ok: false, message: "Voting is currently closed." }, 409);
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