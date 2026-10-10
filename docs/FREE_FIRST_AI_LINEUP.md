# District Mind Media — Free-First AI Lineup

## Operating rule
Every phase follows the owner-approved loop: **build → test → repair → verify**. No feature is called complete because code was committed; it must pass its checks and be confirmed on the deployed site.

## Budget contract
- Budget: **$0**. No paid API dependency, paid model, paid automation service, or secret key required for the core experiences.
- Use free public catalog/search sources where practical (for example, Apple/iTunes Search and public news RSS), and link out to the original source.
- Free public services can change, rate-limit, or be unavailable. Provide graceful fallbacks and never invent live events, artwork, ticket links, facts, or distribution status.
- A rule-based assistant is not a generative AI model. Label it honestly; any future optional model integration must be free-tier, disabled by default, and tested against its actual limits before use.
- Do not store personal location or chat history on a server. Ask for city/state only when the viewer wants local concert discovery; no exact address is required.

## Phased delivery

### Phase 1 — Wayfinder Music Desk
- Dedicated interactive page with chat-style messages, quick prompts, reset, responsive mobile layout, music-only routing, artist/catalog lookup, public music-news search, and concert discovery links.
- Current implementation: `wayfinder.html` and `functions/api/wayfinder-chat.js`.
- Verification: page renders, prompt chips submit, free API route responds, non-music questions are redirected to music topics, catalog cards use safe text rendering, and external links open the source.
- Known boundary: this is a free-first intent router and catalog/news discovery experience, not a paid generative model. Concert links open current event search destinations; they do not guarantee a specific local event has been found.

### Phase 2 — Artwork & Link Inspector
- Audit manifest and release registry; distinguish broken URLs from intentionally missing/ unverified artwork; check image response status and alt text; create a clear report.
- Never substitute unrelated stock art for John Michell or a song. When verified artwork is missing, show a branded fallback and link to the verified catalog page.
- Gate: zero unexplained broken image URLs, every missing owner asset explicitly identified, no false claim that missing artwork was fixed.

### Phase 3 — Artist Scout
- Improve artist lookup with debounced queries, stale-response protection, public catalog artwork, source links, and honest limits on track counts/distribution status.
- Gate: known artist searches, ambiguous-name results, no-result behavior, API timeout, and mobile layout tested.

### Phase 4 — Friday Release Intelligence
- Use free public catalog/news feeds to surface likely new releases and music stories with source attribution and last-checked timestamps.
- Require a source URL for every result; do not present search matches as verified release dates without source evidence.
- Gate: deduplication, stale-feed handling, broken-link checks, and transparent date/source display.

### Phase 5 — Artist Promo Studio
- Free local generators for artist bios, release descriptions, show flyers' copy, press-kit checklists, and social captions. User reviews/copies outputs; no auto-publishing.
- Gate: editable output, clear placeholders, no fabricated achievements or stats, accessible copy buttons.

### Phase 6 — District Mind Academy Coach
- Guided music-business and creative workflow lessons, checklists, and practice prompts using static content and browser-local progress only.
- Gate: each lesson navigates correctly, progress is clearly local/non-synced, and account/login claims stay accurate.

### Phase 7 — Release & Site Quality Loop
- Keep the existing GitHub Actions integrity, security, and browser QA checks; add regression checks for every new feature and publish reports as workflow artifacts.
- Gate: failing checks are repaired before a phase is marked green; report real counts and links to the run.

## Status
- Phase 1 implementation committed; automated Site Defense passed for commit `4fdbccce862a3237ee4a568e3ddbcd55e9a6d38b`.
- First Impression browser QA was still running at the time of this note. Do not mark Phase 1 fully verified until it completes and the live Cloudflare deployment is checked.
- Remaining phases are planned, not yet implemented or verified.