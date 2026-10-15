-- District Mind Radio: shared weekly voting and optional prize entries.
-- Bind this database to Cloudflare Pages as DB before enabling voting.
CREATE TABLE IF NOT EXISTS radio_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  week_key TEXT NOT NULL,
  is_open INTEGER NOT NULL DEFAULT 0 CHECK (is_open IN (0,1)),
  closes_at TEXT
);
INSERT OR IGNORE INTO radio_config (id, week_key, is_open, closes_at)
VALUES (1, '13th-hour-launch-week', 0, NULL);

CREATE TABLE IF NOT EXISTS radio_tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT 'John Michell',
  audio_url TEXT NOT NULL,
  artwork_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
);

-- Votes are intentionally cumulative: every click is a new row.
-- voter_id only helps associate a visitor's optional entry with their voting history;
-- it is not proof of a unique human listener.
CREATE TABLE IF NOT EXISTS radio_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_key TEXT NOT NULL,
  voter_id TEXT NOT NULL,
  track_id TEXT NOT NULL REFERENCES radio_tracks(id),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS radio_votes_week_track ON radio_votes(week_key, track_id);
CREATE INDEX IF NOT EXISTS radio_votes_week_voter ON radio_votes(week_key, voter_id);

CREATE TABLE IF NOT EXISTS radio_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_key TEXT NOT NULL,
  voter_id TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (week_key, email)
);
CREATE INDEX IF NOT EXISTS radio_entries_week_voter ON radio_entries(week_key, voter_id);
