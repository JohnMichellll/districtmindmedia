-- District Mind Radio: seed the approved 13th Hour lineup and the Oct. 23, 2026 release cycle.
-- Release time is midnight Mountain Daylight Time (UTC-06:00) on Friday, Oct. 23.
-- The API opens the round exactly seven days before closes_at and closes it automatically at the cutoff.
INSERT OR IGNORE INTO radio_tracks (id, title, artist, audio_url, artwork_url, sort_order, is_active) VALUES
('dm_track_og_dance', 'OG Dance', 'John Michell', '/assets/audio/13th-hour/OG_DANCE.mp3', NULL, 1, 1),
('dm_track_freeze', 'Freeze', 'John Michell', '/assets/audio/13th-hour/Freeze.mp3', NULL, 2, 1),
('dm_track_turn_up', 'Turn Up', 'John Michell', '/assets/audio/13th-hour/TURN_UP.mp3', NULL, 3, 1),
('dm_track_idk_yet_ring', 'Idk Yet Ring', 'John Michell', '/assets/audio/13th-hour/Idk_yet_ring.mp3', NULL, 4, 1),
('dm_track_what_if', 'What If', 'John Michell', '/assets/audio/13th-hour/What_If.mp3', NULL, 5, 1),
('dm_track_5', '5', 'John Michell', '/assets/audio/13th-hour/5.mp3', NULL, 6, 1),
('dm_track_unfinished', 'Unfinished', 'John Michell', '/assets/audio/13th-hour/Unfinished.mp3', NULL, 7, 1),
('dm_track_rivers', 'Rivers', 'John Michell', '/assets/audio/13th-hour/Rivers.mp3', NULL, 8, 1),
('dm_track_like_u', 'Like U', 'John Michell', '/assets/audio/13th-hour/Like_U.mp3', NULL, 9, 1);

UPDATE radio_config
SET week_key = '13th-hour-release-2026-10-23',
    is_open = 1,
    closes_at = '2026-10-23T06:00:00.000Z'
WHERE id = 1;
