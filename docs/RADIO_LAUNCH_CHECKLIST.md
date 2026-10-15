# District Mind Radio launch checklist

## Implemented in the repository
- `radio.html`: responsive dark Radio page, compact per-track audio controls, cumulative vote buttons, total-vote bar graph, and optional email entry.
- `functions/api/radio.js`: API for shared totals, individual vote events, and one email entry per address per round.
- `migrations/0001_radio.sql`: D1 tables for configuration, approved tracks, cumulative votes, and private reward entries.
- Primary navigation and Explore link to Radio.
- No demo tracks or fabricated vote totals are shown.

## Required before voting can go live
1. Create a Cloudflare D1 database for the Pages project.
2. Apply `migrations/0001_radio.sql` to that database.
3. Add a Pages Function binding named `DB` pointing to the D1 database. The API intentionally returns HTTP 503 until this binding exists.
4. Upload the cleared audio files to the site's assets or another controlled HTTPS host, then insert the real track titles and audio URLs into `radio_tracks`. Do not add the two rejected bonus tracks unless distribution/streaming rights are confirmed.
5. Verify audio, vote increments, shared totals from two separate devices, refresh persistence, email validation, and duplicate-email handling.
6. Confirm official promotion rules and eligibility, then open a round by setting `radio_config.is_open = 1` and a unique `week_key`.

## Weekly close and winner check
Close the round by setting `radio_config.is_open = 0`. Determine the winning track from the final vote totals:

```sql
SELECT track_id, COUNT(*) AS total_votes
FROM radio_votes
WHERE week_key = 'YOUR_WEEK_KEY'
GROUP BY track_id
ORDER BY total_votes DESC, track_id ASC;
```

For the prize drawing, select only entered emails whose voter ID has voted for the final winning track. Keep this query private; never expose entrant email addresses in a public endpoint:

```sql
SELECT DISTINCT e.email
FROM radio_entries e
JOIN radio_votes v
  ON v.week_key = e.week_key AND v.voter_id = e.voter_id
WHERE e.week_key = 'YOUR_WEEK_KEY'
  AND v.track_id = 'WINNING_TRACK_ID';
```

The query intentionally returns eligible entries, not a public winner. Select and contact one eligible entry according to the published official rules. Do not describe vote totals as unique listeners; repeated clicks are counted by design.

## Status
Code has been committed to GitHub. Shared voting and email storage are **not live** until the Cloudflare D1 database and `DB` binding are configured and the real audio lineup is inserted. The email entry form must not be advertised as an active prize promotion until official rules are published.
